# Ancestor Parity

> Ancestor: [`Yeachan-Heo/oh-my-claudecode`](https://github.com/Yeachan-Heo/oh-my-claudecode)
> OMQ snapshot: ancestor **v4.15.1** | Latest adopted: **v5.5.0** | Current ancestor latest: **v5.6.2**
> Status: v5.0.0 through v5.5.0 adopted; M2 subsystem migration in progress (one minor per round)

## Identity

| Fact | Value | Evidence |
|------|-------|----------|
| GitHub fork | no | `fork: false`, `parent: null` |
| Ancestor license | MIT | upstream `LICENSE` |
| OMQ license | Apache-2.0 | OMQ `LICENSE` |
| Ancestor references to Qoder | 0 | grep of ancestor tree |

## Version timeline

| Version | Date | State | Evidence |
|---------|------|-------|----------|
| v4.15.1 | 2026-06-27 | **OMQ snapshot point** | OMQ created 2026-06-25, last upstream push 2026-07-02 |
| v5.0.0 | 2026-08-24 | **adopted** | adoption `344176f` (blob-verified 6790/6790), digest `3c6cbf9` |
| v5.1.0 | 2026-08-31 | **adopted** | this round: pin `ebf06c7`, adoption `3acd654` (6812/6812 blob-verified), see below |
| v5.2.0 | 2026-09-03 | **adopted** | this round: pin `acf7948`, adoption `9ed5686` (6829/6829 blob-verified), see below |
| v5.3.0 | 2026-09-06 | **adopted** | this round: pin `5174b8a`, adoption `35f99d2` (6840/6840 blob-verified), see below |
| v5.4.0 | 2026-09-11 | **adopted** | this round: pin `83c3fab`, adoption `b9aaa2d` (6909/6909 blob-verified), see below |
| v5.5.0 | 2026-09-22 | **adopted** | this round: pin `11b237f`, adoption `5c933c8` (7005/7005 blob-verified), see below |
| v5.6.0 | 2026-10-01 | **adopted** | this round: pin `c56fc5e`, adoption `78b03e9` (7077/7077 blobs measured via the GitHub API — see the caveat below), see below |
| v5.6.1 | not measured | not measured | — |
| v5.6.2 | 2026-10-06 | not measured | latest ancestor tag at this round's time of writing |

## Blob-tree diff v4.15.1 to v5.0.0

Method: full git tree blob SHA comparison (`truncated: false`, 5795 to 6790 blobs).
Not the GitHub compare API, which caps files at 300.

| Metric | All files | Excluding dist/bridge/blog |
|--------|----------:|---------------------------:|
| Added | 1026 | 263 |
| Modified | 1181 | 400 |
| Removed | 31 | 27 |

## Blob-tree diff v5.0.0 to v5.1.0

Method: full git tree blob SHA comparison of the cached ancestor trees (`truncated: false`,
6790 to 6812 blobs). The GitHub compare API reports 300 files (its cap) and 535 commits —
authoritative numbers come from the tree diff, not the API.

| Metric | All files |
|--------|----------:|
| Added | 77 |
| Modified | 445 |
| Removed | 55 |
| Unchanged | 6290 |

Adoption surface after excluding `.github/**`, `dist/**`, `bridge/**` (the coordinator keeper
stays) and the 143 OMQ-only paths: 374 paths adopted (51 additions + 323 modifications,
including the 13 rows the v5.0.0-round patch-layer table marks as OMQ-patched — those were
re-landed in the repair lanes). v5.1.0's new surfaces: 4 new skills (`graph`, `drydock`,
`launch`, `minimal-code-discipline`), the `src/graph` runtime source, `docs/shipyard.md`,
rate-limit-wait and magic-keywords changes, and ~50 test files.

## Blob-tree diff v5.1.0 to v5.2.0 (this round)

Method: full git tree blob SHA comparison of the cached ancestor trees (`truncated: false`,
6812 to 6829 blobs). Authoritative numbers come from the tree diff, not the GitHub compare
API.

| Metric | All files |
|--------|----------:|
| Added | 17 |
| Modified | 634 |
| Removed | 0 |
| Unchanged | 6178 |

Adoption surface after excluding `.github/**`, `dist/**`, `bridge/**` (the coordinator keeper
stays) and the 154 OMQ-only paths: 72 paths adopted (15 additions + 57 modifications; the
keeper `bridge/claude-md-coordinator.cjs` is re-landed and the build reproduces it
byte-identically). v5.2.0's new surfaces: the HUD update-hint element
(`src/hud/elements/update-hint.ts`) with its suite, session-start update-check and
update-refresh suites, the worktree-paths git-timeout / split-warning / toplevel-cache
suites, the LSP document-lifecycle suite, hung-hook fixtures and a win32 stdio-contract
suite -- all 15 additions land under `src/` (the hop's other additions are `dist/**` build
output, excluded).

## Blob-tree diff v5.2.0 to v5.3.0 (this round)

Method: full git tree blob SHA comparison of the cached ancestor trees (`truncated: false`,
6829 to 6840 blobs). Authoritative numbers come from the tree diff, not the GitHub compare
API.

| Metric | All files |
|--------|----------:|
| Added | 11 |
| Modified | 83 |
| Removed | 0 |
| Unchanged | 6746 |

Adoption surface after excluding `.github/**`, `dist/**`, `bridge/**` (the coordinator keeper
stays) and the 154 OMQ-only paths: 61 paths adopted (8 additions + 53 modifications; the
keeper `bridge/claude-md-coordinator.cjs` is re-landed and the build reproduces it
byte-identically). v5.3.0's new surfaces: two new skills (`loft`, `ask-navigator`), the
workspace checkpoint/rollback feature (`src/features/checkpoint` + `src/cli/checkpoint.ts`),
the remote-approval gate runtime (`src/graph/runtime/remote-approval.ts`) with its
approval-reply notification suite, and the batched Windows cache-occupancy identity checks
(#3973) landing in the `cache-occupancy` trio -- the hop's other 3 additions are `dist/**`
build output, excluded.

## Blob-tree diff v5.3.0 to v5.4.0 (this round)

Method: full git tree blob SHA comparison of the cached ancestor trees (`truncated: false`,
6840 to 6909 blobs). Authoritative numbers come from the tree diff, not the GitHub compare
API.

| Metric | All files |
|--------|----------:|
| Added | 69 |
| Modified | 412 |
| Removed | 0 |
| Unchanged | 6428 |

Adoption surface after excluding `.github/**`, `dist/**`, `bridge/**` (the coordinator keeper
stays) and the 154 OMQ-only paths: 180 paths adopted (23 additions + 157 modifications; the
other 46 additions are `dist/**` build output, excluded). v5.4.0's new surfaces: the lookout
workspace feature (`src/features/lookout/**` + `src/cli/lookout.ts` with its suites), the
`harbor` skill with its scenario fixtures and suite, the `agent-doc-discipline` skill, the
`state-lock` twins (`scripts/lib` + `templates/hooks/lib`) that absorb the flock/emergency
mechanism the ancestor moved out of `atomic-write`, the session-end foreground bootstrap, the
contained-fd graph runtime helper, the session-start context-budget suite, and the
Ruby-false-positive lint suite. Three modified-classified paths the fork had deleted in its
own history were recreated by the adoption (`skills/omc-doctor/SKILL.md`,
`skills/omc-setup/phases/02-configure.md`, `src/skills/__tests__/omc-doctor-skill.test.ts`)
and removed again in the naming lane -- the fork keeps only its `omq-*` twins, onto which the
ancestor's runtime-prerequisites increment was ported (identity-substituted, suite-pinned).

## Blob-tree diff v5.4.0 to v5.5.0 (this round)

Method: full git tree blob SHA comparison of the cached ancestor trees (`truncated: false`,
6909 to 7005 blobs). Authoritative numbers come from the tree diff, not the GitHub compare
API.

| Metric | All files |
|--------|----------:|
| Added | 99 |
| Modified | 590 |
| Removed | 3 |
| Unchanged | 6316 |

Adoption surface after excluding `.github/**`, `dist/**`, `bridge/**` (the coordinator keeper
stays) and the 154 OMQ-only paths: 275 paths adopted (65 additions + 210 modifications; the
other 34 additions are `dist/**` build output, excluded; the keeper
`bridge/claude-md-coordinator.cjs` is re-landed and the build reproduces it byte-identically).
The hop's 3 removals are test files the fork had already deleted in its own history
(`src/__tests__/runtime-task-orphan.test.ts`, `src/team/__tests__/runtime-assign.test.ts`,
`src/team/__tests__/runtime-prompt-mode.test.ts`) -- adopted as removed-kept, the fork's
deletions stand. v5.5.0's new surfaces: the JEV judgment system (`src/hooks/jev/**` runtime
with `jev-shadow` plumbings across seven hook families, the `jev-model-routing` /
`jev-slop-warning` features and `scripts/jev-eval.mjs`, all with suites), the native
contained-fs runtime (`native/contained-fs.c` + `src/graph/runtime/native-contained-fs.ts`
with its build/verify scripts and suite), four new skills (`architecture-survey`, `diagram`,
`intent`, `minimal-prose-discipline`), the `src/team` storage-boundary suite, the post-tool
directory-context injector, the `read-budget-preflight` twin (`scripts/lib`), the
shipyard-audit pair, the launch secure-transport suite, and the docs standards trio
(`architecture`/`data`/`process`) with two ADRs -- all 65 non-`dist` additions land inside the
adopted surface above.

## v5.0.0 breaking changes

| Change | Detail | OMQ impact |
|--------|--------|------------|
| Skills retired | 14 | 10 of those names still exist in OMQ today |
| Commands retired | 7 | 10 of those names still exist in OMQ today |
| npm publish | OIDC Trusted Publishing only | not applicable (OMQ distributes via marketplace/zip/local directory) |

## v5.1.0 changes that touched OMQ surfaces

| Change | Detail | OMQ disposition |
|--------|--------|-----------------|
| Skill/agent namespace guard (#3667) | case-folded prefix guard in the pre-tool enforcer | re-landed: prefixes accept `oh-my-qoder:`/`omq:` again beside the ancestor spellings |
| CLAUDE.md companion detection (#1101/#2992) | multi-file companion scanning + setup-fallback suppression | re-landed with the OMQ spellings (`omq-reference`) |
| doctor `check` subcommand, `--skip-hooks` removal | cli surface | re-registered / re-dropped (both had been lost in the hop) |
| fable tier routing (#3246) | new model-tier vocabulary in the routing docs | kept (test-enforced; `fable` appears in the model routing table) |

## v5.2.0 changes that touched OMQ surfaces

| Change | Detail | OMQ disposition |
|--------|--------|-----------------|
| 15 new `src/` files: HUD update-hint element, session-start update-check/refresh, worktree-paths git-timeout/split-warning/toplevel-cache, LSP document-lifecycle, hung-hook fixtures, win32 stdio contract | the hop's only non-`dist` additions | adopted; the naming repair restored the fork spellings inside them (13 of the 15 carry it, 2 stay byte-identical) |
| `bounded-git-timeout.mjs` and `session-start.mjs` (the `scripts/lib` / `templates/hooks` twins) | shared script and hook template rewritten upstream | dual-merged onto the fork's copies (structure then token); twin-hash audit: the pair byte-equal at the pre-adoption ref stays byte-equal, the already-divergent pair keeps its divergence |
| 5 docs/skill collisions (`docs/HOOKS.md`, `docs/REFERENCE.md`, `docs/shipyard.md`, `skills/drydock`+`skills/launch` SKILL.md) | upstream rewrote the same text | fork spellings restored over the ancestor text (docs token pass) |
| plugin manifests + `CHANGELOG.md` | version 5.1.0 -> 5.2.0 and release notes | adopted verbatim (the fork's pre-adoption blobs equalled the v5.1.0 versions) |

## v5.3.0 changes that touched OMQ surfaces

| Change | Detail | OMQ disposition |
|--------|--------|-----------------|
| 8 new non-`dist` files: `loft` + `ask-navigator` skills, workspace checkpoint (`src/features/checkpoint`, `src/cli/checkpoint.ts`), remote-approval gate (`src/graph/runtime/remote-approval.ts`), approval-reply suite | the hop's only non-`dist` additions | adopted; the naming/identity repair restored the fork spellings inside them (checkpoint/remote-approval runtime strings re-branded in the compile lane) |
| `cache-occupancy` trio (`src/utils`, `scripts/lib`, `templates/hooks/lib`) | upstream batched the Windows identity checks (#3973) and preserved occupancy tick precision (#3974) | adopted and dual-merged (structure then token); twin-hash audit: the 10 equal pairs stay equal, the `cache-occupancy` twins keep their by-design divergence (recorded, not silently unified) |
| notifications layer (8 `src/notifications/**` files) | remote-approval reply plumbing, formatter/template changes | adopted; installer/cli repair lane re-asserted the fork's config-dir getters, and the two notification suites mock them (terminal win32 baseline green) |
| 5 docs/skill collisions (`docs/REFERENCE.md`, `docs/shipyard.md`, `skills/AGENTS.md`, `skills/drydock`+`skills/launch` SKILL.md) | upstream rewrote the same text | fork spellings restored over the ancestor text (W4 docs token pass) |
| plugin manifests + `CHANGELOG.md` | version 5.2.0 -> 5.3.0 and release notes | adopted verbatim (the fork's pre-adoption blobs equalled the v5.2.0 versions; byte-verified against the cached v5.3.0 tree) |

## v5.4.0 changes that touched OMQ surfaces

| Change | Detail | OMQ disposition |
|--------|--------|-----------------|
| 23 new non-`dist` files: lookout feature + CLI, `harbor` and `agent-doc-discipline` skills, `state-lock` twins, session-end foreground bootstrap, contained-fd helper | the hop's only non-`dist` additions | adopted; the naming/identity repair restored the fork spellings inside them (the lookout doc token re-branded in the compile lane) |
| `atomic-write` twins lose the flock/emergency mechanism to the new `state-lock` twins | upstream restructured its script/hook library | dual-merged (structure then token); the fork's twin byte-equality contract restored -- the ancestor ships a one-blank-line twin divergence the fork does not -- and the new `state-lock` twins stay byte-equal to the ancestor on both sides |
| `plugin-setup.mjs` drops the Ruby check (#3996); `release.ts` grows the golden + inventory git-add release face | upstream removed a platform probe and expanded the release pipeline | the deletion adopted (its lint suite pins the no-Ruby state); the fork's runtime-externals sentinel and 300s install timeout ported onto the new face; `release.ts` keeps the fork's `.qoder-plugin` manifest paths and `OMQ:VERSION` marker |
| `session-start` twins restructure occupancy handling (#3995) | shared script and hook template rewritten upstream | dual-merged: the ancestor's hoist structure plus the fork's plugin-cache-dir helper calls, `OMQ_SESSION_OWNER_PID`, and `oh-my-qoder` cache regex |
| standalone state-lock provisioning and provisioned-template guards | ancestor-new code crashed on win32 (`'/'`-joined PACKAGE_JSON vs strict `realpathSync`; separator-bound template guards spawned the fail-closed stub) | real defects fixed in the measurement lane (path normalization + separator-agnostic matching; 105 baseline rows flipped green, zero semantic regressions) |
| plugin manifests + `CHANGELOG.md` | version 5.3.0 -> v5.4.0 and release notes | adopted verbatim (the fork's pre-adoption blobs equalled the v5.3.0 versions; byte-verified against the cached v5.4.0 tree) |

## v5.5.0 changes that touched OMQ surfaces

| Change | Detail | OMQ disposition |
|--------|--------|-----------------|
| 65 new non-`dist` files: the JEV judgment system (`src/hooks/jev/**`, `jev-shadow` plumbings across seven hook families, `jev-model-routing`/`jev-slop-warning`, `scripts/jev-eval.mjs`), the native contained-fs runtime (`native/contained-fs.c`, `src/graph/runtime/native-contained-fs.ts`, build/verify scripts), four new skills (`architecture-survey`, `diagram`, `intent`, `minimal-prose-discipline`), the `src/team` storage-boundary suite, the post-tool directory-context injector, the `read-budget-preflight` twin, the shipyard-audit pair, the launch secure-transport suite | the hop's only non-`dist` additions | adopted; the naming/identity repair restored the fork spellings inside them (the jev-shadow and cancel-keyword faces realigned on the omq spellings in the compile and measurement lanes) |
| shared scripts and hook templates rewritten upstream (`scripts/lib` + `templates/hooks/lib` twins, `persistent-mode`, the `keyword-detector` family) | the usual hop rewrite of the twin pairs | adopted and dual-merged; the scripts lane wired the new build entries (`build:contained-fs` et al.) and the W7 build rebuilt every generated artifact byte-identically |
| `runtime-task-orphan` / `runtime-assign` / `runtime-prompt-mode` test files removed upstream | upstream deleted three tests the fork had already deleted in its own history | adopted as removed-kept -- the fork's deletions stand, nothing restored |
| docs token face rewrites (`docs/REFERENCE.md`, `docs/shared/features.md`, `README.md`, among the hop's doc rewrites) | upstream text carries the `omc` cancel-keyword spellings | fork spellings re-asserted in the docs lane: `REFERENCE.md` cancel rows restored to the `omq` spelling (authority v4.15.1 form and the shipped detector tokens); `features.md`/`README.md` keep the authority's own `omc` spelling at those paths |
| plugin manifests + `CHANGELOG.md` | version 5.4.0 -> v5.5.0 and release notes | adopted verbatim (the fork's pre-adoption blobs equalled the v5.4.0 versions; byte-verified against the cached v5.5.0 tree) |

## Blob-tree diff v5.5.0 to v5.6.0

Method: full git tree blob SHA comparison of the cached ancestor trees (`truncated: false`,
7005 to 7077 blobs). Measured this round from `.omq/cache/ancestor-v5.6.0-tree.json`.

| Metric | All files | Adoption surface (excluding `.github/**`) |
|--------|----------:|----------------------------------------:|
| Added | 73 | 73 |
| Modified | 144 | 139 |
| Removed | 1 | 1 |
| Unchanged | 6860 | 6860 |

Excluded from the surface this round: 5 paths under `.github/**` (`CLAUDE.md`,
`generated-artifact-authorizations.json`, `release-body.md`, `workflows/ci.yml`,
`workflows/release.yml`). The fork carries 159 OMQ-only paths (disjoint by construction).

`CONTEXT.md` was removed upstream and is **removed-kept** under the round's rule 2 — the fork
still tracks it and nothing was restored.

### Provenance caveat on the blob count

The 7077 figure was measured through the GitHub API (`/git/trees/<sha>?recursive=1`,
`truncated: false`). Repeated `git fetch` attempts from the upstream repository failed on this
box with `RPC failed; curl 18 transfer closed with outstanding read data remaining` and later
`Recv failure: Connection was reset`, so the ancestor tree could not be obtained over the git
protocol and no authoritative **treeSha** was measured. Do not cite a treeSha for this round.

## v5.6.0 changes that touched OMQ surfaces

| Change | Detail | OMQ disposition |
|--------|--------|-----------------|
| `CliAgentType` loses `'qwen'` | upstream narrowed the CLI agent union to `'claude' \| 'codex' \| 'gemini' \| 'cursor' \| 'grok' \| 'antigravity'`, while `src/team/cli-agent-types.ts` still builds a `Set<CliAgentType>` containing `'qwen'` | **fork feature restored**: `model-contract.ts` re-includes `'qwen'`. Proven necessary — without it tsc fails with `TS2769` on `cli-agent-types.ts:10` and `TS2741` on the `Record<CliAgentType, …>` tables |
| `InstallOptions` gains `skipClaudeCheck`; `hud/index.ts` imports `./omc-state.js` and declares `omcVersion`/`omcUpdateSource` | upstream renaming on the installer/HUD surface | **fork identity restored**: `skipQoderCheck`, `./omq-state.js`, `omqVersion`, `omqUpdateSource`. A blind bulk rename is wrong here — the legacy corpora (`src/installer/legacy-claude-md-corpus.ts`, `src/installer/__tests__/fixtures/legacy-guides.json`) and the `tests/known-failures-*.json` failure signatures legitimately keep ancestor spellings |
| `canonicalTeamStatePath`'s prefix guard still tested the ancestor `.omc` spelling while `TeamPaths.*` emits `.omq/…` strings | the guard never matched, so every real call fell through to `canonicalTeamCwd()` instead of `canonicalTeamOmcRoot()`; `assertTeamStatePathSafeSync` then threw `team_instance_path_outside_storage_root` | **root-cause fix** (`b6142e5`). Proven by before/after: with the guard reverted to `.omc`, all four production shapes (`recoveryLifecycleLock`, `teamInstanceReservation`, `teamInstanceAuthorityRoot`, `teamInstanceCleanupRoot`) resolve OUTSIDE the canonical root and the assertion throws; with `.omq` they resolve INSIDE and it does not. `team-instance.test.ts` 17/17 |
| v1 mutation entrypoints retired | `src/team/runtime-v1-legacy.ts:21` now fails closed (`retired_v1_runtime:spawnWorkerForTask`), while fork tests still call the v1 entrypoints | **upstream behaviour kept**, fork tests flagged: this is a genuine v5.6.0-vs-fork divergence (the `retired-v1-runtime` family, 14 added rows). Proven not a regression from the state-paths fix — it fails identically with that fix reverted |
| `--pool=threads` / fork-storm failure on win32 | the default pool forks one worker per CPU and dies with `fatal error in forked process - WFSO timed out after longjpp`; `--pool=threads` is materially worse (160/159 failures vs 21 at medium load) | terminal run of record uses `npx vitest run --exclude "tests/perf/**" --no-file-parallelism`; measured 842 files / 15715 tests, `Tests 1287 failed \| 14173 passed \| 255 skipped` |
| 73 new non-`dist` files | `scripts/{budget-guard,git-guardrails,jev-resolve,runs-reconciler,stale-run-reporter}.mjs`, `scripts/lib/{enforcement-log,jev-shadow,run-reaper}.mjs`, four skills (`map`, `pr`, `refit`, `tdd`), `GLOSSARY.md`, `docs/design/*`, `docs/factory/t6-acceptance`, `src/factory/**`, `src/cli/commands/{factory,intake,ralph}.ts`, `src/lib/{host-load-gate,runs-ledger}.ts`, `src/hooks/session-end/{chain-enqueuer,check-evidence,guardrails,routing,spawn-next}.ts`, `templates/hooks/session-end.mjs`, ~40 new tests | adopted verbatim; the naming/identity repair restored fork spellings inside them |
| `inventory/inventory-graph.json` declared `generated.distFiles: 5066` | that figure was inherited from the ancestor when v5.4/v5.5 adoption copied the artifact across, and the fork generator had never re-run to correct it | **stale value corrected** (`726969b`): `--write` regenerates it to `distFiles: 0`. Verified deterministic, not data loss — `listTrackedGenerated` has existed since the v5.0.0 alignment, `dist/` was never tracked (`git log --diff-filter=A -- 'dist/*'` is empty), and `.gitignore` ignored `dist/` from the initial commit |

## Migration milestones

| Milestone | Scope | State | Evidence |
|-----------|-------|-------|----------|
| M0 Provenance & baseline | ANCESTOR_BASELINE.json, attribution, lineage docs | done (re-pinned to v5.6.0) | pin `c56fc5e` |
| M1 Conflict ledger | named conflicts + negative-control carriers | done, re-generated | 993 collision rows in `docs/ANCESTOR-PATCH-LAYER.md`; carriage lanes measured |
| M2 Subsystem migration | installer+paths -> bridge+scripts -> hooks+skills -> hud -> artefacts | in progress | v5.0.0 round: `344176f`..`a8aae62`; v5.1.0 round: `ebf06c7` (pin), `3acd654` (adoption), `a5efd6b` (identity), repair lanes through `a870635`; v5.2.0 round: `acf7948` (pin), `9ed5686` (adoption), `30757a4` (identity), repair lanes through `99f9b33`; v5.3.0 round: `5174b8a` (pin), `35f99d2` (adoption), `ab2abcb` (identity), repair lanes through `2be8132`; v5.4.0 round: `83c3fab` (pin), `b9aaa2d` (adoption), `32be4ea` (identity), repair lanes through `37607c7`; v5.5.0 round: `11b237f` (pin), `5c933c8` (adoption), `e595087` (identity), repair lanes through `ddd7e88`; v5.6.0 round: `c56fc5e` (pin), `78b03e9` (adoption), repair lanes through `726969b` |
| M3 Upstream contributions | 2-4 named PRs to shrink rename surface | not started | not measured |
| M4 Pipeline gate | Triggered only if backport demand > 10/quarter | not started | not measured |

## Presentation surface the hop added, and its disposition

The hop also brought repo-presentation files that ship nothing but are still test-enforced,
so they cannot be pruned on aesthetics. Measured at `b24a046` (v5.0.0 round; unchanged since):

| Path | Files | Held by | Disposition |
|------|-------|---------|-------------|
| `receipts/epic-3698/**` | 15 | `scripts/verify-epic-3698-closure.mjs` + `tests/integration/epic-3698-closure-verifier.test.ts` | keep - deleting breaks a green test |
| `README.<lang>.md` | 11 | `src/__tests__/tier0-docs-consistency.test.ts` | keep - each still carries the upstream install block that `README.md` lost in `57c42e4`; fixing them is part of the docs pass |
| `seminar/**` | 12 (1.8 MB) | nothing but `inventory/inventory-graph.json` | delete **together with** regenerating that artifact (Lane 3) - pruning it first widens an already-red drift gate |
| root `CLAUDE.md` | 1 | `tests/lint/fable-routing-docs.test.ts` (byte-equal to `docs/CLAUDE.md`) | keep, branded |

Two identity claims survive in tracked content and are Lane 3 work, not M0-M2:
`inventory/inventory-graph.json` declares `repository: Yeachan-Heo/oh-my-claudecode` (its
generator hardcodes it at `scripts/generate-inventory-graph.mjs:34`, and
`tests/lint/inventory-graph-drift.test.ts:165` pins the wrong value as expected). The
`Yeachan-Heo` strings in `src/__tests__/release-generation.test.ts` are unrelated - they are
synthetic git-log and pull-request fixtures for the changelog generator and must stay.
