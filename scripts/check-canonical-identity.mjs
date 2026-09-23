#!/usr/bin/env node
/**
 * Guard the repository identity that ships to users.
 *
 * Doc links, update checks and marketplace metadata have previously pointed at
 * organisations that no longer own this repository. Those URLs keep working while
 * GitHub's rename redirect stands, then start serving somebody else's content the
 * moment the old login is re-registered - so the check compares every distribution
 * URL against the owner declared in package.json instead of a hardcoded guess.
 *
 * Provenance references to upstream issues and pull requests (`@see .../issues/1719`)
 * are intentionally allowed: they record where behaviour came from, they are not a
 * source that anything installs or executes.
 *
 * Usage: node scripts/check-canonical-identity.mjs [dir] [--json]
 * Exit 0 = clean, 1 = violations found, 2 = the check itself could not run.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2).filter(a => a !== '--json');
const json = process.argv.includes('--json');
const target = resolve(args[0] ?? repoRoot);

const SKIP_DIRS = new Set(['.git', 'node_modules', 'coverage', '.omq', '.omc', '.qoder']);
const TEXT_EXT = /\.(ts|mjs|cjs|js|md|json|sh|txt|yml|yaml)$/i;

function readPkg(dir) {
  return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
}

/** `git+https://github.com/<owner>/<repo>.git` -> `<owner>/<repo>`. */
function slugFromUrl(url) {
  const m = /github\.com[/:]([^/]+)\/([^/#?]+?)(?:\.git)?(?:[/#?]|$)/.exec(url ?? '');
  return m ? `${m[1].toLowerCase()}/${m[2].toLowerCase()}` : null;
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === '.' || entry === '..') continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walk(full, out);
    } else if (TEXT_EXT.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Test fixtures mock remote URLs with arbitrary owners; they are data, not a source
 * anyone resolves. Note they still ship, because `files` includes `dist`.
 */
function isFixturePath(file) {
  return /__tests__|\.test\./.test(file);
}

function isProvenance(line) {
  return /(issues|pull)\/\d+/.test(line);
}

function main() {
  let pkg;
  try {
    pkg = readPkg(target.startsWith(repoRoot) ? repoRoot : target);
  } catch (error) {
    console.error(`cannot read package.json for ${target}: ${error.message}`);
    return 2;
  }

  const canonical = slugFromUrl(pkg.repository?.url ?? pkg.repository) ?? slugFromUrl(pkg.homepage);
  if (!canonical) {
    console.error('package.json declares no repository/homepage URL to check against');
    return 2;
  }

  const [canonicalOwner, canonicalRepo] = canonical.split('/');
  const urlPattern = new RegExp(
    `(?:github\\.com|raw\\.githubusercontent\\.com)[/:]([A-Za-z0-9._-]+)/${canonicalRepo}`,
    'g',
  );

  const violations = [];
  for (const file of walk(target)) {
    if (isFixturePath(file)) continue;
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!urlPattern.test(line)) continue;
      urlPattern.lastIndex = 0;
      for (const match of line.matchAll(urlPattern)) {
        if (match[1].toLowerCase() === canonicalOwner) continue;
        if (isProvenance(line)) continue;
        violations.push({
          file: relative(target, file).split(sep).join('/'),
          line: i + 1,
          owner: match[1],
          text: line.trim().slice(0, 160),
        });
      }
    }
  }

  if (json) {
    console.log(JSON.stringify({ canonical, checked_root: target, violations }, null, 2));
  } else if (violations.length === 0) {
    console.log(`canonical identity ok: ${canonical} (${walk(target).length} files scanned)`);
  } else {
    console.error(`${violations.length} URL(s) name an owner other than "${canonicalOwner}":`);
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line} -> ${v.owner} :: ${v.text}`);
    }
  }

  return violations.length === 0 ? 0 : 1;
}

process.exit(main());
