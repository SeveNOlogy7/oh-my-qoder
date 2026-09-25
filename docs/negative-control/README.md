# Negative Control Harness

Proves that regression tests actually detect the regressions they claim to catch.

## Purpose

A regression test that passes both before and after reverting the fix it is
supposed to validate is not a real test -- it is a false sense of security.
The negative-control harness automates the check:

1. Create a scratch `git worktree add --detach` under `.omq/worktrees/`.
2. Revert the named fix commit inside that worktree only.
3. Run the observation tests.
4. Assert the observation turned RED.
5. Remove the worktree in a `finally` block.

The harness **never** runs `stash`, `reset`, `checkout`, or `revert` in the main
worktree. All destructive git operations are scoped to the scratch worktree.

## Lanes

| Lane name | Fix commit | Observation |
|-----------|-----------|-------------|
| `provenance-path-coverage` | `94df71a` | `src/__tests__/canonical-identity-provenance.test.ts` |

### provenance-path-coverage

Commit `94df71a` changed `scripts/check-canonical-identity.mjs` from a
content-level check (only inspecting files whose text mentioned the ancestor
URL) to a path-coverage gate (every scanned file must appear in
ATTRIBUTION.json). Reverting this fix should cause the provenance tests to
fail because unlisted files are no longer detected as violations.

## Usage

```sh
# Run the harness directly
node scripts/negative-control.mjs --lane provenance-path-coverage

# JSON output
node scripts/negative-control.mjs --lane provenance-path-coverage --json

# Run via vitest
npx vitest run src/__tests__/negative-control.test.ts
```

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Valid: observation turned RED after reverting (test is effective) |
| 1 | Invalid: observation stayed GREEN after reverting (test is weak) |
| 2 | Harness error (bad lane, git failure, etc.) |

## Carrier files

Each run writes a carrier markdown file at
`.omq/worktrees/neg-ctrl-<lane>-<timestamp>-carrier.md` containing:

- Lane metadata (commit, observation file, description)
- Before/after revert exit codes
- Verdict (VALID / INVALID / INCONCLUSIVE)
- Truncated test output for evidence

## Safety invariants

- The main worktree is never modified. No stash, reset, checkout, or revert.
- The scratch worktree is always removed in a `finally` block.
- After cleanup, `git worktree list` is checked to confirm no stray worktrees.
- If `git worktree remove` fails, manual `rmSync` + `git worktree prune` is attempted.

## Adding a new lane

Add an entry to the `LANES` object in `scripts/negative-control.mjs`:

```js
'my-new-lane': {
  fixCommit: 'abc1234',
  observation: 'src/__tests__/my-test.test.ts',
  description: 'what the fix does and why reverting should break the test',
},
```

## Related files

- `scripts/negative-control.mjs` -- the harness
- `src/__tests__/negative-control.test.ts` -- vitest wrapper
- `docs/negative-control/installer-paths-config.txt` -- installer paths validated by the provenance gate
