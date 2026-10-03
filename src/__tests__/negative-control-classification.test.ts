import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- .mjs script has no type declarations
import { classifyPreFixAvailability, classifyForkDeltaPresence } from '../../scripts/negative-control.mjs';

const repoRoot = join(process.cwd());

/**
 * Resolve a short ref to its full SHA so the classification function receives
 * a stable, unambiguous commit identifier regardless of the local repo state.
 */
function resolveRef(ref: string): string {
  return execFileSync('git', ['rev-parse', ref], { cwd: repoRoot, encoding: 'utf8' }).trim();
}

describe('classifyPreFixAvailability', () => {
  it('returns AVAILABLE for a path that exists in the given commit', () => {
    const head = resolveRef('HEAD');
    // negative-control.mjs itself is tracked, so it must be AVAILABLE at HEAD.
    const result = classifyPreFixAvailability(head, 'scripts/negative-control.mjs', repoRoot);
    expect(result).toBe('AVAILABLE');
  });

  it('returns NOT-APPLICABLE for a path that does not exist in the given commit', () => {
    const head = resolveRef('HEAD');
    // This path exists on no branch -- it is purely fabricated.
    const result = classifyPreFixAvailability(head, 'nonexistent/path/that-was-never-committed.ts', repoRoot);
    expect(result).toBe('NOT-APPLICABLE');
  });

  it('returns HARNESS-ERROR for a genuinely broken git reference', () => {
    // A ref that is not a valid object at all triggers a different fatal from
    // git cat-file, which must NOT be collapsed into NOT-APPLICABLE.
    const result = classifyPreFixAvailability('deadbeef0000000deadbeef', 'any-path.ts', repoRoot);
    expect(result).toBe('HARNESS-ERROR');
  });

  it('distinguishes NOT-APPLICABLE from HARNESS-ERROR for a real adoption-style gap', () => {
    // Use HEAD^ as the base and a file that was added by HEAD itself (if any).
    // When the file exists in HEAD but not in HEAD^, the result is NOT-APPLICABLE.
    // When the commit ref is garbage, the result is HARNESS-ERROR.
    const headParent = resolveRef('HEAD^');
    // A file that definitely does not exist in HEAD^:
    const resultAbsent = classifyPreFixAvailability(headParent, '__nonexistent_adoption_file__.ts', repoRoot);
    expect(resultAbsent).toBe('NOT-APPLICABLE');

    // Same shape of call, but with a broken commit -> HARNESS-ERROR, not N/A.
    const resultBroken = classifyPreFixAvailability('zzzzzzz', '__nonexistent_adoption_file__.ts', repoRoot);
    expect(resultBroken).toBe('HARNESS-ERROR');
  });
});

/**
 * A lane can only judge a guard that is still in the tree. Where the adoption commit's own
 * content survived untouched, reverting to the pre-adoption text changes no shipped behaviour,
 * and reporting that as INVALID buries the lanes whose tests really are blind.
 */
describe('classifyForkDeltaPresence', () => {
  const ADOPTION = '344176f';

  it('reports SUPERSEDED-BY-ADOPTION when the tree still holds the adoption commit content', () => {
    // src/providers/index.ts: the ancestor replaced the fork's execSync('git remote get-url
    // origin') with execFileSync + windowsHide, and that is what HEAD still carries.
    expect(classifyForkDeltaPresence(ADOPTION, 'src/providers/index.ts', repoRoot)).toBe('SUPERSEDED-BY-ADOPTION');
  });

  it('reports FORK-DELTA-PRESENT when our patch survived the adoption', () => {
    // scripts/pre-tool-enforcer.mjs has been re-patched twice since the hop (dc08ec0, ec31e25),
    // so its blob cannot equal the adoption commit's blob.
    expect(classifyForkDeltaPresence(ADOPTION, 'scripts/pre-tool-enforcer.mjs', repoRoot)).toBe('FORK-DELTA-PRESENT');
  });

  it('reports HARNESS-ERROR for a ref that is not an object', () => {
    expect(classifyForkDeltaPresence('deadbeef0000000deadbeef', 'src/providers/index.ts', repoRoot)).toBe('HARNESS-ERROR');
  });
});
