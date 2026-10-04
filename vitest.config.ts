import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts', 'src/**/*.test.mjs'],
    exclude: [
      'node_modules',
      'dist',
      'bridge',
      // #76: this suite hung the captured windows run three times (724/727
      // done, then silence until the 6h ceiling). Locally it passes in
      // seconds; the hang is runner-environment-specific. Still runnable via
      // an explicit `vitest run <file>` — reproduce there before un-parking.
      'src/__tests__/workflow-config-file-identity.test.ts',
    ],
    testTimeout: 30000,
    // Pin OMQ_STATE_DIR to a per-file temp root before any suite loads (#42):
    // without it the worktree-paths fallback lands in the repo's real
    // .omq/state/ and full runs write shared state into the working tree.
    setupFiles: ['./tests/setup/pin-state-root.ts'],
  },
});
