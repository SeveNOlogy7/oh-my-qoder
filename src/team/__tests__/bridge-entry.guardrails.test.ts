import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { validateConfigPath } from '../bridge-entry.js';

describe('bridge-entry workdir guardrails (source contract)', () => {
  const source = readFileSync(join(__dirname, '..', 'bridge-entry.ts'), 'utf-8');

  it('requires working directory to exist and be a directory', () => {
    expect(source).toContain('statSync(workingDirectory)');
    expect(source).toContain('isDirectory()');
  });

  it('requires working directory to stay under home directory', () => {
    expect(source).toContain('realpathSync(workingDirectory)');
    // Pinned after 5927e82 folded both sides before comparing, which is what makes
    // the boundary work when realpathSync() and homedir() return backslash paths.
    expect(source).toContain("resolvedKey.startsWith(homeKey + '/')");
    expect(source).toContain('resolvedKey !== homeKey');
  });

  it('requires working directory to be inside a git worktree', () => {
    expect(source).toContain('getWorktreeRoot(workingDirectory)');
    expect(source).toContain('workingDirectory is not inside a git worktree');
  });
});

describe('validateConfigPath guardrails', () => {
  // Derived with join() rather than written as POSIX literals. Feeding '/home/user/...'
  // into a function that calls resolve() is meaningless on Windows, where resolve()
  // re-bases a leading-slash path onto the current drive -- the literals, not the
  // boundary, were what made these cases unsatisfiable here.
  const home = join(tmpdir(), `omq-guardrails-home-${process.pid}`);
  const claudeConfigDir = join(home, '.qwen');
  const omqStateConfig = join(home, 'project', '.omq', 'state', 'config.json');

  it('rejects path outside home', () => {
    expect(validateConfigPath(join(tmpdir(), 'elsewhere', 'omq', 'config.json'), home, claudeConfigDir)).toBe(false);
  });

  it('rejects path not under trusted subpaths', () => {
    expect(validateConfigPath(join(home, 'project', 'config.json'), home, claudeConfigDir)).toBe(false);
  });

  it('accepts trusted .omq path under home', () => {
    expect(validateConfigPath(omqStateConfig, home, claudeConfigDir)).toBe(true);
  });

  it('accepts a path under the claude config dir', () => {
    expect(validateConfigPath(join(claudeConfigDir, 'settings.json'), home, claudeConfigDir)).toBe(true);
  });

  it('still defeats traversal out of the trusted subtree', () => {
    expect(validateConfigPath(join(home, 'project', '.omq', '..', '..', 'evil.json'), home, claudeConfigDir)).toBe(false);
  });

  // The bug this covers only exists where paths come back with backslashes, so the
  // case is asserted on win32 and is trivially true elsewhere.
  it.runIf(process.platform === 'win32')('accepts a backslash config path on Windows', () => {
    const windowsHome = 'C:\\Users\\tester';
    const underOmq = 'C:\\Users\\tester\\project\\.omq\\state\\config.json';
    expect(validateConfigPath(underOmq, windowsHome, 'C:\\Users\\tester\\.qwen')).toBe(true);
    expect(validateConfigPath('C:\\Windows\\omq.json', windowsHome, 'C:\\Users\\tester\\.qwen')).toBe(false);
  });
});

