/**
 * Plugin-context detection must answer for the env var this host actually exports.
 *
 * Qoder CLI exports QODER_PLUGIN_ROOT; the ancestor's manifests and shim bodies carry
 * CLAUDE_PLUGIN_ROOT. Both detectors in src/installer/index.ts looked at the ancestor
 * name only, so a plugin run under this host reported "not a plugin" and the installer
 * took the copy-to-config-root path it is supposed to skip inside a plugin install.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isProjectScopedPlugin, isRunningAsPlugin } from '../index.js';

const ENV_KEYS = ['QODER_PLUGIN_ROOT', 'CLAUDE_PLUGIN_ROOT', 'OMQ_PLUGIN_ROOT'] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe('isRunningAsPlugin', () => {
  it('reports plugin context when only the Qoder host variable is set', () => {
    process.env.QODER_PLUGIN_ROOT = '/install/cache/oh-my-qoder/0.1.0';
    expect(isRunningAsPlugin()).toBe(true);
  });

  it('still reports plugin context for the ancestor variable', () => {
    process.env.CLAUDE_PLUGIN_ROOT = '/install/cache/oh-my-claudecode/5.0.0';
    expect(isRunningAsPlugin()).toBe(true);
  });

  it('reports no plugin context when neither is set', () => {
    expect(isRunningAsPlugin()).toBe(false);
  });
});

describe('isProjectScopedPlugin', () => {
  it('does not answer "global" just because the ancestor variable is absent', () => {
    // A root outside ~/.qoder*/plugins is project-scoped; with QODER_PLUGIN_ROOT alone
    // the detector returned false, which is what let a project install touch global
    // settings.
    process.env.QODER_PLUGIN_ROOT = '/some/project/.qoder/plugins/oh-my-qoder';
    expect(isProjectScopedPlugin()).toBe(true);
  });
});
