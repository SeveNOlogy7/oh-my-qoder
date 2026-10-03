/**
 * Opt a suite back onto the DEFAULT state-root branch (#42).
 *
 * tests/setup/pin-state-root.ts pins OMQ_STATE_DIR for every test file so
 * un-aware suites cannot write into the repository's real .omq/state/. Suites
 * that deliberately test the default resolution chain (workspace marker >
 * git toplevel > cwd) call `useDefaultStateRoot()` inside their describe:
 * for the duration of each test the pin is lifted, and restored afterwards.
 * Every suite using this helper anchors its fixtures in temp directories,
 * so the fallback exercise never reaches the real repo root.
 */
import { beforeEach, afterEach } from 'vitest';
import { clearWorktreeCache } from '../../lib/worktree-paths.js';

export function useDefaultStateRoot(): void {
  let previous: string | undefined;
  beforeEach(() => {
    previous = process.env.OMQ_STATE_DIR;
    delete process.env.OMQ_STATE_DIR;
    clearWorktreeCache();
  });
  afterEach(() => {
    if (previous === undefined) {
      delete process.env.OMQ_STATE_DIR;
    } else {
      process.env.OMQ_STATE_DIR = previous;
    }
    clearWorktreeCache();
  });
}
