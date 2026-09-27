import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// The flake list is the only thing standing between a 999-entry win32 baseline and
// a gate that is red on almost every push, so its two failure modes are both pinned:
// letting flake through (too loose) and excusing a real new failure (too silent).
const SCRIPT = 'scripts/known-failures.mjs';
const FLAKY_A = 'src/__tests__/flake_subject.test.ts > flake subject > flips in one direction';
const FLAKY_B = 'src/__tests__/flake_subject.test.ts > flake subject > flips in the other direction';
const STABLE = 'src/__tests__/flake_subject.test.ts > flake subject > never flaps';

const log = (failLines: string[]) => {
  const files = new Set(failLines.map((l) => l.trim().split(' > ')[0])).size;
  return [' RUN  v3.2.4', ...failLines, ` Test Files  ${files} failed | 1 passed (2)`, `      Tests  ${failLines.length} failed | 1 passed (2)`, ''].join('\n');
};

const check = (args: string[], input: string) =>
  spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', input });

describe('known-failures flake list', () => {
  let dir: string;
  const baseline = () => join(dir, 'baseline.json');
  const flakeList = () => join(dir, 'flaky.json');

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'flake-list-'));
    writeFileSync(baseline(), JSON.stringify({ metadata: { platform: 'win32' }, failures: [FLAKY_B, STABLE] }));
    writeFileSync(
      flakeList(),
      JSON.stringify({ metadata: { platform: 'win32', rule: 'test fixture' }, entries: [{ entry: FLAKY_A, flips: 2 }, { entry: FLAKY_B, flips: 1 }] }),
    );
  });

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  // Must be a function: the describe body runs before beforeAll creates `dir`.
  const base = () => ['--check', `--baseline=${baseline()}`];

  it('exempts a listed title in both directions', () => {
    // FLAKY_A fails this run (would be NEW), FLAKY_B is absent (would be STALE).
    const r = check([...base(), `--flake-list=${flakeList()}`], log([` FAIL  ${FLAKY_A}`, ` FAIL  ${STABLE}`]));
    expect(r.stdout).toContain('All failures match baseline');
    expect(r.stdout).toMatch(/Flakes:.*holds 2 titles/);
    expect(r.status).toBe(0);
  });

  it('still reports the same delta without the list', () => {
    const r = check(base(), log([` FAIL  ${FLAKY_A}`, ` FAIL  ${STABLE}`]));
    expect(r.status).not.toBe(0);
    expect(`${r.stdout}${r.stderr}`).toContain('NEW failure');
    expect(`${r.stdout}${r.stderr}`).toContain('stale baseline entry');
  });

  it('is a title allowlist, not a file allowlist', () => {
    // A different title in a file that has listed flakes must still go red.
    const unlisted = `${FLAKY_A.replace(' > flips in one direction', '')} > an unlisted sibling title`;
    const r = check([...base(), `--flake-list=${flakeList()}`], log([` FAIL  ${unlisted}`, ` FAIL  ${STABLE}`]));
    expect(r.status).not.toBe(0);
    expect(`${r.stdout}${r.stderr}`).toContain(unlisted);
  });

  it('refuses a flake list from another platform', () => {
    writeFileSync(join(dir, 'linux-baseline.json'), JSON.stringify({ metadata: { platform: 'linux' }, failures: [] }));
    const r = check(
      ['--check', `--baseline=${join(dir, 'linux-baseline.json')}`, `--flake-list=${flakeList()}`],
      log([]),
    );
    expect(r.status).toBe(2);
    expect(`${r.stdout}${r.stderr}`).toMatch(/declares "win32".*declares "linux"|platform/i);
  });
});
