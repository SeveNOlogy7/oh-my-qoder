/**
 * Payload validation must accept the artifact this fork actually ships.
 *
 * The adoption left the required-payload lists pointing at the ancestor's
 * artifact shape -- `.claude-plugin/plugin.json`, `commands/omc-setup.md` and a
 * `bridge/claude-md-coordinator.cjs` this fork never builds -- so a genuine
 * installed copy of oh-my-qoder can never validate, and every caller that gates
 * on payload completeness (plugin-mode detection, cache sync, hook dedup) falls
 * back to the standalone branch. b37141e is the authority for all four lists.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { validatePluginCachePayload } from '../index.js';

function write(root: string, relPath: string, content: string): void {
  const abs = join(root, relPath);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, content, 'utf-8');
}

function makeForkPayloadRoot(root: string): void {
  write(root, '.qoder-plugin/plugin.json', JSON.stringify({
    name: 'oh-my-qoder',
    commands: './commands/',
    skills: ['./skills/plan/'],
  }, null, 2));
  write(root, 'package.json', '{ "name": "oh-my-qoder" }');
  write(root, 'dist/hooks/skill-bridge.cjs', '// built\n');
  write(root, 'bridge/cli.cjs', '// built\n');
  write(root, 'hooks/hooks.json', JSON.stringify({ hooks: {} }));
  write(root, 'commands/omq-setup.md', '# omq-setup\n');
  write(root, 'skills/plan/SKILL.md', '---\nname: omq-plan\n---\n\nbody\n');
}

describe('plugin payload validation against the fork artifact shape', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'omq-payload-shape-'));
    makeForkPayloadRoot(root);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('accepts a payload root that looks like this fork installed plugin', () => {
    const result = validatePluginCachePayload(root);

    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('still rejects a payload root missing the manifest directory', () => {
    rmSync(join(root, '.qoder-plugin'), { recursive: true, force: true });

    const result = validatePluginCachePayload(root);

    expect(result.valid).toBe(false);
    expect(result.errors.some(error => error.includes('.qoder-plugin/plugin.json'))).toBe(true);
  });

  it('still rejects a manifest that declares a skill file which is absent', () => {
    rmSync(join(root, 'skills', 'plan', 'SKILL.md'), { force: true });

    const result = validatePluginCachePayload(root);

    expect(result.valid).toBe(false);
    expect(result.errors.some(error => error.includes('skills/plan/SKILL.md'))).toBe(true);
  });
});
