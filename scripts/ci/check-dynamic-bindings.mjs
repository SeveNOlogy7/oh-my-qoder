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

function exportsOf(file) {
  let text;
  try {
    text = readFileSync(join(ROOT, file), 'utf8');
  } catch {
    return null;
  }
  const names = new Set();
  for (const m of text.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) names.add(m[1]);
  for (const m of text.matchAll(/export\s+(?:const|let|var|class)\s+(\w+)/g)) names.add(m[1]);
  for (const m of text.matchAll(/exports\.(\w+)\s*=/g)) names.add(m[1]);
  for (const m of text.matchAll(/^\s*(\w+)\s*:\s*(?:function|[A-Za-z_$][\w$]*\s*[,(]?\s*\(?)/gm)) names.add(m[1]);
  const me = /module\.exports\s*=\s*\{([^}]*)\}/.exec(text);
  if (me) for (const part of me[1].split(',')) { const k = part.split(':')[0].trim(); if (/^\w+$/.test(k)) names.add(k); }
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
for (const file of files) {
  const text = readFileSync(join(ROOT, file), 'utf8');
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
