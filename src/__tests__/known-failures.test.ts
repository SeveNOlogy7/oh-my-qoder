import { describe, it, expect } from 'vitest';
// @ts-expect-error - .mjs file has no type declarations
import { stripAnsi, parseVitestOutput, compareFailures, stripRunnerPrefix, uncountedFailEntries } from '../../scripts/known-failures.mjs';

describe('stripRunnerPrefix', () => {
  it('removes a job/step/timestamp prefix whose step name contains spaces', () => {
    const line = 'windows-test	Test (captured)	2026-09-25T15:20:35.9602849Z  FAIL  src/a.test.ts > works';
    expect(stripRunnerPrefix(line)).toBe(' FAIL  src/a.test.ts > works');
  });

  it('does not cut early on a Z inside the test title', () => {
    const line = 'test	Test (captured)	2026-09-25T15:20:35Z  FAIL  src/z.test.ts > parses Zulu zones';
    expect(stripRunnerPrefix(line)).toBe(' FAIL  src/z.test.ts > parses Zulu zones');
  });

  it('leaves a plain vitest line untouched', () => {
    expect(stripRunnerPrefix(' FAIL  src/a.test.ts > works')).toBe(' FAIL  src/a.test.ts > works');
  });
});

describe('known-failures script', () => {
  describe('stripAnsi', () => {
    it('strips real ESC byte sequences', () => {
      const input = '\x1b[31mFAIL\x1b[0m test';
      expect(stripAnsi(input)).toBe('FAIL test');
    });

    it('strips literal caret notation', () => {
      const input = '^[[31mFAIL^[[0m test';
      expect(stripAnsi(input)).toBe('FAIL test');
    });

    it('handles mixed ANSI encodings', () => {
      const input = '\x1b[31mFAIL^[[0m ^[[32mtest\x1b[0m';
      expect(stripAnsi(input)).toBe('FAIL test');
    });

    it('preserves text without ANSI', () => {
      const input = 'plain text';
      expect(stripAnsi(input)).toBe('plain text');
    });

    it('handles complex ANSI sequences', () => {
      const input = '\x1b[1;31;42mbold red on green\x1b[0m';
      expect(stripAnsi(input)).toBe('bold red on green');
    });
  });

  describe('parseVitestOutput', () => {
    it('extracts FAIL lines from vitest output', () => {
      const output = `
RUN  v4.1.11 E:/project

 ❯ src/test.test.ts (3 tests | 2 failed) 42ms
     ✓ passing test
     × failing test 1
     × failing test 2

 FAIL  src/test.test.ts > suite > failing test 1
Error: expected true to be false

 FAIL  src/test.test.ts > suite > failing test 2
Error: timeout

Test Files  1 failed | 1 total
      Tests  2 failed | 1 passed | 3 total
`;
      const failures = parseVitestOutput(output);
      expect(failures).toHaveLength(2);
      expect(failures[0]).toBe('src/test.test.ts > suite > failing test 1');
      expect(failures[1]).toBe('src/test.test.ts > suite > failing test 2');
    });

    it('collapses the repeated FAIL lines that a retried test emits', () => {
      // vitest prints one FAIL block per attempt, so a flake that is retried and fails
      // twice yields two lines while its own Tests summary counts the test once. Measured
      // on run 36365309333: 960 lines against a tally of 947 + 12, which made the
      // completeness guard refuse the whole comparison before any drift was judged. A
      // baseline is a set of titles, so the second occurrence adds no fact.
      const output = [
        ' FAIL  src/a.test.ts > suite > retried case',
        'AssertionError: first attempt',
        '',
        ' FAIL  src/a.test.ts > suite > retried case',
        'AssertionError: second attempt',
        '',
        'Test Files  1 failed | 1 total',
        '      Tests  1 failed | 1 total',
      ].join('\n');
      expect(parseVitestOutput(output)).toEqual(['src/a.test.ts > suite > retried case']);
    });

    it('normalizes backslashes to forward slashes', () => {
      const output = ' FAIL  src\\path\\to\\test.test.ts > test name';
      const failures = parseVitestOutput(output);
      expect(failures[0]).toBe('src/path/to/test.test.ts > test name');
    });

    it('handles ANSI in FAIL lines', () => {
      const output = ' \x1b[31mFAIL\x1b[0m  src/test.test.ts > test';
      const failures = parseVitestOutput(output);
      expect(failures[0]).toBe('src/test.test.ts > test');
    });

    it('handles caret notation ANSI', () => {
      const output = ' ^[[31mFAIL^[[0m  src/test.test.ts > test';
      const failures = parseVitestOutput(output);
      expect(failures[0]).toBe('src/test.test.ts > test');
    });

    it('returns empty array for no failures', () => {
      const output = `
Test Files  1 passed | 1 total
      Tests  3 passed | 3 total
`;
      const failures = parseVitestOutput(output);
      expect(failures).toHaveLength(0);
    });
  });

  describe('uncountedFailEntries', () => {
    it('names a FAIL entry whose file reports zero failed tests -- a hook blew up and its tests skipped', () => {
      const output = `
 ❯ src/submodule-state-anchor.test.ts (8 tests | 8 skipped) 29038ms
 FAIL  src/submodule-state-anchor.test.ts > submodule state anchoring (issue #3349)
Error: hook blew up
 Test Files  1 failed | 1 total
      Tests  0 failed | 8 skipped (8)
`;
      expect(uncountedFailEntries(output)).toEqual([
        'src/submodule-state-anchor.test.ts > submodule state anchoring (issue #3349)',
      ]);
    });

    it('stays empty when every FAIL entry belongs to a test vitest counted as failed', () => {
      const output = `
 ❯ src/a.test.ts (3 tests | 2 failed) 10ms
 FAIL  src/a.test.ts > suite > failing test 1
 FAIL  src/a.test.ts > suite > failing test 2
 Test Files  1 failed | 1 total
      Tests  2 failed | 1 passed (3)
`;
      expect(uncountedFailEntries(output)).toEqual([]);
    });

    it('does not treat a whole-file collection failure as uncounted', () => {
      const output = `
 FAIL  src/a.test.ts [ src/a.test.ts ]
Error: cannot resolve import
 Test Files  1 failed | 1 total
      Tests  no tests
`;
      expect(uncountedFailEntries(output)).toEqual([]);
    });
  });

  describe('compareFailures', () => {
    it('identifies new failures', () => {
      const actual = ['test1', 'test2', 'test3'];
      const baseline = ['test1', 'test2'];
      
      const result = compareFailures(actual, baseline);
      expect(result.newFailures).toEqual(['test3']);
      expect(result.staleEntries).toEqual([]);
      expect(result.matchedCount).toBe(2);
    });

    it('identifies stale baseline entries', () => {
      const actual = ['test1'];
      const baseline = ['test1', 'test2', 'test3'];
      
      const result = compareFailures(actual, baseline);
      expect(result.newFailures).toEqual([]);
      expect(result.staleEntries).toEqual(['test2', 'test3']);
      expect(result.matchedCount).toBe(1);
    });

    it('handles perfect match', () => {
      const actual = ['test1', 'test2'];
      const baseline = ['test1', 'test2'];
      
      const result = compareFailures(actual, baseline);
      expect(result.newFailures).toEqual([]);
      expect(result.staleEntries).toEqual([]);
      expect(result.matchedCount).toBe(2);
    });

    it('handles complete mismatch', () => {
      const actual = ['test1', 'test2'];
      const baseline = ['test3', 'test4'];
      
      const result = compareFailures(actual, baseline);
      expect(result.newFailures).toEqual(['test1', 'test2']);
      expect(result.staleEntries).toEqual(['test3', 'test4']);
      expect(result.matchedCount).toBe(0);
    });

    it('handles empty actual', () => {
      const actual: string[] = [];
      const baseline = ['test1', 'test2'];
      
      const result = compareFailures(actual, baseline);
      expect(result.newFailures).toEqual([]);
      expect(result.staleEntries).toEqual(['test1', 'test2']);
      expect(result.matchedCount).toBe(0);
    });

    it('handles empty baseline', () => {
      const actual = ['test1', 'test2'];
      const baseline: string[] = [];
      
      const result = compareFailures(actual, baseline);
      expect(result.newFailures).toEqual(['test1', 'test2']);
      expect(result.staleEntries).toEqual([]);
      expect(result.matchedCount).toBe(0);
    });
  });
});
