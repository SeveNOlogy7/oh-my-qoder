/**
 * Tests for the ancestor provenance rule in scripts/check-canonical-identity.mjs.
 *
 * The provenance rule enforces path-level coverage: every scanned file under the
 * target must appear in ATTRIBUTION.json with a valid class. The rule does NOT
 * reuse isFixturePath or isProvenance, and does NOT inspect file content — a file
 * with zero ancestor URL mentions is still a violation if unlisted.
 *
 * Contract: { schemaVersion: 1, entries: [{ path, class, ... }] }
 * Valid classes: "ancestor-derived" | "omq-patched-ancestor" | "omq-original" | "generated"
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(__dirname, '..', '..', 'scripts', 'check-canonical-identity.mjs');

/** Minimal package.json so the script can resolve a canonical owner. */
const MINIMAL_PKG = {
  name: 'test-pkg',
  repository: { type: 'git', url: 'git+https://github.com/qoder-plugins/oh-my-qoder.git' },
};

function runCheck(
  dir: string,
  flags: string[] = [],
): { code: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync('node', [SCRIPT, dir, '--json', ...flags], {
      encoding: 'utf8',
      env: { ...process.env },
    });
    return { code: 0, stdout, stderr: '' };
  } catch (err: any) {
    return {
      code: err.status ?? 1,
      stdout: err.stdout?.toString() ?? '',
      stderr: err.stderr?.toString() ?? '',
    };
  }
}

/** Build a valid ATTRIBUTION.json covering the given relative paths. */
function makeAttribution(
  paths: string[],
  cls = 'omq-original',
  extra: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    schemaVersion: 1,
    entries: paths.map(path => ({ path, class: cls, ...extra })),
  });
}

describe('ancestor provenance rule', () => {
  let fixtureDir: string;

  beforeEach(() => {
    fixtureDir = mkdtempSync(join(tmpdir(), 'omq-provenance-'));
    writeFileSync(join(fixtureDir, 'package.json'), JSON.stringify(MINIMAL_PKG));
  });

  afterEach(() => {
    rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('produces no provenance violations when ATTRIBUTION.json is absent (lenient)', () => {
    // A file that does NOT reference the ancestor anywhere in its text.
    // With no ATTRIBUTION.json and without --require-attribution, the rule is inactive.
    mkdirSync(join(fixtureDir, 'src'), { recursive: true });
    writeFileSync(join(fixtureDir, 'src', 'index.ts'), 'export const x = 1;\n');

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.provenance).toEqual([]);
  });

  it('flags a file with NO ancestor URL in its text when unlisted in ATTRIBUTION.json', () => {
    // This is the critical regression test for the original defect:
    // the old code only inspected files whose TEXT mentioned the ancestor URL,
    // so a file with zero ancestor mentions passed even when unlisted.
    mkdirSync(join(fixtureDir, 'src'), { recursive: true });
    writeFileSync(join(fixtureDir, 'src', 'silent.ts'), '// No ancestor URL here at all\nexport const y = 2;\n');
    // ATTRIBUTION.json exists with correct schema but does NOT list src/silent.ts.
    writeFileSync(
      join(fixtureDir, 'ATTRIBUTION.json'),
      makeAttribution(['package.json']),
    );

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.provenance.length).toBeGreaterThanOrEqual(1);
    const files = parsed.provenance.map((v: any) => v.file);
    expect(files).toContain('src/silent.ts');
  });

  it('produces zero violations when ATTRIBUTION.json covers every scanned path', () => {
    mkdirSync(join(fixtureDir, 'src'), { recursive: true });
    writeFileSync(join(fixtureDir, 'src', 'hooks.ts'), 'export const h = () => {};\n');
    writeFileSync(join(fixtureDir, 'README.md'), '# Test\n');

    // List every file (except ATTRIBUTION.json itself, which is excluded by the rule).
    writeFileSync(
      join(fixtureDir, 'ATTRIBUTION.json'),
      makeAttribution(['package.json', 'src/hooks.ts', 'README.md']),
    );

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.provenance).toEqual([]);
  });

  it('exits non-zero when ATTRIBUTION.json is missing and --require-attribution is set', () => {
    mkdirSync(join(fixtureDir, 'src'), { recursive: true });
    writeFileSync(join(fixtureDir, 'src', 'index.ts'), 'export const x = 1;\n');
    // No ATTRIBUTION.json at all.

    const result = runCheck(fixtureDir, ['--require-attribution']);
    expect(result.code).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.provenance.length).toBeGreaterThanOrEqual(1);
    expect(parsed.provenance[0].reason).toContain('--require-attribution');
  });

  it('exits zero when ATTRIBUTION.json is missing without --require-attribution', () => {
    // Same fixture as above but without the flag — lenient behaviour preserved.
    mkdirSync(join(fixtureDir, 'src'), { recursive: true });
    writeFileSync(join(fixtureDir, 'src', 'index.ts'), 'export const x = 1;\n');

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.provenance).toEqual([]);
  });

  it('flags omq-patched-ancestor entry missing patchId as a violation', () => {
    mkdirSync(join(fixtureDir, 'src'), { recursive: true });
    writeFileSync(join(fixtureDir, 'src', 'patched.ts'), 'export const z = 3;\n');

    // omq-patched-ancestor without patchId (and without ancestorBlobSha).
    writeFileSync(
      join(fixtureDir, 'ATTRIBUTION.json'),
      JSON.stringify({
        schemaVersion: 1,
        entries: [
          { path: 'package.json', class: 'omq-original' },
          { path: 'src/patched.ts', class: 'omq-patched-ancestor' },
        ],
      }),
    );

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(1);
    const parsed = JSON.parse(result.stdout);
    const patched = parsed.provenance.find((v: any) => v.file === 'src/patched.ts');
    expect(patched).toBeDefined();
    expect(patched.reason).toContain('ancestorBlobSha');
    expect(patched.reason).toContain('patchId');
  });

  it('accepts omq-patched-ancestor entry with both ancestorBlobSha and patchId', () => {
    mkdirSync(join(fixtureDir, 'src'), { recursive: true });
    writeFileSync(join(fixtureDir, 'src', 'patched.ts'), 'export const z = 3;\n');

    writeFileSync(
      join(fixtureDir, 'ATTRIBUTION.json'),
      JSON.stringify({
        schemaVersion: 1,
        entries: [
          { path: 'package.json', class: 'omq-original' },
          {
            path: 'src/patched.ts',
            class: 'omq-patched-ancestor',
            ancestorBlobSha: 'abc123',
            patchId: 'pr-42',
          },
        ],
      }),
    );

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.provenance).toEqual([]);
  });

  it('rejects ATTRIBUTION.json with wrong schemaVersion', () => {
    writeFileSync(
      join(fixtureDir, 'ATTRIBUTION.json'),
      JSON.stringify({ schemaVersion: 2, entries: [] }),
    );

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.provenance[0].reason).toContain('schemaVersion');
  });

  it('rejects ATTRIBUTION.json with invalid class name', () => {
    mkdirSync(join(fixtureDir, 'src'), { recursive: true });
    writeFileSync(join(fixtureDir, 'src', 'a.ts'), 'export const a = 1;\n');
    writeFileSync(
      join(fixtureDir, 'ATTRIBUTION.json'),
      JSON.stringify({
        schemaVersion: 1,
        entries: [
          { path: 'package.json', class: 'omq-original' },
          { path: 'src/a.ts', class: 'derived' }, // not a valid hyphenated class
        ],
      }),
    );

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(1);
    const parsed = JSON.parse(result.stdout);
    const invalid = parsed.provenance.find((v: any) => v.file === 'src/a.ts');
    expect(invalid).toBeDefined();
    expect(invalid.reason).toContain('invalid class');
  });

  it('normalises backslashes in entry paths to forward slashes', () => {
    mkdirSync(join(fixtureDir, 'src'), { recursive: true });
    writeFileSync(join(fixtureDir, 'src', 'win.ts'), 'export const w = 1;\n');

    // Entry path uses backslashes — should be normalised and match.
    writeFileSync(
      join(fixtureDir, 'ATTRIBUTION.json'),
      JSON.stringify({
        schemaVersion: 1,
        entries: [
          { path: 'package.json', class: 'omq-original' },
          { path: 'src\\win.ts', class: 'omq-original' },
        ],
      }),
    );

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.provenance).toEqual([]);
  });

  it('does NOT reuse isFixturePath: test files are subject to provenance', () => {
    // A file under __tests__/ with no ancestor URL must still be listed.
    mkdirSync(join(fixtureDir, 'src', '__tests__'), { recursive: true });
    writeFileSync(
      join(fixtureDir, 'src', '__tests__', 'unit.test.ts'),
      "describe('x', () => { it('works', () => {}); });\n",
    );
    writeFileSync(
      join(fixtureDir, 'ATTRIBUTION.json'),
      makeAttribution(['package.json']),
    );

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(1);
    const parsed = JSON.parse(result.stdout);
    const files = parsed.provenance.map((v: any) => v.file);
    expect(files.some((f: string) => f.includes('__tests__'))).toBe(true);
  });
});

describe('canonical identity rule (unchanged)', () => {
  let fixtureDir: string;

  beforeEach(() => {
    fixtureDir = mkdtempSync(join(tmpdir(), 'omq-identity-'));
    writeFileSync(join(fixtureDir, 'package.json'), JSON.stringify(MINIMAL_PKG));
  });

  afterEach(() => {
    rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('passes when all URLs match the canonical owner', () => {
    writeFileSync(
      join(fixtureDir, 'README.md'),
      'See https://github.com/qoder-plugins/oh-my-qoder\n',
    );
    writeFileSync(
      join(fixtureDir, 'ATTRIBUTION.json'),
      makeAttribution(['package.json', 'README.md']),
    );

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.violations).toEqual([]);
  });

  it('flags a URL with a non-canonical owner', () => {
    writeFileSync(
      join(fixtureDir, 'README.md'),
      'See https://github.com/someone-else/oh-my-qoder\n',
    );
    writeFileSync(
      join(fixtureDir, 'ATTRIBUTION.json'),
      makeAttribution(['package.json', 'README.md']),
    );

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.violations.length).toBe(1);
    expect(parsed.violations[0].owner).toBe('someone-else');
  });

  it('allows provenance references (issues/pull URLs)', () => {
    writeFileSync(
      join(fixtureDir, 'CHANGELOG.md'),
      '@see https://github.com/someone-else/oh-my-qoder/issues/42\n',
    );
    writeFileSync(
      join(fixtureDir, 'ATTRIBUTION.json'),
      makeAttribution(['package.json', 'CHANGELOG.md']),
    );

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.violations).toEqual([]);
  });
});
