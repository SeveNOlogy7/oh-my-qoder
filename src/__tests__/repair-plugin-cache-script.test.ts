import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const REPO_ROOT = join(__dirname, '..', '..');
const SCRIPT_PATH = join(REPO_ROOT, 'scripts', 'repair-plugin-cache.mjs');
const tempRoots: string[] = [];

function writePluginRoot(root: string, version: string): void {
  mkdirSync(join(root, 'hooks'), { recursive: true });
  mkdirSync(join(root, 'skills', 'omq-setup'), { recursive: true });
  mkdirSync(join(root, 'docs'), { recursive: true });
  writeFileSync(join(root, 'hooks', 'hooks.json'), '{}\n');
  writeFileSync(join(root, 'skills', 'omq-setup', 'SKILL.md'), '# setup\n');
  writeFileSync(join(root, 'docs', 'CLAUDE.md'), `<!-- OMQ:VERSION:${version} -->\n`);
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('repair-plugin-cache.mjs', () => {
  it('rewrites stale installed_plugins.json and keeps old cache path as a symlink fallback', () => {
    const root = mkdtempSync(join(tmpdir(), 'omc-repair-plugin-cache-'));
    tempRoots.push(root);

    const configDir = join(root, '.claude');
    const cacheBase = join(configDir, 'plugins', 'cache', 'omq', 'oh-my-qoder');
    const oldRoot = join(cacheBase, '4.11.6');
    const newRoot = join(cacheBase, '4.14.1');
    mkdirSync(join(configDir, 'plugins'), { recursive: true });
    writePluginRoot(oldRoot, '4.11.6');
    writePluginRoot(newRoot, '4.14.1');
    writeFileSync(join(configDir, 'plugins', 'installed_plugins.json'), JSON.stringify({
      version: 2,
      plugins: {
        'oh-my-qoder@omq': [{ installPath: oldRoot, version: '4.11.6', enabled: true }],
      },
    }, null, 2));

    const result = spawnSync(process.execPath, [SCRIPT_PATH], {
      env: { ...process.env, QODER_CONFIG_DIR: configDir, OMQ_REPAIR_PLUGIN_CACHE_PLATFORM: 'linux' },
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Repaired plugin cache references');

    const registry = JSON.parse(readFileSync(join(configDir, 'plugins', 'installed_plugins.json'), 'utf-8'));
    expect(registry.plugins['oh-my-qoder@omq'][0]).toMatchObject({
      installPath: newRoot,
      version: '4.14.1',
      enabled: true,
    });
    expect(existsSync(oldRoot)).toBe(true);
    expect(lstatSync(oldRoot).isSymbolicLink()).toBe(true);
    expect(resolve(dirname(oldRoot), readlinkSync(oldRoot))).toBe(newRoot);
    expect(existsSync(join(oldRoot, 'hooks', 'hooks.json'))).toBe(true);
  });

  it('resolves the config root from QODERCN_CONFIG_DIR, the CN distribution\'s own variable', () => {
    const root = mkdtempSync(join(tmpdir(), 'omq-repair-cn-config-'));
    tempRoots.push(root);

    const configDir = join(root, '.qoder-cn');
    const cacheBase = join(configDir, 'plugins', 'cache', 'local', 'oh-my-qoder');
    const oldRoot = join(cacheBase, '4.11.6');
    const newRoot = join(cacheBase, '4.14.1');
    mkdirSync(join(configDir, 'plugins'), { recursive: true });
    writePluginRoot(oldRoot, '4.11.6');
    writePluginRoot(newRoot, '4.14.1');
    writeFileSync(join(configDir, 'plugins', 'installed_plugins.json'), JSON.stringify({
      version: 2,
      plugins: {
        'oh-my-qoder@local': [{ installPath: oldRoot, version: '4.11.6', enabled: true }],
      },
    }, null, 2));

    const env: Record<string, string> = { ...process.env as Record<string, string>, OMQ_REPAIR_PLUGIN_CACHE_PLATFORM: 'linux' };
    delete env.QODER_CONFIG_DIR;
    env.QODERCN_CONFIG_DIR = configDir;
    // Keep the child hermetic: without QODER_CONFIG_DIR the resolver falls back to
    // the home directory, and the fallback must not be the developer's real one.
    env.HOME = root;
    env.USERPROFILE = root;

    const result = spawnSync(process.execPath, [SCRIPT_PATH], { env, encoding: 'utf-8' });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Repaired plugin cache references');
    const registry = JSON.parse(readFileSync(join(configDir, 'plugins', 'installed_plugins.json'), 'utf-8'));
    expect(registry.plugins['oh-my-qoder@local'][0]).toMatchObject({ installPath: newRoot, version: '4.14.1' });
  });

  it('repairs a registry entry whose old cache path was already deleted', () => {
    const root = mkdtempSync(join(tmpdir(), 'omc-repair-missing-cache-'));
    tempRoots.push(root);

    const configDir = join(root, '.claude');
    const cacheBase = join(configDir, 'plugins', 'cache', 'omq', 'oh-my-qoder');
    const oldRoot = join(cacheBase, '4.11.6');
    const newRoot = join(cacheBase, '4.14.1');
    mkdirSync(join(configDir, 'plugins'), { recursive: true });
    writePluginRoot(newRoot, '4.14.1');
    writeFileSync(join(configDir, 'plugins', 'installed_plugins.json'), JSON.stringify({
      'oh-my-qoder@omq': [{ installPath: oldRoot, version: '4.11.6' }],
    }, null, 2));

    const result = spawnSync(process.execPath, [SCRIPT_PATH], {
      env: { ...process.env, QODER_CONFIG_DIR: configDir, OMQ_REPAIR_PLUGIN_CACHE_PLATFORM: 'linux' },
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);
    expect(existsSync(oldRoot)).toBe(true);
    expect(lstatSync(oldRoot).isSymbolicLink()).toBe(true);
    expect(resolve(dirname(oldRoot), readlinkSync(oldRoot))).toBe(newRoot);
    expect(existsSync(join(oldRoot, 'hooks', 'hooks.json'))).toBe(true);
    const registry = JSON.parse(readFileSync(join(configDir, 'plugins', 'installed_plugins.json'), 'utf-8'));
    expect(registry['oh-my-qoder@omq'][0]).toMatchObject({
      installPath: newRoot,
      version: '4.14.1',
    });
  });

  it.runIf(process.platform !== 'win32')('repairs Unix cache hooks from direct node to the find-node bootstrap', () => {
    const root = mkdtempSync(join(tmpdir(), 'omc-repair-unix-hooks-'));
    tempRoots.push(root);

    const configDir = join(root, '.claude');
    const cacheBase = join(configDir, 'plugins', 'cache', 'omq', 'oh-my-qoder');
    const pluginRoot = join(cacheBase, '4.14.4');
    writePluginRoot(pluginRoot, '4.14.4');
    writeFileSync(join(pluginRoot, 'hooks', 'hooks.json'), JSON.stringify({
      hooks: {
        SessionEnd: [{
          matcher: '*',
          hooks: [{
            type: 'command',
            command: 'node "$QODER_PLUGIN_ROOT"/scripts/run.cjs "$QODER_PLUGIN_ROOT"/scripts/session-end.mjs',
          }],
        }],
      },
    }, null, 2));

    const result = spawnSync(process.execPath, [SCRIPT_PATH], {
      env: { ...process.env, QODER_CONFIG_DIR: configDir },
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('hooks=platform');
    const hooksJson = JSON.parse(readFileSync(join(pluginRoot, 'hooks', 'hooks.json'), 'utf-8'));
    expect(hooksJson.hooks.SessionEnd[0].hooks[0].command).toBe(
      'sh "$QODER_PLUGIN_ROOT"/scripts/find-node.sh "$QODER_PLUGIN_ROOT"/scripts/run.cjs "$QODER_PLUGIN_ROOT"/scripts/session-end.mjs',
    );
  });

  it.runIf(process.platform !== 'win32')('repairs every bundled direct-node hook command to find-node on Unix/macOS', () => {
    const root = mkdtempSync(join(tmpdir(), 'omc-repair-unix-bundled-hooks-'));
    tempRoots.push(root);

    const configDir = join(root, '.claude');
    const cacheBase = join(configDir, 'plugins', 'cache', 'omq', 'oh-my-qoder');
    const pluginRoot = join(cacheBase, '4.14.4');
    writePluginRoot(pluginRoot, '4.14.4');
    writeFileSync(
      join(pluginRoot, 'hooks', 'hooks.json'),
      readFileSync(join(REPO_ROOT, 'hooks', 'hooks.json'), 'utf-8'),
    );

    const result = spawnSync(process.execPath, [SCRIPT_PATH], {
      env: { ...process.env, QODER_CONFIG_DIR: configDir },
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);
    const hooksJson = JSON.parse(readFileSync(join(pluginRoot, 'hooks', 'hooks.json'), 'utf-8')) as {
      hooks: Record<string, Array<{ hooks: Array<{ command?: string }> }>>;
    };
    const commands = Object.entries(hooksJson.hooks).flatMap(([event, groups]) =>
      groups.flatMap(group =>
        group.hooks
          .map(hook => hook.command)
          .filter((command): command is string => typeof command === 'string')
          .map(command => ({ event, command })),
      ),
    );

    expect(commands.length).toBeGreaterThan(0);
    for (const { event, command } of commands) {
      expect(command, event).toMatch(/^sh "\$QODER_PLUGIN_ROOT"\/scripts\/find-node\.sh "\$QODER_PLUGIN_ROOT"\/scripts\/run\.cjs /);
      expect(command, event).not.toContain('/bin/sh');
    }
  });

  it('repairs Windows cache hooks from find-node to direct node', () => {
    const root = mkdtempSync(join(tmpdir(), 'omc-repair-win-hooks-'));
    tempRoots.push(root);

    const configDir = join(root, '.claude');
    const cacheBase = join(configDir, 'plugins', 'cache', 'omq', 'oh-my-qoder');
    const pluginRoot = join(cacheBase, '4.14.4');
    writePluginRoot(pluginRoot, '4.14.4');
    writeFileSync(join(pluginRoot, 'hooks', 'hooks.json'), JSON.stringify({
      hooks: {
        SessionEnd: [{
          matcher: '*',
          hooks: [{
            type: 'command',
            command: 'sh "$QODER_PLUGIN_ROOT"/scripts/find-node.sh "$QODER_PLUGIN_ROOT"/scripts/run.cjs "$QODER_PLUGIN_ROOT"/scripts/session-end.mjs',
          }],
        }],
      },
    }, null, 2));

    const result = spawnSync(process.execPath, [SCRIPT_PATH], {
      env: { ...process.env, QODER_CONFIG_DIR: configDir, OMQ_REPAIR_PLUGIN_CACHE_PLATFORM: 'win32' },
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);
    const hooksJson = JSON.parse(readFileSync(join(pluginRoot, 'hooks', 'hooks.json'), 'utf-8'));
    expect(hooksJson.hooks.SessionEnd[0].hooks[0].command).toBe(
      'node "$QODER_PLUGIN_ROOT"/scripts/run.cjs "$QODER_PLUGIN_ROOT"/scripts/session-end.mjs',
    );
  });

  it('setup instructions delegate cache resolution and retain phase repair without unsafe deletion', () => {
    const setupSkill = readFileSync(join(REPO_ROOT, 'skills', 'omq-setup', 'SKILL.md'), 'utf-8');
    const phase = readFileSync(join(REPO_ROOT, 'skills', 'omq-setup', 'phases', '02-configure.md'), 'utf-8');

    const activeRootIndex = setupSkill.indexOf('## Active Plugin Root Resolution');
    const repairInvocationIndex = setupSkill.indexOf('scripts/repair-plugin-cache.mjs');
    const preSetupCheckIndex = setupSkill.indexOf('## Pre-Setup Check');
    expect(activeRootIndex).toBeGreaterThan(-1);
    // The fork resolves the plugin root inside this section and hands stale
    // references to the script before any prompt runs; the ancestor instead
    // forbade the skill from resolving at all, which is not how Qoder CN's
    // stale QODER_PLUGIN_ROOT after a marketplace update is handled here.
    expect(repairInvocationIndex).toBeGreaterThan(activeRootIndex);
    expect(repairInvocationIndex).toBeLessThan(preSetupCheckIndex);
    expect(phase).toContain('Repair Stale Plugin Cache References');
    expect(phase).toContain('repair-plugin-cache.mjs');
    expect(phase).not.toContain('rmSync(p.join(b,x)');
  });
});
