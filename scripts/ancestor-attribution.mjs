#!/usr/bin/env node
/**
 * Four-class file attribution against the ancestor baseline.
 *
 * Classifies every file in a target directory into exactly one of:
 *   ancestor-derived      – same path AND same blob SHA as adoption target (v5.0.0)
 *   omq-patched-ancestor  – same path but different blob SHA (OMQ modified it)
 *   omq-original           – path not in the adoption target; carries lineageSha
 *                            when the path exists in the lineage tree (v4.15.1)
 *   generated              – build artefacts (dist/, bridge/) derived from source
 *
 * The four categories are mutually exclusive and exhaustive over the target
 * directory, so their union == all files in the directory.
 *
 * Usage:
 *   node scripts/ancestor-attribution.mjs [dir] [options]
 *
 * Options:
 *   --check-only   Exit 0 if every file classified, 1 if any unclassified.
 *   --summary      Print only the summary counts to stdout.
 *   --baseline <p> Override path to ANCESTOR_BASELINE.json.
 *   --output <p>   Write classification JSON to this file instead of stdout.
 *
 * Exit codes: 0 = success, 1 = check failed, 2 = setup error.
 *
 * @see ANCESTOR_BASELINE.json
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SKIP_DIRS = new Set([
  '.git', 'node_modules', 'coverage', '.omq', '.omc', '.qoder',
  '.claude', '.tmp-post-tool-use-failure-tests',
]);

const GENERATED_PREFIXES = [
  { prefix: 'dist/', source: 'src/' },
  { prefix: 'bridge/', source: 'scripts/build-*.mjs' },
];

// ---------------------------------------------------------------------------
// Pure helpers (exported for testing)
// ---------------------------------------------------------------------------

/** Compute the git blob SHA-1 for raw file content (Buffer or string). */
export function gitBlobSha(content) {
  const header = `blob ${content.length}\0`;
  const hash = createHash('sha1');
  hash.update(header);
  hash.update(content);
  return hash.digest('hex');
}

/**
 * Deterministic patch identifier for a classified path.
 * Combines the path with the local and ancestor blob SHAs so that every
 * distinct (path, content, ancestor) tuple produces a unique id.
 */
export function patchIdFor(path, localSha, ancestorSha) {
  const h = createHash('sha256');
  h.update(`${path}\0${localSha}\0${ancestorSha}`);
  return h.digest('hex').slice(0, 16);
}

/**
 * Check whether a relative POSIX path falls under a generated prefix.
 * Returns the source description string or null.
 */
function generatedSource(relPath) {
  for (const gen of GENERATED_PREFIXES) {
    if (relPath.startsWith(gen.prefix)) return gen.source;
  }
  return null;
}

/**
 * Pure classification of an array of POSIX paths against dual ancestor trees.
 *
 * @param {string[]} paths  – forward-slash relative paths to classify
 * @param {object}   ctx
 * @param {Map<string,string>} ctx.lineage – Map<path, blobSha> for v4.15.1
 * @param {Map<string,string>} ctx.target  – Map<path, blobSha> for v5.0.0
 * @param {Map<string,string>} ctx.blobShaResolver – Map<path, localBlobSha>
 * @param {object}  [ctx.opts] – reserved for future use
 * @returns {Array<{path:string, class:string, ancestorBlobSha?:string,
 *           lineageSha?:string, patchId?:string, derivedFrom?:string}>}
 */
export function classifyPaths(paths, { lineage, target, blobShaResolver, opts: _opts }) {
  const results = [];

  for (const p of paths) {
    // 1. Generated artefacts
    const genSrc = generatedSource(p);
    if (genSrc) {
      results.push({ path: p, class: 'generated', derivedFrom: genSrc });
      continue;
    }

    // 2. Compare against the adoption target tree (v5.0.0)
    const targetSha = target.get(p);
    const lineageSha = lineage.get(p);
    const localSha = blobShaResolver.get(p);
    // `lineageMatch` answers the question issue #3 actually asks - how much of
    // OMQ is still byte-identical to the v4.15.1 snapshot it was derived from.
    // It cannot be derived later, because the comparison needs the local blob
    // SHA at classification time.
    const lineageMatch = lineageSha === undefined ? undefined : localSha === lineageSha;
    if (targetSha !== undefined) {
      if (localSha === targetSha) {
        results.push({
          path: p,
          class: 'ancestor-derived',
          ancestorBlobSha: targetSha,
          ...(lineageSha !== undefined ? { lineageSha, lineageMatch } : {}),
        });
      } else {
        results.push({
          path: p,
          class: 'omq-patched-ancestor',
          ancestorBlobSha: targetSha,
          patchId: patchIdFor(p, localSha, targetSha),
          ...(lineageSha !== undefined ? { lineageSha, lineageMatch } : {}),
        });
      }
      continue;
    }

    // 3. Not in adoption target - check lineage tree (v4.15.1)
    if (lineageSha !== undefined) {
      results.push({ path: p, class: 'omq-original', lineageSha, lineageMatch });
    } else {
      results.push({ path: p, class: 'omq-original' });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// I/O helpers (not exported – used only by CLI)
// ---------------------------------------------------------------------------

/** Read and parse ANCESTOR_BASELINE.json, validating required fields. */
function loadBaseline(path) {
  if (!existsSync(path)) {
    console.error(`ANCESTOR_BASELINE.json not found at ${path}`);
    return null;
  }
  const data = JSON.parse(readFileSync(path, 'utf8'));
  for (const key of ['lineage', 'adoptionTarget']) {
    if (!data[key]) {
      console.error(`ANCESTOR_BASELINE.json missing required field: ${key}`);
      return null;
    }
    for (const field of ['repo', 'tag', 'treeSha']) {
      if (!data[key][field]) {
        console.error(`ANCESTOR_BASELINE.json ${key} missing required field: ${field}`);
        return null;
      }
    }
  }
  return data;
}

/**
 * Load a cached ancestor tree JSON.
 * Returns Map<posixPath, blobSha>.
 */
function loadTreeCache(baseline, key) {
  const cachePath = resolve(repoRoot, baseline[key].treeCache);
  if (!existsSync(cachePath)) {
    console.error(`Tree cache not found at ${cachePath}`);
    return null;
  }
  const entries = JSON.parse(readFileSync(cachePath, 'utf8'));
  const map = new Map();
  for (const entry of entries) {
    map.set(entry.path, entry.sha);
  }
  return map;
}

/** Recursively walk a directory, returning POSIX paths relative to `root`. */
function walk(root, dir = root, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === '.' || entry === '..' || entry === '.git') continue;
    const full = join(dir, entry);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walk(root, full, out);
    } else {
      out.push(relative(root, full).split(sep).join('/'));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// CLI entry point (runs only when executed directly)
// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check-only');
  const summaryOnly = args.includes('--summary');

  function argValue(name) {
    const idx = args.indexOf(name);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
  }

  const positional = args.find(a =>
    !a.startsWith('--') && a !== argValue('--baseline') && a !== argValue('--output'),
  );
  const targetDir = resolve(positional ?? repoRoot);
  const baselinePath = resolve(argValue('--baseline') ?? join(repoRoot, 'ANCESTOR_BASELINE.json'));
  const outputPath = argValue('--output');

  // 1. Load baseline
  const baseline = loadBaseline(baselinePath);
  if (!baseline) return 2;

  // 2. Load both tree caches
  const lineage = loadTreeCache(baseline, 'lineage');
  if (!lineage) return 2;
  const target = loadTreeCache(baseline, 'adoptionTarget');
  if (!target) return 2;

  // 3. Walk target directory and compute local blob SHAs
  const allPaths = walk(targetDir);
  const blobShaResolver = new Map();
  // Ancestor blob SHAs come from git objects, which store text normalised to
  // LF. A working tree checked out with core.autocrlf has CRLF on disk, and
  // hashing those raw bytes makes every shared file look modified (measured:
  // 0 identical instead of 382). Normalise before hashing so the comparison
  // means "same content", not "same checkout".
  for (const p of allPaths) {
    try {
      let content = readFileSync(join(targetDir, p));
      if (content.includes(13)) {
        content = Buffer.from(content.toString('binary').replace(/\r\n/g, '\n'), 'binary');
      }
      blobShaResolver.set(p, gitBlobSha(content));
    } catch {
      // unreadable – leave unmapped; classifyPaths will still categorise it
    }
  }

  // 4. Classify
  const entries = classifyPaths(allPaths, { lineage, target, blobShaResolver });

  // 5. Build summary
  const counts = {
    'ancestor-derived': 0,
    'omq-patched-ancestor': 0,
    'omq-original': 0,
    'generated': 0,
  };
  for (const e of entries) counts[e.class]++;

  const lineageCoverage = {
    presentInLineage: entries.filter(e => e.lineageSha !== undefined).length,
    identicalToLineage: entries.filter(e => e.lineageMatch === true).length,
    absentFromLineage: entries.filter(e => e.lineageSha === undefined).length,
  };

  const summary = {
    ...counts,
    total: allPaths.length,
    classified: entries.length,
    unclassified: allPaths.length - entries.length,
    lineageCoverage,
  };

  // 6. Output
  if (checkOnly) {
    if (summary.unclassified > 0) {
      console.error(`CHECK FAILED: ${summary.unclassified} unclassified file(s)`);
      return 1;
    }
    console.log(`attribution check ok: ${summary.total} files classified into 4 categories`);
    console.log(`  ancestor-derived:      ${counts['ancestor-derived']}`);
    console.log(`  omq-patched-ancestor:  ${counts['omq-patched-ancestor']}`);
    console.log(`  omq-original:          ${counts['omq-original']}`);
    console.log(`  generated:             ${counts['generated']}`);
    console.log(`  lineage identical:     ${lineageCoverage.identicalToLineage}` +
      ` / ${allPaths.length} (present in lineage: ${lineageCoverage.presentInLineage})`);
    return 0;
  }

  const result = {
    schemaVersion: 1,
    lineageTag: baseline.lineage.tag,
    lineageTreeSha: baseline.lineage.treeSha,
    targetTag: baseline.adoptionTarget.tag,
    targetTreeSha: baseline.adoptionTarget.treeSha,
    generatedAt: new Date().toISOString(),
    counts,
    lineageCoverage,
    entries,
  };

  const json = JSON.stringify(result, null, 2);

  if (outputPath) {
    writeFileSync(resolve(outputPath), json + '\n');
    console.log(`Classification written to ${outputPath}`);
  } else if (summaryOnly) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(json);
  }

  return 0;
}

const isMain = process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().then(code => process.exit(code));
}
