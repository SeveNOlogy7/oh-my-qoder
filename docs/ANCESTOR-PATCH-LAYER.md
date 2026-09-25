# Patch-Layer Collisions

Paths that **OMQ's own commits** change *and* the ancestor hop `v4.15.1` -> `v5.0.0` also changes.
Losing one of these during adoption is a silent regression, which is why this table is generated
from `git log 9ba1359c8f8cab5d72d7ffc543d3e35f676a4709..HEAD` intersected with the two cached ancestor trees -- not written by hand.

| | |
|---|---|
| Colliding paths | 29 |
| Assertable / test-surface / structural | 13 / 6 / 10 |
| Hop modified / added / deleted | 28 / 0 / 1 |
| Assertable rows with a named observation | 13 of 13 |
| Carriers: VALID / INVALID / INCONCLUSIVE / missing | 3 / 9 / 1 / 0 |

The `un-patch` column is the commit whose parent still has OMQ's patch absent; reverting the file to
that parent is what a negative-control lane does. `obs. rule` records *how* the observation was found
(`conventional` = sibling test by naming convention, `reference-and-co-changed` = a test that both
mentions the module and was edited by the same commit, `reference` = mentions the module).

`carrier` is read back out of `docs/negative-control/<lane>.txt`: **VALID** means the un-patch made a
real test fail, INVALID means every named candidate stayed green (the patch has no coverage),
INCONCLUSIVE means no candidate was even green at HEAD, and `missing` means the lane has never been
measured. `verified via` names the test that actually bit, which is not always the one the rules picked.

## Assertable (M1 class ①: needs a negative-control carrier) - 13

| path | hop | commits | un-patch | observation | obs. rule | cands | carrier | verified via |
|---|---|---|---|---|---|---|---|---|
| `scripts/session-start.mjs` | modified | 2 | `4c9cacf^` | `src/__tests__/session-start-timeout-cleanup.test.ts` | reference | 5 | INVALID | - |
| `src/cli/autoresearch-guided.ts` | modified | 1 | `b73da86^` | `src/cli/__tests__/autoresearch-guided.test.ts` | conventional | 1 | INCONCLUSIVE | - |
| `src/cli/index.ts` | modified | 3 | `5fac66e^` | `src/cli/__tests__/cli-boot.test.ts` | reference | 4 | INVALID | - |
| `src/cli/launch.ts` | modified | 2 | `b11884d^` | `src/cli/__tests__/launch.test.ts` | conventional | 1 | INVALID | - |
| `src/cli/tmux-utils.ts` | modified | 1 | `b73da86^` | `src/cli/__tests__/tmux-utils.test.ts` | conventional | 1 | INVALID | - |
| `src/features/auto-update.ts` | modified | 4 | `4c9cacf^` | `src/__tests__/auto-update.test.ts` | reference-and-co-changed | 14 | **VALID** | `src/__tests__/auto-update.test.ts` |
| `src/installer/index.ts` | modified | 1 | `b11884d^` | `src/installer/__tests__/hud-wrapper-env.test.ts` | reference | 15 | INVALID | - |
| `src/installer/mcp-registry.ts` | modified | 1 | `b11884d^` | `src/installer/__tests__/mcp-registry.test.ts` | conventional | 1 | INVALID | - |
| `src/lib/release-generation.ts` | modified | 1 | `2f0bd25^` | `src/__tests__/release-generation.test.ts` | reference-and-co-changed | 1 | **VALID** | `src/__tests__/release-generation.test.ts` |
| `src/team/cli-detection.ts` | modified | 1 | `b73da86^` | `src/team/__tests__/cli-detection.test.ts` | conventional | 1 | INVALID | - |
| `src/team/model-contract.ts` | modified | 1 | `b73da86^` | `src/team/__tests__/model-contract.test.ts` | conventional | 1 | INVALID | - |
| `src/utils/paths.ts` | modified | 1 | `4c9cacf^` | `src/utils/__tests__/paths.test.ts` | conventional | 1 | **VALID** | `src/__tests__/hud-windows.test.ts` |
| `templates/hooks/session-start.mjs` | modified | 1 | `2f0bd25^` | `src/__tests__/session-start-timeout-cleanup.test.ts` | reference | 7 | INVALID | - |

## Test surface (M1 class ②: merge the assertions) - 6

| path | hop | commits | un-patch | observation | obs. rule | cands |
|---|---|---|---|---|---|---|
| `src/__tests__/auto-update.test.ts` | modified | 2 | `b73da86^` | **none - gap** | not-assertable | 0 | |
| `src/__tests__/doctor-conflicts.test.ts` | modified | 1 | `b11884d^` | **none - gap** | not-assertable | 0 | |
| `src/__tests__/release-generation.test.ts` | modified | 1 | `2f0bd25^` | **none - gap** | not-assertable | 0 | |
| `src/cli/__tests__/launch.test.ts` | modified | 1 | `b73da86^` | **none - gap** | not-assertable | 0 | |
| `src/installer/__tests__/standalone-hook-reconcile.test.ts` | modified | 1 | `0da007d^` | **none - gap** | not-assertable | 0 | |
| `src/team/__tests__/model-contract.test.ts` | modified | 1 | `b73da86^` | **none - gap** | not-assertable | 0 | |

## Structural (M1 class ②: structural assertion, no fake test) - 10

| path | hop | commits | un-patch | observation | obs. rule | cands |
|---|---|---|---|---|---|---|
| `docs/GETTING-STARTED.md` | modified | 1 | `5453b47^` | **none - gap** | not-assertable | 0 | |
| `docs/PERFORMANCE-MONITORING.md` | modified | 1 | `5453b47^` | **none - gap** | not-assertable | 0 | |
| `package-lock.json` | modified | 1 | `243cd02^` | **none - gap** | not-assertable | 0 | |
| `package.json` | modified | 3 | `b4a7b40^` | **none - gap** | not-assertable | 0 | |
| `README.md` | modified | 2 | `5453b47^` | **none - gap** | not-assertable | 0 | |
| `skills/cancel/SKILL.md` | modified | 1 | `8ba4cfb^` | **none - gap** | not-assertable | 0 | |
| `skills/learner/SKILL.md` | deleted | 1 | `8ba4cfb^` | **none - gap** | not-assertable | 0 | |
| `skills/project-session-manager/SKILL.md` | modified | 1 | `2f0bd25^` | **none - gap** | not-assertable | 0 | |
| `skills/skillify/SKILL.md` | modified | 1 | `8ba4cfb^` | **none - gap** | not-assertable | 0 | |
| `skills/team/SKILL.md` | modified | 1 | `8ba4cfb^` | **none - gap** | not-assertable | 0 | |

## Declared watch paths - 1

Paths the baseline declares load-bearing (`patchLayer.watchPaths`) that OMQ's own commits
never touched, so they cannot appear as collisions -- yet the hop still changes them.
A row that matches neither ancestor blob holds **OMQ's own text**: adopting the hop
overwrites it, and no patch-layer check will notice.

| path | hop | == v4.15.1 | == v5.0.0 | why |
|---|---|---|---|---|
| docs/CLAUDE.md | modified | no | no | source of the AGENTS.md written into a user's config root |

## Regenerate

```bash
node scripts/conflict-ledger.mjs --patch-layer --output docs/ANCESTOR-PATCH-LAYER.md
```
