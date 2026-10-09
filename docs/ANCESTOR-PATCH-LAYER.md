# Patch-Layer Collisions

Paths that **OMQ's own commits** change *and* the ancestor hop `v4.15.1` -> `v5.1.0` also changes.
Losing one of these during adoption is a silent regression, which is why this table is generated
from `git log 9ba1359c8f8cab5d72d7ffc543d3e35f676a4709..HEAD` intersected with the two cached ancestor trees -- not written by hand.

| | |
|---|---|
| Colliding paths | 827 |
| Assertable / test-surface / structural | 354 / 391 / 82 |
| Hop modified / added / deleted | 511 / 313 / 3 |
| Assertable rows with a named observation | 252 of 354 |
| Carriers: VALID / INVALID / INCONCLUSIVE / missing | 12 / 0 / 1 / 341 |
| Class-2 rows without a named structural guard | 0 of 473 |

The `un-patch` column is the commit whose parent still has OMQ's patch absent; reverting the file to
that parent is what a negative-control lane does. `obs. rule` records *how* the observation was found
(`conventional` = sibling test by naming convention, `reference-and-co-changed` = a test that both
mentions the module and was edited by the same commit, `reference` = mentions the module).

`carrier` is read back out of `docs/negative-control/<lane>.txt`: **VALID** means the un-patch made a
real test fail, INVALID means every named candidate stayed green (the patch has no coverage),
INCONCLUSIVE means no candidate was even green at HEAD, and `missing` means the lane has never been
measured. `verified via` names the test that actually bit, which is not always the one the rules picked.

`structural guard` (class-2 rows) names the check that file depends on instead of a behavioural test:
the metadata contracts suite, the SKILL.md config-root guard, or the identity gate CI runs over the
payload. A row reading **none - gap** is work M1 has not finished.

## Assertable (M1 class ①: needs a negative-control carrier) - 354

| path | hop | commits | un-patch | observation | obs. rule | cands | carrier | verified via |
|---|---|---|---|---|---|---|---|---|
| `.claude-plugin/marketplace.json` | modified | 1 | `3b516e3^` | `src/__tests__/release-boundary.test.ts` | reference-and-co-changed | 1 | missing | - |
| `.claude-plugin/plugin.json` | modified | 1 | `3b516e3^` | `src/__tests__/release-boundary.test.ts` | reference-and-co-changed | 3 | missing | - |
| `benchmark/quick_test.sh` | modified | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `benchmark/run_benchmark.py` | modified | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `benchmark/run_full_comparison.sh` | modified | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `benchmark/run_omc.sh` | modified | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `benchmark/run_vanilla.sh` | modified | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `benchmarks/code-reviewer/run-benchmark.ts` | modified | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `benchmarks/debugger/run-benchmark.ts` | modified | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `benchmarks/executor/run-benchmark.ts` | modified | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `benchmarks/shared/reporter.ts` | modified | 1 | `a427077^` | `tests/benchmark-diagnostics.test.ts` | reference-and-co-changed | 1 | missing | - |
| `benchmarks/shared/runner.ts` | modified | 1 | `a427077^` | `tests/benchmark-diagnostics.test.ts` | reference-and-co-changed | 1 | missing | - |
| `benchmarks/shared/scorer.ts` | modified | 1 | `a427077^` | `tests/benchmark-diagnostics.test.ts` | reference-and-co-changed | 1 | missing | - |
| `benchmarks/shared/types.ts` | modified | 1 | `a427077^` | `src/__tests__/types.test.ts` | reference-and-co-changed | 7 | missing | - |
| `bridge/claude-md-coordinator.cjs` | added | 3 | `a8aae62^` | `src/__tests__/auto-update.test.ts` | reference-and-co-changed | 9 | missing | - |
| `docs/design/issue-3704-prompt-ssot/measurements.json` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `eslint.config.js` | modified | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `examples/advanced-usage.ts` | modified | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `hooks/hooks.json` | modified | 3 | `a427077^` | `tests/lint/windows-hide-hooks.test.ts` | reference-and-co-changed | 10 | missing | - |
| `inventory/inventory-graph.json` | added | 3 | `a427077^` | `tests/lint/inventory-graph-drift.test.ts` | reference-and-co-changed | 1 | missing | - |
| `receipts/epic-3698/child-3702-terminal.receipt.json` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `receipts/epic-3698/child-3703-terminal.receipt.json` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `receipts/epic-3698/child-3704-terminal.receipt.json` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `receipts/epic-3698/child-3705-terminal.receipt.json` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `receipts/epic-3698/child-3706-terminal.receipt.json` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `receipts/epic-3698/child-3707-terminal.receipt.json` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `receipts/epic-3698/child-3708-terminal.receipt.json` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `receipts/epic-3698/child-3709-terminal.receipt.json` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `receipts/epic-3698/child-3710-terminal.receipt.json` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `receipts/epic-3698/child-3711-terminal.receipt.json` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `receipts/epic-3698/ci-evidence-merged.receipt.json` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `receipts/epic-3698/install-verification-2026-08-12.receipt.json` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `receipts/epic-3698/metrics-2026-08-12.receipt.json` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `receipts/epic-3698/remaining-risk.json` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `receipts/issue-3858/merged.receipt.json` | added | 1 | `3b516e3^` | **none - gap** | none | 0 | missing | - |
| `scripts/build-bridge-entry.mjs` | modified | 1 | `a427077^` | `src/__tests__/hud/windows-platform.test.ts` | reference-and-co-changed | 1 | missing | - |
| `scripts/build-claude-md-coordinator.mjs` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `scripts/build-cli.mjs` | modified | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `scripts/build-mcp-server.mjs` | modified | 1 | `a427077^` | `src/__tests__/hud/windows-platform.test.ts` | reference-and-co-changed | 1 | missing | - |
| `scripts/build-prompt-ssot.ts` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `scripts/build-runtime-cli.mjs` | modified | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `scripts/build-skill-bridge.mjs` | modified | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `scripts/build-team-server.mjs` | modified | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `scripts/build-workflow-stage-prompts.mjs` | added | 1 | `a427077^` | `tests/integration/workflow-profile-stop-transition.test.ts` | reference-and-co-changed | 2 | missing | - |
| `scripts/ci/check-no-committed-build-artifacts.mjs` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `scripts/code-simplifier.mjs` | modified | 2 | `a427077^` | `tests/lint/windows-hide-hooks.test.ts` | reference-and-co-changed | 1 | missing | - |
| `scripts/collect-epic-3698-ci-evidence.mjs` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `scripts/compose-docs.mjs` | modified | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `scripts/context-guard-stop.mjs` | modified | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `scripts/generate-inventory-graph.mjs` | added | 3 | `a427077^` | `tests/lint/inventory-graph-drift.test.ts` | reference-and-co-changed | 1 | missing | - |
| `scripts/generate-prompt-projections.mjs` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `scripts/generate-skill-entitlements.mjs` | added | 1 | `a427077^` | `src/__tests__/skill-entitlements.test.ts` | reference-and-co-changed | 1 | missing | - |
| `scripts/graph-agent-demo.mjs` | added | 1 | `3b516e3^` | **none - gap** | none | 0 | missing | - |
| `scripts/inventory-issue-3698.mjs` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `scripts/keyword-detector.mjs` | modified | 3 | `a427077^` | `src/__tests__/keyword-detector-script.test.ts` | reference-and-co-changed | 4 | missing | - |
| `scripts/lib/atomic-write.mjs` | modified | 1 | `a427077^` | `src/lib/__tests__/atomic-write.test.ts` | reference-and-co-changed | 8 | missing | - |
| `scripts/lib/bounded-git-timeout.mjs` | added | 1 | `a427077^` | `src/__tests__/bounded-git-timeout-parity.test.ts` | reference-and-co-changed | 1 | missing | - |
| `scripts/lib/cache-occupancy.mjs` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `scripts/lib/config-dir.sh` | modified | 1 | `12325b6^` | `src/__tests__/config-dir.test.ts` | reference-and-co-changed | 5 | missing | - |
| `scripts/lib/context-usage.mjs` | added | 1 | `a427077^` | `src/__tests__/context-usage.test.ts` | reference-and-co-changed | 1 | missing | - |
| `scripts/lib/precompact-publisher.mjs` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `scripts/lib/precompact-restore.mjs` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `scripts/lib/skill-entitlements.mjs` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `scripts/lib/state-root.cjs` | modified | 1 | `3b516e3^` | **none - gap** | none | 0 | missing | - |
| `scripts/lib/state-root.mjs` | modified | 1 | `3b516e3^` | **none - gap** | none | 0 | missing | - |
| `scripts/lib/stdin.mjs` | modified | 1 | `a427077^` | `src/installer/__tests__/standalone-hook-reconcile.test.ts` | reference-and-co-changed | 2 | missing | - |
| `scripts/lib/workflow-profile-runtime.mjs` | added | 2 | `a427077^` | `src/__tests__/workflow-profile-runtime-prefix.test.ts` | reference-and-co-changed | 2 | missing | - |
| `scripts/lib/workflow-stage-prompts.mjs` | added | 3 | `a427077^` | `src/__tests__/workflow-stage-prompts-drift.test.ts` | reference-and-co-changed | 2 | missing | - |
| `scripts/measure-prompt-ssot.ts` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `scripts/persistent-mode.cjs` | modified | 3 | `a427077^` | `src/__tests__/doctor-conflicts.test.ts` | reference-and-co-changed | 6 | missing | - |
| `scripts/persistent-mode.mjs` | modified | 3 | `a427077^` | `src/__tests__/doctor-conflicts.test.ts` | reference-and-co-changed | 6 | missing | - |
| `scripts/plugin-shipping-surface.mjs` | added | 3 | `a427077^` | `src/__tests__/npm-package-bin-surface.test.ts` | reference-and-co-changed | 1 | missing | - |
| `scripts/post-tool-verifier.mjs` | modified | 2 | `a427077^` | `src/__tests__/doctor-conflicts.test.ts` | reference-and-co-changed | 4 | missing | - |
| `scripts/pre-tool-enforcer.mjs` | modified | 3 | `a427077^` | `src/__tests__/pre-tool-enforcer.test.ts` | reference-and-co-changed | 4 | missing | - |
| `scripts/release-boundary.mjs` | added | 2 | `a427077^` | `src/__tests__/release-boundary.test.ts` | reference-and-co-changed | 2 | missing | - |
| `scripts/release.ts` | modified | 2 | `a427077^` | `src/__tests__/release-boundary.test.ts` | reference-and-co-changed | 4 | missing | - |
| `scripts/run.cjs` | modified | 2 | `a427077^` | `src/__tests__/run-cjs-generic-timeout.test.ts` | reference-and-co-changed | 16 | missing | - |
| `scripts/session-end.mjs` | modified | 1 | `a427077^` | `src/__tests__/doctor-conflicts.test.ts` | reference-and-co-changed | 4 | missing | - |
| `scripts/session-start.mjs` | modified | 5 | `12325b6^` | `src/__tests__/session-start-precompact-restore.test.ts` | reference-and-co-changed | 8 | **VALID** | `src/__tests__/patch-layer-guards.test.ts` |
| `scripts/setup-claude-md.sh` | modified | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `scripts/setup-progress.sh` | modified | 1 | `3b516e3^` | **none - gap** | none | 0 | missing | - |
| `scripts/skill-injector.mjs` | modified | 1 | `a427077^` | `src/__tests__/skill-injector-script.test.ts` | reference-and-co-changed | 1 | missing | - |
| `scripts/uninstall.sh` | modified | 1 | `3b516e3^` | **none - gap** | none | 0 | missing | - |
| `scripts/verify-epic-3698-closure.mjs` | added | 2 | `a427077^` | `tests/integration/epic-3698-closure-verifier.test.ts` | reference-and-co-changed | 1 | missing | - |
| `scripts/verify-generated-artifact-authorization.mjs` | added | 1 | `a427077^` | `src/__tests__/generated-artifact-authorization.test.ts` | reference-and-co-changed | 1 | missing | - |
| `scripts/wiki-session-end.mjs` | modified | 1 | `a427077^` | `src/__tests__/setup-contracts-regression.test.ts` | reference-and-co-changed | 2 | missing | - |
| `scripts/workflow-drift-guard.mjs` | modified | 1 | `a427077^` | `src/hooks/__tests__/workflow-drift-guard-script.test.ts` | reference-and-co-changed | 2 | missing | - |
| `skills/project-session-manager/lib/providers/jira.sh` | modified | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `skills/project-session-manager/lib/session.sh` | modified | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `skills/project-session-manager/lib/tmux.sh` | modified | 2 | `a427077^` | `src/__tests__/psm-launch-trust.test.ts` | reference | 2 | missing | - |
| `skills/project-session-manager/lib/worktree.sh` | modified | 2 | `a427077^` | `src/__tests__/auto-slash-live-data-security.test.ts` | reference-and-co-changed | 70 | missing | - |
| `skills/project-session-manager/psm.sh` | modified | 2 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `skills/project-session-manager/tests/test-jira-provider.sh` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/agents/prompt-ssot/compose.ts` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/agents/prompt-ssot/digest.ts` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/agents/prompt-ssot/index.ts` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/agents/prompt-ssot/manifest.ts` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/agents/prompt-ssot/metrics.ts` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/agents/prompt-ssot/sections.ts` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/agents/prompt-ssot/types.ts` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/agents/scientist.ts` | modified | 1 | `a427077^` | `src/tools/python-repl/__tests__/sandbox-guidance-parity.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/alias-retirement/closure.ts` | added | 1 | `a427077^` | `src/alias-retirement/__tests__/closure.test.ts` | conventional | 1 | missing | - |
| `src/alias-retirement/index.ts` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/alias-retirement/policy.ts` | added | 1 | `a427077^` | `src/alias-retirement/__tests__/policy.test.ts` | conventional | 1 | missing | - |
| `src/alias-retirement/registry.ts` | added | 1 | `a427077^` | `src/alias-retirement/__tests__/registry.test.ts` | conventional | 1 | missing | - |
| `src/alias-retirement/verifier.ts` | added | 1 | `a427077^` | `src/alias-retirement/__tests__/verifier.test.ts` | conventional | 1 | missing | - |
| `src/autoresearch/contracts.ts` | modified | 1 | `a427077^` | `src/autoresearch/__tests__/contracts.test.ts` | conventional | 1 | missing | - |
| `src/autoresearch/runtime.ts` | modified | 3 | `a427077^` | `src/autoresearch/__tests__/runtime.test.ts` | conventional | 1 | missing | - |
| `src/cli/autoresearch-guided.ts` | modified | 3 | `12325b6^` | `src/cli/__tests__/autoresearch-guided.test.ts` | conventional | 1 | INCONCLUSIVE | - |
| `src/cli/claude-md-coordinator.ts` | added | 1 | `a427077^` | `src/installer/__tests__/claude-md-transaction.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/cli/commands/alias-retirement.ts` | added | 2 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/cli/commands/capabilities.ts` | added | 1 | `a427077^` | `src/cli/commands/__tests__/capabilities.test.ts` | conventional | 1 | missing | - |
| `src/cli/commands/doctor-conflicts.ts` | modified | 3 | `a427077^` | `src/__tests__/doctor-conflicts.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/cli/commands/doctor-team-routing.ts` | modified | 2 | `a427077^` | `src/cli/commands/__tests__/doctor-team-routing.test.ts` | conventional | 1 | missing | - |
| `src/cli/commands/team.ts` | modified | 3 | `a427077^` | `src/cli/commands/__tests__/team.test.ts` | conventional | 1 | missing | - |
| `src/cli/commands/teleport.ts` | modified | 2 | `a427077^` | `src/cli/commands/__tests__/teleport.test.ts` | conventional | 1 | missing | - |
| `src/cli/commands/ultragoal.ts` | modified | 2 | `a427077^` | `src/cli/commands/__tests__/ultragoal.test.ts` | conventional | 1 | missing | - |
| `src/cli/graph.ts` | added | 1 | `3b516e3^` | `src/graph/__tests__/runtime/cli.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/cli/hud-watch.ts` | modified | 1 | `a427077^` | `src/cli/__tests__/hud-watch.test.ts` | conventional | 1 | missing | - |
| `src/cli/index.ts` | modified | 4 | `12325b6^` | `src/cli/__tests__/cli-boot.test.ts` | reference-and-co-changed | 5 | **VALID** | `src/cli/__tests__/cli-boot.test.ts` |
| `src/cli/launch.ts` | modified | 3 | `12325b6^` | `src/cli/__tests__/launch.test.ts` | conventional | 1 | **VALID** | `src/cli/__tests__/launch.test.ts` |
| `src/cli/team.ts` | modified | 2 | `a427077^` | `src/cli/__tests__/team.test.ts` | conventional | 1 | missing | - |
| `src/cli/tmux-utils.ts` | modified | 3 | `12325b6^` | `src/cli/__tests__/tmux-utils.test.ts` | conventional | 1 | **VALID** | `src/cli/__tests__/tmux-utils.test.ts` |
| `src/commands/index.ts` | modified | 2 | `a8aae62^` | `tests/lint/inventory-graph-drift.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/config/builtin-skill-entitlements.json` | added | 1 | `a427077^` | `src/__tests__/skill-entitlements-cross-surface.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/config/loader.ts` | modified | 3 | `a427077^` | `src/config/__tests__/loader.test.ts` | conventional | 1 | missing | - |
| `src/config/models.ts` | modified | 2 | `a427077^` | `src/config/__tests__/models.test.ts` | conventional | 1 | missing | - |
| `src/constants/names.ts` | modified | 1 | `a427077^` | `src/__tests__/mode-names-ralplan.test.ts` | reference | 1 | missing | - |
| `src/features/agent-addressability/index.ts` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/features/auto-update.ts` | modified | 3 | `12325b6^` | `src/__tests__/auto-update.test.ts` | reference-and-co-changed | 15 | **VALID** | `src/__tests__/auto-update.test.ts` |
| `src/features/builtin-skills/skills.ts` | modified | 3 | `a427077^` | `src/__tests__/skills-frontmatter-regression.test.ts` | reference-and-co-changed | 14 | missing | - |
| `src/features/delegation-enforcer.ts` | modified | 2 | `a427077^` | `src/__tests__/delegation-enforcer.test.ts` | reference-and-co-changed | 4 | missing | - |
| `src/features/index.ts` | modified | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/features/magic-keywords.ts` | modified | 1 | `3b516e3^` | `src/features/__tests__/magic-keywords.test.ts` | conventional | 1 | missing | - |
| `src/features/model-routing/router.ts` | modified | 1 | `a427077^` | `src/__tests__/model-routing.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/features/model-routing/signals.ts` | modified | 1 | `a427077^` | `src/__tests__/model-routing.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/features/rate-limit-wait/daemon.ts` | modified | 1 | `3b516e3^` | `src/__tests__/rate-limit-wait/daemon-bootstrap.test.ts` | reference-and-co-changed | 3 | missing | - |
| `src/features/rate-limit-wait/rate-limit-monitor.ts` | modified | 1 | `3b516e3^` | `src/__tests__/rate-limit-wait/rate-limit-monitor.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/features/rate-limit-wait/tmux-detector.ts` | modified | 1 | `a427077^` | `src/__tests__/rate-limit-wait/tmux-detector.test.ts` | reference-and-co-changed | 3 | missing | - |
| `src/features/session-friction-report/index.ts` | modified | 1 | `a427077^` | `src/__tests__/session-friction-report.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/features/session-history-search/index.ts` | modified | 1 | `a427077^` | `src/__tests__/session-history-search.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/graph/descriptor.ts` | added | 1 | `a427077^` | `src/graph/__tests__/descriptor.test.ts` | conventional | 1 | missing | - |
| `src/graph/index.ts` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/graph/runtime/approval.ts` | added | 1 | `3b516e3^` | `src/graph/__tests__/runtime/approval.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/graph/runtime/executors/agent.ts` | added | 1 | `3b516e3^` | `src/graph/__tests__/runtime/executors/agent.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/graph/runtime/executors/authority.ts` | added | 1 | `3b516e3^` | **none - gap** | none | 0 | missing | - |
| `src/graph/runtime/executors/command.ts` | added | 1 | `3b516e3^` | `src/graph/__tests__/runtime/executors/command.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/graph/runtime/fence.ts` | added | 1 | `3b516e3^` | `src/graph/__tests__/runtime/fence.test.ts` | reference-and-co-changed | 5 | missing | - |
| `src/graph/runtime/journal.ts` | added | 1 | `3b516e3^` | `src/graph/__tests__/runtime/journal-epoch.test.ts` | reference-and-co-changed | 6 | missing | - |
| `src/graph/runtime/progress.ts` | added | 1 | `3b516e3^` | `src/graph/__tests__/runtime/progress.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/graph/runtime/run-dir.ts` | added | 1 | `3b516e3^` | `src/graph/__tests__/runtime/run-dir.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/graph/runtime/runner.ts` | added | 1 | `3b516e3^` | `src/graph/__tests__/runtime/runner.test.ts` | reference-and-co-changed | 5 | missing | - |
| `src/graph/runtime/safe-fs.ts` | added | 1 | `3b516e3^` | `src/graph/__tests__/runtime/safe-fs.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/graph/runtime/store.ts` | added | 1 | `3b516e3^` | `src/graph/__tests__/runtime/store.test.ts` | reference-and-co-changed | 5 | missing | - |
| `src/graph/runtime/types.ts` | added | 1 | `3b516e3^` | `src/graph/__tests__/runtime/approval.test.ts` | reference-and-co-changed | 13 | missing | - |
| `src/graph/scheduler.ts` | added | 1 | `a427077^` | `src/graph/__tests__/scheduler.test.ts` | conventional | 1 | missing | - |
| `src/graph/schema.ts` | added | 1 | `a427077^` | `src/graph/__tests__/runtime/e2e-crash-recovery.test.ts` | reference | 1 | missing | - |
| `src/graph/types.ts` | added | 1 | `a427077^` | `src/graph/__tests__/runtime/e2e-crash-recovery.test.ts` | reference | 1 | missing | - |
| `src/hooks/auto-slash-command/constants.ts` | modified | 1 | `a427077^` | `src/__tests__/compact-denylist.test.ts` | reference | 1 | missing | - |
| `src/hooks/auto-slash-command/executor.ts` | modified | 2 | `a427077^` | `src/__tests__/auto-slash-aliases.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/hooks/auto-slash-command/live-data.ts` | modified | 1 | `a427077^` | `src/__tests__/live-data.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/hooks/autopilot/adapters/execution-adapter.ts` | modified | 1 | `3b516e3^` | **none - gap** | none | 0 | missing | - |
| `src/hooks/autopilot/adapters/index.ts` | modified | 1 | `a427077^` | `src/hooks/autopilot/__tests__/pipeline.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/hooks/autopilot/adapters/qa-adapter.ts` | modified | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/hooks/autopilot/adapters/ralplan-adapter.ts` | modified | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/hooks/autopilot/cancel.ts` | modified | 2 | `a427077^` | `src/hooks/autopilot/__tests__/cancel.test.ts` | conventional | 1 | missing | - |
| `src/hooks/autopilot/enforcement.ts` | modified | 1 | `a427077^` | `src/__tests__/pipeline-signal-regex-escape.test.ts` | reference | 1 | missing | - |
| `src/hooks/autopilot/index.ts` | modified | 1 | `a427077^` | `src/hooks/persistent-mode/session-isolation.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/hooks/autopilot/named-workflow-resume-validator.ts` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/hooks/autopilot/pipeline-types.ts` | modified | 2 | `a427077^` | `src/__tests__/pipeline-orchestrator.test.ts` | reference-and-co-changed | 3 | missing | - |
| `src/hooks/autopilot/pipeline.ts` | modified | 2 | `a427077^` | `src/hooks/autopilot/__tests__/pipeline.test.ts` | conventional | 1 | missing | - |
| `src/hooks/autopilot/prompts.ts` | modified | 2 | `a427077^` | `src/hooks/autopilot/__tests__/prompts.test.ts` | conventional | 1 | missing | - |
| `src/hooks/autopilot/runtime-insight.ts` | modified | 2 | `a427077^` | `src/hooks/autopilot/__tests__/runtime-insight.test.ts` | conventional | 1 | missing | - |
| `src/hooks/autopilot/state.ts` | modified | 2 | `a427077^` | `src/hooks/autopilot/__tests__/state.test.ts` | conventional | 1 | missing | - |
| `src/hooks/autopilot/types.ts` | modified | 2 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/hooks/autopilot/validation.ts` | modified | 1 | `a427077^` | `src/hooks/autopilot/__tests__/validation.test.ts` | conventional | 1 | missing | - |
| `src/hooks/beads-context/constants.ts` | modified | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/hooks/bridge.ts` | modified | 2 | `a427077^` | `src/hooks/__tests__/bridge.test.ts` | conventional | 1 | missing | - |
| `src/hooks/code-simplifier/index.ts` | modified | 2 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/hooks/index.ts` | modified | 2 | `a427077^` | `src/hooks/subagent-tracker/__tests__/index.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/hooks/keyword-detector/index.ts` | modified | 3 | `a427077^` | `src/hooks/keyword-detector/__tests__/index.test.ts` | conventional | 1 | missing | - |
| `src/hooks/keyword-detector/ultrawork/antigravity.ts` | deleted | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/hooks/learner/bridge.ts` | modified | 1 | `a427077^` | `src/__tests__/hooks/learner/bridge.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/hooks/merge-readiness/index.ts` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/hooks/merge-readiness/mcq.ts` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/hooks/merge-readiness/report.ts` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/hooks/merge-readiness/runtime.ts` | added | 3 | `a427077^` | `src/hooks/merge-readiness/__tests__/runtime.test.ts` | conventional | 1 | missing | - |
| `src/hooks/merge-readiness/types.ts` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/hooks/mode-registry/index.ts` | modified | 3 | `a427077^` | `src/__tests__/pipeline-orchestrator.test.ts` | reference-and-co-changed | 4 | missing | - |
| `src/hooks/mode-registry/types.ts` | modified | 2 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/hooks/omc-orchestrator/index.ts` | modified | 2 | `a427077^` | `src/__tests__/delegation-enforcement-levels.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/hooks/permission-handler/index.ts` | modified | 1 | `3b516e3^` | `src/hooks/permission-handler/__tests__/index.test.ts` | conventional | 1 | missing | - |
| `src/hooks/persistent-mode/idle-repo-state.ts` | modified | 1 | `a427077^` | `src/hooks/persistent-mode/__tests__/idle-repo-state.test.ts` | conventional | 1 | missing | - |
| `src/hooks/persistent-mode/index.ts` | modified | 3 | `a427077^` | `src/hooks/persistent-mode/__tests__/ralph-session-mismatch.test.ts` | reference-and-co-changed | 5 | missing | - |
| `src/hooks/pre-compact/index.ts` | modified | 2 | `a427077^` | `src/hooks/__tests__/precompact-restore.test.ts` | reference-and-co-changed | 3 | missing | - |
| `src/hooks/pre-compact/restore.ts` | added | 2 | `a427077^` | `src/hooks/__tests__/precompact-restore.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/hooks/project-memory/detector.ts` | modified | 1 | `a427077^` | `src/hooks/project-memory/__tests__/detector.test.ts` | conventional | 1 | missing | - |
| `src/hooks/project-memory/hot-path-tracker.ts` | modified | 1 | `a427077^` | `src/hooks/project-memory/__tests__/hot-path-tracker.test.ts` | conventional | 1 | missing | - |
| `src/hooks/project-memory/learner.ts` | modified | 1 | `a427077^` | `src/hooks/project-memory/__tests__/learner.test.ts` | conventional | 1 | missing | - |
| `src/hooks/ralph/index.ts` | modified | 2 | `a427077^` | `src/hooks/keyword-detector/__tests__/index.test.ts` | reference-and-co-changed | 8 | missing | - |
| `src/hooks/ralph/loop.ts` | modified | 2 | `a427077^` | `src/hooks/__tests__/bridge-routing.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/hooks/ralph/prd.ts` | modified | 3 | `a427077^` | `src/hooks/persistent-mode/__tests__/ralph-verification-flow.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/hooks/ralph/stale-prd.ts` | added | 2 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/hooks/ralph/verifier.ts` | modified | 3 | `a427077^` | `src/__tests__/ralph-prd-amendment.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/hooks/registry/cutover.ts` | added | 1 | `a427077^` | `src/hooks/registry/__tests__/cutover.test.ts` | conventional | 1 | missing | - |
| `src/hooks/registry/dispatcher.ts` | added | 1 | `a427077^` | `src/hooks/registry/__tests__/dispatcher.test.ts` | conventional | 1 | missing | - |
| `src/hooks/registry/index.ts` | added | 1 | `a427077^` | `src/hooks/persistent-mode/stop-hook-blocking.test.ts` | reference-and-co-changed | 4 | missing | - |
| `src/hooks/registry/registry.ts` | added | 1 | `a427077^` | `src/hooks/registry/__tests__/registry.test.ts` | conventional | 1 | missing | - |
| `src/hooks/registry/shadow.ts` | added | 1 | `a427077^` | `src/hooks/registry/__tests__/shadow.test.ts` | conventional | 1 | missing | - |
| `src/hooks/registry/types.ts` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/hooks/rules-injector/finder.ts` | modified | 1 | `a427077^` | `src/hooks/rules-injector/finder.test.ts` | conventional | 1 | missing | - |
| `src/hooks/rules-injector/parser.ts` | modified | 1 | `a427077^` | `src/hooks/rules-injector/parser.test.ts` | conventional | 1 | missing | - |
| `src/hooks/session-end/action-runner.ts` | added | 1 | `a427077^` | `src/hooks/session-end/__tests__/action-runner.test.ts` | conventional | 1 | missing | - |
| `src/hooks/session-end/action-watchdog.ts` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/hooks/session-end/callbacks.ts` | modified | 2 | `a427077^` | `src/hooks/session-end/__tests__/callbacks.test.ts` | conventional | 1 | missing | - |
| `src/hooks/session-end/cleanup-manifest.ts` | added | 1 | `a427077^` | `src/hooks/session-end/__tests__/cleanup-manifest.test.ts` | conventional | 1 | missing | - |
| `src/hooks/session-end/index.ts` | modified | 3 | `a427077^` | `src/__tests__/hooks/session-end-cleanup.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/hooks/session-end/worker.ts` | added | 1 | `a427077^` | `src/hooks/session-end/__tests__/worker.test.ts` | conventional | 1 | missing | - |
| `src/hooks/skill-state/index.ts` | modified | 3 | `a427077^` | `src/__tests__/hooks.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/hooks/subagent-tracker/index.ts` | modified | 2 | `a427077^` | `src/hooks/subagent-tracker/__tests__/index.test.ts` | conventional | 1 | missing | - |
| `src/hooks/subagent-tracker/session-replay.ts` | modified | 2 | `a427077^` | `src/hooks/subagent-tracker/__tests__/session-replay.test.ts` | conventional | 1 | missing | - |
| `src/hooks/subagent-tracker/worktree-evidence.ts` | added | 1 | `a427077^` | `src/hooks/subagent-tracker/__tests__/worktree-evidence.test.ts` | conventional | 1 | missing | - |
| `src/hooks/task-size-detector/index.ts` | modified | 1 | `3b516e3^` | `src/hooks/task-size-detector/__tests__/index.test.ts` | conventional | 1 | missing | - |
| `src/hooks/team-dispatch-hook.ts` | modified | 2 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/hooks/team-leader-nudge-hook.ts` | modified | 1 | `a427077^` | `src/team/__tests__/team-leader-nudge-outstanding.test.ts` | reference-and-co-changed | 3 | missing | - |
| `src/hooks/team-pipeline/state.ts` | modified | 1 | `3b516e3^` | **none - gap** | none | 0 | missing | - |
| `src/hooks/team-worker-hook.ts` | modified | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/hooks/todo-continuation/index.ts` | modified | 3 | `a427077^` | `src/__tests__/delegation-enforcement-levels.test.ts` | reference-and-co-changed | 7 | missing | - |
| `src/hooks/wiki/session-hooks.ts` | modified | 1 | `a427077^` | `src/hooks/wiki/__tests__/session-hooks.test.ts` | conventional | 1 | missing | - |
| `src/hooks/wiki/storage.ts` | modified | 1 | `a427077^` | `src/hooks/wiki/__tests__/storage.test.ts` | conventional | 1 | missing | - |
| `src/hud/agent-kind.ts` | added | 1 | `a427077^` | `src/__tests__/hud/agent-kind.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/hud/custom-rate-provider.ts` | modified | 1 | `a427077^` | `src/hud/__tests__/custom-rate-provider.test.ts` | conventional | 1 | missing | - |
| `src/hud/elements/agents.ts` | modified | 1 | `a427077^` | `src/__tests__/hud-agents.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/hud/elements/autopilot.ts` | modified | 1 | `a427077^` | `src/hud/__tests__/autopilot-profile.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/hud/elements/cwd.ts` | modified | 1 | `a427077^` | `src/__tests__/hud/cwd.test.ts` | reference-and-co-changed | 4 | missing | - |
| `src/hud/elements/enterprise-cost.ts` | modified | 1 | `a427077^` | `src/hud/__tests__/enterprise-cost.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/hud/elements/limits.ts` | modified | 1 | `a427077^` | `src/__tests__/hud/scoped-weekly-buckets-render.test.ts` | reference-and-co-changed | 6 | missing | - |
| `src/hud/elements/model.ts` | modified | 2 | `a427077^` | `src/__tests__/hud/model.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/hud/elements/multi-repo.ts` | modified | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/hud/index.ts` | modified | 1 | `3b516e3^` | `src/__tests__/hud/watch-mode-init.test.ts` | reference-and-co-changed | 9 | missing | - |
| `src/hud/payload-estimate.ts` | modified | 1 | `a427077^` | `src/__tests__/hud/payload-estimate.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/hud/state.ts` | modified | 1 | `a427077^` | `src/__tests__/hud/state.test.ts` | reference-and-co-changed | 9 | missing | - |
| `src/hud/stdin.ts` | modified | 2 | `a427077^` | `src/__tests__/hud/stdin.test.ts` | reference-and-co-changed | 6 | missing | - |
| `src/hud/transcript.ts` | modified | 1 | `a427077^` | `src/__tests__/hud/agent-kind.test.ts` | reference-and-co-changed | 5 | missing | - |
| `src/hud/types.ts` | modified | 2 | `a427077^` | `src/__tests__/context-usage.test.ts` | reference-and-co-changed | 24 | missing | - |
| `src/hud/usage-api.ts` | modified | 3 | `a427077^` | `src/__tests__/hud/usage-api-lock.test.ts` | reference-and-co-changed | 10 | missing | - |
| `src/index.ts` | modified | 2 | `a427077^` | `src/__tests__/delegation-enforcement-levels.test.ts` | reference-and-co-changed | 18 | missing | - |
| `src/installer/claude-md-analysis.ts` | added | 1 | `a427077^` | `src/installer/__tests__/claude-md-analysis.test.ts` | conventional | 1 | missing | - |
| `src/installer/claude-md-transaction.ts` | added | 1 | `a427077^` | `src/installer/__tests__/claude-md-transaction.test.ts` | conventional | 1 | missing | - |
| `src/installer/historical-agent-ownership.ts` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/installer/hooks.ts` | modified | 2 | `12325b6^` | `src/installer/__tests__/hook-command-portability.test.ts` | reference-and-co-changed | 3 | missing | - |
| `src/installer/index.ts` | modified | 4 | `12325b6^` | `src/installer/__tests__/hud-wrapper-env.test.ts` | reference-and-co-changed | 19 | **VALID** | `src/__tests__/patch-layer-guards.test.ts` |
| `src/installer/legacy-claude-md-corpus.ts` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/installer/mcp-registry.ts` | modified | 3 | `12325b6^` | `src/installer/__tests__/mcp-registry.test.ts` | conventional | 1 | **VALID** | `src/installer/__tests__/mcp-registry.test.ts` |
| `src/lib/atomic-write.ts` | modified | 2 | `a427077^` | `src/lib/__tests__/atomic-write.test.ts` | conventional | 1 | missing | - |
| `src/lib/mode-names.ts` | modified | 2 | `a427077^` | `src/__tests__/mode-names-ralplan.test.ts` | reference | 1 | missing | - |
| `src/lib/mode-state-io.ts` | modified | 2 | `a427077^` | `src/lib/__tests__/mode-state-io.test.ts` | conventional | 1 | missing | - |
| `src/lib/release-generation.ts` | modified | 4 | `12325b6^` | `src/__tests__/release-generation.test.ts` | reference-and-co-changed | 2 | **VALID** | `src/__tests__/release-generation.test.ts` |
| `src/lib/worktree-paths.ts` | modified | 3 | `a427077^` | `src/lib/__tests__/worktree-paths.test.ts` | conventional | 1 | missing | - |
| `src/mcp/tool-registry.ts` | modified | 2 | `a427077^` | `src/tools/python-repl/__tests__/description-parity.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/notifications/reply-listener.ts` | modified | 1 | `a427077^` | `src/notifications/__tests__/reply-listener.test.ts` | conventional | 1 | missing | - |
| `src/notifications/session-registry.ts` | modified | 1 | `a427077^` | `src/notifications/__tests__/session-registry.test.ts` | conventional | 1 | missing | - |
| `src/platform/process-utils.ts` | modified | 1 | `a427077^` | `src/hooks/session-end/__tests__/action-runner.test.ts` | reference-and-co-changed | 7 | missing | - |
| `src/projection/composer.ts` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/projection/manifest.ts` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/providers/index.ts` | modified | 1 | `a427077^` | `src/cli/commands/__tests__/teleport.test.ts` | reference-and-co-changed | 3 | missing | - |
| `src/shared/types.ts` | modified | 3 | `a427077^` | `src/__tests__/types.test.ts` | reference-and-co-changed | 7 | missing | - |
| `src/team/api-interop.ts` | modified | 2 | `a427077^` | `src/__tests__/shipyard-skills.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/team/cli-detection.ts` | modified | 2 | `12325b6^` | `src/team/__tests__/cli-detection.test.ts` | conventional | 1 | **VALID** | `src/team/__tests__/cli-detection.test.ts` |
| `src/team/cli-worker-contract.ts` | modified | 1 | `3b516e3^` | `src/team/__tests__/cli-worker-contract.test.ts` | conventional | 1 | missing | - |
| `src/team/dispatch-queue.ts` | modified | 1 | `a427077^` | `src/hooks/__tests__/team-dispatch-prompt-readiness.test.ts` | reference-and-co-changed | 3 | missing | - |
| `src/team/events.ts` | modified | 1 | `a427077^` | `src/team/__tests__/team-leader-nudge-hook.logging.test.ts` | reference | 1 | missing | - |
| `src/team/git-worktree.ts` | modified | 1 | `a427077^` | `src/team/__tests__/git-worktree.test.ts` | conventional | 1 | missing | - |
| `src/team/governance.ts` | modified | 1 | `a427077^` | `src/team/__tests__/governance.test.ts` | conventional | 1 | missing | - |
| `src/team/index.ts` | modified | 1 | `a427077^` | `src/__tests__/npm-package-bin-surface.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/team/leader-inbox.ts` | modified | 1 | `3b516e3^` | `src/team/__tests__/leader-inbox.test.ts` | conventional | 1 | missing | - |
| `src/team/mailbox-notification-guard.ts` | added | 1 | `a427077^` | `src/team/__tests__/mailbox-notification-guard.test.ts` | conventional | 1 | missing | - |
| `src/team/mailbox-outstanding.ts` | added | 1 | `a427077^` | `src/team/__tests__/mailbox-outstanding.test.ts` | conventional | 1 | missing | - |
| `src/team/mcp-comm.ts` | modified | 1 | `a427077^` | `src/__tests__/mcp-comm-inbox-dedup.test.ts` | reference | 1 | missing | - |
| `src/team/mcp-team-bridge.ts` | modified | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/team/merge-coordinator.ts` | modified | 2 | `a427077^` | `src/team/__tests__/merge-coordinator.test.ts` | conventional | 1 | missing | - |
| `src/team/merge-orchestrator.ts` | modified | 1 | `a427077^` | `src/team/__tests__/merge-orchestrator.test.ts` | conventional | 1 | missing | - |
| `src/team/model-contract.ts` | modified | 4 | `12325b6^` | `src/team/__tests__/model-contract.test.ts` | conventional | 1 | **VALID** | `src/team/__tests__/model-contract.test.ts` |
| `src/team/monitor.ts` | modified | 2 | `a427077^` | `src/cli/__tests__/team-status-worktree.test.ts` | reference | 1 | missing | - |
| `src/team/pane-readiness.ts` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/team/process-identity-lock.ts` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/team/recovery-request-store.ts` | added | 1 | `a427077^` | `src/team/__tests__/recovery-request-store.test.ts` | conventional | 1 | missing | - |
| `src/team/recovery-saga.ts` | added | 1 | `a427077^` | `src/team/__tests__/recovery-saga.test.ts` | conventional | 1 | missing | - |
| `src/team/runtime-cli.ts` | modified | 2 | `a427077^` | `src/team/__tests__/runtime-cli.test.ts` | conventional | 1 | missing | - |
| `src/team/runtime-owner-client.ts` | added | 1 | `a427077^` | `src/team/__tests__/runtime-owner-client.test.ts` | conventional | 1 | missing | - |
| `src/team/runtime-v2.ts` | modified | 2 | `a427077^` | `src/cli/__tests__/team.test.ts` | reference-and-co-changed | 5 | missing | - |
| `src/team/runtime.ts` | modified | 3 | `a427077^` | `src/team/__tests__/runtime.test.ts` | conventional | 1 | missing | - |
| `src/team/scaling.ts` | modified | 3 | `a427077^` | `src/team/__tests__/scaling.test.ts` | conventional | 1 | missing | - |
| `src/team/stage-router.ts` | modified | 2 | `a427077^` | `src/team/__tests__/stage-router.test.ts` | conventional | 1 | missing | - |
| `src/team/state-paths.ts` | modified | 2 | `a427077^` | `src/team/__tests__/state-paths.test.ts` | conventional | 1 | missing | - |
| `src/team/state/tasks.ts` | modified | 2 | `a427077^` | `src/team/__tests__/recovery-reservation-claim.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/team/task-file-ops.ts` | modified | 1 | `3b516e3^` | `src/team/__tests__/task-file-ops.test.ts` | conventional | 1 | missing | - |
| `src/team/task-recovery-checkpoint.ts` | added | 1 | `a427077^` | `src/team/__tests__/task-recovery-checkpoint.test.ts` | conventional | 1 | missing | - |
| `src/team/team-ops.ts` | modified | 2 | `a427077^` | `src/__tests__/team-ops-task-locking.test.ts` | reference-and-co-changed | 3 | missing | - |
| `src/team/team-owner-epoch.ts` | added | 1 | `a427077^` | `src/team/__tests__/team-owner-epoch.test.ts` | conventional | 1 | missing | - |
| `src/team/team-projection.ts` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/team/team-state-reader.ts` | added | 2 | `a427077^` | `src/team/__tests__/team-state-reader.test.ts` | conventional | 1 | missing | - |
| `src/team/tmux-comm.ts` | modified | 1 | `3b516e3^` | `src/team/__tests__/tmux-comm.test.ts` | conventional | 1 | missing | - |
| `src/team/tmux-session.ts` | modified | 3 | `a427077^` | `src/team/__tests__/tmux-session.test.ts` | conventional | 1 | missing | - |
| `src/team/types.ts` | modified | 2 | `a427077^` | `src/cli/__tests__/team.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/team/worker-activation-gate.ts` | added | 1 | `a427077^` | `src/team/__tests__/worker-activation-gate.test.ts` | conventional | 1 | missing | - |
| `src/team/worker-bootstrap.ts` | modified | 2 | `a427077^` | `src/team/__tests__/worker-bootstrap.test.ts` | conventional | 1 | missing | - |
| `src/team/worker-canonicalization.ts` | modified | 1 | `a427077^` | `src/team/__tests__/worker-canonicalization.test.ts` | conventional | 1 | missing | - |
| `src/team/worker-commit-cadence.ts` | modified | 2 | `a427077^` | `src/team/__tests__/worker-commit-cadence.test.ts` | conventional | 1 | missing | - |
| `src/team/worker-launch-ack.ts` | added | 2 | `a427077^` | `src/team/__tests__/worker-launch-ack.test.ts` | conventional | 1 | missing | - |
| `src/tools/ast-tools.ts` | modified | 2 | `a427077^` | `src/__tests__/ast-tools-path-restriction.test.ts` | reference-and-co-changed | 6 | missing | - |
| `src/tools/index.ts` | modified | 1 | `a427077^` | `src/tools/__tests__/schema-conversion.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/tools/lsp/client.ts` | modified | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/tools/lsp/index.ts` | modified | 1 | `a427077^` | `src/tools/diagnostics/__tests__/lsp-aggregator.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/tools/lsp/servers.ts` | modified | 1 | `a427077^` | `src/__tests__/lsp-servers.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/tools/python-repl/bridge-manager.ts` | modified | 1 | `a427077^` | `src/hooks/session-end/__tests__/duplicate-notifications.test.ts` | reference-and-co-changed | 6 | missing | - |
| `src/tools/python-repl/index.ts` | modified | 1 | `a427077^` | `src/__tests__/omc-tools-contract.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/tools/python-repl/sandbox.ts` | added | 1 | `a427077^` | `src/tools/python-repl/__tests__/shipped-artifact-parity.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/tools/python-repl/tool.ts` | modified | 1 | `a427077^` | `src/tools/python-repl/__tests__/shipped-artifact-parity.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/tools/state-tools.ts` | modified | 2 | `a427077^` | `src/tools/__tests__/state-tools.test.ts` | conventional | 1 | missing | - |
| `src/tools/trace-tools.ts` | modified | 1 | `a427077^` | `src/__tests__/tools/trace-tools.test.ts` | reference-and-co-changed | 4 | missing | - |
| `src/tools/wiki-tools.ts` | modified | 1 | `3b516e3^` | `src/tools/__tests__/wiki-tools-direct-dist-failclosed.test.ts` | reference-and-co-changed | 3 | missing | - |
| `src/ultragoal/artifacts.ts` | modified | 1 | `a427077^` | `src/ultragoal/__tests__/artifacts.test.ts` | conventional | 1 | missing | - |
| `src/utils/cache-occupancy.ts` | added | 1 | `a427077^` | `src/utils/__tests__/cache-occupancy.test.ts` | conventional | 1 | missing | - |
| `src/utils/frontmatter.ts` | modified | 1 | `a427077^` | `src/utils/__tests__/frontmatter.test.ts` | conventional | 1 | missing | - |
| `src/utils/paths.ts` | modified | 3 | `12325b6^` | `src/utils/__tests__/paths.test.ts` | conventional | 1 | **VALID** | `src/__tests__/hud-windows.test.ts` |
| `src/utils/resolve-node.ts` | modified | 1 | `a427077^` | `src/__tests__/resolve-node.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/utils/skill-resources.ts` | modified | 1 | `3b516e3^` | **none - gap** | none | 0 | missing | - |
| `src/workflow/alias-resolver.ts` | added | 2 | `a427077^` | `src/workflow/__tests__/alias-resolver.test.ts` | conventional | 1 | missing | - |
| `src/workflow/index.ts` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `src/workflow/projections.ts` | added | 1 | `a427077^` | `src/workflow/__tests__/projections.test.ts` | conventional | 1 | missing | - |
| `src/workflow/registry.ts` | added | 3 | `a427077^` | `src/workflow/__tests__/registry.test.ts` | conventional | 1 | missing | - |
| `templates/hooks/code-simplifier.mjs` | modified | 2 | `a427077^` | `src/__tests__/installer-hooks-merge.test.ts` | reference-and-co-changed | 3 | missing | - |
| `templates/hooks/keyword-detector.mjs` | modified | 3 | `a427077^` | `src/__tests__/keyword-detector-script.test.ts` | reference-and-co-changed | 13 | missing | - |
| `templates/hooks/lib/atomic-write.mjs` | modified | 1 | `a427077^` | `src/lib/__tests__/atomic-write.test.ts` | reference-and-co-changed | 8 | missing | - |
| `templates/hooks/lib/bounded-git-timeout.mjs` | added | 1 | `a427077^` | `src/__tests__/bounded-git-timeout-parity.test.ts` | reference-and-co-changed | 1 | missing | - |
| `templates/hooks/lib/cache-occupancy.mjs` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `templates/hooks/lib/precompact-publisher.mjs` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `templates/hooks/lib/precompact-restore.mjs` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `templates/hooks/lib/skill-entitlements.mjs` | added | 1 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `templates/hooks/lib/state-root.mjs` | modified | 2 | `a427077^` | **none - gap** | none | 0 | missing | - |
| `templates/hooks/lib/stdin.mjs` | modified | 1 | `a427077^` | `src/installer/__tests__/standalone-hook-reconcile.test.ts` | reference-and-co-changed | 2 | missing | - |
| `templates/hooks/lib/workflow-profile-runtime.mjs` | added | 2 | `a427077^` | `src/__tests__/workflow-profile-runtime-prefix.test.ts` | reference-and-co-changed | 2 | missing | - |
| `templates/hooks/lib/workflow-stage-prompts.mjs` | added | 3 | `a427077^` | `src/__tests__/workflow-stage-prompts-drift.test.ts` | reference-and-co-changed | 2 | missing | - |
| `templates/hooks/persistent-mode.mjs` | modified | 3 | `a427077^` | `src/__tests__/delegation-enforcement-levels.test.ts` | reference-and-co-changed | 11 | missing | - |
| `templates/hooks/post-tool-use.mjs` | modified | 3 | `a427077^` | `src/__tests__/doctor-conflicts.test.ts` | reference-and-co-changed | 3 | missing | - |
| `templates/hooks/pre-tool-use.mjs` | modified | 3 | `a427077^` | `src/hooks/__tests__/pre-tool-use-template-source-ext.test.ts` | reference-and-co-changed | 4 | missing | - |
| `templates/hooks/session-start.mjs` | modified | 4 | `12325b6^` | `src/__tests__/session-start-timeout-cleanup.test.ts` | reference-and-co-changed | 10 | **VALID** | `src/__tests__/patch-layer-guards.test.ts` |
| `templates/hooks/workflow-drift-guard.mjs` | modified | 1 | `a427077^` | `tests/lint/windows-hide-hooks.test.ts` | reference-and-co-changed | 1 | missing | - |
| `tests/fixtures/prompt-projection/claude-body.normalized` | added | 3 | `a427077^` | `src/projection/__tests__/fixtures.test.ts` | reference-and-co-changed | 1 | missing | - |
| `tests/fixtures/prompt-projection/claude-managed-block.golden` | added | 4 | `a427077^` | `src/projection/__tests__/fixtures.test.ts` | reference-and-co-changed | 1 | missing | - |
| `tests/fixtures/prompt-projection/transaction-backup-rollback.json` | added | 1 | `a427077^` | `src/projection/__tests__/fixtures.test.ts` | reference-and-co-changed | 1 | missing | - |
| `tests/perf/subagent-lock.bench.ts` | modified | 2 | `a427077^` | `tests/lint/subagent-lock-test-contract.test.ts` | reference-and-co-changed | 1 | missing | - |
| `vitest.config.ts` | modified | 3 | `a8aae62^` | `src/notifications/__tests__/notify-registry-integration.test.ts` | reference-and-co-changed | 2 | missing | - |

## Test surface (M1 class ②: merge the assertions) - 391

| path | hop | commits | un-patch | structural guard |
|---|---|---|---|---|
| `src/__tests__/auto-slash-aliases.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/auto-slash-live-data-security.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/auto-update.test.ts` | modified | 3 | `12325b6^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/auto-upgrade-prompt.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/bedrock-model-routing.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/bounded-git-timeout-parity.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/config-dir.test.ts` | modified | 2 | `12325b6^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/consensus-execution-handoff.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/consolidation-contracts.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/context-guard-stop.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/context-usage.test.ts` | added | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/delegation-enforcement-levels.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/delegation-enforcer.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/doctor-conflicts.test.ts` | modified | 4 | `12325b6^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/fixtures/hung-hooks/hung-grandchild.cjs` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/fixtures/hung-hooks/hung-parent.cjs` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/generated-artifact-authorization.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/hooks.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/hooks/learner/bridge.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/hooks/session-end-cleanup.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/hud-agents.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/hud/agent-kind.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/hud/cwd.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/hud/mission-board-state.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/hud/model.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/hud/payload-estimate.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/hud/payload-warning-render.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/hud/scoped-weekly-buckets-render.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/hud/state.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/hud/stdin.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/hud/usage-api-user-agent.test.ts` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/hud/usage-api.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/hud/watch-mode-init.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/hud/windows-platform.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/installer-hooks-merge.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/installer-mcp-config.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/installer-omc-reference.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/installer-plugin-agents.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/installer.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/issue-2652-runtime-wiring-and-output-contract.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/issue-3867-legacy-l-update.test.ts` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/keyword-detector-echo-guard.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/keyword-detector-script.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/live-data.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/lsp-servers-python-catalog.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/lsp-servers.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/model-routing.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/no-committed-build-artifacts.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/notepad.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/npm-package-bin-surface.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/npm-package-hook-surface.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/npm-package-surface-helpers.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/omc-tools-contract.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/package-dir-resolution-regression.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/pipeline-orchestrator.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/plugin-shipping-surface.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/plugin-skill-budget.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/post-tool-verifier.test.mjs` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/pre-tool-enforcer.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/preemptive-compaction-hook.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/project-session-manager-worktree-protocol.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/psm-tmux-naming.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/purge-stale-cache.integration.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/purge-stale-cache.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/ralph-prd-amendment.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/ralph-prd-mandatory.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/ralph-prd-stale.test.ts` | added | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/ralph-prd.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/ralph-progress.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/rate-limit-wait/daemon-bootstrap.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/rate-limit-wait/daemon-cache-context.test.ts` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/rate-limit-wait/rate-limit-monitor.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/rate-limit-wait/tmux-detector.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/release-boundary.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/release-generation.test.ts` | modified | 4 | `12325b6^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/release-guidance.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/repair-plugin-cache-script.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/resolve-node.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/run-cjs-generic-timeout.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/run-cjs-graceful-fallback.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/session-end-empty-stdin.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/session-end-process-exit.test.ts` | added | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/session-history-search.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/session-start-cache-cleanup.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/session-start-precompact-restore.test.ts` | added | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/session-start-script-context.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/setup-claude-md-script.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/setup-contracts-regression.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/shared-memory-concurrency.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/shipyard-seed-locale.test.ts` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/shipyard-skills.test.ts` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/skill-entitlements-cross-surface.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/skill-entitlements.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/skill-injector-script.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/skills-frontmatter-regression.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/skills.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/smoke-pipeline-edge.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/smoke-slack-and-state.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/state-root-resolution.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/task-continuation.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/team-ops-task-locking.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/team-update-task-locking.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/tier0-contracts.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/tier0-docs-consistency.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/tools/ast-tools-runtime.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/tools/trace-tools.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/trusted-publishing-contract.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/types.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/wiki-hook-output-format.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/windows-prompt-hook-runner.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/workflow-profile-activation-script.test.ts` | added | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/agents/prompt-ssot/__tests__/prompt-ssot.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/alias-retirement/__tests__/closure.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/alias-retirement/__tests__/policy.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/alias-retirement/__tests__/registry.test.ts` | added | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/alias-retirement/__tests__/verifier.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/cli/__tests__/autoresearch-guided.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/cli/__tests__/doctor-team-routing.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/cli/__tests__/hud-watch.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/cli/__tests__/launch.test.ts` | modified | 5 | `12325b6^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/cli/__tests__/self-improve-paths.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/cli/__tests__/team.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/cli/commands/__tests__/capabilities.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/cli/commands/__tests__/doctor-team-routing.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/cli/commands/__tests__/team.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/cli/commands/__tests__/teleport.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/cli/commands/__tests__/ultragoal.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/config/__tests__/loader.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/config/__tests__/models.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/features/__tests__/magic-keywords.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/features/agent-addressability/__tests__/addressability.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/graph/__tests__/descriptor.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/graph/__tests__/fixtures.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/graph/__tests__/runtime/approval.test.ts` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/graph/__tests__/runtime/cli.test.ts` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/graph/__tests__/runtime/e2e-crash-recovery.test.ts` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/graph/__tests__/runtime/executors/agent.test.ts` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/graph/__tests__/runtime/executors/command.test.ts` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/graph/__tests__/runtime/fence.test.ts` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/graph/__tests__/runtime/fixtures/back-edge-graph.json` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/graph/__tests__/runtime/fixtures/fanout-join-graph.json` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/graph/__tests__/runtime/fixtures/simple-linear.json` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/graph/__tests__/runtime/journal-epoch.test.ts` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/graph/__tests__/runtime/journal.test.ts` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/graph/__tests__/runtime/progress.test.ts` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/graph/__tests__/runtime/regression-matrix.test.ts` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/graph/__tests__/runtime/run-dir.test.ts` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/graph/__tests__/runtime/runner.test.ts` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/graph/__tests__/runtime/safe-fs.test.ts` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/graph/__tests__/runtime/store.test.ts` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/graph/__tests__/scheduler.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/__tests__/bridge-routing.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/__tests__/bridge-security.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/__tests__/pre-tool-use-template-source-ext.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/__tests__/precompact-restore.test.ts` | added | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/__tests__/team-dispatch-prompt-readiness.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/__tests__/team-worker-idle-outstanding.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/__tests__/workflow-drift-guard-script.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/autopilot/__tests__/cancel.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/autopilot/__tests__/pipeline.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/autopilot/__tests__/prompts.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/autopilot/__tests__/state.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/autopilot/__tests__/summary.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/autopilot/__tests__/transition.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/autopilot/__tests__/transitions.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/autopilot/__tests__/validation.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/autopilot/__tests__/workflow-integrity.test.ts` | added | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/beads-context/__tests__/index.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/keyword-detector/__tests__/index.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/merge-readiness/__tests__/runtime.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/merge-readiness/__tests__/tool-flow.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/merge-readiness/__tests__/win-cross-platform.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/mode-registry/__tests__/session-isolation.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/permission-handler/__tests__/index.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/persistent-mode/__tests__/cancel-race.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/persistent-mode/__tests__/error-handling.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/persistent-mode/__tests__/idle-repo-state.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/persistent-mode/__tests__/ralph-session-mismatch.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/persistent-mode/__tests__/ralph-verification-flow.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/persistent-mode/__tests__/team-ralplan-stop.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/persistent-mode/__tests__/ultragoal-persistence.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/persistent-mode/session-isolation.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/persistent-mode/stop-hook-blocking.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/project-memory/__tests__/detector.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/project-memory/__tests__/hot-path-tracker.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/project-memory/__tests__/integration.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/project-memory/__tests__/learner.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/project-memory/__tests__/pre-compact-storage.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/project-memory/__tests__/storage.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/registry/__tests__/cutover.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/registry/__tests__/dispatcher.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/registry/__tests__/registry.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/registry/__tests__/shadow.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/rules-injector/finder.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/rules-injector/parser.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/self-improve/__tests__/session-isolation.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/session-end/__tests__/action-runner.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/session-end/__tests__/cleanup-manifest.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/session-end/__tests__/duplicate-notifications.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/session-end/__tests__/mode-state-cleanup.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/session-end/__tests__/openclaw-session-end.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/session-end/__tests__/session-duration.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/session-end/__tests__/session-end-bridge-cleanup.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/session-end/__tests__/session-end-timeout.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/session-end/__tests__/subdirectory-cwd.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/session-end/__tests__/team-cleanup.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/session-end/__tests__/worker.test.ts` | added | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/setup/__tests__/prune.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/subagent-tracker/__tests__/flush-race.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/subagent-tracker/__tests__/index.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/subagent-tracker/__tests__/session-replay.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/subagent-tracker/__tests__/worktree-evidence.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/task-size-detector/__tests__/index.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/think-mode/__tests__/index.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/ultrawork/session-isolation.test.ts` | deleted | 1 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/wiki/__tests__/cjk-tokenize.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/wiki/__tests__/ingest.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/wiki/__tests__/lint.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/wiki/__tests__/query.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/wiki/__tests__/reserved-file-guard.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/wiki/__tests__/session-hooks.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/wiki/__tests__/storage.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hud/__tests__/autopilot-profile.test.ts` | added | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hud/__tests__/custom-rate-provider.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hud/__tests__/enterprise-cost.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hud/__tests__/usage-api-enterprise.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/installer/__tests__/claude-md-analysis.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/installer/__tests__/claude-md-merge.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/installer/__tests__/claude-md-transaction.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/installer/__tests__/fixtures/historical-agents/architect.md` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/installer/__tests__/fixtures/historical-agents/build-fixer.md` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/installer/__tests__/fixtures/historical-agents/deep-executor.md` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/installer/__tests__/fixtures/historical-agents/quality-reviewer.md` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/installer/__tests__/fixtures/historical-agents/v4.1.0/build-fixer.md` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/installer/__tests__/fixtures/historical-agents/v4.4.0/analyst.md` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/installer/__tests__/fixtures/historical-agents/v4.5.0/architect.md` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/installer/__tests__/fixtures/legacy-guides.json` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/installer/__tests__/hook-templates.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/installer/__tests__/mcp-registry.test.ts` | modified | 3 | `9c54932^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/installer/__tests__/plugin-cache-sync.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/installer/__tests__/session-start-template.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/installer/__tests__/stale-cleanup.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/installer/__tests__/standalone-hook-reconcile.test.ts` | modified | 3 | `12325b6^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/interop/__tests__/shared-state-artifacts.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/interop/__tests__/shared-state-workspace.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/lib/__tests__/atomic-write.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/lib/__tests__/mode-state-io.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/lib/__tests__/sync-publication-short-write.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/lib/__tests__/worktree-paths-foreign-root.test.ts` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/lib/__tests__/worktree-paths-git-probe-failclosed.test.ts` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/lib/__tests__/worktree-paths-nongit-anchor.test.ts` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/lib/__tests__/worktree-paths-superproject-cache.test.ts` | added | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/lib/__tests__/worktree-paths.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/mcp/__tests__/team-cleanup.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/mcp/__tests__/team-server-artifact-convergence.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/notifications/__tests__/notify-registry-integration.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/notifications/__tests__/reply-listener.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/openclaw/__tests__/dead-pane-guard.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/openclaw/__tests__/index.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/planning/__tests__/artifacts.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/platform/__tests__/process-utils-identity.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/projection/__tests__/fixtures.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/projection/__tests__/parity.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/ralphthon/__tests__/prd.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/activity-log.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/api-interop.cleanup.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/api-interop.compatibility.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/api-interop.cwd-resolution.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/api-interop.dispatch.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/audit-log.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/bridge-integration.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/cli-detection.test.ts` | modified | 2 | `9c54932^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/cli-detection.windows.integration.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/cli-worker-contract.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/conflict-mailbox.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/critic-cli-worker.integration.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/dispatch-queue.strict-read.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/edge-cases.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/events.outstanding.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/followup-planner.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/governance-enforcement.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/heartbeat.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/leader-inbox.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/legacy-config-classification.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/mailbox-notification-guard.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/mailbox-outstanding.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/mcp-comm.mailbox-notification.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/mcp-team-bridge.usage.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/merge-orchestrator.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/message-router.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/model-contract.test.ts` | modified | 5 | `12325b6^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/multirepo-workspace-team.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/phase1-foundation.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/recovery-finalization-concurrency.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/recovery-owner-finalization.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/recovery-pane-rollback.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/recovery-public-api.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/recovery-request-store.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/recovery-reservation-claim.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/recovery-saga.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/runtime-assign.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/runtime-cli.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/runtime-done-recovery.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/runtime-owner-busy.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/runtime-owner-client.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/runtime-prompt-mode.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/runtime-v2-role-routing.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/runtime-v2.cursor-routing.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/runtime-v2.dispatch.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/runtime-v2.gemini-preflight.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/runtime-v2.monitor.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/runtime-v2.service-repair.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/runtime-v2.shutdown-pane-cleanup.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/runtime-v2.shutdown.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/runtime-watchdog-retry.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/runtime.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/scaling-launch-config.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/scaling.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/split-pane-cleanup-evidence.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/stage-router.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/summary-report.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/task-file-ops.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/task-recovery-checkpoint.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/task-router.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/team-config-revision-lock.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/team-leader-nudge-hook.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/team-leader-nudge-outstanding.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/team-owner-epoch.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/team-registration.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/team-state-reader.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/team-status.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/team-summary-worktree.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/tmux-comm.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/tmux-session.create-team.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/tmux-session.kill-team-session.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/tmux-session.spawn.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/tmux-session.startup.test.ts` | added | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/tmux-session.target-membership.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/tmux-session.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/unified-team.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/usage-tracker.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/worker-activation-gate.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/worker-bootstrap.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/worker-canonicalization.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/worker-commit-cadence.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/worker-health.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/worker-launch-ack.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/worker-launch-posix-transport.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/worker-restart.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/worktree-contract-fields.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/tools/__tests__/cancel-integration.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/tools/__tests__/deepinit-manifest.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/tools/__tests__/memory-tools.test.ts` | modified | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/tools/__tests__/schema-conversion.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/tools/__tests__/state-tools-nongit-ownership.test.ts` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/tools/__tests__/state-tools.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/tools/__tests__/wiki-tools-direct-dist-failclosed.test.ts` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/tools/__tests__/wiki-tools-foreign-root.test.ts` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/tools/__tests__/wiki-tools-git-probe-failclosed.test.ts` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/tools/diagnostics/__tests__/lsp-aggregator.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/tools/lsp/__tests__/client-handle-data.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/tools/lsp/__tests__/client-python-boundary.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/tools/lsp/__tests__/client-python-switch.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/tools/python-repl/__tests__/description-parity.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/tools/python-repl/__tests__/guidance-sections.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/tools/python-repl/__tests__/python-sandbox.test.ts` | modified | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/tools/python-repl/__tests__/sandbox-guidance-parity.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/tools/python-repl/__tests__/shipped-artifact-parity.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/ultragoal/__tests__/artifacts.multirepo.test.ts` | modified | 2 | `a8aae62^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/ultragoal/__tests__/artifacts.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/utils/__tests__/cache-occupancy.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/utils/__tests__/frontmatter.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/workflow/__tests__/alias-resolver.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/workflow/__tests__/projections.test.ts` | added | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/workflow/__tests__/registry.test.ts` | added | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/benchmark-diagnostics.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/integration/concurrent-project-memory.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/integration/epic-3698-closure-verifier.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/integration/multirepo-workspace.test.ts` | modified | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/integration/task-list-identity-stop.test.ts` | added | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/integration/workflow-profile-keyword-activation.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/integration/workflow-profile-lock-recovery.test.ts` | added | 2 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/integration/workflow-profile-stop-transition.test.ts` | added | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/lint/better-sqlite3-lockfloor.test.ts` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/lint/cancel-signal-fixture-ttl.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/lint/fable-routing-docs.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/lint/inventory-graph-drift.test.ts` | added | 3 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/lint/setup-phases-drift.test.ts` | added | 1 | `3b516e3^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/lint/skill-parallel-caveats.test.ts` | modified | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/lint/subagent-lock-test-contract.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/lint/windows-hide-hooks.test.ts` | added | 1 | `a427077^` | `scripts/known-failures.mjs --check (CI test job)` |

## Structural (M1 class ②: structural assertion, no fake test) - 82

| path | hop | commits | un-patch | structural guard |
|---|---|---|---|---|
| `.github/CLAUDE.md` | modified | 4 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `AGENTS.md` | modified | 2 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `agents/scientist.md` | modified | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `benchmark/README.md` | modified | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `benchmark/results/README.md` | modified | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `benchmarks/debugger/prompts/build-fixer.md` | modified | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `CHANGELOG.md` | modified | 2 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `CLAUDE.md` | modified | 4 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `CONTRIBUTING.md` | modified | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/adr/03487-named-autopilot-stage-profiles.md` | added | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/adr/03570-graph-core-contract.md` | added | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/adr/03664-ralph-prd-criterion-amendment.md` | added | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/ARCHITECTURE.md` | modified | 2 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/cancel-skill-active-state-gap.md` | modified | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/CLAUDE.md` | modified | 4 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/design/CLAUDE_CODE_GOAL_ADAPTER.md` | modified | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/design/ISSUE-3698-LIGHTWEIGHT-WORKFLOW-PLAN.md` | added | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/design/ISSUE-3703-WORKFLOW-REGISTRY.md` | added | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/design/issue-3704-prompt-ssot/README.md` | added | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/design/ISSUE-3707-HOOK-REGISTRY-SHADOW.md` | added | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/design/ISSUE-3712-RELEASE-VERIFICATION.md` | added | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/FEATURES.md` | modified | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/GETTING-STARTED.md` | modified | 2 | `12325b6^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/HOOKS.md` | modified | 2 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/issues/issue-3668-ralph-namespace.md` | added | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/MIGRATION.md` | modified | 3 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/PERFORMANCE-MONITORING.md` | modified | 3 | `12325b6^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/REFERENCE.md` | modified | 2 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/settings-schema.md` | modified | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/shared/agent-tiers.md` | modified | 2 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/shared/features.md` | modified | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/shared/mode-hierarchy.md` | modified | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/shared/mode-selection-guide.md` | modified | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/shipyard.md` | added | 1 | `3b516e3^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/TOOLS.md` | modified | 2 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `generated/prompt-ssot/coordinator.md` | added | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `generated/prompt-ssot/role-executor.md` | added | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `generated/prompt-ssot/role-planner.md` | added | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `generated/prompt-ssot/role-reviewer.md` | added | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `generated/prompt-ssot/role-verifier.md` | added | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `package-lock.json` | modified | 3 | `12325b6^` | `src/__tests__/metadata-contracts.test.ts` |
| `package.json` | modified | 5 | `12325b6^` | `src/__tests__/metadata-contracts.test.ts` |
| `README.de.md` | modified | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `README.es.md` | modified | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `README.fr.md` | modified | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `README.it.md` | modified | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `README.ja.md` | modified | 2 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `README.ko.md` | modified | 2 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `README.md` | modified | 4 | `12325b6^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `README.pt.md` | modified | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `README.ru.md` | modified | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `README.tr.md` | modified | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `README.vi.md` | modified | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `README.zh.md` | modified | 2 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `receipts/epic-3698/README.md` | added | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `seminar/demos/demo-0-live-audience.md` | modified | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `skills/AGENTS.md` | modified | 3 | `a427077^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/autopilot/SKILL.md` | modified | 3 | `a427077^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/cancel/SKILL.md` | modified | 4 | `12325b6^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/drydock/SKILL.md` | added | 1 | `3b516e3^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/execute/SKILL.md` | added | 2 | `a427077^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/graph/SKILL.md` | added | 1 | `3b516e3^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/hud/SKILL.md` | modified | 2 | `12325b6^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/launch/SKILL.md` | added | 1 | `3b516e3^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/learner/SKILL.md` | deleted | 1 | `12325b6^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/minimal-code-discipline/SKILL.md` | added | 1 | `3b516e3^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/plan/SKILL.md` | modified | 3 | `a427077^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/project-session-manager/SKILL.md` | modified | 3 | `12325b6^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/ralph/SKILL.md` | modified | 3 | `a427077^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/ralplan/SKILL.md` | modified | 3 | `a427077^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/research/SKILL.md` | added | 1 | `a427077^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/review/SKILL.md` | added | 2 | `a427077^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/self-improve/SKILL.md` | modified | 1 | `3b516e3^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/skillify/SKILL.md` | modified | 2 | `12325b6^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/team/SKILL.md` | modified | 4 | `12325b6^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/ultragoal/SKILL.md` | modified | 2 | `a427077^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/wiki/SKILL.md` | modified | 1 | `a427077^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `src/agents/AGENTS.md` | modified | 2 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `src/features/AGENTS.md` | modified | 1 | `3b516e3^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `src/hooks/AGENTS.md` | modified | 2 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `src/tools/lsp/AGENTS.md` | modified | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `tests/fixtures/prompt-projection/README.md` | added | 1 | `a427077^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |

## Regenerate

```bash
node scripts/conflict-ledger.mjs --patch-layer --output docs/ANCESTOR-PATCH-LAYER.md
```
