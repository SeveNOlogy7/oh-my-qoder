/**
 * Per-test cwd fixture (T16b).
 *
 * Some production writers (hud state, session-end jobs, alias telemetry,
 * dispatch telemetry) resolve their target through getOmqRoot() with NO
 * directory argument, i.e. through process.cwd(). A suite that exercises
 * them in-process therefore writes into the repository's real .omq/state/
 * no matter how carefully its payloads carry explicit fixture paths.
 *
 * `useCwdFixture()` anchors those tests: each test runs with the worker
 * chdir'ed into a fresh temp directory (spawned children inherit it as
 * their spawn cwd), restored and removed afterwards. Test-infra only —
 * production path resolution is untouched.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, afterEach } from 'vitest';

export function useCwdFixture(): void {
  let fixture: string | undefined;
  let original: string | undefined;

  beforeEach(() => {
    original = process.cwd();
    fixture = mkdtempSync(join(tmpdir(), 'omq-cwd-fixture-'));
    process.chdir(fixture);
  });

  afterEach(() => {
    if (original !== undefined) {
      process.chdir(original);
      original = undefined;
    }
    if (fixture !== undefined) {
      try {
        rmSync(fixture, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
      } catch {
        // Non-fatal: a leaked %TEMP% dir is acceptable, a thrown cleanup is not.
      }
      fixture = undefined;
    }
  });
}
