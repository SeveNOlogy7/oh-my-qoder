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
| M1 Conflict ledger | 28 named conflicts + negative-control carriers | not started | not measured |
| M2 Subsystem migration | installer+paths -> bridge+scripts -> hooks+skills -> hud -> artefacts | not started | not measured |
| M3 Upstream contributions | 2-4 named PRs to shrink rename surface | not started | not measured |
| M4 Pipeline gate | Triggered only if backport demand > 10/quarter | not started | not measured |
