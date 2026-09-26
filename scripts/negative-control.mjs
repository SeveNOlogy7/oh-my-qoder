#!/usr/bin/env node
/**
 * Negative-control harness.
 *
 * Proves that a regression test actually detects the regression it claims to
 * catch.  For a named "lane" (a fix commit + an observation test file) the
 * harness:
 *
 *   1. Creates a scratch `git worktree add --detach` under .omq/worktrees/.
 *   2. Reverts the fix commit inside that worktree ONLY.
 *   3. Runs the observation tests.
 *   4. Reports whether the observation turned RED.
 *   5. Removes the worktree in a `finally` block -- no stray worktrees.
 *
 * SAFETY: the script NEVER runs stash / reset / checkout / revert in the main
 * worktree.  All destructive git operations are scoped to the scratch worktree.
 *
 * Usage:
 *   node scripts/negative-control.mjs --lane <name> [--json]
 *   node scripts/negative-control.mjs --lanes-from <patch-layer.json> [--gate] [--json]
 *
 * `--lanes-from` consumes `node scripts/conflict-ledger.mjs --patch-layer --json`
 * and builds one lane per assertable collision, so lane definitions are derived
 * from the tree instead of hand-maintained beside it.
 *
 * `--gate` makes a non-VALID lane fail the run. Without it the harness only
 * records what it measured, which is what M1 needs before the patches have
 * been re-applied: an unmet observation is ledger data, not a build break.
 *
 * Exit codes:
 *   0  The observation turned RED after reverting the fix (expected -- the
 *      test is a valid negative control).
 *   1  The observation stayed GREEN after reverting (the test does NOT detect
 *      the regression -- this is a loud warning).
 *   2  Harness error (bad lane name, git failure, etc.).
 *   3  A scratch worktree survived cleanup.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// Lane naming lives with the ledger so a carrier filename and its row cannot drift apart.
// @ts-expect-error -- .mjs script has no type declarations
import { laneNameFor } from './conflict-ledger.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

/* ------------------------------------------------------------------ */
/*  Lane definitions                                                   */
/* ------------------------------------------------------------------ */

/**
 * Each lane names:
 *   - fixCommit:   the commit that introduced the fix
 *   - observation: the test file that should go RED when the fix is reverted
 *   - description: human-readable summary of what the fix does
 */
const LANES = {
  'provenance-path-coverage': {
    fixCommit: '94df71a',
    observation: 'src/__tests__/canonical-identity-provenance.test.ts',
    scriptFile: 'scripts/check-canonical-identity.mjs',
    description:
      'fix(identity): make the provenance rule a path-coverage gate -- ' +
      'reverting should cause provenance tests to fail because unlisted files ' +
      'are no longer detected as violations.',
  },
};

/* ------------------------------------------------------------------ */
/*  Argument parsing                                                   */
/* ------------------------------------------------------------------ */

const args = process.argv.slice(2);
const json = args.includes('--json');
const gate = args.includes('--gate');
const retryAlternates = args.includes('--retry-alternates');
const laneIdx = args.indexOf('--lane');
const singleLaneName = laneIdx >= 0 ? args[laneIdx + 1] : undefined;
const fromIdx = args.indexOf('--lanes-from');
const lanesFile = fromIdx >= 0 ? args[fromIdx + 1] : undefined;

function usageAndBail() {
  console.error('Usage: node scripts/negative-control.mjs --lane <name> [--json]');
  console.error('       node scripts/negative-control.mjs --lanes-from <patch-layer.json> [--retry-alternates] [--gate] [--json]');
  console.error(`Available lanes: ${Object.keys(LANES).join(', ')}`);
  process.exit(2);
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function git(argv, cwd) {
  try {
    return execFileSync('git', argv, {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (err) {
    const stderr = err.stderr?.toString().trim() ?? '';
    const stdout = err.stdout?.toString().trim() ?? '';
    const error = new Error(`git ${argv.join(' ')} failed\n${stderr || stdout}`);
    error.status = err.status;
    throw error;
  }
}

function subjectOf(sha) {
  try {
    return git(['log', '-1', '--format=%s', sha], repoRoot);
  } catch {
    return `commit ${sha}`;
  }
}

/**
 * Turn a patch-layer ledger into lane definitions.
 *
 * `revertTo` is `<oldest patching commit>^`, so the parent is exactly the state
 * where OMQ's patch is absent -- including for paths several commits touched.
 */
function lanesFromPatchLayer(file) {
  const doc = JSON.parse(readFileSync(resolve(file), 'utf8'));
  if (doc.schemaVersion !== 1 || !Array.isArray(doc.rows)) {
    throw new Error(`${file} is not a patch-layer ledger (schemaVersion 1, rows[])`);
  }
  const lanes = [];
  for (const row of doc.rows) {
    if (row.class !== 'assertable' || !row.observation || !row.revertTo) continue;
    const fixCommit = String(row.revertTo).replace(/\^$/, '');
    if (!/^[0-9a-f]{7,40}$/.test(fixCommit)) {
      throw new Error(`row ${row.path} has an unusable revertTo: ${row.revertTo}`);
    }
    lanes.push({
      name: laneNameFor(row.path),
      fixCommit,
      scriptFile: row.path,
      observation: row.observation,
      alternates: Array.isArray(row.observationAlternates) ? row.observationAlternates : [],
      description: `${subjectOf(fixCommit)} -- reverting ${row.path} ` +
        `should turn ${row.observation} RED (observation found by rule "${row.observationRule}").`,
    });
  }
  if (!lanes.length) throw new Error(`${file} contains no assertable lane`);
  return lanes;
}

/**
 * Make captured output comparable across runs and machines.
 *
 * Test output embeds the scratch worktree path (which carries a timestamp) and
 * mkdtemp suffixes (which are random).  Redacting both is what lets a carrier be
 * committed as evidence: re-running a lane whose result has not changed must not
 * produce a diff, or nobody can review the file.
 */
function redact(text, worktreePath) {
  if (!text) return '';
  // Colour codes first: every rule below would otherwise miss its line.
  let out = text.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '').replace(/\r\n/g, '\n');
  const posixRoot = worktreePath.replace(/\\/g, '/');
  for (const form of new Set([worktreePath, posixRoot])) {
    if (form) out = out.split(form).join('<worktree>');
  }
  // mkdtemp suffixes are random: omq-hud-cache-AbC123 -> omq-hud-cache-<tmp>
  out = out.replace(/([-/][a-z0-9-]{3,}-)[A-Za-z0-9]{6,8}(?=[\s"'/,):])/g, '$1<tmp>');
  // Per-test durations differ every run, and they are never the evidence.
  out = out.replace(/ \d+(?:\.\d+)?(?:ms|s)\b/g, '');
  // Same for vitest's summary footer.
  out = out.replace(/^[ \t]*Start at +\d[\d:.]+[ \t]*$/gm, '   Start at  <redacted>');
  out = out.replace(/^[ \t]*Duration +[\d.]+(?:ms|s)\b.*$/gm, '   Duration  <redacted>');
  return out;
}

function runVitest(worktreeDir, testFile) {
  // Use node to invoke vitest directly, avoiding npx resolution issues on Windows.
  const vitestBin = join(worktreeDir, 'node_modules', '.bin', 'vitest');
  const vitestEntry = vitestBin.endsWith('.cmd')
    ? vitestBin
    : join(worktreeDir, 'node_modules', 'vitest', 'vitest.mjs');
  // On Windows the .bin entry is a .cmd shim; prefer running the module directly.
  const entry = existsSync(join(worktreeDir, 'node_modules', 'vitest', 'vitest.mjs'))
    ? join(worktreeDir, 'node_modules', 'vitest', 'vitest.mjs')
    : join(worktreeDir, 'node_modules', 'vitest', 'dist', 'cli-wrapper.js');

  try {
    const stdout = execFileSync('node', [entry, 'run', testFile, '--reporter=verbose'], {
      cwd: worktreeDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
      timeout: 120000,
    });
    return { code: 0, stdout, stderr: '' };
  } catch (err) {
    return {
      code: err.status ?? 1,
      stdout: (err.stdout?.toString() ?? '') + (err.stderr?.toString() ?? ''),
      stderr: err.stderr?.toString() ?? '',
    };
  }
}

/* ------------------------------------------------------------------ */
/*  One lane                                                           */
/* ------------------------------------------------------------------ */

/**
 * Run one lane and write its carrier.  Returns { exitCode, result }.
 *
 * With `retryAlternates` the lane's other named candidates are measured too.
 * That is coverage discovery, not test shopping: every candidate is a test that
 * already exists and already references the module, and the carrier records each
 * attempt -- so a reader can see which ones were green before the revert and
 * stayed green after it.
 */
function runLane(lane, { retryAlternates }) {
  const laneName = lane.name;
  const timestamp = Date.now();
  const worktreeName = `neg-ctrl-${laneName}-${timestamp}`;
  const worktreePath = join(repoRoot, '.omq', 'worktrees', worktreeName);
  // The carrier is the deliverable: it must live in the tree so CI and reviewers
  // can read the evidence, not in the gitignored scratch area beside the worktree.
  const carrierPath = join(repoRoot, 'docs', 'negative-control', `${laneName}.txt`);

  let worktreeCreated = false;
  let outcome = { exitCode: 2, result: { lane: laneName, verdict: 'NOT_RUN' } };
  // process.exit() called inside try/catch skips `finally`, which is how this
  // harness leaked registered-but-undeleted worktrees. Record the code instead
  // and exit once cleanup has had its turn.
  let exitCode = 0;

  try {
    // 1. Ensure the worktrees directory exists.
    mkdirSync(join(repoRoot, '.omq', 'worktrees'), { recursive: true });

    // 2. Create a detached worktree at HEAD.
    git(['worktree', 'add', '--detach', worktreePath, 'HEAD'], repoRoot);
    worktreeCreated = true;

    // 2b. Mirror this worktree's untracked build outputs into the scratch
    //     worktree. `git worktree add` only checks out tracked files, and
    //     bridge/ + dist/ + node_modules are gitignored, so without this any
    //     observation that imports the compiled CLI fails at collection -- which
    //     reads as "not green before revert" and tells us nothing about the patch.
    for (const dir of ['node_modules', 'bridge', 'dist']) {
      const source = join(repoRoot, dir);
      const target = join(worktreePath, dir);
      if (existsSync(source) && !existsSync(target)) {
        symlinkSync(source, target, 'junction');
      }
    }

    // 3. Candidates: the named observation first, then (optionally) the others.
    const candidates = [lane.observation, ...(retryAlternates ? lane.alternates ?? [] : [])]
      .filter((candidate, index, all) => candidate && all.indexOf(candidate) === index);

    // 4. Extract the pre-fix version of the patched file once.  A whole-commit
    //    revert is not usable: those commits also add or edit the observations,
    //    which would delete the very tests being measured.
    const preFixContent = git(['show', `${lane.fixCommit}^:${lane.scriptFile}`], repoRoot);

    const attempts = [];
    const byObservation = new Map();
    // 5. Phase A -- every candidate on the un-reverted tree (should be GREEN).
    for (const observation of candidates) {
      if (!existsSync(join(worktreePath, observation))) {
        attempts.push({ observation, note: 'observation file absent in worktree' });
        continue;
      }
      const before = runVitest(worktreePath, observation);
      const attempt = { observation, beforeExitCode: before.code, green: before.code === 0 };
      attempts.push(attempt);
      byObservation.set(observation, attempt);
    }

    // 6. Revert the patched file, then measure only the candidates that were
    //    green -- a red-before test cannot prove anything about the revert.
    writeFileSync(join(worktreePath, lane.scriptFile), preFixContent, 'utf8');
    let winner = null;
    for (const observation of candidates) {
      const attempt = byObservation.get(observation);
      if (!attempt?.green) continue;
      const after = runVitest(worktreePath, observation);
      attempt.afterExitCode = after.code;
      attempt.red = after.code !== 0;
      attempt.output = redact(after.stdout, worktreePath).slice(-2000);
      attempt.stderr = redact(after.stderr, worktreePath).slice(-1000);
      if (attempt.red && !winner) winner = observation;
    }

    const anyGreenBefore = [...byObservation.values()].some((a) => a.green);
    const verdict = winner
      ? 'VALID'
      : anyGreenBefore
        ? 'INVALID: no observation turned RED after reverting the fix'
        : 'INCONCLUSIVE: no observation was green before revert';
    const chosen = byObservation.get(winner ?? candidates[0]);

    const result = {
      lane: laneName,
      fixCommit: lane.fixCommit,
      patchedFile: lane.scriptFile,
      description: lane.description,
      observation: winner ?? lane.observation,
      namedObservation: lane.observation,
      verified: winner !== null,
      attempts: attempts.map(({ output, stderr, ...rest }) => rest),
      beforeRevert: { exitCode: chosen?.beforeExitCode ?? -1, green: chosen?.green ?? false },
      afterRevert: { exitCode: chosen?.afterExitCode ?? -1, red: chosen?.red ?? false },
      verdict,
    };

    // 7. Write carrier file.
    const carrierLines = [
      `# Negative Control Carrier: ${laneName}`,
      ``,
      `- **Lane**: ${laneName}`,
      `- **Fix commit**: ${lane.fixCommit}`,
      `- **Patched file**: ${lane.scriptFile}`,
      `- **Named observation**: ${lane.observation}`,
      `- **Verified observation**: ${winner ?? 'none'}`,
      `- **Description**: ${lane.description}`,
      // Deliberately no worktree name and no timestamp: the carrier is committed
      // as evidence, so re-running the same control must reproduce it byte for
      // byte, otherwise the tracked file churns on every run and cannot be diffed.
      ``,
      `## Attempts`,
      ``,
      `| observation | before (want 0) | after (want !=0) | verdict |`,
      `|---|---|---|---|`,
      ...attempts.map((a) => `| \`${a.observation}\` | ${a.beforeExitCode ?? '-'} | ${a.afterExitCode ?? '-'} | ` +
        `${a.note ?? (a.red ? 'RED after revert' : a.green ? 'still GREEN' : 'red before revert')} |`),
      ``,
      `## Verdict`,
      ``,
      `**${verdict}**`,
      ``,
      `### Winning observation output after revert (last 2000 chars)`,
      '```',
      chosen?.output ?? '',
      '```',
      ``,
      `### Winning observation stderr after revert (last 1000 chars)`,
      '```',
      chosen?.stderr ?? '',
      '```',
    ];
    mkdirSync(join(repoRoot, 'docs', 'negative-control'), { recursive: true });
    writeFileSync(carrierPath, carrierLines.join('\n'), 'utf8');
    result.carrier = `docs/negative-control/${laneName}.txt`;

    if (!json) {
      console.log(`\n=== Negative Control: ${laneName} ===`);
      console.log(`Patched file: ${lane.scriptFile} (revert to ${lane.fixCommit}^)`);
      console.log(`Candidates measured: ${byObservation.size}, green before: ${anyGreenBefore ? 'yes' : 'no'}`);
      console.log(`Verdict: ${verdict}${winner ? ` via ${winner}` : ''}`);
      console.log(`Carrier: ${carrierPath}`);
    }

    exitCode = winner ? 0 : 1;
    outcome = { exitCode, result };
  } catch (err) {
    console.error(`Harness error in lane ${laneName}: ${err.message}`);
    outcome = { exitCode: 2, result: { lane: laneName, verdict: `HARNESS ERROR: ${err.message}` } };
  } finally {
    // 8. ALWAYS clean up the worktree.
    if (worktreeCreated && existsSync(worktreePath)) {
      try {
        git(['worktree', 'remove', worktreePath, '--force'], repoRoot);
      } catch {
        // If `git worktree remove` fails, try manual removal + prune.
        try {
          rmSync(worktreePath, { recursive: true, force: true });
          git(['worktree', 'prune'], repoRoot);
        } catch {
          console.error(`WARNING: could not remove worktree ${worktreePath}`);
        }
      }
    }

    // 9. Verify the scratch worktree is gone. Counting every registered worktree
    // would flag the developer's own checkout as a leak, so look for this run's
    // path specifically.
    try {
      const worktreeList = (git(['worktree', 'list'], repoRoot) || '').replace(/\\/g, '/');
      if (worktreeList.includes(worktreePath.replace(/\\/g, '/'))) {
        console.error(`LEAK: ${worktreePath} is still registered after cleanup`);
        // A leaked scratch worktree is a failed run even when the verdict was
        // VALID: the next CI pass would inherit it and the tree would keep growing.
        exitCode = exitCode === 0 ? 3 : exitCode;
        outcome = { exitCode, result: outcome.result };
      }
    } catch {
      // Non-fatal: step 10 inspects the directory itself, which is the stronger
      // check of the two.
    }

    // 10. Registration is not the whole story. On Windows `git worktree remove`
    // can unlink the tree and drop the registration while the (now empty)
    // directory survives, because a child process still held its cwd -- 33 such
    // stubs accumulated silently before this check existed. Clear it, then fail
    // loudly if it is still there.
    if (worktreeCreated && existsSync(worktreePath)) {
      try {
        rmSync(worktreePath, { recursive: true, force: true });
      } catch {
        // Reported below; no second opinion needed.
      }
      if (existsSync(worktreePath)) {
        console.error(`LEAK: ${worktreePath} still exists on disk after cleanup`);
        exitCode = exitCode === 0 ? 3 : exitCode;
        outcome = { exitCode, result: outcome.result };
      }
    }
  }

  return outcome;
}

/* ------------------------------------------------------------------ */
/*  Driver                                                             */
/* ------------------------------------------------------------------ */

let lanes;
if (singleLaneName) {
  if (!LANES[singleLaneName]) usageAndBail();
  lanes = [{ name: singleLaneName, ...LANES[singleLaneName] }];
} else if (lanesFile) {
  try {
    lanes = lanesFromPatchLayer(lanesFile);
  } catch (err) {
    console.error(`Cannot build lanes: ${err.message}`);
    process.exit(2);
  }
} else {
  usageAndBail();
}

const outcomes = [];
let worst = 0;
for (const lane of lanes) {
  const { exitCode, result } = runLane(lane, { retryAlternates });
  outcomes.push(result);
  worst = Math.max(worst, exitCode);
}

if (json) {
  console.log(JSON.stringify(lanes.length === 1 ? outcomes[0] : outcomes, null, 2));
} else {
  console.log(`\n=== ${lanes.length} lane(s): ${outcomes.filter((o) => o.verdict === 'VALID').length} VALID ===`);
  for (const outcome of outcomes) {
    console.log(`${outcome.verdict === 'VALID' ? 'ok  ' : 'FAIL'}  ${outcome.lane}  ${outcome.verdict}`);
  }
}

// Without --gate an observation that did not bite is recorded, not fatal: M1's
// job is to find out which lanes have no test yet.  A harness error (2) or a
// leaked worktree (3) is always fatal.
process.exit(worst === 1 && !gate ? 0 : worst);
