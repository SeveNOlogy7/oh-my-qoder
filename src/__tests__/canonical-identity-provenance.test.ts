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

/**
 * Owner/repo visibility rule (#60). Every reference to a lineage repo name
 * (oh-my-qoder and its ancestors) must resolve to an explicitly allowlisted
 * owner/repo slug, whether it appears as a github URL or as a bare slug. This
 * is the class neither the URL rule (canonical repo name only) nor the
 * namespace rule (guidance addresses only) could see.
 */
describe('owner/repo visibility rule', () => {
  let fixtureDir: string;

  beforeEach(() => {
    fixtureDir = mkdtempSync(join(tmpdir(), 'omq-ownerslug-'));
    writeFileSync(join(fixtureDir, 'package.json'), JSON.stringify(MINIMAL_PKG));
  });

  afterEach(() => {
    rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('passes canonical URL and bare canonical slug references', () => {
    writeFileSync(
      join(fixtureDir, 'README.md'),
      [
        'Install from https://github.com/qoder-plugins/oh-my-qoder',
        'or clone qoder-plugins/oh-my-qoder locally.',
      ].join('\n'),
    );

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ownerslug).toEqual([]);
    expect(parsed.ownerslug_refs_seen).toBeGreaterThanOrEqual(2);
  });

  it('flags a bare foreign-owner slug naming this repo', () => {
    writeFileSync(
      join(fixtureDir, 'README.md'),
      'Install it from local-attacker/oh-my-qoder today.\n',
    );

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ownerslug.length).toBe(1);
    expect(parsed.ownerslug[0].slugs).toContain('local-attacker/oh-my-qoder');
  });

  it('flags a URL naming an ancestor repo under a NEW foreign owner', () => {
    // The URL rule only checks the CANONICAL repo name, so a brand-new owner
    // of oh-my-claudecode slips past it; this rule is what sees it.
    mkdirSync(join(fixtureDir, 'docs'), { recursive: true });
    writeFileSync(
      join(fixtureDir, 'docs', 'setup.md'),
      'Upstream docs: https://github.com/neworg/oh-my-claudecode\n',
    );

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ownerslug.length).toBe(1);
    expect(parsed.ownerslug[0].slugs).toContain('neworg/oh-my-claudecode');
  });

  it('passes allowlisted ancestor references in prose', () => {
    mkdirSync(join(fixtureDir, 'docs'), { recursive: true });
    writeFileSync(
      join(fixtureDir, 'docs', 'MIGRATION.md'),
      'Users coming from Yeachan-Heo/oh-my-claudecode can migrate directly.\n',
    );

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ownerslug).toEqual([]);
    // The prose reference plus the fixture package.json's own canonical URL.
    expect(parsed.ownerslug_refs_seen).toBe(2);
  });

  it('passes the allowlisted fork and alias-seed slugs', () => {
    mkdirSync(join(fixtureDir, 'skills', 'psm'), { recursive: true });
    writeFileSync(
      join(fixtureDir, 'skills', 'psm', 'notes.md'),
      [
        'Fork evidence: SeveNOlogy7/oh-my-qoder run logs.',
        'Alias seed: spring-ai-alibaba/oh-my-qoder.',
      ].join('\n'),
    );

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ownerslug).toEqual([]);
    // Two slugs on separate lines, plus the trailing period after
    // spring-ai-alibaba/oh-my-qoder is prose punctuation and now counts the
    // reference (it is allowlisted, so it passes) instead of hiding it.
    expect(parsed.ownerslug_refs_seen).toBe(3);
  });

  it('does not flag file paths that merely contain a lineage name', () => {
    writeFileSync(
      join(fixtureDir, 'README.md'),
      ['Run bin/oh-my-qoder.js after install.', 'Config lives at etc/oh-my-claudecode.yaml.'].join('\n'),
    );

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ownerslug).toEqual([]);
    // Only the fixture package.json's canonical URL; neither file path counts.
    expect(parsed.ownerslug_refs_seen).toBe(1);
  });

  it('flags a foreign-owner slug glued to a sentence period (bare and URL)', () => {
    // Regression (#60 follow-up): the original `(?![\w.-])` lookahead treated
    // the trailing period as a filename dot and hid the reference entirely.
    mkdirSync(join(fixtureDir, 'docs'), { recursive: true });
    writeFileSync(
      join(fixtureDir, 'README.md'),
      'Clone it from evil-inc/oh-my-qoder.\n',
    );
    writeFileSync(
      join(fixtureDir, 'docs', 'pointer.md'),
      'See https://github.com/neworg/oh-my-codex.\n',
    );

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ownerslug.length).toBe(2);
    const allSlugs = parsed.ownerslug.flatMap((v: { slugs: string[] }) => v.slugs);
    expect(allSlugs).toContain('evil-inc/oh-my-qoder');
    expect(allSlugs).toContain('neworg/oh-my-codex');
  });

  it('does not flag allowlisted references ending in prose punctuation, and still flags non-allowlisted ones', () => {
    // The extension exemption must not swing the other way: an allowlisted
    // slug at the end of a sentence is legal prose, while a foreign slug
    // before a comma (never a filename dot) is still a violation.
    mkdirSync(join(fixtureDir, 'docs'), { recursive: true });
    writeFileSync(
      join(fixtureDir, 'docs', 'prose.md'),
      [
        'Users arrive from Yeachan-Heo/oh-my-claudecode.',
        'Fork evidence lives in SeveNOlogy7/oh-my-qoder logs.',
      ].join('\n'),
    );
    writeFileSync(
      join(fixtureDir, 'README.md'),
      'Do not trust someotherteam/oh-my-qoder, or any mirror like it.\n',
    );

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ownerslug.length).toBe(1);
    expect(parsed.ownerslug[0].slugs).toContain('someotherteam/oh-my-qoder');
  });
});

/**
 * Plugin-namespace rule. Guidance files are the text a model or user is told to
 * act on, so a skill/agent address there that is not this plugin's own namespace
 * is a defect even though it is not a URL: `Skill("other-plugin:plan")` resolves
 * to nothing on this host. The rule is scoped to that surface on purpose --
 * TypeScript matchers accept foreign spellings as input by design, and migration
 * docs name the ancestor product deliberately.
 */
describe('plugin namespace rule', () => {
  let fixtureDir: string;

  const OWN = 'test-pkg';

  beforeEach(() => {
    fixtureDir = mkdtempSync(join(tmpdir(), 'omq-namespace-'));
    writeFileSync(join(fixtureDir, 'package.json'), JSON.stringify(MINIMAL_PKG));
    mkdirSync(join(fixtureDir, '.qoder-plugin'), { recursive: true });
    writeFileSync(
      join(fixtureDir, '.qoder-plugin', 'plugin.json'),
      JSON.stringify({ name: OWN }),
    );
  });

  afterEach(() => {
    rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('flags a foreign skill identifier inside shipped skill guidance', () => {
    mkdirSync(join(fixtureDir, 'skills', 'demo'), { recursive: true });
    writeFileSync(
      join(fixtureDir, 'skills', 'demo', 'SKILL.md'),
      'Invoke it with `Skill("other-plugin:plan")`.\n',
    );

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.namespace.length).toBe(1);
    expect(parsed.namespace[0].file).toBe('skills/demo/SKILL.md');
    expect(parsed.namespace[0].namespace).toBe('other-plugin');
  });

  it('flags a foreign slash-command form in a shipped command file', () => {
    mkdirSync(join(fixtureDir, 'commands'), { recursive: true });
    writeFileSync(
      join(fixtureDir, 'commands', 'demo.md'),
      'Run /other-plugin:cancel to clear state.\n',
    );

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.namespace.map((v: any) => v.file)).toEqual(['commands/demo.md']);
  });

  it('flags an unresolvable agent type in the canonical guidance source', () => {
    mkdirSync(join(fixtureDir, 'docs'), { recursive: true });
    writeFileSync(
      join(fixtureDir, 'docs', 'CLAUDE.md'),
      '<!-- OMQ:START -->\nUse Task(subagent_type="other-plugin:executor", ...)\n<!-- OMQ:END -->\n',
    );

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.namespace.length).toBe(1);
    expect(parsed.namespace[0].file).toBe('docs/CLAUDE.md');
  });

  it('accepts this plugin own namespace in the same positions', () => {
    mkdirSync(join(fixtureDir, 'skills', 'demo'), { recursive: true });
    writeFileSync(
      join(fixtureDir, 'skills', 'demo', 'SKILL.md'),
      `Invoke with \`Skill("${OWN}:plan")\` or /${OWN}:cancel.\n`,
    );

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.namespace).toEqual([]);
  });

  it('does NOT apply to TypeScript matchers, which accept foreign spellings as input', () => {
    mkdirSync(join(fixtureDir, 'src'), { recursive: true });
    writeFileSync(
      join(fixtureDir, 'src', 'alias-resolver.ts'),
      'const tolerant = "other-plugin:plan";\n',
    );

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.namespace).toEqual([]);
  });

  it('does NOT apply to migration docs, which name the ancestor product on purpose', () => {
    mkdirSync(join(fixtureDir, 'docs'), { recursive: true });
    writeFileSync(
      join(fixtureDir, 'docs', 'MIGRATION.md'),
      'Users coming from `other-plugin:plan` should use this instead.\n',
    );

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.namespace).toEqual([]);
  });

  it('flags a foreign MCP tool name in guidance', () => {
    mkdirSync(join(fixtureDir, 'skills', 'demo'), { recursive: true });
    writeFileSync(
      join(fixtureDir, 'skills', 'demo', 'SKILL.md'),
      'ToolSearch(query="select:mcp__plugin_other-plugin_t__state_clear")\n',
    );

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.namespace.length).toBe(1);
    expect(parsed.namespace[0].namespace).toBe('other-plugin');
  });

  it('does NOT flag prose that merely contains a colon inside backticks', () => {
    mkdirSync(join(fixtureDir, 'skills', 'hud'), { recursive: true });
    writeFileSync(
      join(fixtureDir, 'skills', 'hud', 'SKILL.md'),
      [
        '| `repo:name` | Git repository name |',
        '| `ctx:67%` | Context window usage |',
        'Imports `homedir` from `node:os`.',
        'TypeError in src/hooks/session.ts:45 after restart',
        '',
      ].join('\n'),
    );

    const result = runCheck(fixtureDir);
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.namespace).toEqual([]);
  });
});
