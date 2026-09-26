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
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SKIP_DIRS = new Set([
  '.git', 'node_modules', 'coverage', '.omq', '.omq', '.qoder',
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
// Patch layer: OMQ's own commits measured against the ancestor hop
// ---------------------------------------------------------------------------
//
// `buildLedger` answers "how does the whole tree relate to v5.0.0?".  It cannot
// answer the question M1 actually has to be gated on: which files does **OMQ's
// own work** touch, and of those, which ones does the ancestor hop also touch?
// Those are the only paths where adopting the new tree can silently delete a
// local fix, so they are enumerated from git history rather than inferred.

/** What the ancestor hop (lineage -> target) did to a path. */
export function hopVerdict(path, { lineage, target }) {
  const inLineage = lineage.has(path);
  const inTarget = target.has(path);
  if (inLineage && inTarget) {
    return lineage.get(path) === target.get(path) ? 'unchanged' : 'modified';
  }
  if (inTarget) return 'added';
  if (inLineage) return 'deleted';
  return 'absent';
}

/**
 * Which of M1's two exit-criterion classes a colliding path falls into.
 *
 * - `test-surface`: the path *is* a test; upstream rewrote the same test, so the
 *   work is merging assertions, not proving behaviour.
 * - `structural`: prose / manifest / lockfile; no trustworthy behavioural test
 *   exists, so the plan requires a structural assertion instead of a fake one.
 * - `assertable`: real code, and a carrier is only meaningful once a test that
 *   actually goes red without the patch has been named.
 */
export function patchLayerClass(path) {
  if (/\.test\.tsx?$/.test(path) || path.includes('__tests__/')) return 'test-surface';
  if (path === 'package.json' || path === 'package-lock.json' || path.endsWith('.md')) return 'structural';
  return 'assertable';
}

/**
 * The structural check that guards a class-2 row.
 *
 * Prose, manifests and lockfiles have no honest behavioural test, but "no test"
 * must not become "no gate": each of these rows names the check that would fail
 * if the file's contract drifted, so the table accounts for all 29 rows.
 */
export function structuralCheck(path) {
  if (/\.test\.tsx?$/.test(path) || path.includes('__tests__/')) {
    // A merged test that silently stops asserting is caught by the suite-delta
    // gate: a baseline entry that no longer fails is itself a failure.
    return 'scripts/known-failures.mjs --check (CI test job)';
  }
  if (path === 'package.json' || path === 'package-lock.json') return 'src/__tests__/metadata-contracts.test.ts';
  if (path.startsWith('skills/')) return 'src/skills/__tests__/skill-config-dir.test.ts';
  if (path === '.qoder-plugin/plugin.json') return 'src/__tests__/metadata-contracts.test.ts';
  if (path.endsWith('.md')) return 'scripts/check-canonical-identity.mjs (CI provenance job)';
  return null;
}

/**
 * Name the observation that would catch the loss of OMQ's patch to `path`.
 *
 * Rules are tried strongest-first and the winning rule is recorded, so a reader
 * can tell a conventionally-placed test apart from a grep hit, and a row with no
 * observation is visibly a gap rather than an oversight.
 *
 * @param {string} path
 * @param {object} ctx
 * @param {Set<string>} ctx.testFiles - every test file in the tree
 * @param {Map<string,string>} ctx.testBodies - test file -> content
 * @param {string[]} [ctx.coChangedTests] - tests touched by the same commits
 * @returns {{observation: string|null, rule: string, candidates: number}}
 */
export function pickObservation(path, { testFiles, testBodies, coChangedTests = [] }) {
  if (patchLayerClass(path) !== 'assertable') {
    return { observation: null, rule: 'not-assertable', candidates: 0, alternates: [] };
  }

  const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '.';
  const base = path.replace(/\.[^.]+$/, '').split('/').pop();
  const moduleDir = dir === '.' ? '' : dir;
  const coChanged = new Set(coChangedTests);

  // A test that mentions "<parent dir>/<module>" is reading the real import
  // specifier ("../../utils/paths"); the bare basename is far too common to use.
  const specifier = dir === '.' ? base : `${dir.split('/').pop()}/${base}`;
  const score = (testFile) => {
    const testBase = testFile.replace(/\.[^.]+$/, '').split('/').pop();
    const testDir = testFile.includes('/') ? testFile.slice(0, testFile.lastIndexOf('/')) : '';
    let s = 0;
    if (testBase === base) s += 8;
    else if (testBase.includes(base)) s += 1;
    // A test living next to the module (or in its __tests__) is usually its suite.
    if (moduleDir && (testDir === `${moduleDir}/__tests__` || testDir === moduleDir)) s += 4;
    if (coChanged.has(testFile)) s += 2;
    return s;
  };
  // No cap on candidates: a lane that stops measuring at the eighth reference
  // silently reports INVALID for a patch whose guard sits at number nine.
  const referencing = [...testBodies.entries()]
    .filter(([file, body]) => file !== path && body.includes(specifier))
    .map(([file]) => file)
    .sort((a, b) => score(b) - score(a) || a.localeCompare(b));

  const conventional = [
    `${dir}/__tests__/${base}.test.ts`,
    `${dir}/__tests__/${base}.test.tsx`,
    `${dir}/${base}.test.ts`,
  ].find((candidate) => testFiles.has(candidate));
  if (conventional) {
    return {
      observation: conventional,
      rule: 'conventional',
      candidates: 1,
      alternates: referencing.filter((file) => file !== conventional),
    };
  }
  if (referencing.length) {
    const observation = referencing[0];
    return {
      observation,
      rule: coChanged.has(observation) ? 'reference-and-co-changed' : 'reference',
      candidates: referencing.length,
      alternates: referencing.slice(1),
    };
  }
  return { observation: null, rule: 'none', candidates: 0, alternates: [] };
}

/**
 * Build the M1 collision table: patch-layer paths the ancestor hop also touched.
 *
 * @param {string[]} patchPaths - files changed by OMQ's own commits
 * @param {object} ctx
 * @param {Map<string,string>} ctx.lineage - v4.15.1 path -> blob sha
 * @param {Map<string,string>} ctx.target - v5.0.0 path -> blob sha
 * @param {Map<string,string[]>} ctx.commitsByPath - OMQ commits per path, newest first
 * @param {Map<string,string[]>} ctx.coChangedByPath - test files touched by those commits
 * @param {Set<string>} ctx.testFiles
 * @param {Map<string,string>} ctx.testBodies
 */
export function buildPatchLayerRows(patchPaths, ctx) {
  const rows = [];
  for (const path of patchPaths) {
    const hop = hopVerdict(path, ctx);
    if (hop === 'unchanged' || hop === 'absent') continue;
    const commits = ctx.commitsByPath.get(path) ?? [];
    const klass = patchLayerClass(path);
    const { observation, rule, candidates, alternates } = pickObservation(path, {
      testFiles: ctx.testFiles,
      testBodies: ctx.testBodies,
      coChangedTests: ctx.coChangedByPath.get(path),
    });
    rows.push({
      path,
      hop,
      class: klass,
      omqCommits: commits.length,
      revertTo: commits.length ? `${commits[commits.length - 1]}^` : null,
      observation,
      observationRule: rule,
      observationCandidates: candidates,
      observationAlternates: alternates,
      structuralCheck: klass === 'assertable' ? null : structuralCheck(path),
      carrier: klass === 'assertable' ? (ctx.carrierByLane?.get(laneNameFor(path))?.verdict ?? 'missing') : null,
      verifiedObservation: klass === 'assertable' ? (ctx.carrierByLane?.get(laneNameFor(path))?.verifiedObservation ?? null) : null,
    });
  }
  const order = { assertable: 0, 'test-surface': 1, structural: 2 };
  return rows.sort((a, b) => (order[a.class] - order[b.class]) || a.path.localeCompare(b.path));
}

/** Counts the collision table needs to be read at a glance. */
export function summarizePatchLayer(rows) {
  const counts = { assertable: 0, 'test-surface': 0, structural: 0 };
  const hopCounts = { modified: 0, added: 0, deleted: 0 };
  const carriers = { VALID: 0, INVALID: 0, INCONCLUSIVE: 0, missing: 0 };
  let withObservation = 0;
  let unguarded = 0;
  for (const row of rows) {
    counts[row.class] = (counts[row.class] ?? 0) + 1;
    hopCounts[row.hop] = (hopCounts[row.hop] ?? 0) + 1;
    if (row.observation) withObservation++;
    if (row.class === 'assertable') carriers[row.carrier ?? 'missing'] = (carriers[row.carrier ?? 'missing'] ?? 0) + 1;
    if (row.class !== 'assertable' && !row.structuralCheck) unguarded++;
  }
  return {
    total: rows.length,
    ...counts,
    ...Object.fromEntries(Object.entries(hopCounts).map(([k, v]) => [`hop_${k}`, v])),
    withObservation,
    missingObservation: counts.assertable - withObservation,
    unguardedStructural: unguarded,
    carriers,
  };
}

/** Stable lane id for a path: `src/utils/paths.ts` -> `src-utils-paths-ts`. */
export function laneNameFor(path) {
  return path.replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-+|-+$/g, '');
}

/**
 * Read the verdict out of a carrier file.
 *
 * The carrier is written by `scripts/negative-control.mjs`, so reporting it here
 * makes the committed table a statement about measured evidence rather than a
 * claim about intent.  A lane with no carrier is `missing`, not blank.
 */
export function parseCarrier(text) {
  if (typeof text !== 'string') return null;
  const raw = text.match(/^\*\*(VALID|INVALID[^*]*|INCONCLUSIVE[^*]*)\*\*/m)?.[1];
  const verified = text.match(/^- \*\*Verified observation\*\*: (.+)$/m)?.[1]?.trim();
  return {
    verdict: raw ? raw.split(':')[0].trim() : null,
    verifiedObservation: verified && verified !== 'none' ? verified : null,
  };
}

/**
 * Rows for paths the baseline declares load-bearing even though OMQ's own
 * commits never touch them.  Without this, a file like `docs/CLAUDE.md` — whose
 * shipped text is OMQ's, not the ancestor's — is invisible to the collision
 * table, because the collision table only intersects patch-layer commits.
 *
 * Paths already reported as collisions are skipped so nothing is listed twice.
 */
export function buildWatchRows(watchPaths, { lineage, target, collisionPaths, localBlobByPath }) {
  const rows = [];
  for (const entry of watchPaths ?? []) {
    if (collisionPaths.has(entry.path)) continue;
    const hop = hopVerdict(entry.path, { lineage, target });
    if (hop === 'unchanged' || hop === 'absent') continue;
    const local = localBlobByPath.get(entry.path) ?? null;
    rows.push({
      path: entry.path,
      why: entry.why ?? '',
      hop,
      matchesLineage: local !== null && lineage.get(entry.path) === local,
      matchesTarget: local !== null && target.get(entry.path) === local,
    });
  }
  return rows;
}

/**
 * Render the collision table as markdown.  Deliberately contains no
 * generation timestamp: the output is committed, so it must be byte-stable.
 */
export function renderPatchLayerMarkdown({ baseCommit, lineageTag, targetTag, rows, summary, watchRows = [] }) {
  const label = {
    assertable: 'Assertable (M1 class \u2460: needs a negative-control carrier)',
    'test-surface': 'Test surface (M1 class \u2461: merge the assertions)',
    structural: 'Structural (M1 class \u2461: structural assertion, no fake test)',
  };
  const lines = [
    '# Patch-Layer Collisions',
    '',
    'Paths that **OMQ\'s own commits** change *and* the ancestor hop `' + lineageTag + '` -> `' + targetTag + '` also changes.',
    'Losing one of these during adoption is a silent regression, which is why this table is generated',
    'from `git log ' + baseCommit + '..HEAD` intersected with the two cached ancestor trees -- not written by hand.',
    '',
    '| | |',
    '|---|---|',
    `| Colliding paths | ${summary.total} |`,
    `| Assertable / test-surface / structural | ${summary.assertable} / ${summary['test-surface']} / ${summary.structural} |`,
    `| Hop modified / added / deleted | ${summary.hop_modified} / ${summary.hop_added} / ${summary.hop_deleted} |`,
    `| Assertable rows with a named observation | ${summary.withObservation} of ${summary.assertable} |`,
    `| Carriers: VALID / INVALID / INCONCLUSIVE / missing | ${summary.carriers.VALID} / ${summary.carriers.INVALID} / ${summary.carriers.INCONCLUSIVE} / ${summary.carriers.missing} |`,
    `| Class-2 rows without a named structural guard | ${summary.unguardedStructural} of ${summary['test-surface'] + summary.structural} |`,
    '',
    'The `un-patch` column is the commit whose parent still has OMQ\'s patch absent; reverting the file to',
    'that parent is what a negative-control lane does. `obs. rule` records *how* the observation was found',
    '(`conventional` = sibling test by naming convention, `reference-and-co-changed` = a test that both',
    'mentions the module and was edited by the same commit, `reference` = mentions the module).',
    '',
    '`carrier` is read back out of `docs/negative-control/<lane>.txt`: **VALID** means the un-patch made a',
    'real test fail, INVALID means every named candidate stayed green (the patch has no coverage),',
    'INCONCLUSIVE means no candidate was even green at HEAD, and `missing` means the lane has never been',
    'measured. `verified via` names the test that actually bit, which is not always the one the rules picked.',
    '',
    '`structural guard` (class-2 rows) names the check that file depends on instead of a behavioural test:',
    'the metadata contracts suite, the SKILL.md config-root guard, or the identity gate CI runs over the',
    'payload. A row reading **none - gap** is work M1 has not finished.',
    '',
  ];
  for (const klass of ['assertable', 'test-surface', 'structural']) {
    const group = rows.filter((row) => row.class === klass);
    lines.push(`## ${label[klass]} - ${group.length}`);
    lines.push('');
    if (!group.length) {
      lines.push('_none_');
      lines.push('');
      continue;
    }
    const withCarrier = klass === 'assertable';
    lines.push(withCarrier
      ? '| path | hop | commits | un-patch | observation | obs. rule | cands | carrier | verified via |'
      : '| path | hop | commits | un-patch | structural guard |');
    lines.push(withCarrier ? '|---|---|---|---|---|---|---|---|---|' : '|---|---|---|---|---|');
    for (const row of group) {
      const head = `| \`${row.path}\` | ${row.hop} | ${row.omqCommits} | \`${row.revertTo ?? '-'}\` |`;
      if (!withCarrier) {
        // A class-2 row still needs a named gate, or "no fake test" becomes "no test".
        lines.push(`${head} ${row.structuralCheck ? `\`${row.structuralCheck}\`` : '**none - gap**'} |`);
        continue;
      }
      lines.push(
        `${head} ${row.observation ? `\`${row.observation}\`` : '**none - gap**'} | ` +
        `${row.observationRule} | ${row.observationCandidates} | ` +
        `${row.carrier === 'VALID' ? '**VALID**' : row.carrier ?? '-'} | ` +
        `${row.verifiedObservation ? `\`${row.verifiedObservation}\`` : '-'} |`,
      );
    }
    lines.push('');
  }
  if (watchRows.length) {
    lines.push('## Declared watch paths - ' + watchRows.length);
    lines.push('');
    lines.push('Paths the baseline declares load-bearing (`patchLayer.watchPaths`) that OMQ\'s own commits');
    lines.push('never touched, so they cannot appear as collisions -- yet the hop still changes them.');
    lines.push('A row that matches neither ancestor blob holds **OMQ\'s own text**: adopting the hop');
    lines.push('overwrites it, and no patch-layer check will notice.');
    lines.push('');
    lines.push('| path | hop | == ' + lineageTag + ' | == ' + targetTag + ' | why |');
    lines.push('|---|---|---|---|---|');
    for (const row of watchRows) {
      lines.push(
        `| ${row.path} | ${row.hop} | ${row.matchesLineage ? 'yes' : 'no'} | ` +
        `${row.matchesTarget ? 'yes' : 'no'} | ${row.why} |`,
      );
    }
    lines.push('');
  }
  lines.push('## Regenerate');
  lines.push('');
  lines.push('```bash');
  lines.push('node scripts/conflict-ledger.mjs --patch-layer --output docs/ANCESTOR-PATCH-LAYER.md');
  lines.push('```');
  lines.push('');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// I/O helpers (not exported – used only by CLI)
// ---------------------------------------------------------------------------

/** Run git and return stdout trimmed. */
function git(args, cwd = repoRoot) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
}

/** Paths changed between two revisions. */
function changedPaths(range, cwd) {
  return git(['diff', '--name-only', range], cwd).split('\n').filter(Boolean);
}

/** Short SHAs of commits in `range` that touched `path`, newest first. */
function commitsForPath(range, path, cwd) {
  return git(['log', '--format=%h', range, '--', path], cwd).split('\n').filter(Boolean);
}

/** Files touched by a commit (its whole diff), for spotting co-changed tests. */
function filesInCommit(sha, cwd) {
  return git(['show', '--name-only', '--format=', sha], cwd).split('\n').filter(Boolean);
}

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

/** Collect the evidence the collision table is built from, straight from git. */
function collectPatchLayerEvidence(baseCommit) {
  const range = `${baseCommit}..HEAD`;
  const patchPaths = changedPaths(range);

  const testFiles = new Set();
  const testBodies = new Map();
  for (const p of walk(repoRoot)) {
    if (!/\.test\.tsx?$/.test(p)) continue;
    testFiles.add(p);
    try {
      testBodies.set(p, readFileSync(join(repoRoot, p), 'utf8'));
    } catch {
      testBodies.set(p, '');
    }
  }

  const filesByCommit = new Map();
  const commitsByPath = new Map();
  const coChangedByPath = new Map();
  for (const p of patchPaths) {
    const commits = commitsForPath(range, p);
    commitsByPath.set(p, commits);
    const coChanged = new Set();
    for (const c of commits) {
      if (!filesByCommit.has(c)) filesByCommit.set(c, filesInCommit(c));
      for (const f of filesByCommit.get(c)) {
        if (testFiles.has(f) && f !== p) coChanged.add(f);
      }
    }
    coChangedByPath.set(p, [...coChanged].sort());
  }

  return { patchPaths, testFiles, testBodies, commitsByPath, coChangedByPath };
}

function runPatchLayer({ baseline, lineage, target, outputPath, asJson }) {
  const baseCommit = baseline.patchLayer?.baseCommit;
  if (!baseCommit) {
    console.error('ANCESTOR_BASELINE.json missing required field: patchLayer.baseCommit');
    return 2;
  }

  const evidence = collectPatchLayerEvidence(baseCommit);
  const carrierByLane = new Map();
  const carrierDir = join(repoRoot, 'docs', 'negative-control');
  for (const p of evidence.patchPaths) {
    const lane = laneNameFor(p);
    const file = join(carrierDir, `${lane}.txt`);
    if (!existsSync(file)) continue;
    const parsed = parseCarrier(readFileSync(file, 'utf8'));
    if (parsed?.verdict) carrierByLane.set(lane, parsed);
  }

  const rows = buildPatchLayerRows(evidence.patchPaths, {
    carrierByLane,
    lineage,
    target,
    commitsByPath: evidence.commitsByPath,
    coChangedByPath: evidence.coChangedByPath,
    testFiles: evidence.testFiles,
    testBodies: evidence.testBodies,
  });
  const summary = summarizePatchLayer(rows);

  const watchPaths = baseline.patchLayer?.watchPaths ?? [];
  const localBlobByPath = new Map();
  for (const entry of watchPaths) {
    try {
      localBlobByPath.set(entry.path, git(['rev-parse', `HEAD:${entry.path}`]));
    } catch {
      // Path not in HEAD – recorded as matching neither ancestor blob below.
    }
  }
  const watchRows = buildWatchRows(watchPaths, {
    lineage,
    target,
    collisionPaths: new Set(rows.map((row) => row.path)),
    localBlobByPath,
  });

  if (asJson) {
    const json = JSON.stringify({ schemaVersion: 1, baseCommit, summary, rows, watchRows }, null, 2);
    if (outputPath) writeFileSync(resolve(outputPath), json + '\n');
    else console.log(json);
    return 0;
  }

  const markdown = renderPatchLayerMarkdown({
    baseCommit,
    lineageTag: baseline.lineage.tag,
    targetTag: baseline.adoptionTarget.tag,
    rows,
    summary,
    watchRows,
  });
  if (outputPath) {
    writeFileSync(resolve(outputPath), markdown);
    console.log(`Patch-layer table written to ${outputPath} (${rows.length} collisions)`);
  } else {
    console.log(markdown);
  }
  return 0;
}

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

  if (args.includes('--patch-layer')) {
    return runPatchLayer({ baseline, lineage, target, outputPath, asJson: args.includes('--json') });
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
