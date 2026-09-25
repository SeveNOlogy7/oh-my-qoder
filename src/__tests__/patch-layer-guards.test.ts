/**
 * Patch-layer guards for the shipped scripts and installer text.
 *
 * These assert on the shipped *text* rather than a runtime behaviour, because the
 * behaviour they protect is "which path or URL gets interpolated into a command
 * the user's shell runs later" -- reproducing that needs a whole install. The
 * repo already guards the same class of defect textually in
 * `src/skills/__tests__/skill-config-dir.test.ts`, and a text guard still meets
 * the real bar here: removing the patch turns this suite red.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const hookScript = readFileSync(join(repoRoot, 'scripts', 'session-start.mjs'), 'utf8');
const hookTemplate = readFileSync(join(repoRoot, 'templates', 'hooks', 'session-start.mjs'), 'utf8');

/** package.json's repository is the one owner every shipped URL must agree with. */
function canonicalOwner(): string {
  const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as {
    repository?: string | { url?: string };
  };
  const url = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
  const owner = /github(?:usercontent)?\.com[/:]([^/]+)\//.exec(String(url))?.[1];
  if (!owner) throw new Error('package.json declares no github repository to check against');
  return owner;
}

describe('scripts/session-start.mjs plugin cache discovery', () => {
  // The hook built `plugins/cache/omq/oh-my-qoder` by hand, which is wrong for
  // every marketplace slug but `omq` -- a local install lands under `local`, so
  // the installed hook kept looking at a directory that does not exist.
  it('discovers the plugin cache through the shared helper instead of one slug', () => {
    expect(hookScript).toMatch(/from '\.\/lib\/plugin-cache-dir\.mjs'/);
    expect(hookScript).toContain('resolvePluginCacheBase(');
    expect(hookScript).not.toMatch(/['"]cache['"]\s*,\s*['"]omq['"]/);
  });
});

describe('templates/hooks/session-start.mjs repository identity', () => {
  // This template is copied into the user's config root as an installed hook, so
  // a stale ancestor or sandbox owner ships a wrong URL to every user -- and no
  // runtime path fails unless someone happens to reach it.
  it('references only the canonical repository owner', () => {
    const owners = [...hookTemplate.matchAll(/github(?:usercontent)?\.com\/([^/\s'"]+)/g)]
      .map((match) => match[1]);
    expect(owners.length, 'the template has no repository URL -- this guard is now vacuous').toBeGreaterThan(0);
    expect([...new Set(owners)]).toEqual([canonicalOwner()]);
  });
});

describe('src/installer/index.ts statusline config root', () => {
  // The statusline command written into settings.json carried a literal
  // `${QODER_CONFIG_DIR:-$HOME/.qoder}` guess, so a CN install rendered the HUD
  // against the wrong root whenever the variable was absent from the hook's
  // environment. The helper derives it from the inferred root instead.
  it('derives the shell fallback root instead of hardcoding ~/.qoder', () => {
    const source = readFileSync(join(repoRoot, 'src', 'installer', 'index.ts'), 'utf8');
    expect(source).toContain('getDefaultConfigDirShellPath(');
    expect(source).not.toMatch(/QODER_CONFIG_DIR:-\$HOME\/\.qoder\}/);
  });
});
