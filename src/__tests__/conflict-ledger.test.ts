/**
 * Tests for scripts/conflict-ledger.mjs
 *
 * Covers the pure classification logic with inline maps (no network, no FS).
 * Tests every conflict category and edge case.
 */
import { describe, it, expect } from 'vitest';
// @ts-expect-error -- .mjs script has no type declarations
import { classifyConflict, buildLedger, summarizeLedger, gitBlobSha, isGenerated, hopVerdict, patchLayerClass, pickObservation, buildPatchLayerRows, summarizePatchLayer, buildWatchRows, parseCarrier, laneNameFor, structuralCheck, renderPatchLayerMarkdown } from '../../scripts/conflict-ledger.mjs';

/** SHA constants for tests (look like git blob SHAs but are deterministic). */
const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const SHA_C = 'c'.repeat(40);
const SHA_D = 'd'.repeat(40);

describe('isGenerated', () => {
  it('identifies dist/ paths as generated', () => {
    expect(isGenerated('dist/index.js')).toBe(true);
    expect(isGenerated('dist/nested/file.d.ts')).toBe(true);
  });

  it('identifies bridge/ paths as generated', () => {
    expect(isGenerated('bridge/cli.cjs')).toBe(true);
  });

  it('does not mark src/ paths as generated', () => {
    expect(isGenerated('src/index.ts')).toBe(false);
    expect(isGenerated('scripts/build.mjs')).toBe(false);
  });
});

describe('classifyConflict', () => {
  it('classifies three-way conflict when all three versions differ', () => {
    const result = classifyConflict('src/index.ts', {
      lineageSha: SHA_A,
      targetSha: SHA_B,
      localSha: SHA_C,
    });

    expect(result).toEqual({
      path: 'src/index.ts',
      category: 'three-way',
      action: 'manual-merge-required',
      lineageSha: SHA_A,
      targetSha: SHA_B,
      localSha: SHA_C,
    });
  });

  it('classifies omq-only change when upstream did not modify', () => {
    // v4.15.1 == v5.0.0 (upstream unchanged), but OMQ differs
    const result = classifyConflict('src/utils.ts', {
      lineageSha: SHA_A,
      targetSha: SHA_A,
      localSha: SHA_B,
    });

    expect(result.category).toBe('omq-only');
    expect(result.action).toBe('cherry-pick-to-v5');
  });

  it('classifies upstream-only change when OMQ did not modify', () => {
    // OMQ == v4.15.1 (OMQ unchanged), but v5.0.0 differs
    const result = classifyConflict('src/config.ts', {
      lineageSha: SHA_A,
      targetSha: SHA_B,
      localSha: SHA_A,
    });

    expect(result.category).toBe('upstream-only');
    expect(result.action).toBe('fast-forward-to-v5');
  });

  it('classifies aligned when OMQ matches v5.0.0', () => {
    const result = classifyConflict('src/shared.ts', {
      lineageSha: SHA_A,
      targetSha: SHA_B,
      localSha: SHA_B,
    });

    expect(result.category).toBe('aligned');
    expect(result.action).toBe('none');
  });

  it('classifies upstream-deleted when file removed in v5.0.0', () => {
    const result = classifyConflict('skills/old/SKILL.md', {
      lineageSha: SHA_A,
      targetSha: null,
      localSha: SHA_B,
    });

    expect(result.category).toBe('upstream-deleted');
    expect(result.action).toBe('decide-restore-or-drop');
    expect(result.omqChanged).toBe(true);
  });

  it('marks upstream-deleted as accept-deletion when OMQ unchanged', () => {
    const result = classifyConflict('skills/old/SKILL.md', {
      lineageSha: SHA_A,
      targetSha: null,
      localSha: SHA_A,
    });

    expect(result.category).toBe('upstream-deleted');
    expect(result.action).toBe('accept-deletion');
    expect(result.omqChanged).toBe(false);
  });

  it('classifies omq-original when file not in v5.0.0', () => {
    const result = classifyConflict('bin/omq', {
      lineageSha: null,
      targetSha: null,
      localSha: SHA_A,
    });

    expect(result.category).toBe('omq-original');
    expect(result.action).toBe('keep-as-omq-specific');
  });

  it('classifies upstream-deleted with lineageSha when file in v4.15.1 but not v5.0.0', () => {
    const result = classifyConflict('lib/legacy.ts', {
      lineageSha: SHA_A,
      targetSha: null,
      localSha: SHA_B,
    });

    expect(result.category).toBe('upstream-deleted');
    expect(result.lineageSha).toBe(SHA_A);
    expect(result.localSha).toBe(SHA_B);
    expect(result.omqChanged).toBe(true);
  });

  it('classifies generated files regardless of tree membership', () => {
    const result = classifyConflict('dist/index.js', {
      lineageSha: SHA_A,
      targetSha: SHA_B,
      localSha: SHA_C,
    });

    expect(result.category).toBe('generated');
    expect(result.action).toBe('skip');
  });

  it('handles new-conflict when file not in v4.15.1 but differs in OMQ and v5.0.0', () => {
    const result = classifyConflict('src/new-feature.ts', {
      lineageSha: null,
      targetSha: SHA_A,
      localSha: SHA_B,
    });

    expect(result.category).toBe('new-conflict');
    expect(result.action).toBe('review-both-versions');
  });
});

describe('buildLedger', () => {
  it('builds a complete ledger from path arrays and maps', () => {
    const paths = ['src/a.ts', 'src/b.ts', 'bin/omq'];
    const lineage = new Map([['src/a.ts', SHA_A]]);
    const target = new Map([
      ['src/a.ts', SHA_B],
      ['src/b.ts', SHA_A],
    ]);
    const local = new Map([
      ['src/a.ts', SHA_C],
      ['src/b.ts', SHA_A],
      ['bin/omq', SHA_D],
    ]);

    const ledger = buildLedger(paths, { lineage, target, local });

    expect(ledger).toHaveLength(3);
    expect(ledger[0].category).toBe('three-way'); // src/a.ts: all differ
    expect(ledger[1].category).toBe('aligned'); // src/b.ts: OMQ == v5.0.0
    expect(ledger[2].category).toBe('omq-original'); // bin/omq: not in v5.0.0
  });
});

describe('summarizeLedger', () => {
  it('computes correct counts and actionable total', () => {
    const ledger = [
      { path: 'a.ts', category: 'three-way', action: 'manual-merge-required' },
      { path: 'b.ts', category: 'three-way', action: 'manual-merge-required' },
      { path: 'c.ts', category: 'omq-only', action: 'cherry-pick-to-v5' },
      { path: 'd.ts', category: 'aligned', action: 'none' },
      { path: 'e.ts', category: 'generated', action: 'skip' },
      { path: 'f.ts', category: 'upstream-deleted', action: 'decide-restore-or-drop' },
    ];

    const summary = summarizeLedger(ledger as any);

    expect(summary['three-way']).toBe(2);
    expect(summary['omq-only']).toBe(1);
    expect(summary['aligned']).toBe(1);
    expect(summary['generated']).toBe(1);
    expect(summary['upstream-deleted']).toBe(1);
    expect(summary.total).toBe(6);
    expect(summary.actionable).toBe(4); // 2 three-way + 1 omq-only + 1 upstream-deleted
    expect(summary.nonActionable).toBe(2); // 1 aligned + 1 generated
  });

  it('handles empty ledger', () => {
    const summary = summarizeLedger([]);

    expect(summary.total).toBe(0);
    expect(summary.actionable).toBe(0);
    expect(summary.nonActionable).toBe(0);
  });
});

describe('gitBlobSha', () => {
  it('computes a valid hex SHA for buffer content', () => {
    const sha = gitBlobSha(Buffer.from('hello world'));
    expect(sha).toMatch(/^[0-9a-f]{40}$/);
  });

  it('produces different SHAs for different content', () => {
    const sha1 = gitBlobSha(Buffer.from('content A'));
    const sha2 = gitBlobSha(Buffer.from('content B'));
    expect(sha1).not.toBe(sha2);
  });

  it('produces same SHA for same content', () => {
    const sha1 = gitBlobSha(Buffer.from('same content'));
    const sha2 = gitBlobSha(Buffer.from('same content'));
    expect(sha1).toBe(sha2);
  });
});

describe('integration: full ledger workflow', () => {
  it('classifies a realistic mixed scenario correctly', () => {
    const paths = [
      'src/installer/index.ts', // three-way
      'src/utils/paths.ts', // omq-only
      'src/config/loader.ts', // upstream-only
      'skills/old/SKILL.md', // upstream-deleted
      'bin/omq', // omq-original
      'dist/index.js', // generated
      'src/shared.ts', // aligned
    ];

    const lineage = new Map([
      ['src/installer/index.ts', SHA_A],
      ['src/utils/paths.ts', SHA_A],
      ['src/config/loader.ts', SHA_A],
      ['skills/old/SKILL.md', SHA_A],
      ['src/shared.ts', SHA_A],
    ]);

    const target = new Map([
      ['src/installer/index.ts', SHA_B],
      ['src/utils/paths.ts', SHA_A],
      ['src/config/loader.ts', SHA_B],
      ['src/shared.ts', SHA_B],
      ['dist/index.js', SHA_C],
    ]);

    const local = new Map([
      ['src/installer/index.ts', SHA_C],
      ['src/utils/paths.ts', SHA_B],
      ['src/config/loader.ts', SHA_A],
      ['skills/old/SKILL.md', SHA_D],
      ['bin/omq', SHA_D],
      ['dist/index.js', SHA_D],
      ['src/shared.ts', SHA_B],
    ]);

    const ledger = buildLedger(paths, { lineage, target, local });
    const summary = summarizeLedger(ledger);

    expect(summary['three-way']).toBe(1);
    expect(summary['omq-only']).toBe(1);
    expect(summary['upstream-only']).toBe(1);
    expect(summary['upstream-deleted']).toBe(1);
    expect(summary['omq-original']).toBe(1);
    expect(summary['generated']).toBe(1);
    expect(summary['aligned']).toBe(1);
    expect(summary.total).toBe(7);
    expect(summary.actionable).toBe(4); // three-way + omq-only + upstream-only + upstream-deleted
  });
});

describe('hopVerdict', () => {
  const lineage = new Map([
    ['same.ts', SHA_A],
    ['drift.ts', SHA_A],
    ['gone.ts', SHA_A],
  ]);
  const target = new Map([
    ['same.ts', SHA_A],
    ['drift.ts', SHA_B],
    ['brand-new.ts', SHA_A],
  ]);

  it('sees a path both trees hold identically as unchanged', () => {
    expect(hopVerdict('same.ts', { lineage, target })).toBe('unchanged');
  });

  it('sees a path whose blob changed as modified', () => {
    expect(hopVerdict('drift.ts', { lineage, target })).toBe('modified');
  });

  it('sees a path only the target holds as added', () => {
    expect(hopVerdict('brand-new.ts', { lineage, target })).toBe('added');
  });

  it('sees a path only the lineage holds as deleted', () => {
    expect(hopVerdict('gone.ts', { lineage, target })).toBe('deleted');
  });

  it('sees a path neither tree holds as absent', () => {
    expect(hopVerdict('src/utils/config-dir.ts', { lineage, target })).toBe('absent');
  });
});

describe('patchLayerClass', () => {
  it('routes test files to the test-surface class', () => {
    expect(patchLayerClass('src/team/__tests__/model-contract.test.ts')).toBe('test-surface');
    expect(patchLayerClass('src/__tests__/auto-update.test.ts')).toBe('test-surface');
  });

  it('routes prose, manifests and lockfiles to the structural class', () => {
    expect(patchLayerClass('README.md')).toBe('structural');
    expect(patchLayerClass('skills/team/SKILL.md')).toBe('structural');
    expect(patchLayerClass('package.json')).toBe('structural');
    expect(patchLayerClass('package-lock.json')).toBe('structural');
  });

  it('routes code to the assertable class', () => {
    expect(patchLayerClass('src/utils/paths.ts')).toBe('assertable');
    expect(patchLayerClass('templates/hooks/session-start.mjs')).toBe('assertable');
  });
});

describe('pickObservation', () => {
  const ctx = (over = {}) => ({
    testFiles: new Set(),
    testBodies: new Map(),
    coChangedTests: [],
    ...over,
  });

  it('names no observation for a non-assertable path', () => {
    expect(pickObservation('README.md', ctx())).toEqual({
      observation: null,
      rule: 'not-assertable',
      candidates: 0,
      alternates: [],
    });
  });

  it('prefers the conventionally-placed sibling test', () => {
    const testFiles = new Set(['src/utils/__tests__/paths.test.ts']);
    expect(pickObservation('src/utils/paths.ts', ctx({ testFiles }))).toMatchObject({
      observation: 'src/utils/__tests__/paths.test.ts',
      rule: 'conventional',
      candidates: 1,
    });
  });

  it('picks the test named after the module over one that merely mentions it', () => {
    const testFiles = new Set([
      'src/__tests__/plugin-setup-deps.test.ts',
      'src/__tests__/session-start-timeout-cleanup.test.ts',
    ]);
    const testBodies = new Map([
      ['src/__tests__/plugin-setup-deps.test.ts', "spawn('scripts/session-start.mjs')"],
      ['src/__tests__/session-start-timeout-cleanup.test.ts', "read('scripts/session-start.mjs')"],
    ]);
    const result = pickObservation('scripts/session-start.mjs', ctx({ testFiles, testBodies }));
    expect(result.observation).toBe('src/__tests__/session-start-timeout-cleanup.test.ts');
    expect(result.rule).toBe('reference');
    expect(result.candidates).toBe(2);
  });

  it('breaks a tie towards a test sharing the module directory', () => {
    const testFiles = new Set(['src/__tests__/aaa.test.ts', 'src/installer/__tests__/zzz.test.ts']);
    const testBodies = new Map([
      ['src/__tests__/aaa.test.ts', "from '../../installer/index'"],
      ['src/installer/__tests__/zzz.test.ts', "comment mentions installer/index"],
    ]);
    const result = pickObservation('src/installer/index.ts', ctx({ testFiles, testBodies }));
    expect(result.observation).toBe('src/installer/__tests__/zzz.test.ts');
  });

  it('hands the runner other candidates without dropping the first pick', () => {
    const testFiles = new Set(['src/utils/__tests__/paths.test.ts']);
    const testBodies = new Map([
      ['src/utils/__tests__/paths.test.ts', "from '../paths' /* utils/paths */"],
      ['src/utils/__tests__/plugin-cache-base.test.ts', "import '../paths' /* utils/paths */"],
    ]);
    const result = pickObservation('src/utils/paths.ts', ctx({ testFiles, testBodies }));
    expect(result.observation).toBe('src/utils/__tests__/paths.test.ts');
    expect(result.alternates).toEqual(['src/utils/__tests__/plugin-cache-base.test.ts']);
  });

  it('records co-change in the rule name when it is what was used', () => {
    const testFiles = new Set(['src/__tests__/auto-update.test.ts']);
    const testBodies = new Map([['src/__tests__/auto-update.test.ts', 'import features/auto-update']]);
    const result = pickObservation('src/features/auto-update.ts', ctx({
      testFiles,
      testBodies,
      coChangedTests: ['src/__tests__/auto-update.test.ts'],
    }));
    expect(result.rule).toBe('reference-and-co-changed');
  });

  it('reports an explicit gap when nothing references the module', () => {
    expect(pickObservation('src/lib/solo.ts', ctx())).toEqual({
      observation: null,
      rule: 'none',
      candidates: 0,
      alternates: [],
    });
  });
});

describe('buildPatchLayerRows', () => {
  const lineage = new Map([
    ['src/utils/paths.ts', SHA_A],
    ['README.md', SHA_A],
    ['untouched.ts', SHA_A],
    ['skills/learner/SKILL.md', SHA_A],
  ]);
  const target = new Map([
    ['src/utils/paths.ts', SHA_B],
    ['README.md', SHA_B],
    ['untouched.ts', SHA_A],
  ]);
  const ctx = {
    lineage,
    target,
    commitsByPath: new Map([
      ['src/utils/paths.ts', ['ccc3333', 'aaa1111']],
      ['README.md', ['bbb2222']],
      ['skills/learner/SKILL.md', ['ddd4444']],
    ]),
    coChangedByPath: new Map(),
    testFiles: new Set(['src/utils/__tests__/paths.test.ts']),
    testBodies: new Map(),
  };

  it('keeps only the paths the hop also touched, including deletions', () => {
    const rows = buildPatchLayerRows(
      ['src/utils/paths.ts', 'README.md', 'untouched.ts', 'skills/learner/SKILL.md'],
      ctx,
    );
    expect(rows.map((r: { path: string }) => r.path)).toEqual(['src/utils/paths.ts', 'README.md', 'skills/learner/SKILL.md']);
    expect(rows.find((r: { path: string }) => r.path === 'skills/learner/SKILL.md').hop).toBe('deleted');
  });

  it('points un-patch at the oldest patching commit so multi-commit paths revert fully', () => {
    const rows = buildPatchLayerRows(['src/utils/paths.ts'], ctx);
    expect(rows[0].revertTo).toBe('aaa1111^');
    expect(rows[0].omqCommits).toBe(2);
  });

  it('sorts assertable rows ahead of prose rows', () => {
    const rows = buildPatchLayerRows(['README.md', 'src/utils/paths.ts'], ctx);
    expect(rows.map((r: { class: string }) => r.class)).toEqual(['assertable', 'structural']);
    expect(rows[0].observation).toBe('src/utils/__tests__/paths.test.ts');
  });

  it('summarizes counts and the observation gap', () => {
    const rows = buildPatchLayerRows(
      ['src/utils/paths.ts', 'README.md', 'skills/learner/SKILL.md'],
      ctx,
    );
    expect(summarizePatchLayer(rows)).toMatchObject({
      total: 3,
      assertable: 1,
      structural: 2,
      'test-surface': 0,
      hop_modified: 2,
      hop_deleted: 1,
      withObservation: 1,
      missingObservation: 0,
    });
  });

  it('counts an assertable row with no test as a gap', () => {
    const rows = buildPatchLayerRows(['src/utils/paths.ts'], { ...ctx, testFiles: new Set() });
    expect(rows[0].observation).toBeNull();
    expect(summarizePatchLayer(rows).missingObservation).toBe(1);
  });
});

describe('buildWatchRows', () => {
  const lineage = new Map([
    ['docs/CLAUDE.md', SHA_A],
    ['src/utils/paths.ts', SHA_A],
    ['stable.md', SHA_A],
    ['not-in-trees.md', SHA_A],
  ]);
  const target = new Map([
    ['docs/CLAUDE.md', SHA_B],
    ['src/utils/paths.ts', SHA_B],
    ['stable.md', SHA_A],
  ]);

  it('lists a declared path the hop changes but the patch layer never touched', () => {
    const rows = buildWatchRows([{ path: 'docs/CLAUDE.md', why: 'AGENTS.md source' }], {
      lineage,
      target,
      collisionPaths: new Set(),
      localBlobByPath: new Map([['docs/CLAUDE.md', SHA_C]]),
    });
    expect(rows).toEqual([{
      path: 'docs/CLAUDE.md',
      why: 'AGENTS.md source',
      hop: 'modified',
      matchesLineage: false,
      matchesTarget: false,
    }]);
  });

  it('does not duplicate a path already reported as a collision', () => {
    const rows = buildWatchRows([{ path: 'src/utils/paths.ts' }], {
      lineage,
      target,
      collisionPaths: new Set(['src/utils/paths.ts']),
      localBlobByPath: new Map(),
    });
    expect(rows).toEqual([]);
  });

  it('drops a declared path the hop leaves alone, keeps one it deletes', () => {
    const rows = buildWatchRows([{ path: 'stable.md' }, { path: 'not-in-trees.md' }], {
      lineage,
      target,
      collisionPaths: new Set(),
      localBlobByPath: new Map(),
    });
    expect(rows.map((r: { path: string }) => r.path)).toEqual(['not-in-trees.md']);
    expect(rows[0].hop).toBe('deleted');
  });

  it('says which ancestor version a declared path already matches', () => {
    const rows = buildWatchRows([{ path: 'docs/CLAUDE.md' }], {
      lineage,
      target,
      collisionPaths: new Set(),
      localBlobByPath: new Map([['docs/CLAUDE.md', SHA_B]]),
    });
    expect(rows[0]).toMatchObject({ matchesLineage: false, matchesTarget: true });
  });
});

describe('laneNameFor', () => {
  it('turns a path into the carrier filename the harness writes', () => {
    expect(laneNameFor('src/utils/paths.ts')).toBe('src-utils-paths-ts');
    expect(laneNameFor('templates/hooks/session-start.mjs')).toBe('templates-hooks-session-start-mjs');
  });
});

describe('parseCarrier', () => {
  const valid = [
    '# Negative Control Carrier: src-utils-paths-ts',
    '- **Verified observation**: src/__tests__/hud-windows.test.ts',
    '## Verdict',
    '',
    '**VALID**',
  ].join('\n');

  it('reads the verdict and the test that actually bit', () => {
    expect(parseCarrier(valid)).toEqual({
      verdict: 'VALID',
      verifiedObservation: 'src/__tests__/hud-windows.test.ts',
    });
  });

  it('strips the explanation after the verdict keyword', () => {
    expect(parseCarrier(valid.replace('**VALID**', '**INVALID: no observation turned RED**'))).toMatchObject({
      verdict: 'INVALID',
    });
  });

  it('reports no verified observation when the carrier says none', () => {
    expect(parseCarrier(valid.replace('src/__tests__/hud-windows.test.ts', 'none'))).toMatchObject({
      verifiedObservation: null,
    });
  });

  it('returns null for a missing carrier so the table can say "missing"', () => {
    expect(parseCarrier(null)).toBeNull();
    expect(parseCarrier('no verdict here')).toMatchObject({ verdict: null });
  });
});

describe('buildPatchLayerRows with carriers', () => {
  it('reports measured carrier status per assertable row', () => {
    const lineage = new Map([['src/utils/paths.ts', SHA_A]]);
    const target = new Map([['src/utils/paths.ts', SHA_B]]);
    const rows = buildPatchLayerRows(['src/utils/paths.ts'], {
      lineage,
      target,
      commitsByPath: new Map([['src/utils/paths.ts', ['aaa1111']]]),
      coChangedByPath: new Map(),
      testFiles: new Set(['src/utils/__tests__/paths.test.ts']),
      testBodies: new Map(),
      carrierByLane: new Map([[laneNameFor('src/utils/paths.ts'), { verdict: 'VALID', verifiedObservation: 'x.test.ts' }]]),
    });
    expect(rows[0]).toMatchObject({ carrier: 'VALID', verifiedObservation: 'x.test.ts' });
    expect(summarizePatchLayer(rows).carriers.VALID).toBe(1);
  });

  it('marks an unmeasured assertable row as a missing carrier', () => {
    const lineage = new Map([['src/utils/paths.ts', SHA_A]]);
    const target = new Map([['src/utils/paths.ts', SHA_B]]);
    const rows = buildPatchLayerRows(['src/utils/paths.ts'], {
      lineage,
      target,
      commitsByPath: new Map([['src/utils/paths.ts', ['aaa1111']]]),
      coChangedByPath: new Map(),
      testFiles: new Set(['src/utils/__tests__/paths.test.ts']),
      testBodies: new Map(),
    });
    expect(rows[0].carrier).toBe('missing');
    expect(summarizePatchLayer(rows).carriers.missing).toBe(1);
  });
});

describe('structuralCheck', () => {
  it('routes each class-2 kind to a check that really exists', () => {
    expect(structuralCheck('src/team/__tests__/model-contract.test.ts')).toContain('known-failures.mjs');
    expect(structuralCheck('package.json')).toBe('src/__tests__/metadata-contracts.test.ts');
    expect(structuralCheck('package-lock.json')).toBe('src/__tests__/metadata-contracts.test.ts');
    expect(structuralCheck('skills/team/SKILL.md')).toBe('src/skills/__tests__/skill-config-dir.test.ts');
    expect(structuralCheck('docs/GETTING-STARTED.md')).toContain('check-canonical-identity.mjs');
  });

  it('names no guard for code, which must be covered by a lane instead', () => {
    expect(structuralCheck('src/utils/paths.ts')).toBeNull();
  });
});

describe('renderPatchLayerMarkdown', () => {
  const rows = [
    {
      path: 'src/utils/paths.ts', hop: 'modified', class: 'assertable', omqCommits: 2,
      revertTo: 'aaa1111^', observation: 'src/utils/__tests__/paths.test.ts',
      observationRule: 'conventional', observationCandidates: 1,
    },
    {
      path: 'src/lib/solo.ts', hop: 'modified', class: 'assertable', omqCommits: 1,
      revertTo: 'eee5555^', observation: null, observationRule: 'none', observationCandidates: 0,
    },
  ];
  const args = {
    baseCommit: '9ba1359c8f8cab5d72d7ffc543d3e35f676a4709',
    lineageTag: 'v4.15.1',
    targetTag: 'v5.0.0',
    rows,
    summary: summarizePatchLayer(rows),
  };

  it('renders the same bytes twice so the table can be committed', () => {
    expect(renderPatchLayerMarkdown(args)).toBe(renderPatchLayerMarkdown(args));
  });

  it('carries no wall-clock timestamp', () => {
    expect(renderPatchLayerMarkdown(args)).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:/);
  });

  it('shows a missing observation as a gap rather than a blank cell', () => {
    const md = renderPatchLayerMarkdown(args);
    expect(md).toContain('**none - gap**');
    expect(md).toContain('`src/utils/__tests__/paths.test.ts`');
  });

  it('gives class-2 rows a structural guard column instead of a fake observation', () => {
    const structuralRows = [{
      path: 'package.json', hop: 'modified', class: 'structural', omqCommits: 1,
      revertTo: 'aaa1111^', observation: null, observationRule: 'not-assertable',
      observationCandidates: 0, structuralCheck: 'src/__tests__/metadata-contracts.test.ts', carrier: null,
    }];
    const md = renderPatchLayerMarkdown({ ...args, rows: structuralRows, summary: summarizePatchLayer(structuralRows) });
    expect(md).toContain('| path | hop | commits | un-patch | structural guard |');
    const row = md.match(/^\| `package\.json`.*$/m)?.[0];
    expect(row).toContain('`src/__tests__/metadata-contracts.test.ts`');
    expect(row).not.toContain('none - gap');
    expect(md).toContain('| Class-2 rows without a named structural guard | 0 of 1 |');
  });

  it('renders declared watch paths in their own section', () => {
    const md = renderPatchLayerMarkdown({
      ...args,
      watchRows: [{
        path: 'docs/CLAUDE.md', why: 'AGENTS.md source', hop: 'modified',
        matchesLineage: false, matchesTarget: false,
      }],
    });
    expect(md).toContain('## Declared watch paths');
    expect(md).toContain('| docs/CLAUDE.md | modified | no | no | AGENTS.md source |');
    expect(renderPatchLayerMarkdown({ ...args, watchRows: [] })).not.toContain('## Declared watch paths');
  });
});
