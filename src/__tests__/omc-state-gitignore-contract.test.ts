import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

describe('.omq gitignore state contract', () => {
  it('ignores runtime .omq state while allowing project skills to be committed intentionally', () => {
    const gitignore = readFileSync(resolve(process.cwd(), '.gitignore'), 'utf-8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    expect(gitignore).toEqual(expect.arrayContaining([
      '!.omq/',
      '.omq/*',
      '!.omq/skills/',
      '!.omq/skills/**',
    ]));

    expect(gitignore.indexOf('!.omq/')).toBeLessThan(gitignore.indexOf('.omq/*'));
    expect(gitignore.indexOf('.omq/*')).toBeLessThan(gitignore.indexOf('!.omq/skills/'));
    expect(gitignore.indexOf('!.omq/skills/')).toBeLessThan(gitignore.indexOf('!.omq/skills/**'));
  });
});
