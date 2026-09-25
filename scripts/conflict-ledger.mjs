#!/usr/bin/env node
/**
 * Conflict ledger generator for ancestor baseline migration.
 *
 * Identifies files that need manual attention when migrating from ancestor
 * v4.15.1 (lineage) to v5.0.0 (adoption target). Classifies conflicts into:
 *
 * - three-way: OMQ modified, upstream also modified (needs manual merge)
 * - omq-only: OMQ modified, upstream unchanged (can cherry-pick)
 * - upstream-only: OMQ unchanged, upstream modified (can fast-forward)
 * - deleted: Upstream deleted the file (needs decision)
 *
 * Usage:
 *   node scripts/conflict-ledger.mjs [options]
 *
 * Options:
 *   --json           Output full ledger as JSON (default)
 *   --summary        Output only counts
 *   --filter <dir>   Only include files under this directory (e.g., src/)
 *   --output <path>  Write ledger to file instead of stdout
 *   --baseline <p>   Override path to ANCESTOR_BASELINE.json
 *
 * @see ANCESTOR_BASELINE.json
 * @see docs/ANCESTOR-CONFLICTS.md
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

const GENERATED_PREFIXES = ['dist/', 'bridge/'];

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
 * Check whether a path is a generated artifact.
 */
export function isGenerated(path) {
  return GENERATED_PREFIXES.some(prefix => path.startsWith(prefix));
}

/**
 * Classify a single file into a conflict category.
 *
 * @param {string} path - Relative file path
 * @param {object} ctx
 * @param {string|null} ctx.lineageSha - Blob SHA in v4.15.1 (null if absent)
 * @param {string|null} ctx.targetSha - Blob SHA in v5.0.0 (null if absent)
 * @param {string|null} ctx.localSha - Blob SHA in OMQ (null if unreadable)
 * @returns {object} Classification result
 */
export function classifyConflict(path, { lineageSha, targetSha, localSha }) {
  // Generated artifacts are not conflicts
  if (isGenerated(path)) {
    return { path, category: 'generated', action: 'skip' };
  }

  const inLineage = lineageSha !== null;
  const inTarget = targetSha !== null;
  const inLocal = localSha !== null;

  // File deleted upstream (in v4.15.1 but not in v5.0.0)
  if (inLineage && !inTarget && inLocal) {
    const omqChanged = localSha !== lineageSha;
    return {
      path,
      category: 'upstream-deleted',
      action: omqChanged ? 'decide-restore-or-drop' : 'accept-deletion',
      lineageSha,
      localSha,
      omqChanged,
    };
  }

  // File new in v5.0.0 (not in v4.15.1, not in OMQ)
  if (!inLineage && inTarget && !inLocal) {
    return {
      path,
      category: 'upstream-new',
      action: 'review-and-adopt',
      targetSha,
    };
  }

  // File exists in both OMQ and v5.0.0
  if (inTarget && inLocal) {
    const omqMatchesTarget = localSha === targetSha;
    const upstreamChanged = inLineage && lineageSha !== targetSha;
    const omqChanged = inLineage && localSha !== lineageSha;

    // Already aligned with v5.0.0
    if (omqMatchesTarget) {
      return {
        path,
        category: 'aligned',
        action: 'none',
        targetSha,
        ...(inLineage ? { lineageSha } : {}),
      };
    }

    // Three-way conflict: both OMQ and upstream changed
    if (upstreamChanged && omqChanged) {
      return {
        path,
        category: 'three-way',
        action: 'manual-merge-required',
        lineageSha,
        targetSha,
        localSha,
      };
    }

    // OMQ-only change: upstream didn't modify
    if (omqChanged && !upstreamChanged) {
      return {
        path,
        category: 'omq-only',
        action: 'cherry-pick-to-v5',
        lineageSha,
        targetSha,
        localSha,
      };
    }

    // Upstream-only change: OMQ didn't modify
    if (!omqChanged && upstreamChanged) {
      return {
        path,
        category: 'upstream-only',
        action: 'fast-forward-to-v5',
        lineageSha,
        targetSha,
        localSha,
      };
    }

    // Edge case: in v5.0.0 and OMQ but not in v4.15.1
    if (!inLineage) {
      return {
        path,
        category: 'new-conflict',
        action: 'review-both-versions',
        targetSha,
        localSha,
      };
    }
  }

  // OMQ-original: file exists in OMQ but not in v5.0.0
  if (!inTarget && inLocal) {
    const inLineageTree = inLineage;
    return {
      path,
      category: 'omq-original',
      action: 'keep-as-omq-specific',
      localSha,
      ...(inLineageTree ? { lineageSha } : {}),
    };
  }

  // Fallback (should not happen with complete data)
  return { path, category: 'unclassified', action: 'investigate' };
}

/**
 * Build the full conflict ledger for all files in a directory.
 *
 * @param {string[]} paths - Array of relative file paths
 * @param {object} ctx
 * @param {Map<string,string>} ctx.lineage - Map<path, blobSha> for v4.15.1
 * @param {Map<string,string>} ctx.target - Map<path, blobSha> for v5.0.0
 * @param {Map<string,string>} ctx.local - Map<path, blobSha> for OMQ
 * @returns {object[]} Array of classification results
 */
export function buildLedger(paths, { lineage, target, local }) {
  const ledger = [];

  for (const path of paths) {
    const lineageSha = lineage.get(path) || null;
    const targetSha = target.get(path) || null;
    const localSha = local.get(path) || null;

    const classification = classifyConflict(path, { lineageSha, targetSha, localSha });
    ledger.push(classification);
  }

  return ledger;
}

/**
 * Compute summary counts from a ledger.
 */
export function summarizeLedger(ledger) {
  const counts = {
    'three-way': 0,
    'omq-only': 0,
    'upstream-only': 0,
    'upstream-deleted': 0,
    'upstream-new': 0,
    'aligned': 0,
    'omq-original': 0,
    'generated': 0,
    'new-conflict': 0,
    'unclassified': 0,
  };

  for (const entry of ledger) {
    if (counts[entry.category] !== undefined) {
      counts[entry.category]++;
    }
  }

  const actionable = counts['three-way'] +
    counts['omq-only'] +
    counts['upstream-only'] +
    counts['upstream-deleted'] +
    counts['new-conflict'];

  return {
    ...counts,
    total: ledger.length,
    actionable,
    nonActionable: ledger.length - actionable,
  };
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

/**
 * Compute local blob SHAs for all files in a directory.
 * Normalizes CRLF to LF before hashing.
 */
function computeLocalShas(paths, rootDir) {
  const map = new Map();
  for (const p of paths) {
    try {
      let content = readFileSync(join(rootDir, p));
      // Normalize CRLF to LF for consistent hashing
      if (content.includes(13)) {
        content = Buffer.from(content.toString('binary').replace(/\r\n/g, '\n'), 'binary');
      }
      map.set(p, gitBlobSha(content));
    } catch {
      // unreadable – leave unmapped
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// CLI entry point (runs only when executed directly)
// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const summaryOnly = args.includes('--summary');
  
  function argValue(name) {
    const idx = args.indexOf(name);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
  }
  
  const filterDir = argValue('--filter');
  const outputPath = argValue('--output');
  const baselinePath = resolve(argValue('--baseline') ?? join(repoRoot, 'ANCESTOR_BASELINE.json'));

  // 1. Load baseline
  const baseline = loadBaseline(baselinePath);
  if (!baseline) return 2;

  // 2. Load both tree caches
  const lineage = loadTreeCache(baseline, 'lineage');
  if (!lineage) return 2;
  const target = loadTreeCache(baseline, 'adoptionTarget');
  if (!target) return 2;

  // 3. Walk target directory and compute local blob SHAs
  const targetDir = repoRoot;
  let allPaths = walk(targetDir);

  // Apply filter if specified
  if (filterDir) {
    allPaths = allPaths.filter(p => p.startsWith(filterDir));
  }

  const local = computeLocalShas(allPaths, targetDir);

  // 4. Build ledger
  const ledger = buildLedger(allPaths, { lineage, target, local });

  // 5. Compute summary
  const summary = summarizeLedger(ledger);

  // 6. Output
  const result = {
    schemaVersion: 1,
    lineageTag: baseline.lineage.tag,
    targetTag: baseline.adoptionTarget.tag,
    generatedAt: new Date().toISOString(),
    filter: filterDir,
    summary,
    entries: ledger,
  };

  const json = JSON.stringify(result, null, 2);

  if (outputPath) {
    writeFileSync(resolve(outputPath), json + '\n');
    console.log(`Conflict ledger written to ${outputPath}`);
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
