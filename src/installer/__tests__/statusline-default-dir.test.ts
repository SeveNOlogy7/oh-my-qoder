import { describe, it, expect, vi } from 'vitest';

// buildStatusLineCommand takes the POSIX branch only off Windows; the host may
// be win32, so pin the platform for the branch under test.
vi.mock('../hooks.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks.js')>();
  return { ...actual, isWindows: vi.fn(() => false) };
});

import { buildStatusLineCommand, QODER_CONFIG_DIR } from '../index.js';
import { isDefaultQoderConfigDir, getDefaultConfigDirShellPath } from '../../utils/config-dir.js';

// #49 (ledger :377/:383): the statusline fallback root used to be hardcoded to
// $HOME/.claude — an ancestor leftover. The fallback must come from
// getDefaultConfigDirShellPath(), whose whole purpose is expressing this
// default (distribution-aware: .qoder vs .qoder-cn), and the guarded form must
// be used exactly when the installed config dir IS that default; a custom
// config dir keeps absolute paths (a $HOME/.qoder fallback would point the
// statusline at a directory that holds nothing).
describe('buildStatusLineCommand – default config dir fallback root', () => {
  it('uses the getDefaultConfigDirShellPath fallback when the config dir is the default', () => {
    const expectedRoot = getDefaultConfigDirShellPath();
    if (!isDefaultQoderConfigDir(QODER_CONFIG_DIR)) {
      // Host uses a custom/legacy config dir; the pairing branch is covered by
      // the custom-dir test below.
      return;
    }

    for (const cmd of [
      buildStatusLineCommand('node', 'X/hud/omc-hud.mjs'),
      buildStatusLineCommand('node', 'X/hud/omc-hud.mjs', 'X/hud/find-node.sh'),
      buildStatusLineCommand('node', 'X/hud/omc-hud.mjs', undefined, 'X/hud/omc-hud-cache.sh'),
    ]) {
      expect(cmd).toContain(`\${QODER_CONFIG_DIR:-${expectedRoot}}`);
      expect(cmd).not.toContain('$HOME/.claude');
    }
  });

  it('keeps absolute paths for a custom config dir (no mismatched fallback root)', () => {
    if (isDefaultQoderConfigDir(QODER_CONFIG_DIR)) {
      // Cannot fabricate a custom QODER_CONFIG_DIR here: the constant is bound
      // at module load. Skip when the host happens to sit on the default.
      return;
    }

    const cmd = buildStatusLineCommand('node', 'X/hud/omc-hud.mjs');
    expect(cmd).not.toContain('${QODER_CONFIG_DIR:-');
    expect(cmd).toContain(QODER_CONFIG_DIR.replace(/\\/g, '/'));
  });
});
