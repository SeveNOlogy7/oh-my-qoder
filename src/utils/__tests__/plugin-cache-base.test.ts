import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { resolvePluginCacheBase } from '../paths.js';

/**
 * `qoderclicn plugins install <dir>` registers the plugin under a `local`
 * marketplace directory, while a marketplace install lands under `omq`. Code that
 * hardcodes `plugins/cache/omq/` reports a local install as missing.
 */
describe('resolvePluginCacheBase', () => {
  let root: string;
  let configDir: string;

  const cacheDir = (slug: string, ...versions: string[]) => {
    for (const v of versions) {
      mkdirSync(join(configDir, 'plugins', 'cache', slug, 'oh-my-qoder', v), { recursive: true });
    }
  };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'omq-cache-base-'));
    configDir = join(root, 'config');
    mkdirSync(configDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('resolves a marketplace install', () => {
    cacheDir('omq', '4.1.5');
    expect(resolvePluginCacheBase(configDir)).toBe(join(configDir, 'plugins', 'cache', 'omq', 'oh-my-qoder'));
  });

  it('resolves a local-directory install', () => {
    cacheDir('local', '0.1.0');
    expect(resolvePluginCacheBase(configDir)).toBe(join(configDir, 'plugins', 'cache', 'local', 'oh-my-qoder'));
  });

  it('prefers the newest version across marketplace directories', () => {
    cacheDir('local', '0.1.0');
    cacheDir('omq', '4.1.5');
    expect(resolvePluginCacheBase(configDir)).toBe(join(configDir, 'plugins', 'cache', 'omq', 'oh-my-qoder'));
  });

  it('prefers the canonical slug when two marketplaces hold the same version', () => {
    cacheDir('local', '0.1.0');
    cacheDir('omq', '0.1.0');
    expect(resolvePluginCacheBase(configDir)).toBe(join(configDir, 'plugins', 'cache', 'omq', 'oh-my-qoder'));
  });

  it('falls back to the canonical slug when nothing is installed', () => {
    expect(resolvePluginCacheBase(configDir)).toBe(join(configDir, 'plugins', 'cache', 'omq', 'oh-my-qoder'));
  });

  it('ignores marketplace dirs that hold no version directory', () => {
    cacheDir('omq');
    cacheDir('local', '0.1.0');
    expect(resolvePluginCacheBase(configDir)).toBe(join(configDir, 'plugins', 'cache', 'local', 'oh-my-qoder'));
  });

  it('ignores other plugins cached beside oh-my-qoder', () => {
    mkdirSync(join(configDir, 'plugins', 'cache', 'other-market', 'some-plugin', '9.9.9'), { recursive: true });
    cacheDir('local', '0.1.0');
    expect(resolvePluginCacheBase(configDir)).toBe(join(configDir, 'plugins', 'cache', 'local', 'oh-my-qoder'));
  });

  it('ranks pre-release and multi-digit versions numerically', () => {
    cacheDir('a', '0.9.0');
    cacheDir('b', '0.10.0');
    expect(resolvePluginCacheBase(configDir)).toBe(join(configDir, 'plugins', 'cache', 'b', 'oh-my-qoder'));
  });

  it('survives an unreadable cache tree', () => {
    mkdirSync(join(configDir, 'plugins'), { recursive: true });
    writeFileSync(join(configDir, 'plugins', 'cache'), 'not a directory');
    expect(resolvePluginCacheBase(configDir)).toBe(join(configDir, 'plugins', 'cache', 'omq', 'oh-my-qoder'));
  });
});
