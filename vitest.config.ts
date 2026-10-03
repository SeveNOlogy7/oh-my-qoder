import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts', 'src/**/*.test.mjs'],
    exclude: ['node_modules', 'dist', 'bridge'],
    testTimeout: 30000,
    // Pin OMQ_STATE_DIR to a per-file temp root before any suite loads (#42):
    // without it the worktree-paths fallback lands in the repo's real
    // .omq/state/ and full runs write shared state into the working tree.
    setupFiles: ['./tests/setup/pin-state-root.ts'],
  },
});
