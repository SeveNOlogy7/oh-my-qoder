/**
 * Tests for scripts/conflict-ledger.mjs
 *
 * Covers the pure classification logic with inline maps (no network, no FS).
 * Tests every conflict category and edge case.
 */
import { describe, it, expect } from 'vitest';
// @ts-expect-error -- .mjs script has no type declarations
import { classifyConflict, buildLedger, summarizeLedger, gitBlobSha, isGenerated } from '../../scripts/conflict-ledger.mjs';

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
