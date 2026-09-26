# Upstream Lineage

> Ancestor: [`Yeachan-Heo/oh-my-claudecode`](https://github.com/Yeachan-Heo/oh-my-claudecode)
> OMQ snapshot: ancestor **v4.15.1** | Ancestor latest: **v5.5.0**
> Status: baseline-only (M0 complete; M1/M2 not started)

## Relationship

OMQ is **not a GitHub fork** of the ancestor (`fork: false`, `parent: null`).
The two repos share no common git history, so there is no merge base and no
incremental version diff to apply. The ancestor is licensed MIT; OMQ is
Apache-2.0. The ancestor contains 0 references to Qoder.

## Snapshot point

OMQ was created 2026-06-25 (last upstream push 2026-07-02) and corresponds to
ancestor **v4.15.1** (released 2026-06-27). OMQ is a renamed snapshot of that
version, adapted for the Qoder CLI platform.

## Ancestor version timeline

| Version | Date | State | Evidence |
|---------|------|-------|----------|
| v4.15.1 | 2026-06-27 | **OMQ snapshot point** | OMQ created 2026-06-25, last push 2026-07-02 |
| v5.0.0 | 2026-08-24 | not adopted | blob-tree diff measured |
| v5.1.0 | 2026-08-31 | not measured | not measured |
| v5.2.0 | 2026-09-03 | not measured | not measured |
| v5.3.0 | 2026-09-06 | not measured | not measured |
| v5.4.0 | 2026-09-11 | not measured | not measured |
| v5.5.0 | 2026-09-22 | not measured | not measured |

No ancestor version has been adopted. M2 has not started; current state is
baseline-only.

## Blob-tree diff: v4.15.1 to v5.0.0

The first meaningful jump is v4.15.1 to v5.0.0 — a whole-tree realignment plus
re-application of OMQ's CN-specific patches.

**Method**: full git tree blob SHA comparison (`truncated: false`, 5795 blobs in
v4.15.1 to 6790 blobs in v5.0.0).

> **Warning**: The GitHub compare API caps files at 300. The figures below are
> derived from blob-tree comparison, not the compare API.

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

## What is not measured

Figures for per-version diffs beyond v5.0.0 (v5.1.0 through v5.5.0) are not
measured. Detailed file-level adoption counts (beyond the aggregate diff above)
are not measured. Where a number is needed but unavailable, this document marks
it "not measured" rather than guessing.
