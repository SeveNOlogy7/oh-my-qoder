# Patch-Layer Collisions

Paths that **OMQ's own commits** change *and* the ancestor hop `v5.6.0` -> `v5.7.0` also changes.
Losing one of these during adoption is a silent regression, which is why this table is generated
from `git log 9ba1359c8f8cab5d72d7ffc543d3e35f676a4709..HEAD` intersected with the two cached ancestor trees -- not written by hand.

| | |
|---|---|
| Colliding paths | 281 |
| Assertable / test-surface / structural | 128 / 126 / 27 |
| Hop modified / added / deleted | 234 / 47 / 0 |
| Assertable rows with a named observation | 114 of 128 |
| Carriers: VALID / INVALID / INCONCLUSIVE / missing | 7 / 0 / 0 / 121 |
| Class-2 rows without a named structural guard | 0 of 153 |

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

## Assertable (M1 class ①: needs a negative-control carrier) - 128

| path | hop | commits | un-patch | observation | obs. rule | cands | carrier | verified via |
|---|---|---|---|---|---|---|---|---|
| `.claude-plugin/marketplace.json` | modified | 8 | `1542fbc^` | `src/__tests__/release-boundary.test.ts` | reference-and-co-changed | 1 | missing | - |
| `.claude-plugin/plugin.json` | modified | 9 | `1542fbc^` | `src/__tests__/release-boundary.test.ts` | reference-and-co-changed | 3 | missing | - |
| `bridge/claude-md-coordinator.cjs` | modified | 9 | `b363dad^` | `src/__tests__/auto-update.test.ts` | reference-and-co-changed | 9 | missing | - |
| `hooks/hooks.json` | modified | 7 | `3f25131^` | `tests/lint/windows-hide-hooks.test.ts` | reference-and-co-changed | 12 | missing | - |
| `inventory/inventory-graph.json` | modified | 23 | `3f25131^` | `tests/lint/inventory-graph-drift.test.ts` | reference-and-co-changed | 1 | missing | - |
| `scripts/build-contained-fs.mjs` | modified | 2 | `7ae8ac4^` | `src/team/__tests__/tmux-session.create-team.test.ts` | reference-and-co-changed | 2 | missing | - |
| `scripts/dev/repro-state-lock.mjs` | added | 4 | `fba421a^` | **none - gap** | none | 0 | missing | - |
| `scripts/git-guardrails.mjs` | modified | 3 | `7f973ec^` | `tests/integration/git-guardrails-hook.test.ts` | reference-and-co-changed | 1 | missing | - |
| `scripts/jev-resolve.mjs` | modified | 6 | `7f973ec^` | `tests/integration/issue-4266-jev-temp-cleanup.test.ts` | reference-and-co-changed | 1 | missing | - |
| `scripts/keyword-detector.mjs` | modified | 7 | `3f25131^` | `src/__tests__/keyword-detector-echo-guard.test.ts` | reference-and-co-changed | 5 | missing | - |
| `scripts/lib/agent-model-config.mjs` | modified | 2 | `fba421a^` | `src/utils/__tests__/jsonc.test.ts` | reference-and-co-changed | 1 | missing | - |
| `scripts/lib/atomic-write.mjs` | modified | 6 | `3f25131^` | `src/lib/__tests__/atomic-write.test.ts` | reference-and-co-changed | 11 | missing | - |
| `scripts/lib/cache-occupancy.mjs` | modified | 5 | `3f25131^` | `src/utils/__tests__/cache-occupancy.test.ts` | reference-and-co-changed | 2 | missing | - |
| `scripts/lib/context-usage.mjs` | modified | 4 | `3f25131^` | `src/__tests__/context-usage.test.ts` | reference-and-co-changed | 1 | missing | - |
| `scripts/lib/hud-cache-wrapper.sh` | modified | 6 | `461bf95^` | **none - gap** | none | 0 | missing | - |
| `scripts/lib/jev-shadow.mjs` | modified | 6 | `7f973ec^` | `tests/integration/issue-4266-jev-temp-cleanup.test.ts` | reference-and-co-changed | 1 | missing | - |
| `scripts/lib/state-lock.mjs` | modified | 6 | `b0a05cf^` | `src/lib/__tests__/mode-state-lock.test.ts` | reference-and-co-changed | 2 | missing | - |
| `scripts/lib/workflow-profile-runtime.mjs` | modified | 4 | `3f25131^` | `src/__tests__/workflow-profile-runtime-prefix.test.ts` | reference-and-co-changed | 3 | missing | - |
| `scripts/persistent-mode.cjs` | modified | 7 | `3f25131^` | `src/__tests__/doctor-conflicts.test.ts` | reference-and-co-changed | 8 | missing | - |
| `scripts/persistent-mode.mjs` | modified | 9 | `3f25131^` | `src/__tests__/doctor-conflicts.test.ts` | reference-and-co-changed | 8 | missing | - |
| `scripts/post-tool-use-failure.mjs` | modified | 5 | `fba421a^` | `src/__tests__/windows-prompt-hook-runner.test.ts` | reference | 1 | missing | - |
| `scripts/post-tool-verifier.mjs` | modified | 7 | `3f25131^` | `src/__tests__/doctor-conflicts.test.ts` | reference-and-co-changed | 3 | missing | - |
| `scripts/postinstall-contained-fs.mjs` | added | 4 | `fba421a^` | `tests/integration/contained-fs-packaging.test.ts` | reference-and-co-changed | 1 | missing | - |
| `scripts/pre-tool-enforcer.mjs` | modified | 7 | `3f25131^` | `src/__tests__/pre-tool-enforcer-jev-wiring.test.ts` | reference-and-co-changed | 5 | missing | - |
| `scripts/run-provider-advisor.js` | modified | 3 | `3f25131^` | `src/cli/__tests__/ask.test.ts` | reference-and-co-changed | 1 | missing | - |
| `scripts/run.cjs` | modified | 9 | `3f25131^` | `src/__tests__/run-cjs-generic-timeout.test.ts` | reference-and-co-changed | 19 | missing | - |
| `scripts/session-start.mjs` | modified | 13 | `fc7250d^` | `src/__tests__/session-start-precompact-restore.test.ts` | reference-and-co-changed | 9 | **VALID** | `src/__tests__/patch-layer-guards.test.ts` |
| `scripts/shipyard-audit.mjs` | modified | 5 | `7ae8ac4^` | `src/__tests__/shipyard-skills.test.ts` | reference-and-co-changed | 1 | missing | - |
| `scripts/wiki-session-end.mjs` | modified | 2 | `3f25131^` | `src/__tests__/setup-contracts-regression.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/cli/commands/intake.ts` | modified | 3 | `7f973ec^` | `src/cli/commands/__tests__/intake.test.ts` | conventional | 1 | missing | - |
| `src/cli/commands/ralph.ts` | modified | 5 | `7f973ec^` | `src/cli/__tests__/ralph-afk.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/cli/commands/session-search.ts` | modified | 1 | `fba421a^` | `src/cli/__tests__/session-search-terminal.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/cli/commands/team.ts` | modified | 7 | `3f25131^` | `src/cli/commands/__tests__/team.test.ts` | conventional | 1 | missing | - |
| `src/cli/commands/wait.ts` | modified | 2 | `fba421a^` | `src/cli/commands/__tests__/wait.test.ts` | conventional | 1 | missing | - |
| `src/cli/team.ts` | modified | 6 | `3f25131^` | `src/cli/__tests__/team.test.ts` | conventional | 1 | missing | - |
| `src/config/loader.ts` | modified | 6 | `3f25131^` | `src/config/__tests__/loader.test.ts` | conventional | 1 | missing | - |
| `src/factory/listener.ts` | modified | 3 | `7f973ec^` | `src/factory/__tests__/listener.test.ts` | conventional | 1 | missing | - |
| `src/factory/map-frontier.ts` | added | 1 | `fba421a^` | `src/factory/__tests__/map-frontier.test.ts` | conventional | 1 | missing | - |
| `src/factory/map-ingest.ts` | added | 1 | `fba421a^` | `src/factory/__tests__/map-ingest.test.ts` | conventional | 1 | missing | - |
| `src/factory/map-run.ts` | added | 5 | `fba421a^` | `src/factory/__tests__/map-run.test.ts` | conventional | 1 | missing | - |
| `src/features/rate-limit-wait/daemon-state.ts` | added | 4 | `fba421a^` | `src/__tests__/rate-limit-wait/daemon-bootstrap.test.ts` | reference-and-co-changed | 3 | missing | - |
| `src/features/rate-limit-wait/daemon.ts` | modified | 5 | `1542fbc^` | `src/__tests__/rate-limit-wait/daemon-bootstrap.test.ts` | reference-and-co-changed | 4 | missing | - |
| `src/features/rate-limit-wait/pane-fresh-capture.ts` | modified | 1 | `fba421a^` | `src/__tests__/rate-limit-wait/pane-fresh-capture.test.ts` | reference-and-co-changed | 5 | missing | - |
| `src/features/rate-limit-wait/rate-limit-monitor.ts` | modified | 3 | `1542fbc^` | `src/__tests__/rate-limit-wait/rate-limit-monitor.test.ts` | reference-and-co-changed | 3 | missing | - |
| `src/features/rate-limit-wait/tmux-detector.ts` | modified | 3 | `3f25131^` | `src/__tests__/rate-limit-wait/tmux-detector.test.ts` | reference-and-co-changed | 4 | missing | - |
| `src/features/rate-limit-wait/types.ts` | modified | 2 | `fba421a^` | `src/__tests__/rate-limit-wait/daemon-bootstrap.test.ts` | reference-and-co-changed | 6 | missing | - |
| `src/hooks/autopilot/enforcement.ts` | modified | 3 | `3f25131^` | `src/__tests__/keyword-detector-echo-guard.test.ts` | reference-and-co-changed | 3 | missing | - |
| `src/hooks/bridge.ts` | modified | 8 | `3f25131^` | `src/hooks/__tests__/bridge.test.ts` | conventional | 1 | missing | - |
| `src/hooks/code-simplifier/jev-shadow.ts` | modified | 4 | `7ae8ac4^` | **none - gap** | none | 0 | missing | - |
| `src/hooks/jev/points.ts` | modified | 3 | `7ae8ac4^` | **none - gap** | none | 0 | missing | - |
| `src/hooks/jev/resolver.ts` | modified | 4 | `7ae8ac4^` | `src/hooks/jev/__tests__/resolver.test.ts` | conventional | 1 | missing | - |
| `src/hooks/jev/types.ts` | modified | 4 | `7ae8ac4^` | **none - gap** | none | 0 | missing | - |
| `src/hooks/keyword-detector/index.ts` | modified | 8 | `3f25131^` | `src/hooks/keyword-detector/__tests__/index.test.ts` | conventional | 1 | missing | - |
| `src/hooks/keyword-detector/jev-shadow.ts` | modified | 3 | `7ae8ac4^` | `src/hooks/keyword-detector/__tests__/jev-shadow.test.ts` | conventional | 1 | missing | - |
| `src/hooks/learner/jev-shadow.ts` | modified | 4 | `7ae8ac4^` | **none - gap** | none | 0 | missing | - |
| `src/hooks/permission-handler/index.ts` | modified | 5 | `1542fbc^` | `src/hooks/permission-handler/__tests__/index.test.ts` | conventional | 1 | missing | - |
| `src/hooks/persistent-mode/index.ts` | modified | 6 | `3f25131^` | `src/hooks/persistent-mode/__tests__/ralph-session-mismatch.test.ts` | reference-and-co-changed | 5 | missing | - |
| `src/hooks/persistent-mode/jev-shadow.ts` | modified | 4 | `7ae8ac4^` | **none - gap** | none | 0 | missing | - |
| `src/hooks/preemptive-compaction/index.ts` | modified | 2 | `7ae8ac4^` | `src/hooks/__tests__/compaction-concurrency.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/hooks/preemptive-compaction/jev-shadow.ts` | modified | 2 | `7ae8ac4^` | `src/hooks/preemptive-compaction/__tests__/jev-shadow.test.ts` | conventional | 1 | missing | - |
| `src/hooks/ralph/feedback-baseline.ts` | modified | 4 | `7f973ec^` | `src/hooks/ralph/__tests__/feedback-baseline.test.ts` | conventional | 1 | missing | - |
| `src/hooks/ralph/jev-shadow.ts` | modified | 4 | `7ae8ac4^` | **none - gap** | none | 0 | missing | - |
| `src/hooks/ralph/loop.ts` | modified | 6 | `3f25131^` | `src/hooks/__tests__/bridge-routing.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/hooks/session-end/chain-enqueuer.ts` | modified | 3 | `7f973ec^` | `src/hooks/session-end/__tests__/chain-enqueuer.test.ts` | conventional | 1 | missing | - |
| `src/hooks/session-end/index.ts` | modified | 10 | `3f25131^` | `src/__tests__/hooks/session-end-cleanup.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/hooks/session-end/spawn-next.ts` | modified | 4 | `7f973ec^` | `src/hooks/session-end/__tests__/spawn-next.test.ts` | conventional | 1 | missing | - |
| `src/hooks/session-end/wiki-foreground-bootstrap.ts` | added | 1 | `fba421a^` | `src/hooks/session-end/__tests__/wiki-foreground-bootstrap.test.ts` | conventional | 1 | missing | - |
| `src/hooks/task-size-detector/jev-shadow.ts` | modified | 2 | `7ae8ac4^` | `src/hooks/task-size-detector/__tests__/jev-shadow.test.ts` | conventional | 1 | missing | - |
| `src/hooks/todo-continuation/index.ts` | modified | 6 | `3f25131^` | `src/__tests__/delegation-enforcement-levels.test.ts` | reference-and-co-changed | 8 | missing | - |
| `src/hud/background-cleanup.ts` | modified | 2 | `fba421a^` | `src/__tests__/hud/background-history-cap.test.ts` | reference-and-co-changed | 3 | missing | - |
| `src/hud/background-tasks.ts` | modified | 2 | `fba421a^` | `src/__tests__/hud/background-history-cap.test.ts` | reference-and-co-changed | 4 | missing | - |
| `src/hud/custom-rate-provider.ts` | modified | 4 | `3f25131^` | `src/hud/__tests__/custom-rate-provider.test.ts` | conventional | 1 | missing | - |
| `src/hud/elements/cwd.ts` | modified | 3 | `3f25131^` | `src/__tests__/hud/cwd-hyperlink-boundary.test.ts` | reference-and-co-changed | 5 | missing | - |
| `src/hud/elements/effort.ts` | added | 3 | `fba421a^` | `src/__tests__/hud/effort.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/hud/elements/index.ts` | modified | 2 | `fba421a^` | **none - gap** | none | 0 | missing | - |
| `src/hud/index.ts` | modified | 6 | `1542fbc^` | `src/__tests__/hud/cli-diagnostic.test.ts` | reference-and-co-changed | 9 | missing | - |
| `src/hud/render.ts` | modified | 3 | `461bf95^` | `src/__tests__/hud/update-hint.test.ts` | reference-and-co-changed | 13 | missing | - |
| `src/hud/stdin.ts` | modified | 4 | `3f25131^` | `src/__tests__/hud/stdin.test.ts` | reference-and-co-changed | 7 | missing | - |
| `src/hud/transcript.ts` | modified | 3 | `3f25131^` | `src/__tests__/hud/transcript-task-tools.test.ts` | reference-and-co-changed | 6 | missing | - |
| `src/hud/types.ts` | modified | 6 | `3f25131^` | `src/__tests__/context-usage.test.ts` | reference-and-co-changed | 26 | missing | - |
| `src/hud/usage-api.ts` | modified | 10 | `3f25131^` | `src/__tests__/hud/usage-api-header-fallback.test.ts` | reference-and-co-changed | 11 | missing | - |
| `src/installer/hooks.ts` | modified | 6 | `fc7250d^` | `src/installer/__tests__/hook-command-portability.test.ts` | reference-and-co-changed | 4 | missing | - |
| `src/installer/index.ts` | modified | 11 | `fc7250d^` | `src/installer/__tests__/hud-wrapper-env.test.ts` | reference-and-co-changed | 29 | **VALID** | `src/__tests__/patch-layer-guards.test.ts` |
| `src/installer/mcp-registry.ts` | modified | 6 | `fc7250d^` | `src/installer/__tests__/mcp-registry.test.ts` | conventional | 1 | **VALID** | `src/installer/__tests__/mcp-registry.test.ts` |
| `src/lib/atomic-write.ts` | modified | 6 | `3f25131^` | `src/lib/__tests__/atomic-write.test.ts` | conventional | 1 | missing | - |
| `src/lib/mode-state-io.ts` | modified | 8 | `3f25131^` | `src/lib/__tests__/mode-state-io.test.ts` | conventional | 1 | missing | - |
| `src/lib/payload-limits.ts` | modified | 1 | `fba421a^` | `src/lib/__tests__/payload-limits.test.ts` | conventional | 1 | missing | - |
| `src/lib/project-memory-merge.ts` | modified | 1 | `fba421a^` | `src/__tests__/project-memory-merge.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/lib/release-generation.ts` | modified | 7 | `fc7250d^` | `src/__tests__/release-generation.test.ts` | reference-and-co-changed | 2 | **VALID** | `src/__tests__/release-generation.test.ts` |
| `src/lib/worktree-paths.ts` | modified | 9 | `3f25131^` | `src/lib/__tests__/worktree-paths.test.ts` | conventional | 1 | missing | - |
| `src/notifications/config.ts` | modified | 3 | `8a0d3c5^` | `src/notifications/__tests__/config.test.ts` | conventional | 1 | missing | - |
| `src/notifications/dispatcher.ts` | modified | 1 | `fba421a^` | `src/notifications/__tests__/dispatcher.test.ts` | conventional | 1 | missing | - |
| `src/notifications/reply-listener.ts` | modified | 4 | `3f25131^` | `src/notifications/__tests__/reply-listener.test.ts` | conventional | 1 | missing | - |
| `src/notifications/session-registry.ts` | modified | 4 | `3f25131^` | `src/notifications/__tests__/session-registry.test.ts` | conventional | 1 | missing | - |
| `src/notifications/template-engine.ts` | modified | 2 | `8a0d3c5^` | `src/notifications/__tests__/template-engine.test.ts` | conventional | 1 | missing | - |
| `src/notifications/tmux.ts` | modified | 2 | `fba421a^` | `src/notifications/__tests__/tmux.test.ts` | conventional | 1 | missing | - |
| `src/notifications/validation.ts` | modified | 1 | `fba421a^` | **none - gap** | none | 0 | missing | - |
| `src/providers/azure-devops.ts` | modified | 1 | `fba421a^` | `src/__tests__/providers/azure-devops.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/providers/index.ts` | modified | 2 | `3f25131^` | `src/__tests__/providers/detection.test.ts` | reference-and-co-changed | 3 | missing | - |
| `src/shared/types.ts` | modified | 5 | `3f25131^` | `src/__tests__/types.test.ts` | reference-and-co-changed | 7 | missing | - |
| `src/team/api-interop.ts` | modified | 6 | `3f25131^` | `src/__tests__/shipyard-skills.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/team/model-contract.ts` | modified | 10 | `fc7250d^` | `src/team/__tests__/model-contract.test.ts` | conventional | 1 | **VALID** | `src/team/__tests__/model-contract.test.ts` |
| `src/team/runtime-v2.ts` | modified | 8 | `3f25131^` | `src/cli/__tests__/team-status-worktree.test.ts` | reference-and-co-changed | 6 | missing | - |
| `src/team/scaling.ts` | modified | 6 | `3f25131^` | `src/team/__tests__/scaling.test.ts` | conventional | 1 | missing | - |
| `src/team/stage-router.ts` | modified | 4 | `3f25131^` | `src/team/__tests__/stage-router.test.ts` | conventional | 1 | missing | - |
| `src/team/team-owner-epoch.ts` | modified | 3 | `3f25131^` | `src/team/__tests__/team-owner-epoch.test.ts` | conventional | 1 | missing | - |
| `src/team/tmux-session.ts` | modified | 11 | `3f25131^` | `src/team/__tests__/tmux-session.test.ts` | conventional | 1 | missing | - |
| `src/team/usage-tracker.ts` | modified | 2 | `fba421a^` | `src/team/__tests__/usage-tracker.test.ts` | conventional | 1 | missing | - |
| `src/tools/diagnostics/index.ts` | modified | 1 | `fba421a^` | **none - gap** | none | 0 | missing | - |
| `src/tools/diagnostics/tsc-runner.ts` | modified | 1 | `fba421a^` | **none - gap** | none | 0 | missing | - |
| `src/tools/lsp/utils.ts` | modified | 1 | `fba421a^` | **none - gap** | none | 0 | missing | - |
| `src/utils/cache-occupancy.ts` | modified | 5 | `3f25131^` | `src/utils/__tests__/cache-occupancy.test.ts` | conventional | 1 | missing | - |
| `src/utils/jsonc.ts` | modified | 3 | `3f25131^` | `src/utils/__tests__/jsonc.test.ts` | conventional | 1 | missing | - |
| `src/utils/node-version.ts` | added | 1 | `fba421a^` | **none - gap** | none | 0 | missing | - |
| `src/utils/paths.ts` | modified | 10 | `fc7250d^` | `src/utils/__tests__/paths.test.ts` | conventional | 1 | **VALID** | `src/__tests__/hud-windows.test.ts` |
| `src/utils/plugin-cache-validation.ts` | added | 5 | `fba421a^` | `src/__tests__/purge-stale-cache-validation.test.ts` | reference-and-co-changed | 2 | missing | - |
| `src/utils/resolve-node.ts` | modified | 3 | `3f25131^` | `src/__tests__/resolve-node.test.ts` | reference-and-co-changed | 1 | missing | - |
| `src/utils/ssrf-guard.ts` | modified | 2 | `fba421a^` | `src/__tests__/ssrf-guard.test.ts` | reference-and-co-changed | 4 | missing | - |
| `src/utils/string-width.ts` | modified | 1 | `fba421a^` | `src/utils/__tests__/string-width.test.ts` | conventional | 1 | missing | - |
| `src/workflow/registry.ts` | modified | 9 | `3f25131^` | `src/workflow/__tests__/registry.test.ts` | conventional | 1 | missing | - |
| `templates/hooks/keyword-detector.mjs` | modified | 7 | `3f25131^` | `src/__tests__/keyword-detector-script.test.ts` | reference-and-co-changed | 14 | missing | - |
| `templates/hooks/lib/atomic-write.mjs` | modified | 6 | `3f25131^` | `src/lib/__tests__/atomic-write.test.ts` | reference-and-co-changed | 11 | missing | - |
| `templates/hooks/lib/cache-occupancy.mjs` | modified | 5 | `3f25131^` | `src/utils/__tests__/cache-occupancy.test.ts` | reference-and-co-changed | 2 | missing | - |
| `templates/hooks/lib/workflow-profile-runtime.mjs` | modified | 4 | `3f25131^` | `src/__tests__/workflow-profile-runtime-prefix.test.ts` | reference-and-co-changed | 3 | missing | - |
| `templates/hooks/persistent-mode.mjs` | modified | 9 | `3f25131^` | `src/__tests__/delegation-enforcement-levels.test.ts` | reference-and-co-changed | 12 | missing | - |
| `templates/hooks/post-tool-use-failure.mjs` | modified | 6 | `3f25131^` | `src/installer/__tests__/safe-installer.test.ts` | reference | 1 | missing | - |
| `templates/hooks/session-start.mjs` | modified | 12 | `fc7250d^` | `src/__tests__/session-start-timeout-cleanup.test.ts` | reference-and-co-changed | 10 | **VALID** | `src/__tests__/patch-layer-guards.test.ts` |
| `tests/fixtures/prompt-projection/claude-managed-block.golden` | modified | 12 | `3f25131^` | `src/projection/__tests__/fixtures.test.ts` | reference-and-co-changed | 1 | missing | - |

## Test surface (M1 class ②: merge the assertions) - 126

| path | hop | commits | un-patch | structural guard |
|---|---|---|---|---|
| `src/__tests__/context-usage.test.ts` | modified | 5 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/hud-cache-wrapper-4237.test.ts` | added | 5 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/hud-cache-wrapper.test.ts` | modified | 6 | `461bf95^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/hud/background-history-cap.test.ts` | added | 1 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/hud/custom-rate-provider.test.ts` | modified | 2 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/hud/cwd-hyperlink-boundary.test.ts` | added | 4 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/hud/effort.test.ts` | added | 1 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/hud/transcript-task-tools.test.ts` | added | 4 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/hud/usage-api-lock.test.ts` | modified | 3 | `b363dad^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/hud/usage-api-stale.test.ts` | modified | 3 | `b363dad^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/hud/usage-api.test.ts` | modified | 9 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/hud/watch-mode-init.test.ts` | modified | 5 | `1542fbc^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/jev-resolve-script.test.mjs` | modified | 6 | `7f973ec^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/keyword-detector-echo-guard.test.ts` | modified | 6 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/permission-handler-runtime-entrypoint.test.ts` | modified | 2 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/post-tool-use-failure.test.ts` | modified | 6 | `b363dad^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/project-memory-merge.test.ts` | modified | 1 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/providers/azure-devops.test.ts` | modified | 1 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/providers/detection.test.ts` | modified | 4 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/purge-stale-cache-relink.test.ts` | added | 5 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/purge-stale-cache-symlink.integration.test.ts` | added | 5 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/purge-stale-cache-validation.test.ts` | added | 5 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/purge-stale-cache.integration.test.ts` | modified | 6 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/purge-stale-cache.test.ts` | modified | 7 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/rate-limit-wait/daemon-bootstrap.test.ts` | modified | 3 | `1542fbc^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/rate-limit-wait/daemon-cache-context.test.ts` | modified | 3 | `1542fbc^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/rate-limit-wait/daemon.test.ts` | modified | 2 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/rate-limit-wait/integration.test.ts` | modified | 3 | `8a0d3c5^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/rate-limit-wait/pane-fresh-capture.test.ts` | modified | 3 | `b0a05cf^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/rate-limit-wait/quota-confirmation.test.ts` | added | 5 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/rate-limit-wait/rate-limit-monitor.test.ts` | modified | 2 | `1542fbc^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/rate-limit-wait/tmux-detector.test.ts` | modified | 3 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/release-generation.test.ts` | modified | 5 | `fc7250d^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/resolve-node.test.ts` | modified | 4 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/resolve-transcript-path.test.ts` | modified | 3 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/run-cjs-graceful-fallback.test.ts` | modified | 5 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/session-end-process-exit.test.ts` | modified | 12 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/session-start-cache-cleanup.test.ts` | modified | 4 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/session-start-script-context.test.ts` | modified | 7 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/shipyard-seed-locale.test.ts` | modified | 3 | `1542fbc^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/shipyard-skills.test.ts` | modified | 9 | `1542fbc^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/skills.test.ts` | modified | 12 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/ssrf-guard.test.ts` | modified | 2 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/task-continuation.test.ts` | modified | 4 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/__tests__/workflow-profile-activation-script.test.ts` | modified | 7 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/alias-retirement/__tests__/registry.test.ts` | modified | 8 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/cli/__tests__/ask.test.ts` | modified | 6 | `b363dad^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/cli/__tests__/ralph-afk.test.ts` | modified | 3 | `7f973ec^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/cli/__tests__/session-search-terminal.test.ts` | added | 5 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/cli/__tests__/team.test.ts` | modified | 10 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/cli/commands/__tests__/intake-headless-flag.test.ts` | added | 3 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/cli/commands/__tests__/wait.test.ts` | added | 1 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/config/__tests__/loader.test.ts` | modified | 7 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/factory/__tests__/listener.test.ts` | modified | 5 | `7f973ec^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/factory/__tests__/map-frontier.test.ts` | added | 1 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/factory/__tests__/map-ingest.test.ts` | added | 1 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/factory/__tests__/map-run.test.ts` | added | 4 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/__tests__/background-process-guard.test.ts` | modified | 3 | `b363dad^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/__tests__/bridge-routing.test.ts` | modified | 6 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/__tests__/bridge-security.test.ts` | modified | 4 | `b363dad^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/__tests__/compaction-concurrency.test.ts` | modified | 2 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/jev/__tests__/active-mode.test.ts` | added | 4 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/keyword-detector/__tests__/index.test.ts` | modified | 5 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/permission-handler/__tests__/index.test.ts` | modified | 4 | `b363dad^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/persistent-mode/__tests__/ralph-hard-max-script.test.ts` | added | 5 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/persistent-mode/stop-hook-blocking.test.ts` | modified | 6 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/preemptive-compaction/__tests__/jev-shadow.test.ts` | modified | 4 | `7ae8ac4^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/ralph/__tests__/feedback-baseline.test.ts` | modified | 3 | `7f973ec^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/session-end/__tests__/action-runner.test.ts` | modified | 7 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/session-end/__tests__/chain-enqueuer.test.ts` | modified | 3 | `7f973ec^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/session-end/__tests__/cleanup-manifest.test.ts` | modified | 7 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/session-end/__tests__/spawn-next.test.ts` | modified | 5 | `7f973ec^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/session-end/__tests__/wiki-foreground-bootstrap.test.ts` | added | 4 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hooks/session-end/__tests__/worker.test.ts` | modified | 7 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hud/__tests__/custom-provider-cache-identity.test.ts` | added | 4 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/hud/__tests__/custom-rate-provider.test.ts` | modified | 2 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/installer/__tests__/hook-templates.test.ts` | modified | 8 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/installer/__tests__/mcp-registry.test.ts` | modified | 6 | `6b43f17^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/installer/__tests__/session-start-template.test.ts` | modified | 8 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/installer/__tests__/standalone-hook-reconcile.test.ts` | modified | 12 | `fc7250d^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/lib/__tests__/atomic-write.test.ts` | modified | 6 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/lib/__tests__/mode-state-lock.test.ts` | modified | 4 | `7ae8ac4^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/lib/__tests__/payload-limits.test.ts` | modified | 1 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/lib/__tests__/worktree-paths-issue-4254-win32.test.ts` | added | 4 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/notifications/__tests__/custom-config-shapes.test.ts` | added | 4 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/notifications/__tests__/custom-webhook-body.test.ts` | added | 1 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/notifications/__tests__/dispatcher.test.ts` | modified | 2 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/notifications/__tests__/reply-listener.test.ts` | modified | 4 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/notifications/__tests__/session-registry-durability.test.ts` | added | 5 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/notifications/__tests__/template-engine.test.ts` | modified | 2 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/notifications/__tests__/tmux.test.ts` | modified | 2 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/api-interop.cwd-resolution.test.ts` | modified | 9 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/issue-4261-cmux-team-failures.test.ts` | added | 1 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/model-contract.test.ts` | modified | 11 | `fc7250d^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/recovery-pane-rollback.test.ts` | modified | 6 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/runtime-v2-role-routing.test.ts` | modified | 8 | `1542fbc^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/stage-router.test.ts` | modified | 3 | `1542fbc^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/team-owner-epoch.test.ts` | modified | 5 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/tmux-session-liveness.test.ts` | modified | 5 | `7ae8ac4^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/tmux-session.create-team.test.ts` | modified | 5 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/tmux-session.pane-env.test.ts` | added | 4 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/tmux-session.target-membership.test.ts` | modified | 5 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/tmux-session.test.ts` | modified | 6 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/usage-record-shape.test.ts` | added | 5 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/team/__tests__/usage-unicode-counts.test.ts` | added | 4 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/tools/diagnostics/__tests__/tsc-project-failures.test.ts` | added | 4 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/tools/lsp/__tests__/utils-file-uri.test.ts` | added | 4 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/utils/__tests__/cache-occupancy.test.ts` | modified | 8 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/utils/__tests__/jsonc.test.ts` | modified | 2 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/utils/__tests__/string-width.test.ts` | modified | 1 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/workflow/__tests__/projections.test.ts` | modified | 9 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `src/workflow/__tests__/registry.test.ts` | modified | 9 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/integration/contained-fs-packaging.test.ts` | added | 1 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/integration/git-guardrails-hook.test.ts` | modified | 4 | `7f973ec^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/integration/issue-4266-jev-temp-cleanup.test.ts` | added | 4 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/integration/jev-active-mode-repro.test.ts` | added | 5 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/integration/runs-reconciler.test.ts` | modified | 3 | `7f973ec^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/integration/session-flow-skill.test.ts` | added | 3 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/integration/skill-map-references.test.ts` | modified | 3 | `7f973ec^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/integration/state-lock-owner-reclaim.test.ts` | modified | 3 | `7f973ec^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/integration/workflow-profile-keyword-activation.test.ts` | modified | 4 | `3f25131^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/lint/file-identity-bigint.test.ts` | added | 1 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/lint/hooks-async-configuration.test.ts` | added | 1 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/lint/issue-4156-windows-dev-zero.test.ts` | modified | 2 | `7f973ec^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/lint/issue-4267-tmux-guard-shell-syntax.test.ts` | added | 4 | `fba421a^` | `scripts/known-failures.mjs --check (CI test job)` |
| `tests/shipyard-audit.test.ts` | modified | 4 | `7ae8ac4^` | `scripts/known-failures.mjs --check (CI test job)` |

## Structural (M1 class ②: structural assertion, no fake test) - 27

| path | hop | commits | un-patch | structural guard |
|---|---|---|---|---|
| `.github/CLAUDE.md` | modified | 10 | `3f25131^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `CHANGELOG.md` | modified | 12 | `3f25131^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `CLAUDE.md` | modified | 12 | `3f25131^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/adr/03672-env-activated-active-mode.md` | modified | 5 | `7f973ec^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/CLAUDE.md` | modified | 12 | `3f25131^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/design/FACTORY-FINAL-DESIGN.md` | modified | 3 | `7f973ec^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/HOOKS.md` | modified | 8 | `3f25131^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/MIGRATION.md` | modified | 8 | `3f25131^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/REFERENCE.md` | modified | 12 | `3f25131^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `docs/shipyard.md` | modified | 7 | `1542fbc^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `GLOSSARY.md` | modified | 3 | `7f973ec^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `package-lock.json` | modified | 12 | `fc7250d^` | `src/__tests__/metadata-contracts.test.ts` |
| `package.json` | modified | 14 | `fc7250d^` | `src/__tests__/metadata-contracts.test.ts` |
| `README.md` | modified | 11 | `fc7250d^` | `scripts/check-canonical-identity.mjs (CI provenance job)` |
| `skills/agent-doc-discipline/SKILL.md` | modified | 3 | `b0a05cf^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/AGENTS.md` | modified | 10 | `3f25131^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/ask-navigator/SKILL.md` | modified | 5 | `8a0d3c5^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/deep-interview/SKILL.md` | modified | 5 | `b0a05cf^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/drydock/SKILL.md` | modified | 7 | `1542fbc^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/execute/SKILL.md` | modified | 3 | `3f25131^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/hud/SKILL.md` | modified | 5 | `fc7250d^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/launch/SKILL.md` | modified | 8 | `1542fbc^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/map/SKILL.md` | modified | 3 | `7f973ec^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/pr/SKILL.md` | modified | 3 | `7f973ec^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/review/SKILL.md` | modified | 5 | `3f25131^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/session-flow/SKILL.md` | added | 3 | `fba421a^` | `src/skills/__tests__/skill-config-dir.test.ts` |
| `skills/tdd/SKILL.md` | modified | 2 | `7f973ec^` | `src/skills/__tests__/skill-config-dir.test.ts` |

## Regenerate

```bash
node scripts/conflict-ledger.mjs --patch-layer --output docs/ANCESTOR-PATCH-LAYER.md
```
