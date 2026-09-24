import { describe, it, expect } from 'vitest';
import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HELPER = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'scripts', 'lib', 'config-dir.mjs');

/**
 * The HUD wrapper template destructures `getClaudeConfigDir` from the copy of this
 * helper that the installer drops into `<configDir>/hud/lib/`. Without the alias
 * the statusline throws on every render, and the HUD tests never caught it
 * because their fixtures add the alias themselves.
 */
describe('config-dir helper shipped to the HUD', () => {
  it('resolves the legacy symbol the HUD wrapper imports', async () => {
    const mod = await import(pathToFileURL(HELPER).href);

    expect(typeof mod.getClaudeConfigDir).toBe('function');
    expect(mod.getClaudeConfigDir).toBe(mod.getQoderConfigDir);
    expect(mod.getClaudeConfigDir()).toBe(mod.getQoderConfigDir());
  });
});
