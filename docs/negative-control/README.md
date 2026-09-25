# Negative Control Harness

Proves that a regression test actually detects the regression it claims to catch.

## Purpose

A test that passes both before and after removing the fix is not a regression
test. The harness measures that: it creates a scratch worktree, removes one
OMQ patch inside it, runs the tests that are supposed to depend on that patch,
and records whether anything turned red.

1. `git worktree add --detach` under `.omq/worktrees/` at `HEAD`.
2. Overwrite the patched file with its **pre-patch** content.
3. Run each candidate observation on the un-patched tree (want: green).
4. Revert the file, run the green candidates again (want: red).
5. Write the carrier, remove the worktree in a `finally` block.

The revert is per file, not per commit: the patching commits also add or edit
the tests being measured, so a whole-commit revert would delete the observation
it is judging.

The harness **never** runs `stash`, `reset`, `checkout`, `revert`, `commit` or
`push` in the main worktree. All git writes are scoped to the scratch worktree,
and after cleanup it verifies its own worktree path is unregistered.

## Lanes

A lane is (patched file, pre-patch commit, observation). Lanes are **derived**,
not hand-written:

```sh
node scripts/conflict-ledger.mjs --patch-layer --json > .omq/patch-layer.json
node scripts/negative-control.mjs --lanes-from .omq/patch-layer.json --retry-alternates
```

`--retry-alternates` also measures the other tests that reference the module.
A named observation that stays green after the un-patch means one of two very
different things -- the patch has no coverage, or the ledger pointed at the
wrong test -- and the alternates are what tells them apart. Every attempt is
kept in the carrier, so a reader sees which candidates were green before the
revert and stayed green after it. That is coverage discovery, not test shopping:
the harness never writes a test, it only measures ones that already exist.

The one hand-written lane, `provenance-path-coverage`, tests the provenance
gate itself (it has no patch-layer row to derive from).

Current measured status of the patch-layer lanes is in the `carrier` column of
[`docs/ANCESTOR-PATCH-LAYER.md`](../ANCESTOR-PATCH-LAYER.md); do not restate the
numbers here, they go stale the next time a lane is measured.

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Valid: some observation was green before the revert and red after |
| 1 | Nothing bit: every candidate stayed green, or none was green to begin with |
| 2 | Harness error (bad lane name, git failure, unreadable ledger) |
| 3 | A scratch worktree survived cleanup |

`--gate` makes code 1 fail the run. Without it a non-biting lane is recorded
rather than fatal, which is what the ledger needs while coverage is still being
authored.

## Measure on Linux

Run lanes on Linux (CI, or a throwaway container). On Windows a large share of
this suite is red for path-separator and `/tmp` reasons, so `before revert` is
already non-zero and the lane answers nothing -- the ledger's
`INCONCLUSIVE`/`INVALID` split on win32 is environment noise, not evidence.
Carriers committed here are Linux-measured.

That is not the same as "Windows does not matter". Measuring the same lanes on
Linux and win32 is how one real defect surfaced -- `isDefaultQoderConfigDir`
fails to recognise the default root on Windows and passes on Linux -- so the
Windows suite runs in CI too, gated on its own baseline
(`tests/known-failures-win32.json`) rather than on absolute green.

## Reproducing the Linux measurement locally

```sh
docker run --rm -v "$PWD/..:/main:ro" -v "$PWD:/host:ro" node:20 bash -lc '
  git config --global safe.directory "*"
  git clone --no-hardlinks /main /work/omq && cd /work/omq
  git checkout port/ancestor-baseline-m0
  cp /host/.omq/cache/ancestor-v*.json .omq/cache/   # tree caches are gitignored
  npm ci --ignore-scripts && npm run build
  node scripts/conflict-ledger.mjs --patch-layer --json > .omq/patch-layer.json
  node scripts/negative-control.mjs --lanes-from .omq/patch-layer.json --retry-alternates
'
```

Clone the **common** repository rather than a linked worktree: a worktree's `.git`
file holds an absolute Windows path that is meaningless inside the container.
`--ignore-scripts` skips the `better-sqlite3` node-gyp build, which cannot reach
nodejs.org through this machine's proxy; `npm run build` is still required
because several observations import the compiled bridge.

## Carrier files

Each lane writes `docs/negative-control/<lane>.txt`: lane metadata, one row per
attempt with before/after exit codes, the verdict, and the winning output.
Carriers carry no timestamp and no worktree path, so re-running a lane whose
result has not changed produces no diff and the evidence stays reviewable.
The ledger reads the verdict back out of these files.

## Adding coverage for a lane

`INVALID` means: name a test that fails when the patch is removed, or write one.
Do not point the lane at a test that merely passes -- that is the failure mode
this harness exists to catch.

## Related files

- `scripts/negative-control.mjs` -- the harness
- `scripts/conflict-ledger.mjs` -- derives the lanes, reads the verdicts back
- `src/__tests__/negative-control.test.ts` -- vitest wrapper for the hand-written lane
- `docs/ANCESTOR-PATCH-LAYER.md` -- generated collision table with carrier status
