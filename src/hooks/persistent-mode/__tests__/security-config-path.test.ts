import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';
// Exercises the DEFAULT state-root branch over its own fixtures (#42):
// lift the per-file OMQ_STATE_DIR pin for every test below.
import { useDefaultStateRoot } from '../../../__tests__/helpers/default-state-root.js';

/**
 * The shipped stop hook resolves its own security config path (it cannot import
 * the TypeScript loader), so the path literals are a second implementation that
 * has to be driven end-to-end or nothing tests them at all.
 */
const SCRIPT_PATH = join(process.cwd(), 'scripts', 'persistent-mode.mjs');

function runHook(
  input: Record<string, unknown>,
  options: { cwd: string; env?: Record<string, string | undefined> } = { cwd: process.cwd() },
): Record<string, unknown> {
  const execOptions = {
    encoding: 'utf-8',
    timeout: 10_000,
    input: JSON.stringify(input),
    cwd: options.cwd,
    env: { ...process.env, NODE_ENV: 'test', ...options.env },
  } as const;
  try {
    const result = execSync(`node "${SCRIPT_PATH}"`, execOptions);
    const lines = result.trim().split('\n');
    return JSON.parse(lines[lines.length - 1]);
  } catch (error: unknown) {
    const stdout = (error as { stdout?: string }).stdout;
    if (stdout) {
      const lines = stdout.trim().split('\n');
      return JSON.parse(lines[lines.length - 1]);
    }
    throw error;
  }
}

function writeExhaustedRalphState(tempDir: string, sessionId: string): string {
  const sessionDir = join(tempDir, '.omq', 'state', 'sessions', sessionId);
  mkdirSync(sessionDir, { recursive: true });
  const statePath = join(sessionDir, 'ralph-state.json');
  writeFileSync(
    statePath,
    JSON.stringify({
      active: true,
      iteration: 5,
      max_iterations: 5,
      session_id: sessionId,
      project_path: tempDir,
      started_at: new Date().toISOString(),
      last_checked_at: new Date().toISOString(),
      prompt: 'Test ralph task',
    }),
  );
  return statePath;
}

describe('persistent-mode security config path (scripts/persistent-mode.mjs)', () => {
  useDefaultStateRoot();
  let tempDir: string;
  let fakeHome: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'pm-config-path-'));
    fakeHome = mkdtempSync(join(tmpdir(), 'pm-config-home-'));
    execSync('git init', { cwd: tempDir, stdio: 'pipe' });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    rmSync(fakeHome, { recursive: true, force: true });
  });

  it('honors security.hardMaxIterations from the project omq.jsonc', () => {
    const sessionId = 'pm-hard-max-project-omq';
    mkdirSync(join(tempDir, '.claude'), { recursive: true });
    writeFileSync(
      join(tempDir, '.claude', 'omq.jsonc'),
      JSON.stringify({ security: { hardMaxIterations: 3 } }),
    );
    const statePath = writeExhaustedRalphState(tempDir, sessionId);

    const output = runHook({ directory: tempDir, sessionId }, { cwd: tempDir });

    expect(String(output.reason)).toContain('HARD LIMIT');
    expect(JSON.parse(readFileSync(statePath, 'utf-8')).active).toBe(false);
  });

  it('honors security.hardMaxIterations from the user qoder-omq config.jsonc', () => {
    const sessionId = 'pm-hard-max-user-qoder-omq';
    mkdirSync(join(fakeHome, '.config', 'qoder-omq'), { recursive: true });
    writeFileSync(
      join(fakeHome, '.config', 'qoder-omq', 'config.jsonc'),
      JSON.stringify({ security: { hardMaxIterations: 3 } }),
    );
    const statePath = writeExhaustedRalphState(tempDir, sessionId);

    const output = runHook(
      { directory: tempDir, sessionId },
      { cwd: tempDir, env: { HOME: fakeHome, USERPROFILE: fakeHome } },
    );

    expect(String(output.reason)).toContain('HARD LIMIT');
    expect(JSON.parse(readFileSync(statePath, 'utf-8')).active).toBe(false);
  });

  it('leaves ralph unlimited when no security config exists on either path', () => {
    const sessionId = 'pm-hard-max-unset';
    const statePath = writeExhaustedRalphState(tempDir, sessionId);
    expect(existsSync(join(tempDir, '.claude', 'omq.jsonc'))).toBe(false);

    const output = runHook(
      { directory: tempDir, sessionId },
      { cwd: tempDir, env: { HOME: fakeHome, USERPROFILE: fakeHome } },
    );

    expect(String(output.reason)).toContain('EXTENDED');
    expect(JSON.parse(readFileSync(statePath, 'utf-8')).max_iterations).toBe(15);
  });
});
