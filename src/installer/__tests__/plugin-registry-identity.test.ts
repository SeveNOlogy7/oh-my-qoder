/**
 * Registry identity for this fork's marketplace install.
 *
 * The official-plugin machinery (OMQ_PLUGIN_IDS / isOfficialOmcPluginId /
 * isOmcPluginLookalike) is ancestor-new -- b37141e has no equivalent -- so it
 * shipped with the ancestor's package slug. A Qoder marketplace install registers
 * as `oh-my-qoder@omq` under `plugins/cache/omq/oh-my-qoder/<version>`, which the
 * id set does not contain and the lookalike marker does not even flag, so the
 * entry is skipped in silence: getInstalledOmcPluginRoots() returns nothing and
 * every caller that needs the installed root degrades to legacy mode.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const TRACKED_ENV_KEYS = ['QODER_CONFIG_DIR', 'CLAUDE_PLUGIN_ROOT', 'QODER_PLUGIN_ROOT', 'OMQ_PLUGIN_ROOT'] as const;
let savedEnv: Record<string, string | undefined>;
let tempRoot: string;

function saveEnv(): void {
  savedEnv = Object.fromEntries(TRACKED_ENV_KEYS.map(key => [key, process.env[key]]));
}

function restoreEnv(): void {
  // Key-by-key, never `process.env = {...}`: replacing the object detaches the
  // real environment for every later file in the same worker.
  for (const key of TRACKED_ENV_KEYS) {
    const value = savedEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

async function freshInstaller() {
  vi.resetModules();
  return await import('../index.js');
}

function pluginsDirOf(): string {
  const dir = join(process.env.QODER_CONFIG_DIR as string, 'plugins');
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cacheRoot(pluginsDir: string, marketplace: string, pkg: string, version: string): string {
  const root = join(pluginsDir, 'cache', marketplace, pkg, version);
  mkdirSync(root, { recursive: true });
  return root;
}

function writeRegistry(pluginsDir: string, entries: Record<string, unknown>): void {
  writeFileSync(join(pluginsDir, 'installed_plugins.json'), JSON.stringify({ version: 2, plugins: entries }, null, 2));
}

describe('installed plugin registry identity', () => {
  beforeEach(() => {
    saveEnv();
    tempRoot = mkdtempSync(join(tmpdir(), 'omq-registry-identity-'));
    process.env.QODER_CONFIG_DIR = join(tempRoot, '.qoder');
    delete process.env.CLAUDE_PLUGIN_ROOT;
    delete process.env.QODER_PLUGIN_ROOT;
    delete process.env.OMQ_PLUGIN_ROOT;
  });

  afterEach(() => {
    restoreEnv();
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('discovers the root registered under this fork\'s marketplace slug', async () => {
    // Shape taken from this machine's own registry: a `plugins install <dir>`
    // install of this fork registers as oh-my-qoder@local under
    // plugins/cache/local/oh-my-qoder/<version>.
    const pluginsDir = pluginsDirOf();
    const installed = cacheRoot(pluginsDir, 'local', 'oh-my-qoder', '0.1.0');
    writeRegistry(pluginsDir, {
      'oh-my-qoder@local': [{ installPath: installed, version: '0.1.0', enabled: true }],
    });

    const installer = await freshInstaller();

    expect(installer.getInstalledOmcPluginRoots()).toContain(installed);
  });

  it('discovers a marketplace-channel install of this fork', async () => {
    const pluginsDir = pluginsDirOf();
    const installed = cacheRoot(pluginsDir, 'omq', 'oh-my-qoder', '0.1.0');
    writeRegistry(pluginsDir, {
      'oh-my-qoder@omq': [{ installPath: installed, version: '0.1.0', enabled: true }],
    });

    const installer = await freshInstaller();

    expect(installer.getInstalledOmcPluginRoots()).toContain(installed);
  });

  it('ignores an unrelated plugin instead of treating it as ours', async () => {
    const pluginsDir = pluginsDirOf();
    const installed = cacheRoot(pluginsDir, 'other', 'somebody-else', '1.0.0');
    writeRegistry(pluginsDir, {
      'somebody-else@other': [{ installPath: installed, version: '1.0.0' }],
    });

    const installer = await freshInstaller();

    expect(installer.getInstalledOmcPluginRoots()).toEqual([]);
  });

  it('still resolves an ancestor-shaped install left behind by an upgrade', async () => {
    const pluginsDir = pluginsDirOf();
    const installed = cacheRoot(pluginsDir, 'omc', 'oh-my-claudecode', '4.14.4');
    writeRegistry(pluginsDir, {
      'oh-my-claudecode@omc': [{ installPath: installed, version: '4.14.4' }],
    });

    const installer = await freshInstaller();

    expect(installer.getInstalledOmcPluginRoots()).toContain(installed);
  });
});
