import { describe, it, expect } from 'vitest';
// @ts-expect-error - .mjs file has no type declarations
import { stripAnsi, parseVitestOutput, compareFailures } from '../../scripts/known-failures.mjs';

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
      const actual = [];
      const baseline = ['test1', 'test2'];
      
      const result = compareFailures(actual, baseline);
      expect(result.newFailures).toEqual([]);
      expect(result.staleEntries).toEqual(['test1', 'test2']);
      expect(result.matchedCount).toBe(0);
    });

    it('handles empty baseline', () => {
      const actual = ['test1', 'test2'];
      const baseline = [];
      
      const result = compareFailures(actual, baseline);
      expect(result.newFailures).toEqual(['test1', 'test2']);
      expect(result.staleEntries).toEqual([]);
      expect(result.matchedCount).toBe(0);
    });
  });
});
