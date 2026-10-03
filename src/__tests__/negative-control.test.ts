/**
 * Negative-control test: proves that reverting the provenance path-coverage
 * gate (commit 94df71a) turns the canonical-identity-provenance tests RED.
 *
 * This test invokes the negative-control harness script, which operates
 * exclusively inside a scratch git worktree (never touching the main worktree).
 *
 * The harness:
 *   1. Creates `git worktree add --detach` under .omq/worktrees/
 *   2. Reverts the fix commit inside that worktree
 *   3. Runs the observation tests
 *   4. Cleans up the worktree in a finally block
 *   5. Verifies no stray worktrees remain
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HARNESS = join(__dirname, '..', '..', 'scripts', 'negative-control.mjs');

function runHarness(lane: string): { code: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync('node', [HARNESS, '--lane', lane, '--json'], {
      encoding: 'utf8',
      cwd: join(__dirname, '..', '..'),
      timeout: 300000,
    });
    return { code: 0, stdout, stderr: '' };
  } catch (err: any) {
    return {
      code: err.status ?? 1,
      stdout: err.stdout?.toString() ?? '',
      stderr: err.stderr?.toString() ?? '',
    };
  }
}

describe('negative control', () => {
  it('provenance-path-coverage: reverting the fix turns the observation RED', () => {
    const result = runHarness('provenance-path-coverage');

    // The harness exits 0 when the observation turns red (valid negative control).
    // It exits 1 when the observation stays green (invalid -- the test is weak).
    // It exits 2 on harness error.
    expect(result.code).not.toBe(2);

    let parsed: any;
    try {
      parsed = JSON.parse(result.stdout);
    } catch {
      throw new Error(
        `Harness did not produce valid JSON output.\nstdout: ${result.stdout.slice(0, 500)}\nstderr: ${result.stderr.slice(0, 500)}`,
      );
    }

    // The verdict must be VALID: the observation turned RED after reverting.
    // If it stayed GREEN, the test does NOT actually detect the regression.
    expect(parsed.verdict).toBe('VALID');

    // Structural checks.
    expect(parsed.beforeRevert.green).toBe(true);
    expect(parsed.afterRevert.red).toBe(true);
    expect(parsed.fixCommit).toBe('94df71a');
    expect(parsed.observation).toBe('src/__tests__/canonical-identity-provenance.test.ts');
  });
});
