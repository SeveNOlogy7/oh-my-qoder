# Ancestor Parity

> Ancestor: [`Yeachan-Heo/oh-my-claudecode`](https://github.com/Yeachan-Heo/oh-my-claudecode)
> OMQ snapshot: ancestor **v4.15.1** | Latest adopted: **v5.1.0** | Current ancestor latest: **v5.6.2**
> Status: v5.0.0 and v5.1.0 adopted; M2 subsystem migration in progress (one minor per round)

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
| v5.2.0 | 2026-09-03 | not measured | next round's candidate |
| v5.3.0 | 2026-09-06 | not measured | — |
| v5.4.0 | 2026-09-11 | not measured | — |
| v5.5.0 | 2026-09-22 | not measured | — |
| v5.6.0 | 2026-10-01 | not measured | — |
| v5.6.2 | 2026-10-06 | not measured | latest ancestor tag at this round's time of writing |

## Blob-tree diff v4.15.1 to v5.0.0

Method: full git tree blob SHA comparison (`truncated: false`, 5795 to 6790 blobs).
Not the GitHub compare API, which caps files at 300.

| Metric | All files | Excluding dist/bridge/blog |
|--------|----------:|---------------------------:|
| Added | 1026 | 263 |
| Modified | 1181 | 400 |
| Removed | 31 | 27 |

## Blob-tree diff v5.0.0 to v5.1.0 (this round)

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

## Migration milestones

| Milestone | Scope | State | Evidence |
|-----------|-------|-------|----------|
| M0 Provenance & baseline | ANCESTOR_BASELINE.json, attribution, lineage docs | done (re-pinned to v5.1.0) | auditTarget `ebf06c7` |
| M1 Conflict ledger | named conflicts + negative-control carriers | done, re-generated | 827 collision rows in `docs/ANCESTOR-PATCH-LAYER.md`; carriage lanes measured |
| M2 Subsystem migration | installer+paths -> bridge+scripts -> hooks+skills -> hud -> artefacts | in progress | v5.0.0 round: `344176f`..`a8aae62`; v5.1.0 round: `ebf06c7` (pin), `3acd654` (adoption), `a5efd6b` (identity), repair lanes through `a870635` |
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
