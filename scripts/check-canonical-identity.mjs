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
 * Usage: node scripts/check-canonical-identity.mjs [dir] [--json] [--require-attribution]
 * Exit 0 = clean, 1 = violations found, 2 = the check itself could not run.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2).filter(a => a !== '--json' && a !== '--require-attribution');
const json = process.argv.includes('--json');
const requireAttribution = process.argv.includes('--require-attribution');
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

/* ------------------------------------------------------------------
 * Ancestor provenance rule (path-level coverage).
 *
 * The identity rule above guards OMQ's own URLs. A separate concern is
 * whether files derived from the ancestor project (Yeachan-Heo/oh-my-claudecode)
 * carry proper attribution. ATTRIBUTION.json, when present, must classify
 * EVERY scanned path under the target with a valid class.
 *
 * Contract: { schemaVersion: 1, entries: [{ path, class, ancestorBlobSha?,
 *            patchId?, lineageSha? }] }
 * Valid classes: "ancestor-derived" | "omq-patched-ancestor" |
 *                "omq-original" | "generated"
 * "omq-patched-ancestor" entries MUST include ancestorBlobSha and patchId.
 *
 * This rule does NOT reuse isFixturePath or isProvenance. Ancestor
 * attribution most often appears on lines that mention issue/PR numbers
 * (which isProvenance would silence) and can appear in test fixtures
 * (which isFixturePath would skip). Skipping those would defeat the gate.
 *
 * --require-attribution: fail closed when ATTRIBUTION.json is missing.
 *   CI and release builds use this to guarantee every shipped path is
 *   accounted for before publishing.
 * Without the flag: lenient — a bare local checkout (before the attribution
 *   generator has run) still passes the gate. This split exists so that
 *   developers cloning the repo for the first time are not blocked by a
 *   manifest that is generated as part of the release pipeline.
 * ------------------------------------------------------------------ */
const VALID_ATTRIBUTION_CLASSES = new Set([
  'ancestor-derived',
  'omq-patched-ancestor',
  'omq-original',
  'generated',
]);
const PROVENANCE_LIST_CAP = 20;

function checkAncestorProvenance(target, allFiles, requireAttribution) {
  let attribution;
  try {
    attribution = JSON.parse(readFileSync(join(target, 'ATTRIBUTION.json'), 'utf8'));
  } catch {
    // ATTRIBUTION.json not yet generated.
    // Without --require-attribution we stay lenient so a bare local checkout
    // still passes. With --require-attribution CI/release builds fail closed.
    if (requireAttribution) {
      return [{ file: '(ATTRIBUTION.json)', reason: 'ATTRIBUTION.json is missing and --require-attribution is set' }];
    }
    return [];
  }

  const violations = [];

  // Validate contract shape exactly.
  if (attribution.schemaVersion !== 1) {
    return [{ file: '(ATTRIBUTION.json)', reason: `schemaVersion must be 1, got ${JSON.stringify(attribution.schemaVersion)}` }];
  }
  if (!Array.isArray(attribution.entries)) {
    return [{ file: '(ATTRIBUTION.json)', reason: 'entries must be an array' }];
  }

  // Build set of known paths from entries, normalising backslashes.
  const knownPaths = new Set();
  for (const entry of attribution.entries) {
    if (!entry.path || typeof entry.path !== 'string') {
      violations.push({ file: '(ATTRIBUTION.json)', reason: `entry with invalid/missing path: ${JSON.stringify(entry)}` });
      continue;
    }
    const normPath = entry.path.replace(/[\\/]/g, '/');
    knownPaths.add(normPath);

    if (!VALID_ATTRIBUTION_CLASSES.has(entry.class)) {
      violations.push({ file: normPath, reason: `invalid class "${entry.class}"` });
      continue;
    }

    // omq-patched-ancestor must carry ancestorBlobSha and patchId.
    if (entry.class === 'omq-patched-ancestor') {
      if (!entry.ancestorBlobSha || !entry.patchId) {
        violations.push({
          file: normPath,
          reason: 'omq-patched-ancestor entry missing ancestorBlobSha or patchId',
        });
      }
    }
  }

  // Path coverage: every scanned file must appear in ATTRIBUTION.json.
  const unlisted = [];
  for (const file of allFiles) {
    const relPath = relative(target, file).split(sep).join('/');
    if (relPath === 'ATTRIBUTION.json') continue;
    if (!knownPaths.has(relPath)) {
      unlisted.push(relPath);
    }
  }

  for (let i = 0; i < Math.min(unlisted.length, PROVENANCE_LIST_CAP); i++) {
    violations.push({ file: unlisted[i], reason: 'not listed in ATTRIBUTION.json' });
  }
  if (unlisted.length > PROVENANCE_LIST_CAP) {
    violations.push({
      file: `... and ${unlisted.length - PROVENANCE_LIST_CAP} more`,
      reason: 'not listed in ATTRIBUTION.json',
    });
  }

  return violations;
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
  const allFiles = walk(target);
  for (const file of allFiles) {
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

  // Ancestor provenance: path-level coverage, NOT silenced by isFixturePath/isProvenance.
  const provenanceViolations = checkAncestorProvenance(target, allFiles, requireAttribution);

  if (json) {
    console.log(JSON.stringify({ canonical, checked_root: target, violations, provenance: provenanceViolations }, null, 2));
  } else if (violations.length === 0 && provenanceViolations.length === 0) {
    console.log(`canonical identity ok: ${canonical} (${allFiles.length} files scanned)`);
  } else {
    if (violations.length > 0) {
      console.error(`${violations.length} URL(s) name an owner other than "${canonicalOwner}":`);
      for (const v of violations) {
        console.error(`  ${v.file}:${v.line} -> ${v.owner} :: ${v.text}`);
      }
    }
    if (provenanceViolations.length > 0) {
      console.error(`${provenanceViolations.length} provenance violation(s):`);
      for (const v of provenanceViolations) {
        console.error(`  ${v.file}: ${v.reason}`);
      }
    }
  }

  return (violations.length === 0 && provenanceViolations.length === 0) ? 0 : 1;
}

process.exit(main());
