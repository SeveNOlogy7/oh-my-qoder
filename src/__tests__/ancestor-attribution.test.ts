/**
 * Tests for scripts/ancestor-attribution.mjs
 *
 * Covers the pure classification logic with inline maps (no network, no FS).
 * Seven cases covering every classification branch and edge case.
 */
import { describe, it, expect } from 'vitest';
// @ts-expect-error -- .mjs script has no type declarations
import { classifyPaths, patchIdFor, gitBlobSha } from '../../scripts/ancestor-attribution.mjs';

/** Helper: build a Map from an object literal. */
function mapOf(obj: Record<string, string>): Map<string, string> {
  return new Map(Object.entries(obj));
}

/** SHA constants for tests (look like git blob SHAs but are deterministic). */
const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const SHA_C = 'c'.repeat(40);
const SHA_D = 'd'.repeat(40);

const emptyLineage = new Map<string, string>();
const emptyTarget = new Map<string, string>();

describe('classifyPaths', () => {
  it('classifies matching blob SHA as ancestor-derived', () => {
    const target = mapOf({ 'src/index.ts': SHA_A });
    const blobShaResolver = mapOf({ 'src/index.ts': SHA_A });

    const results = classifyPaths(['src/index.ts'], {
      lineage: emptyLineage,
      target,
      blobShaResolver,
    });

    expect(results).toEqual([
      { path: 'src/index.ts', class: 'ancestor-derived', ancestorBlobSha: SHA_A },
    ]);
  });

  it('classifies different blob SHA as omq-patched-ancestor with patchId', () => {
    const target = mapOf({ 'src/hooks/session.mjs': SHA_A });
    const blobShaResolver = mapOf({ 'src/hooks/session.mjs': SHA_B });

    const results = classifyPaths(['src/hooks/session.mjs'], {
      lineage: emptyLineage,
      target,
      blobShaResolver,
    });

    expect(results).toHaveLength(1);
    const entry = results[0];
    expect(entry.class).toBe('omq-patched-ancestor');
    expect(entry.ancestorBlobSha).toBe(SHA_A);
    expect(entry.patchId).toBe(
      patchIdFor('src/hooks/session.mjs', SHA_B, SHA_A),
    );
  });

  it('classifies path only in lineage as omq-original with lineageSha', () => {
    // Path exists in lineage (v4.15.1) but NOT in target (v5.0.0)
    const lineage = mapOf({ 'lib/legacy.ts': SHA_C });
    const blobShaResolver = mapOf({ 'lib/legacy.ts': SHA_D });

    const results = classifyPaths(['lib/legacy.ts'], {
      lineage,
      target: emptyTarget,
      blobShaResolver,
    });

    expect(results).toEqual([
      { path: 'lib/legacy.ts', class: 'omq-original', lineageSha: SHA_C, lineageMatch: false },
    ]);
  });

  it('marks a lineage-only path that is byte-identical with lineageMatch true', () => {
    // This is the signal issue #3 asks for: still literally the v4.15.1 snapshot.
    const lineage = mapOf({ 'lib/legacy.ts': SHA_C });
    const blobShaResolver = mapOf({ 'lib/legacy.ts': SHA_C });

    const results = classifyPaths(['lib/legacy.ts'], {
      lineage,
      target: emptyTarget,
      blobShaResolver,
    });

    expect(results).toEqual([
      { path: 'lib/legacy.ts', class: 'omq-original', lineageSha: SHA_C, lineageMatch: true },
    ]);
  });

  it('records lineage fidelity even when the path also exists in the target', () => {
    // A file present in both trees, changed relative to v5.0.0 but unchanged
    // since v4.15.1, must still be counted as lineage-identical.
    const lineage = mapOf({ 'src/hooks/keyword-detector.mjs': SHA_A });
    const target = mapOf({ 'src/hooks/keyword-detector.mjs': SHA_B });
    const blobShaResolver = mapOf({ 'src/hooks/keyword-detector.mjs': SHA_A });

    const results = classifyPaths(['src/hooks/keyword-detector.mjs'], {
      lineage,
      target,
      blobShaResolver,
    });

    expect(results).toHaveLength(1);
    const entry = results[0];
    expect(entry.class).toBe('omq-patched-ancestor');
    expect(entry.lineageSha).toBe(SHA_A);
    expect(entry.lineageMatch).toBe(true);
    expect(entry.patchId).toBeTruthy();
  });

  it('classifies path in neither tree as omq-original without lineageSha', () => {
    const blobShaResolver = mapOf({ 'bin/omq': SHA_A });

    const results = classifyPaths(['bin/omq'], {
      lineage: emptyLineage,
      target: emptyTarget,
      blobShaResolver,
    });

    expect(results).toEqual([
      { path: 'bin/omq', class: 'omq-original' },
    ]);
  });

  it('classifies dist/ paths as generated regardless of tree membership', () => {
    // Even if the path exists in the target tree, dist/ is always generated
    const target = mapOf({ 'dist/index.js': SHA_A });
    const blobShaResolver = mapOf({ 'dist/index.js': SHA_B });

    const results = classifyPaths(['dist/index.js'], {
      lineage: emptyLineage,
      target,
      blobShaResolver,
    });

    expect(results).toEqual([
      { path: 'dist/index.js', class: 'generated', derivedFrom: 'src/' },
    ]);
  });

  it('handles a mixed batch with correct counts per class', () => {
    const lineage = mapOf({
      'old/removed.ts': SHA_C,   // in lineage, not in target
    });
    const target = mapOf({
      'src/same.ts': SHA_A,      // unchanged
      'src/modified.ts': SHA_A,  // patched
    });
    const blobShaResolver = mapOf({
      'src/same.ts': SHA_A,
      'src/modified.ts': SHA_B,
      'old/removed.ts': SHA_D,
      'bin/omq': SHA_A,
      'dist/out.js': SHA_D,
    });

    const paths = [
      'src/same.ts',
      'src/modified.ts',
      'old/removed.ts',
      'bin/omq',
      'dist/out.js',
    ];

    const results = classifyPaths(paths, {
      lineage,
      target,
      blobShaResolver,
    });

    const byClass = Object.fromEntries(
      ['ancestor-derived', 'omq-patched-ancestor', 'omq-original', 'generated']
        .map(c => [c, results.filter((r: any) => r.class === c)]),
    );

    expect(byClass['ancestor-derived']).toHaveLength(1);
    expect(byClass['omq-patched-ancestor']).toHaveLength(1);
    expect(byClass['omq-original']).toHaveLength(2); // old/removed.ts + bin/omq
    expect(byClass['generated']).toHaveLength(1);

    // Verify lineageSha coverage: only old/removed.ts should have it
    const withLineage = results.filter((r: any) => r.lineageSha);
    expect(withLineage).toHaveLength(1);
    expect(withLineage[0].path).toBe('old/removed.ts');
  });

  it('produces deterministic patchIds for the same inputs', () => {
    const id1 = patchIdFor('src/foo.ts', SHA_A, SHA_B);
    const id2 = patchIdFor('src/foo.ts', SHA_A, SHA_B);
    const id3 = patchIdFor('src/foo.ts', SHA_B, SHA_A); // different order

    expect(id1).toBe(id2);           // same inputs -> same id
    expect(id1).not.toBe(id3);       // different inputs -> different id
    expect(id1).toHaveLength(16);    // 16 hex chars
  });
});

describe('gitBlobSha', () => {
  it('computes a valid hex SHA for buffer content', () => {
    const sha = gitBlobSha(Buffer.from('hello world'));
    expect(sha).toMatch(/^[0-9a-f]{40}$/);
  });
});
