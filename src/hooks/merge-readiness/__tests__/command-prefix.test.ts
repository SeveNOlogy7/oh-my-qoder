import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createInitialMergeReadinessState } from '../runtime.js';

// This plugin registers as oh-my-qoder, so /omq: and /oh-my-qoder: are the
// prefixes its own merge-readiness command arrives with.
const COMMAND_FORMS = [
  '/merge-readiness',
  '/omq:merge-readiness',
  '/oh-my-qoder:merge-readiness',
  '/omc:merge-readiness',
  '/oh-my-claudecode:merge-readiness',
] as const;

function withTempDir<T>(run: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), 'mr-prefix-'));
  try {
    return run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe.each(COMMAND_FORMS)('command text extraction for %s', (command) => {
  it('keeps the task text as the change summary', () => {
    withTempDir((dir) => {
      const state = createInitialMergeReadinessState(dir, `${command} fix the flaky test`);
      expect(state.change_summary).toBe('fix the flaky test');
      expect(state.slug).toBe('fix-the-flaky-test');
    });
  });
});
