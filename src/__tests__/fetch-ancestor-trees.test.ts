/**
 * The provenance gate depends on ancestor blob trees that are *not* in git
 * (`.omq/` is ignored), so CI must fetch them. These cases lock the two ways
 * that fetch could lie: a truncated response, and non-blob entries.
 */
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- .mjs script has no type declarations
import { toTreeEntries } from '../../scripts/fetch-ancestor-trees.mjs';

describe('toTreeEntries', () => {
  it('keeps blobs and drops trees, sorted by path', () => {
    const entries = toTreeEntries({
      truncated: false,
      tree: [
        { path: 'z/last.ts', type: 'blob', sha: 'ccc' },
        { path: 'a', type: 'tree', sha: 'ddd' },
        { path: 'b.ts', type: 'blob', sha: 'bbb' },
      ],
    });
    expect(entries).toEqual([
      { path: 'b.ts', sha: 'bbb' },
      { path: 'z/last.ts', sha: 'ccc' },
    ]);
  });

  it('refuses a truncated tree instead of caching a partial ancestor', () => {
    expect(() => toTreeEntries({ truncated: true, tree: [{ path: 'a', type: 'blob', sha: 'a' }] }))
      .toThrow(/truncated/);
  });

  it('refuses a response with no tree array', () => {
    expect(() => toTreeEntries({ message: 'Not Found' })).toThrow(/no tree array/);
    expect(() => toTreeEntries(undefined)).toThrow(/no tree array/);
  });
});
