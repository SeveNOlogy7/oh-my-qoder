import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { validateConfigPath } from '../bridge-entry.js';

describe('bridge-entry security', () => {
  const source = readFileSync(join(__dirname, '..', 'bridge-entry.ts'), 'utf-8');

  it('does NOT use process.cwd()', () => {
    expect(source).not.toContain('process.cwd()');
  });

  it('has validateBridgeWorkingDirectory function', () => {
    expect(source).toContain('validateBridgeWorkingDirectory');
  });

  it('validates config path is under ~/.qoder/ or .omq/', () => {
    expect(source).toContain('.qoder/');
    expect(source).toContain('.omq/');
  });

  it('sanitizes team and worker names', () => {
    expect(source).toContain('sanitizeName(config.teamName)');
    expect(source).toContain('sanitizeName(config.workerName)');
  });

  it('uses realpathSync for symlink resolution', () => {
    expect(source).toContain('realpathSync');
  });

  it('checks path is under homedir', () => {
    expect(source).toContain("home + '/'");
  });

  it('verifies git worktree', () => {
    expect(source).toContain('probeGitTopLevel');
  });

  it('validates working directory exists and is a directory', () => {
    expect(source).toContain('statSync(workingDirectory)');
    expect(source).toContain('isDirectory()');
  });

  it('validates provider is codex or gemini', () => {
    expect(source).toContain("config.provider !== 'codex'");
    expect(source).toContain("config.provider !== 'gemini'");
  });

  it('has signal handlers for graceful cleanup', () => {
    expect(source).toContain('SIGINT');
    expect(source).toContain('SIGTERM');
    expect(source).toContain('deleteHeartbeat');
    expect(source).toContain('unregisterMcpWorker');
  });

  it('validates required config fields', () => {
    expect(source).toContain('teamName');
    expect(source).toContain('workerName');
    expect(source).toContain('provider');
    expect(source).toContain('workingDirectory');
    expect(source).toContain('Missing required config field');
  });

  it('applies default configuration values', () => {
    expect(source).toContain('pollIntervalMs');
    expect(source).toContain('taskTimeoutMs');
    expect(source).toContain('maxConsecutiveErrors');
    expect(source).toContain('outboxMaxLines');
    expect(source).toContain('maxRetries');
  });
});

describe('validateConfigPath', () => {
  // Derived with join() instead of written as POSIX literals. `resolve()` re-bases a
  // leading-slash path onto the current drive on Windows, so the literals made the two
  // acceptance cases unsatisfiable AND let the rejection cases pass for the wrong
  // reason -- the path was rejected because it had moved outside home by accident of
  // resolution, not because a guard fired.
  const home = join(tmpdir(), `omq-bridge-entry-home-${process.pid}`);
  const claudeConfigDir = join(home, '.qwen');

  it('should reject paths outside home directory', () => {
    expect(validateConfigPath(join(tmpdir(), 'elsewhere', '.omq', 'config.json'), home, claudeConfigDir)).toBe(false);
  });

  it('should reject paths without trusted subpath', () => {
    expect(validateConfigPath(join(home, 'project', 'config.json'), home, claudeConfigDir)).toBe(false);
  });

  it('should accept paths under claudeConfigDir (~/.qwen)', () => {
    expect(validateConfigPath(join(claudeConfigDir, 'teams', 'foo', 'config.json'), home, claudeConfigDir)).toBe(true);
  });

  it('should accept paths under project/.omq/', () => {
    expect(validateConfigPath(join(home, 'project', '.omq', 'state', 'config.json'), home, claudeConfigDir)).toBe(true);
  });

  it('should reject path that matches subpath but not home', () => {
    expect(validateConfigPath(join(tmpdir(), 'other-omq-home', '.omq', 'config.json'), home, claudeConfigDir)).toBe(false);
  });

  it('should reject path traversal via ../ that escapes trusted subpath', () => {
    // <home>/foo/.qoder/../../evil.json resolves to <home>/evil.json (no trusted subpath)
    expect(validateConfigPath(join(home, 'foo', '.qoder', '..', '..', 'evil.json'), home, claudeConfigDir)).toBe(false);
  });
});
