# Ancestor Parity

> Ancestor: [`Yeachan-Heo/oh-my-claudecode`](https://github.com/Yeachan-Heo/oh-my-claudecode)
> OMQ snapshot: ancestor **v4.15.1** | Current ancestor latest: **v5.5.0**
> Status: baseline-only (M0 provenance recorded; M1/M2 migration not started)

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
| v5.0.0 | 2026-08-24 | not adopted | blob-tree diff measured (see below) |
| v5.1.0 | 2026-08-31 | not measured | not measured |
| v5.2.0 | 2026-09-03 | not measured | not measured |
| v5.3.0 | 2026-09-06 | not measured | not measured |
| v5.4.0 | 2026-09-11 | not measured | not measured |
| v5.5.0 | 2026-09-22 | not measured | not measured |

No ancestor version is adopted. M2 has not started; current state is baseline-only.

## Blob-tree diff v4.15.1 to v5.0.0

Method: full git tree blob SHA comparison (`truncated: false`, 5795 to 6790 blobs).
Not the GitHub compare API, which caps files at 300.

| Metric | All files | Excluding dist/bridge/blog |
|--------|----------:|---------------------------:|
| Added | 1026 | 263 |
| Modified | 1181 | 400 |
| Removed | 31 | 27 |

## v5.0.0 breaking changes

| Change | Detail | OMQ impact |
|--------|--------|------------|
| Skills retired | 14 | 10 of those names still exist in OMQ today |
| Commands retired | 7 | 10 of those names still exist in OMQ today |
| npm publish | OIDC Trusted Publishing only | not applicable (OMQ distributes via marketplace/zip/local directory) |

## Migration milestones

| Milestone | Scope | State | Evidence |
|-----------|-------|-------|----------|
| M0 Provenance & baseline | ANCESTOR_BASELINE.json, attribution, lineage docs | done | this baseline commit |
| M1 Conflict ledger | 28 named conflicts + negative-control carriers | done | 13 lanes, 12 with a VALID negative-control carrier (`docs/negative-control/`), gate wired to the `test`/`windows-test` jobs |
| M2 Subsystem migration | installer+paths -> bridge+scripts -> hooks+skills -> hud -> artefacts | in progress | adoption `344176f`, install surface `01f323e`+`ece6d26`, predicates `ffef454`, on-disk brand tokens `b24a046`, shipped install doc `57c42e4` |
| M3 Upstream contributions | 2-4 named PRs to shrink rename surface | not started | not measured |
| M4 Pipeline gate | Triggered only if backport demand > 10/quarter | not started | not measured |

## Presentation surface the hop added, and its disposition

The hop also brought repo-presentation files that ship nothing but are still test-enforced,
so they cannot be pruned on aesthetics. Measured at `b24a046`:

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
