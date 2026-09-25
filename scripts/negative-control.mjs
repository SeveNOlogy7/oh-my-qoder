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
 *
 * Exit codes:
 *   0  The observation turned RED after reverting the fix (expected -- the
 *      test is a valid negative control).
 *   1  The observation stayed GREEN after reverting (the test does NOT detect
 *      the regression -- this is a loud warning).
 *   2  Harness error (bad lane name, git failure, etc.).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
const laneIdx = args.indexOf('--lane');
const laneName = laneIdx >= 0 ? args[laneIdx + 1] : undefined;

if (!laneName || !LANES[laneName]) {
  console.error(`Usage: node scripts/negative-control.mjs --lane <name> [--json]`);
  console.error(`Available lanes: ${Object.keys(LANES).join(', ')}`);
  process.exit(2);
}

const lane = LANES[laneName];

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
/*  Main harness                                                       */
/* ------------------------------------------------------------------ */

const timestamp = Date.now();
const worktreeName = `neg-ctrl-${laneName}-${timestamp}`;
const worktreePath = join(repoRoot, '.omq', 'worktrees', worktreeName);
// The carrier is the deliverable: it must live in the tree so CI and reviewers
// can read the evidence, not in the gitignored scratch area beside the worktree.
const carrierPath = join(repoRoot, 'docs', 'negative-control', `${laneName}.txt`);

let worktreeCreated = false;
let result;
// process.exit() called inside try/catch skips `finally`, which is how this
// harness leaked registered-but-undeleted worktrees. Record the code instead
// and exit once cleanup has had its turn.
let exitCode = 0;

try {
  // 1. Ensure the worktrees directory exists.
  const worktreesDir = join(repoRoot, '.omq', 'worktrees');
  mkdirSync(worktreesDir, { recursive: true });

  // 2. Create a detached worktree at HEAD.
  git(['worktree', 'add', '--detach', worktreePath, 'HEAD'], repoRoot);
  worktreeCreated = true;

  // 2b. Symlink node_modules from the main worktree so vitest can run.
  //     The worktree has no node_modules of its own; the tests only need
  //     vitest (a devDependency) and the script under test uses only node:*.
  const mainNodeModules = join(repoRoot, 'node_modules');
  const worktreeNodeModules = join(worktreePath, 'node_modules');
  if (existsSync(mainNodeModules) && !existsSync(worktreeNodeModules)) {
    symlinkSync(mainNodeModules, worktreeNodeModules, 'junction');
  }

  // 3. Verify the observation test file exists in the worktree BEFORE reverting.
  const obsPath = join(worktreePath, lane.observation);
  if (!existsSync(obsPath)) {
    throw new Error(`Observation file not found in worktree: ${lane.observation}`);
  }

  // 4. Run the observation BEFORE reverting -- should be GREEN.
  const beforeResult = runVitest(worktreePath, lane.observation);

  // 5. Surgically revert ONLY the script file to its pre-fix state.
  //    We cannot `git revert` the whole commit because it also added the test
  //    file -- reverting the whole commit would delete the observation.
  //    Instead, extract the pre-fix version of the script and overwrite it.
  const preFixContent = git(
    ['show', `${lane.fixCommit}^:${lane.scriptFile}`],
    repoRoot,
  );
  writeFileSync(join(worktreePath, lane.scriptFile), preFixContent, 'utf8');

  // 6. Run the observation AFTER reverting -- should be RED if the test is valid.
  const afterResult = runVitest(worktreePath, lane.observation);

  const beforeGreen = beforeResult.code === 0;
  const afterRed = afterResult.code !== 0;

  result = {
    lane: laneName,
    fixCommit: lane.fixCommit,
    description: lane.description,
    observation: lane.observation,
    worktree: `.omq/worktrees/${worktreeName}`,
    beforeRevert: {
      exitCode: beforeResult.code,
      green: beforeGreen,
      output: beforeResult.stdout.slice(-2000),
    },
    afterRevert: {
      exitCode: afterResult.code,
      red: afterRed,
      output: afterResult.stdout.slice(-2000),
      stderr: afterResult.stderr.slice(-1000),
    },
    verdict: beforeGreen && afterRed
      ? 'VALID'
      : beforeGreen && !afterRed
        ? 'INVALID: observation stayed GREEN after reverting the fix'
        : 'INCONCLUSIVE: observation was not green before revert',
    timestamp: new Date().toISOString(),
  };

  // 7. Write carrier file.
  const carrierLines = [
    `# Negative Control Carrier: ${laneName}`,
    ``,
    `- **Lane**: ${laneName}`,
    `- **Fix commit**: ${lane.fixCommit}`,
    `- **Observation**: ${lane.observation}`,
    `- **Description**: ${lane.description}`,
    `- **Worktree**: .omq/worktrees/${worktreeName}`,
    `- **Timestamp**: ${result.timestamp}`,
    ``,
    `## Before revert (should be GREEN)`,
    `- Exit code: ${beforeResult.code}`,
    `- Green: ${beforeGreen}`,
    ``,
    `## After revert (should be RED)`,
    `- Exit code: ${afterResult.code}`,
    `- Red: ${afterRed}`,
    ``,
    `## Verdict`,
    ``,
    `**${result.verdict}**`,
    ``,
    `### After-revert output (last 2000 chars)`,
    '```',
    afterResult.stdout.slice(-2000),
    '```',
    ``,
    `### After-revert stderr (last 1000 chars)`,
    '```',
    afterResult.stderr.slice(-1000),
    '```',
  ];
  mkdirSync(join(repoRoot, 'docs', 'negative-control'), { recursive: true });
  writeFileSync(carrierPath, carrierLines.join('\n'), 'utf8');

  // 8. Print result.
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`\n=== Negative Control: ${laneName} ===`);
    console.log(`Fix: ${lane.fixCommit} -- ${lane.description}`);
    console.log(`Observation: ${lane.observation}`);
    console.log(`Before revert: exit ${beforeResult.code} (${beforeGreen ? 'GREEN' : 'NOT GREEN'})`);
    console.log(`After revert:  exit ${afterResult.code} (${afterRed ? 'RED' : 'NOT RED'})`);
    console.log(`\nVerdict: ${result.verdict}`);
    console.log(`Carrier: ${carrierPath}`);
  }

  // Exit 0 if valid (observation turned red), 1 if invalid.
  exitCode = beforeGreen && afterRed ? 0 : 1;

} catch (err) {
  console.error(`Harness error: ${err.message}`);
  if (json) {
    console.log(JSON.stringify({ error: err.message, lane: laneName }, null, 2));
  }
  exitCode = 2;
} finally {
  // 9. ALWAYS clean up the worktree.
  if (worktreeCreated && existsSync(worktreePath)) {
    try {
      git(['worktree', 'remove', worktreePath, '--force'], repoRoot);
    } catch (cleanupErr) {
      // If `git worktree remove` fails, try manual removal + prune.
      try {
        rmSync(worktreePath, { recursive: true, force: true });
        git(['worktree', 'prune'], repoRoot);
      } catch {
        console.error(`WARNING: could not remove worktree ${worktreePath}`);
      }
    }
  }

  // 10. Verify the scratch worktree is gone. Counting every registered worktree
  // would flag the developer's own checkout as a leak, so look for this run's
  // path specifically.
  try {
    const worktreeList = (git(['worktree', 'list'], repoRoot) || '').replace(/\\/g, '/');
    if (worktreeList.includes(worktreePath.replace(/\\/g, '/'))) {
      console.error(`LEAK: ${worktreePath} is still registered after cleanup`);
      // A leaked scratch worktree is a failed run even when the verdict was
      // VALID: the next CI pass would inherit it and the tree would keep growing.
      exitCode = exitCode === 0 ? 3 : exitCode;
    }
  } catch {
    // Non-fatal: we tried to verify.
  }
}

process.exit(exitCode);
