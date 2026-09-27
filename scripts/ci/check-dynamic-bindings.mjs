#!/usr/bin/env node
/**
 * Dynamic-binding checker for the hook script surface.
 *
 * tsc cannot see these edges: a script pulls a name out of a CommonJS/ESM
 * sibling with `const { X } = require(...)` or `await import(...)`. If the
 * sibling no longer exports X (a branding rename, a lost mirror, a deleted
 * helper) the call only fails at runtime, inside a hook the model never sees.
 *
 * Reports every destructured binding whose name is absent from the resolved
 * module's export set.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOT = process.cwd();

function git(args) {
  try {
    return execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return '';
  }
}

const files = git(['ls-files', '--', 'scripts', 'templates', 'src'])
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => /\.(mjs|cjs|js)$/.test(l));

// git() returns '' when the listing fails, which would scan nothing and still
// exit 0 -- a silent no-op is indistinguishable from a clean bill of health.
if (!files.length) {
  console.error('REFUSE: no .mjs/.cjs/.js files listed by git; refusing to report a clean scan.');
  process.exit(1);
}

function exportsOf(file) {
  let text;
  try {
    text = readFileSync(join(ROOT, file), 'utf8');
  } catch {
    return null;
  }
  // `export * from` makes the real set unknowable; reporting against a partial
  // set would invent missing bindings, so such modules are left unchecked.
  if (/export\s+\*/.test(text)) return null;
  const names = new Set();
  for (const m of text.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) names.add(m[1]);
  for (const m of text.matchAll(/export\s+(?:const|let|var|class)\s+(\w+)/g)) names.add(m[1]);
  for (const m of text.matchAll(/exports\.(\w+)\s*=/g)) names.add(m[1]);
  // `export { a, b as c }` and `export { a } from './x'` publish the right-hand
  // side of `as`; missing this form reports a perfectly good binding as broken.
  for (const m of text.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const k = part.trim().split(/\s+as\s+/).pop().trim();
      if (/^\w+$/.test(k)) names.add(k);
    }
  }
  // Only keys of a module.exports object are exports. Applied to the whole file
  // this rule credited 72 of the 122 scanned modules with names taken from
  // unrelated object literals, which silently un-checks real missing bindings.
  // The region ends at the first `}`, so a nested object inside module.exports
  // is out of scope -- none exists in the scanned surface today.
  for (const region of text.matchAll(/module\.exports\s*=\s*\{([^}]*)\}/g)) {
    for (const part of region[1].split(/[,\n]/)) {
      // `{ a, b: c }` -- the exported name is on the left of the colon either way.
      const entry = /^(\w+)\s*:?\s*(?=$|[,{}\s])/.exec(part.replace(/\/\/.*$/, '').trim());
      if (entry) names.add(entry[1]);
    }
  }
  return names;
}

/** Resolve a require()/import() specifier written relative to the host file. */
function resolveSpec(hostFile, spec) {
  const base = dirname(join(ROOT, hostFile));
  if (!spec.startsWith('.')) return null;
  const direct = resolve(base, spec);
  for (const candidate of [direct, `${direct}.mjs`, `${direct}.cjs`, `${direct}.js`]) {
    if (existsSync(candidate)) return candidate.slice(ROOT.length + 1).split('\\').join('/');
  }
  return null;
}

const problems = [];

/**
 * Static ESM imports of a sibling module. tsc does check these for .ts hosts,
 * which is why the scan is limited to the untyped surface (.mjs/.cjs/.js): a
 * hook template importing a name the lib stopped exporting is exactly the bug
 * this file exists to catch. Type-only imports are skipped, and an import of a
 * `./types.js` specifier never resolves because only .mjs/.cjs/.js targets do.
 */
const STATIC_IMPORT_RE = /^[ \t]*import\s+(type\s+)?\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"]/gm;

function checkStaticImports(file, text) {
  for (const m of text.matchAll(STATIC_IMPORT_RE)) {
    if (m[1]) continue;
    const target = m[3];
    const mod = resolveSpec(file, target);
    if (!mod) continue;
    const ex = exportsOf(mod);
    if (!ex) continue;
    for (const raw of m[2].split(',')) {
      // ESM renames with `as` (import { a as b }), unlike object destructuring
      // below that renames with `:`; the imported name is always the left side.
      const original = raw.split(/\s+as\s+/)[0].trim();
      if (!original || original === 'default') continue;
      const line = text.slice(0, m.index).split('\n').length;
      if (!ex.has(original)) problems.push({ file, line, binding: original, module: mod });
    }
  }
}

for (const file of files) {
  const text = readFileSync(join(ROOT, file), 'utf8');
  checkStaticImports(file, text);
  const lines = text.split('\n');
  lines.forEach((line, idx) => {
    const req = /const\s*\{([^}]+)\}\s*=\s*(?:require\(\s*['"]([^'"]+)['"]\s*\)|await\s+import\()/.exec(line);
    if (!req) return;
    const bindings = req[1].split(',').map((b) => b.split(':')[0].trim()).filter(Boolean);
    let target = req[2];
    if (!target) {
      // import() specifiers here are built with nested calls, e.g.
      // await import(pathToFileURL(join(__dirname, "lib", "state-root.mjs")).href)
      // so the whole rest of the line is scanned instead of the call arguments:
      // a real module path is the only quoted fragment carrying an extension,
      // and a bare sibling directory may precede it.
      const rest = line.slice(req.index);
      const frags = [...rest.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
      const mod = frags.find((f) => /\.(mjs|cjs|js)$/.test(f));
      if (mod) {
        const dir = frags.find((f) => f !== mod && /^[A-Za-z0-9_.-]+$/.test(f) && !f.startsWith('.'));
        target = dir && !mod.includes('/') ? `./${dir}/${mod}` : mod.startsWith('.') ? mod : `./${mod}`;
      }
    }
    if (!target) return;
    const mod = resolveSpec(file, target.startsWith('lib/') || target.includes('/') && !target.startsWith('./') ? './' + target : target);
    if (!mod) return;
    const ex = exportsOf(mod);
    if (!ex) return;
    for (const b of bindings) {
      if (b === 'default') continue;
      if (!ex.has(b)) problems.push({ file, line: idx + 1, binding: b, module: mod });
    }
  });
}

const byModule = {};
for (const p of problems) {
  const k = p.module;
  byModule[k] = byModule[k] || { missing: new Set(), sites: [] };
  byModule[k].missing.add(p.binding);
  byModule[k].sites.push(`${p.file}:${p.line}`);
}
console.log(JSON.stringify(Object.entries(byModule).map(([mod, v]) => ({
  module: mod,
  missingExports: [...v.missing],
  sites: v.sites,
})), null, 1));
console.log('TOTAL missing-binding sites:', problems.length);
// Without a non-zero exit this guard is decorative: it is wired into the build
// job, where a reported site has to fail the run.
process.exit(problems.length ? 1 : 0);
