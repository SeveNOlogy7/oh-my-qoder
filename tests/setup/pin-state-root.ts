/**
 * Per-test-file state-root pin (#42).
 *
 * src/lib/worktree-paths.ts resolves the state root as
 *   OMQ_STATE_DIR > workspace marker > git toplevel > cwd
 * and a suite that never sets OMQ_STATE_DIR therefore falls through to the
 * git toplevel — this repository's REAL .omq/state/. Full runs wrote hud
 * state, session-end jobs, telemetry and mode state into the shared tree and
 * let concurrent vitest batches corrupt each other (ledger #42).
 *
 * This setup file pins OMQ_STATE_DIR to a fresh temp directory before any
 * suite module of this file loads, so every fallback write lands in a
 * throwaway per-file root instead. The pin is the production env branch —
 * src/lib/worktree-paths.ts is not modified.
 *
 * Suites that deliberately exercise the DEFAULT resolution branch (marker /
 * git toplevel / cwd) opt out per suite via `useDefaultStateRoot()` from
 * src/__tests__/helpers/default-state-root.ts; those suites are all
 * fixture-based on temp directories, so their fallback exercises never touch
 * the real root.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll } from 'vitest';

const stateRoot = mkdtempSync(join(tmpdir(), 'omq-vitest-state-'));
const previous = process.env.OMQ_STATE_DIR;
process.env.OMQ_STATE_DIR = stateRoot;

afterAll(() => {
  if (previous === undefined) {
    delete process.env.OMQ_STATE_DIR;
  } else {
    process.env.OMQ_STATE_DIR = previous;
  }
  try {
    rmSync(stateRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
  } catch {
    // Non-fatal: a leaked temp dir is acceptable, a thrown cleanup is not.
  }
});
