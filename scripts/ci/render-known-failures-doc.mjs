#!/usr/bin/env node
/**
 * Render docs/KNOWN-FAILURES.md from a CI vitest log pair plus a family map.
 *
 * The known-failures baselines are machine-generated, but the *reason* each entry
 * is tolerated is human judgement. Keeping that judgement in this file means the
 * two cannot drift apart: the script refuses to render unless every failing test
 * file in the logs is claimed by exactly one family, and it re-derives every count
 * it prints from the logs rather than from prose.
 *
 * Usage:
 *   node scripts/ci/render-known-failures-doc.mjs --linux=<log> --win32=<log> [--write] [--run=<id@sha>]
 */
import { readFileSync, writeFileSync } from 'fs';
// The counts on this page are only meaningful if they are the counts the gate
// itself would compute, so the parse is imported rather than re-implemented.
import { parseVitestOutput, stripAnsi, stripRunnerPrefix } from '../known-failures.mjs';

function readLog(logPath) {
  const counts = new Map();
  for (const entry of parseVitestOutput(readFileSync(logPath, 'utf8'))) {
    // A file-level failure renders as `path [ path ]`; claim it by its file.
    const file = entry.split(' > ')[0].replace(/ \[.*\]$/, '');
    counts.set(file, (counts.get(file) ?? 0) + 1);
  }
  return counts;
}

/**
 * Bucket the win32 failures that have no Linux counterpart. The signature is the
 * first error line after a file's FAIL header, so this reads the raw log rather
 * than the gate's parsed entries.
 */
const WIN32_BUCKETS = [
  ['collection-error (module did not parse)', / \[ .* \]$/],
  ['missing python bridge payload', /gyoshu_bridge\.py/],
  ['path separator or CRLF', /\\[A-Za-z0-9_.-]|\r\n|to be '\/|\/foo\/bar|StringContaining "\/dist/],
  ['win32 fs permission or ENOENT', /EPERM|EBUSY|ENOENT|ENOTEMPTY|rmSync|unlink/],
  ['subprocess or shell dialect', /cmd\.exe|COMSPEC|node:internal\/errors|spawnSync|shell:true/],
  ['timing or timeout', /timed out|timeout of \d+ms|Found 0\./],
  ['ancestor brand expectation', /omc|OMC|[Cc]laude/],
  ['registry or count ratchet', /length of|expected \d+ to be/],
];

function classifyWin32Only(winLogPath, winCounts, linuxCounts) {
  const raw = readFileSync(winLogPath, 'utf8');
  const lines = stripAnsi(raw).split('\n').map(stripRunnerPrefix);
  const firstMsg = new Map();
  for (let i = 0; i < lines.length; i++) {
    const m = /^\s*FAIL\s+(.+)$/.exec(lines[i].trim());
    if (!m) continue;
    const full = m[1].trim().replace(/\\/g, '/');
    const file = full.split(' > ')[0].replace(/ \[.*\]$/, '');
    if (firstMsg.has(file)) continue;
    let msg = / \[ .* \]$/.test(full) ? 'COLLECTION' : '';
    if (!msg) {
      for (let j = i + 1; j < Math.min(i + 16, lines.length); j++) {
        if (/^\s*FAIL\s/.test(lines[j]) || /^\s*Test Files/.test(lines[j])) break;
        const b = lines[j].trim();
        if (/AssertionError|Error:|TypeError|SyntaxError/.test(b)) { msg = b; break; }
      }
    }
    firstMsg.set(file, msg || '(no inline error)');
  }

  const buckets = new Map();
  for (const [file, n] of winCounts) {
    if (linuxCounts.has(file)) continue;
    const msg = firstMsg.get(file) ?? '';
    let name = 'unclassified';
    for (const [bucket, re] of WIN32_BUCKETS) {
      if (re.test(msg)) { name = bucket; break; }
    }
    const e = buckets.get(name) ?? { n: 0, files: [] };
    e.n += n;
    e.files.push(file);
    buckets.set(name, e);
  }
  return buckets;
}

const args = process.argv.slice(2);
const argValue = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};
const linuxPath = argValue('linux');
const winPath = argValue('win32');
if (!linuxPath || !winPath) {
  console.error('Usage: render-known-failures-doc.mjs --linux=<log> --win32=<log> [--write] [--run=<id@sha>]');
  process.exit(2);
}
const L = readLog(linuxPath);
const W = readLog(winPath);
const runRef = argValue('run') ?? 'unknown';

// ---------------------------------------------------------------------------
// Family map. `fix` is the disposition; `owner` is the lane that owns the work.
// ---------------------------------------------------------------------------
const FAMILIES = [
  {
    id: 'workflow-profile-config-root-fixture',
    title: 'Workflow-profile fixtures named the wrong config-root env var',
    fix: 'fixed on this branch',
    owner: 'closed by 4aa3b3b',
    cause: 'Three integration fixtures spawned the stop hook with CLAUDE_CONFIG_DIR, which this fork never reads: getQoderConfigDir() takes QODER_CONFIG_DIR / QODERCN_CONFIG_DIR, so the hook resolved the transcript root under $HOME/.qoder[-cn] instead of the fixture directory, readStableTranscript() returned null, and the hook reported `workflow_descriptor_integrity_failed` before any stage prompt was built. Fixed by naming the env var the fork actually honours; measured 127 -> 0 on Linux. Two remainders, deliberately not smoothed over: on win32 workflow-profile-stop-transition still fails because readStableTranscript() requires /proc/self/fd (named workflow profiles cannot run there at all -- tracked separately), and the fixture variable is still spelled claudeConfigDir.',
    evidence: "AssertionError: expected '[AUTOPILOT WORKFLOW] workflow_descriptor…' to be '## PIPELINE STAGE: EXECUTION (Solo Mode…'",
    files: [
      'tests/integration/workflow-profile-stop-transition.test.ts',
      'tests/integration/task-list-identity-stop.test.ts',
    ],
  },
  {
    id: 'python-bridge-payload-missing',
    title: 'The Python bridge payload is not in the repository',
    fix: 'needs a product decision',
    owner: 'unassigned -- requires sourcing bridge/gyoshu_bridge.py',
    cause: 'bridge-manager.ts resolves `<package-root>/bridge/gyoshu_bridge.py` at runtime and scripts/plugin-shipping-surface.mjs lists it as shipping surface, but `.gitignore` has `bridge/`, so the ancestor\'s Python source was never carried into this fork. The MCP python_repl tool therefore ships without its payload; this is a product gap, not a test-only problem.',
    evidence: "FileNotFoundError: [Errno 2] No such file or directory: '/home/runner/work/oh-my-qoder/oh-my-qoder/bridge/gyoshu_bridge.py'",
    files: ['src/tools/python-repl/__tests__/python-sandbox.test.ts'],
  },
  {
    id: 'agent-namespace-prefix',
    title: 'Agent namespace prefix is still oh-my-claudecode:',
    fix: 'fix code',
    owner: 'Lane 0 (L0-E branding)',
    cause: 'The plugin registers itself as `oh-my-qoder` (`.qoder-plugin/plugin.json` name, and `~/.qoder-cn/plugins/cache/local/oh-my-qoder`), so Qoder addresses its agents as `oh-my-qoder:<name>` -- the live agent catalogue in any session shows that spelling. b37141e stripped exactly that prefix, but the hop restored the ancestor\'s `/^oh-my-claudecode:/`, so a namespaced agent type reaches the registry unstripped and dies as "Unknown agent type", and emitted guidance still tells users to call `/oh-my-claudecode:cancel`. This is a runtime defect, not test drift.',
    evidence: "Error: Unknown agent type: oh-my-qoder:executor (from oh-my-qoder:executor)",
    files: [
      'src/__tests__/routing-force-inherit.test.ts',
      'src/hooks/skill-state/__tests__/skill-state.test.ts',
      'src/hooks/autopilot/__tests__/pipeline.test.ts',
      'src/hooks/autopilot/__tests__/prompts.test.ts',
      'src/hooks/autopilot/__tests__/validation.test.ts',
      'src/__tests__/auto-slash-aliases.test.ts',
    ],
  },
  {
    id: 'code-emits-legacy-brand',
    title: 'Production code still emits an omc/Claude token where the fork uses omq/Qoder',
    fix: 'fix code',
    owner: 'Lane 0 (L0-E branding)',
    cause: 'Definition-side renames landed, consumers did not. These assertions are the fork\'s own spellings (b37141e), so each one is a place where the built artefact disagrees with the rest of the product: team worktree branches and tmux session names, the config-root/state-root helpers, the `$CLAUDE_PLUGIN_ROOT` hook command, HUD script filenames, and config-dir joins. `src/installer/index.ts` is the sharpest one: both its plugin-detection reads (`isRunningAsPlugin` at :576 and the `hasEnabledOmqPlugin` short-circuit at :2030) look only at `CLAUDE_PLUGIN_ROOT`, while b37141e:428 detected through `QODER_PLUGIN_ROOT` -- under Qoder CN the host exports the Qoder name, so the fork answers "no plugin enabled" and callers bypass the plugin path. That is one of the nine patch-layer behaviours M1 recorded, reverted by the hop, and it fails identically on all three platforms.',
    evidence: "AssertionError: expected 'omc-team/test-wt/worker1' to be 'omq-team/test-wt/worker1'",
    files: [
      'src/team/__tests__/git-worktree.test.ts',
      'src/team/__tests__/edge-cases.test.ts',
      'src/team/__tests__/api-interop.command-dialect.test.ts',
      'src/utils/__tests__/paths.test.ts',
      'src/__tests__/hooks-command-escaping.test.ts',
      'src/__tests__/plugin-setup-deps.test.ts',
      'src/hooks/setup/__tests__/windows-patch.test.ts',
      'src/__tests__/setup-agents-md-script.test.ts',
      'src/__tests__/hud-windows.test.ts',
      'src/installer/__tests__/has-enabled-omc-plugin.test.ts',
    ],
  },
  {
    id: 'patch-layer-guards',
    title: 'M1 patch-layer guards are unmet or have gone vacuous',
    fix: 'fix code',
    owner: 'Lane 0 + Lane 1 (the patch layer these guards protect)',
    cause: 'These are the guards M1 wrote so the fork\'s own patch layer cannot silently disappear. Three of them now report that the behaviour is gone (session-start.mjs must import the shared plugin-cache helper; the installer must derive its shell fallback through getDefaultConfigDirShellPath; session-start must keep the legacy hud script name in its fallback list), and one has become self-reporting-vacuous because the template it inspects no longer carries a repository URL at all. A vacuous guard is worse than a red one, so this family is the highest-priority item on the page.',
    evidence: "AssertionError: the template has no repository URL -- this guard is now vacuous: expected 0 to be greater than 0",
    files: [
      'src/__tests__/patch-layer-guards.test.ts',
      'src/__tests__/hud-build-guidance.test.ts',
    ],
  },
  {
    id: 'state-root-session-scoping',
    title: 'Session-scoped state root resolves to nothing',
    fix: 'fix code',
    owner: 'Lane 2-4 (hooks + state)',
    cause: 'OMQ_STATE_DIR / per-session state resolution: resolveSessionStatePaths returns an empty string when no session id is supplied, and the skill-active-state writer does not honour OMQ_STATE_DIR, so state lands outside the intended root. Both are the fork\'s own pre-hop behaviour, which the hop\'s state-root refactor did not carry.',
    evidence: "AssertionError: expected '' to contain 'sessions'  (worktree-paths > resolveSessionStatePaths > no sessionId)",
    files: [
      'src/lib/__tests__/worktree-paths.test.ts',
      'src/__tests__/state-root-resolution.test.ts',
    ],
  },
  {
    id: 'jsonc-trailing-commas',
    title: 'The hand-rolled JSONC reader lost trailing-comma tolerance',
    fix: 'fix code',
    owner: 'Lane 1 (config loading)',
    cause: 'src/utils/jsonc.ts strips comments and then calls JSON.parse, so a trailing comma -- legal in JSONC and produced by any hand-edited config -- throws. jsonc-parser is declared in package.json and required by nothing in the bundle, which is the obvious way to satisfy the suite. Neither the adopted ancestor snapshot of jsonc.ts nor b37141e implemented trailing-comma removal, so this is an unmet contract rather than something the hop deleted.',
    evidence: "SyntaxError: Unexpected token ']', \"[1,2,]\" is not valid JSON (parseJsonc src/utils/jsonc.ts:13)",
    files: ['src/utils/__tests__/jsonc.test.ts'],
  },
  {
    id: 'test-asserts-ancestor-spelling',
    title: 'Test asserts the ancestor\'s text, form or version',
    fix: 'fix test',
    owner: 'Lane 0 (L0-E branding)',
    cause: 'The production side already emits the fork spelling; the fixture still expects the ancestor\'s -- `OMC maintenance completed:`, `skills/omc-doctor/`, `.claude`, `.github/workflows/ci.yml`, an `omc team` help line. Two of them are not spelling at all: one expects a projection marker stamped `0.1.0` while the build stamps the package version, and one expects `export function getClaudeConfigDir()` where 0c749e8 added `export const`. Ratified here rather than rewritten under this story so each flip lands in one attributable branding commit.',
    evidence: "AssertionError: expected 'OMQ maintenance completed:\\n- No main…' to contain 'OMC maintenance completed:'",
    files: [
      'src/hooks/__tests__/bridge-routing.test.ts',
      'src/__tests__/mnemosyne/finder.test.ts',
      'src/skills/__tests__/omc-doctor-skill.test.ts',
      'src/__tests__/consolidation-contracts.test.ts',
      'src/__tests__/omc-state-gitignore-contract.test.ts',
      'src/__tests__/tier0-docs-consistency.test.ts',
      'src/__tests__/claude-goal-adapter-doc.test.ts',
      'src/__tests__/ralph-prd-mandatory.test.ts',
      'src/cli/__tests__/team-help.test.ts',
      'src/cli/__tests__/teleport-help.test.ts',
      'src/cli/__tests__/session-search-help.test.ts',
      'src/cli/__tests__/team-command-branding.test.ts',
      'src/cli/__tests__/cli-boot.test.ts',
      'src/cli/commands/__tests__/ultragoal.test.ts',
      'src/cli/commands/__tests__/team-role-shorthand.test.ts',
      'src/installer/__tests__/standalone-hook-reconcile.test.ts',
      'src/installer/__tests__/hook-templates.test.ts',
      'src/installer/__tests__/claude-md-target-resolution.test.ts',
      'tests/lint/subagent-lock-test-contract.test.ts',
      'tests/lint/windows-hide-hooks.test.ts',
    ],
  },
  {
    id: 'mock-or-undefined-export',
    title: 'A mock or import does not provide the symbol the subject uses',
    fix: 'fix test',
    owner: 'Lane 0 (L0-E branding) + Lane 1',
    cause: 'A vi.mock factory replaces the module wholesale, so a renamed export must be renamed inside every mock too; where it was not, the case dies with "No X export is defined on the mock" or with an `undefined` that makes the assertion itself invalid. Two are confirmed rather than inferred: beads-context mocks `getOMCConfig` while the hook imports `getOMQConfig`, and purge-stale-cache mocks only `getClaudeConfigDir` although src/utils/paths.ts:12 imports `getQoderConfigDir` as well, so the purge resolves no cache root and returns 0 -- which reads like a discovery bug but is a fixture gap. Two of these files (beads-context, jobid-collision-safety) are already fixed on the branch.',
    evidence: 'Error: [vitest] No "getOMQConfig" export is defined on the "../../../features/auto-update.js" mock.',
    files: [
      'src/hooks/beads-context/__tests__/index.test.ts',
      'src/__tests__/jobid-collision-safety.test.ts',
      'src/__tests__/purge-stale-cache.test.ts',
      'src/__tests__/doctor-conflicts.test.ts',
      'src/__tests__/runtime-task-orphan.test.ts',
      'src/lib/__tests__/session-id.test.ts',
      'src/__tests__/generated-artifact-authorization.test.ts',
      'src/__tests__/npm-package-bin-surface.test.ts',
      'src/__tests__/npm-package-hook-surface.test.ts',
      'src/installer/__tests__/session-start-template.test.ts',
      'src/__tests__/deep-interview-provider-options.test.ts',
      'src/__tests__/cleanup-validation.test.ts',
    ],
  },
  {
    id: 'provider-default-expectations',
    title: 'Ancestor asserts Claude provider defaults',
    fix: 'fix test',
    owner: 'Lane 0 (L0-D/L0-E) -- same class as 7ab618e',
    cause: 'This fork defaults its tiers to the Qwen family, so anything that previously resolved to `sonnet`/`opus`/`haiku` now resolves to `low`/`medium`/`high` or a qwen id, and anything that resolved to `claude` now resolves to `qwen`. The assertions are the ancestor\'s, not a regression; they need the fork-coherent expectation one family at a time, the way delegation-enforcer was done in 7ab618e.',
    evidence: "AssertionError: expected 'low' to be 'haiku' // Object.is equality",
    files: [
      'src/__tests__/model-routing.test.ts',
      'src/__tests__/bedrock-lm-suffix-hook.test.ts',
      'src/__tests__/pre-tool-enforcer.test.ts',
      'src/__tests__/session-start-script-context.test.ts',
      'src/hooks/think-mode/__tests__/index.test.ts',
      'src/__tests__/installer.test.ts',
      'src/team/__tests__/runtime-v2.explicit-provider-routing.test.ts',
      'src/__tests__/delegation-enforcement-levels.test.ts',
      'src/__tests__/hud/labels.test.ts',
      'src/__tests__/hud/render.test.ts',
    ],
  },
  {
    id: 'registry-count-ratchet',
    title: 'A registry count or manifest is pinned to the ancestor',
    fix: 'fix test or regenerate manifest',
    owner: 'Lane 5 (artefact materialisation)',
    cause: 'The fork ships more skills, more MCP tools and more workflow projections than the ancestor asserted, and two of these read manifest or inventory files that have not been regenerated since the renames (one of them opens `.claude-plugin/plugin.json`, which this fork calls `.qoder-plugin/`).',
    evidence: 'AssertionError: expected [ \'mcp__t__lsp_hover\', …(73) ] to have a length of 59 but got 74',
    files: [
      'src/__tests__/skills.test.ts',
      'src/alias-retirement/__tests__/registry.test.ts',
      'src/__tests__/omq-tools-server.test.ts',
      'src/workflow/__tests__/projections.test.ts',
      'tests/lint/inventory-graph-drift.test.ts',
      'src/__tests__/plugin-skill-budget.test.ts',
    ],
  },
  {
    id: 'plugin-cache-installer-discovery',
    title: 'Plugin-cache and installer discovery',
    fix: 'investigate -- real defects likely',
    owner: 'Lane 1 (installer + paths + config)',
    cause: 'The remaining plugin-cache and repair-script cases: what the cache directory looks like on a CN install, and what the repair script should do about interrupted relinks. Two verified notes rather than a blanket hedge -- `purge-stale-cache` is a fixture gap and now lives in `mock-or-undefined-export`, and `plugin-dir-capture` fails for **different reasons per platform** (Linux: `expected null not to be null` on `OMQ_PLUGIN_ROOT` child-env propagation; Windows: `expected \'/foo/bar\' to be \'E:\\foo\\bar\'`, a separator artefact of the same assertion). The rest are not yet root-caused file by file.',
    evidence: 'AssertionError: expected +0 to be 2 // Object.is equality  (repair-plugin-cache-script)',
    files: [
      'src/__tests__/repair-plugin-cache-script.test.ts',
      'src/cli/__tests__/plugin-dir-capture.test.ts',
      'src/installer/__tests__/plugin-dir-mode-e2e.test.ts',
      'src/installer/__tests__/stale-cleanup.test.ts',
      'src/__tests__/installer-omc-reference.test.ts',
      'src/__tests__/installer-version-guard.test.ts',
      'src/__tests__/setup-claude-md-script.test.ts',
      'src/__tests__/release-guidance.test.ts',
      'src/__tests__/trusted-publishing-contract.test.ts',
      'src/__tests__/setup-contracts-regression.test.ts',
    ],
  },
  {
    id: 'tmux-worker-timing',
    title: 'tmux / worker-process timing',
    fix: 'accepted known (environment-sensitive)',
    owner: 'unassigned -- needs psmux on win32, tmux timing on Linux',
    cause: 'Team workers are tmux panes; these suites wait for log events with a fixed timeout and report `Found 0`. They are the same class the Linux baseline has carried since M1, and they fail identically on both platforms, so they are timing- rather than brand-dependent. Treat as flaky-known until a lane reproduces them deterministically.',
    evidence: 'Error: waitForEventInLog: timed out after 30000ms waiting for 1x "merge_succeeded" (worker=worker-1). Found 0.',
    files: [
      'src/team/__tests__/worktree-runtime-e2e.test.ts',
      'src/team/__tests__/worker-activation-gate.test.ts',
      'src/team/__tests__/auto-merge.perf.test.ts',
      'src/team/__tests__/teardown-invariant.test.ts',
      'src/team/__tests__/rebase-smoke.test.ts',
      'src/cli/__tests__/autoresearch-guided.test.ts',
      'src/__tests__/session-start-timeout-cleanup.test.ts',
      'src/__tests__/issue-2652-runtime-wiring-and-output-contract.test.ts',
      'src/hooks/session-end/__tests__/callbacks.test.ts',
    ],
  },
  {
    id: 'hook-output-and-state-io',
    title: 'Hook return shape and HUD state readers',
    fix: 'investigate -- real defects plausible',
    owner: 'Lane 2-4 (hooks + state)',
    cause: 'Hook cases compare the whole `{ continue, suppressOutput, … }` object and the HUD usage readers get `undefined` where a number is expected. Both read state files whose layout moved during the branding passes, so some of these are the same unresolved state-root question as family `plugin-cache-installer-discovery`.',
    evidence: 'AssertionError: expected { Object (continue, suppressOutput) } to deeply equal { continue: true }',
    files: [
      'src/__tests__/post-tool-rules-injector.test.ts',
      'src/hooks/factcheck/__tests__/sentinel-gate.test.ts',
      'src/__tests__/hud-agents.test.ts',
      'src/__tests__/hud/usage-api-stale.test.ts',
      'src/__tests__/hud/usage-api-lock.test.ts',
    ],
  },
  {
    id: 'undeclared-dependency',
    title: 'Suite imports a package the manifest does not declare',
    fix: 'needs a decision -- new dependency',
    owner: 'unassigned',
    cause: 'tests/benchmark-diagnostics.test.ts fails at collection because it imports `@anthropic-ai/sdk`, which is not a dependency of this fork. Adding it is a dependency decision, not a branding one, so it is listed rather than fixed.',
    evidence: "Error: Cannot find package '@anthropic-ai/sdk' imported from '/home/runner/work/oh-my-qoder/oh-my-qoder/tests/benchmark-diagnostics.test.ts'",
    files: ['tests/benchmark-diagnostics.test.ts'],
  },
  {
    id: 'entitlement-projection',
    title: 'Generated entitlement projections fingerprint a stale source hash',
    fix: 'fixed on this branch',
    owner: 'closed by 4aca1fe',
    cause: 'The branding passes edited the entitlement manifest without refreshing the generated projections, whose header carries the manifest\'s sha256. Fixed in 4aca1fe; it stays listed so the entry does not silently vanish from the baseline diff.',
    evidence: 'Error: Command failed: … generate-skill-entitlements.mjs --verify / skill entitlement projections are stale',
    files: ['src/__tests__/skill-entitlements.test.ts'],
  },
  {
    id: 'mcp-team-job-id',
    title: 'Team job ids rejected by the CLI',
    fix: 'fixed on this branch',
    owner: 'closed by d178d27 + c3c7cc5',
    cause: 'team-server issues `omq-${timestamp}${uuid}` and validates that form, while src/cli/team.ts kept the ancestor\'s `/^omc-/` pattern -- so every CLI subcommand taking a job id rejected the id the server had just produced. d178d27 restored the validator and the convergence suite\'s fixtures but left generateJobId() on `omc-`, which made the CLI emit ids its own validator rejects; c3c7cc5 closes that and moves team.test.ts\'s ten job-id assertions with it. Discovered by diffing the failure sets of two CI runs: 17 entries went green while 8 new ones appeared.',
    evidence: 'Error: Invalid job_id: "omc-art1". Must match /^omq-[a-z0-9]{1,16}$/',
    files: [
      'src/mcp/__tests__/team-server-artifact-convergence.test.ts',
      'src/cli/__tests__/team.test.ts',
    ],
  },
];

const seen = new Map();
for (const family of FAMILIES) {
  for (const file of family.files) {
    if (seen.has(file)) {
      console.error(`DOUBLE-CLAIMED: ${file} in ${seen.get(file)} and ${family.id}`);
      process.exitCode = 1;
    }
    seen.set(file, family.id);
  }
}
/** Declared before the checks below so the error paths can use it too. */
const count = (map, file) => map.get(file) ?? 0;

const unclaimed = [...L.keys()].filter((f) => !seen.has(f));
if (unclaimed.length) {
  console.error(`UNCLAIMED (${unclaimed.length}):`);
  for (const f of unclaimed) console.error(`  ${f}  ${count(L, f)}x linux / ${count(W, f)}x win32`);
  process.exitCode = 1;
}
// A claimed file that no longer fails is not an error: it is the ratchet shrinking.
// Families keep their entries so the rendered table shows the closure.
const closed = [...seen.keys()].filter((f) => !L.has(f));
if (closed.length) console.error(`closed (claimed but no longer failing): ${closed.join(', ')}`);
if (process.exitCode) process.exit(1);

const lTotal = [...L.values()].reduce((a, b) => a + b, 0);
const wTotal = [...W.values()].reduce((a, b) => a + b, 0);
const linuxOnlySum = [...L.keys()].reduce((a, f) => a + count(W, f), 0);

const familyOrder = [...FAMILIES].sort((a, b) => b.files.reduce((s, f) => s + count(L, f), 0) - a.files.reduce((s, f) => s + count(L, f), 0));

const lines = [];
lines.push('# Known failures');
lines.push('');
lines.push(`Tracked in \`tests/known-failures-linux.json\` and \`tests/known-failures-win32.json\`, both machine-generated.`);
lines.push(`This page is generated by \`scripts/ci/render-known-failures-doc.mjs\` from the CI logs of run \`${runRef}\`,`);
lines.push('so the counts below are measured, not remembered.');
lines.push('');
lines.push('## Why a baseline exists at all');
lines.push('');
lines.push([
    'The ancestor tree was adopted whole (`344176f`), so a large number of failing tests arrived with it.',
    '`build.yml` therefore gates on a *delta*: the `test` and `windows-test` jobs capture vitest output, and',
    '`scripts/known-failures.mjs --check` fails on a failure that is not in the baseline **and** on a baseline entry',
    'that stops failing. Absolute green is not the goal -- a red that is *new* is the signal.',
    ''].join('\n'));
lines.push('');
lines.push('## Current totals');
lines.push('');
lines.push('| platform | failing tests | failing files | baseline |');
lines.push('| --- | --: | --: | --- |');
lines.push(`| linux | ${lTotal} | ${L.size} | \`tests/known-failures-linux.json\` |`);
lines.push(`| win32 | ${wTotal} | ${W.size} | \`tests/known-failures-win32.json\` |`);
lines.push('');
const win32OnlyBuckets = classifyWin32Only(winPath, W, L);
const win32OnlyTotal = [...win32OnlyBuckets.values()].reduce((a, v) => a + v.n, 0);
lines.push([
    `${lTotal} linux failures sit in ${L.size} files, and every one of them is claimed by a family below.`,
    `win32 reports ${linuxOnlySum} failures in those same files plus ${win32OnlyTotal} in files that pass on`,
    'Linux. That surplus is classified here from the log rather than described by hand:',
    ''].join('\n'));
lines.push('');
lines.push('| win32-only failures | files | signature |');
lines.push('| --: | --: | --- |');
for (const [name, v] of [...win32OnlyBuckets].sort((a, b) => b[1].n - a[1].n)) {
  lines.push(`| ${v.n} | ${v.files.length} | ${name} |`);
}
lines.push('');
lines.push('The classification keys on the first error line after each file\'s `FAIL` header, so `unclassified` is');
lines.push('the honest residual rather than a bucket labelled "environment". Two consequences worth stating: a');
lines.push('*collection* failure (`FAIL <file> [<file>]`) loses every test in that module, so it is counted as the');
lines.push('file\'s whole win32 contribution; and because the surplus is largely Windows-path expectations, the');
lines.push('win32 baseline may never be authored from a Linux run -- hence two files with their own');
lines.push('`metadata.platform`.');
lines.push('');
lines.push('## Families');
lines.push('');
lines.push('| family | linux | win32 | disposition | owner |');
lines.push('| --- | --: | --: | --- | --- |');
for (const f of familyOrder) {
  const l = f.files.reduce((s, file) => s + count(L, file), 0);
  const w = f.files.reduce((s, file) => s + count(W, file), 0);
  lines.push(`| [${f.id}](#${f.id}) | ${l} | ${w} | ${f.fix} | ${f.owner} |`);
}
lines.push(`| **total** | **${lTotal}** | **${[...L.keys()].reduce((a, f) => a + count(W, f), 0)}** | | |`);
lines.push('');
for (const f of familyOrder) {
  const l = f.files.reduce((s, file) => s + count(L, file), 0);
  const w = f.files.reduce((s, file) => s + count(W, file), 0);
  lines.push(`<a id="${f.id}"></a>`);
  lines.push(`## ${f.title} -- ${l === 0 ? 'closed (0 remaining)' : `${l} linux / ${w} win32`}`);
  lines.push('');
  lines.push(`**Disposition:** ${f.fix} · **Owner:** ${f.owner}`);
  lines.push('');
  lines.push(f.cause);
  lines.push('');
  lines.push('Representative CI failure:');
  lines.push('');
  lines.push('```');
  lines.push(f.evidence);
  lines.push('```');
  lines.push('');
  lines.push('| linux | win32 | file |');
  lines.push('| --: | --: | --- |');
  for (const file of [...f.files].sort((a, b) => count(L, b) - count(L, a))) {
    lines.push(`| ${count(L, file)} | ${count(W, file)} | \`${file}\` |`);
  }
  lines.push('');
}
lines.push('## Regenerating a baseline');
lines.push('');
lines.push('A baseline may only be authored from the platform it declares, from a CI log of that platform:');
lines.push('');
lines.push('```bash');
lines.push('gh run view <run-id> --repo SeveNOlogy7/oh-my-qoder --log --job <test-job-id> > /tmp/test.log');
lines.push('node scripts/known-failures.mjs --platform=linux \\');
lines.push('  --source="run:<run-id>@<sha>" < /tmp/test.log > tests/known-failures-linux.json');
lines.push('node scripts/ci/render-known-failures-doc.mjs --linux=/tmp/test.log --win32=/tmp/win.log \\');
lines.push('  --run="<run-id>@<sha>" --write');
lines.push('```');
lines.push('');
lines.push([
    '`gh api .../jobs/<id>/logs` returns an empty body here because the response carries escape sequences;',
    'use `gh run view --log --job`. A local Docker run is **not** a substitute for the CI log: `node:20` has no',
    'tmux and no ruby, and the workflow-profile family happens to match CI exactly (114 = 114) while other',
    'families do not. Windows numbers measured on a workstation are not comparable either -- they carry the',
    'same separator noise the windows-latest runner does not.',
    ''].join('\n'));
lines.push('');
lines.push('## What may not be done with this file');
lines.push('');
lines.push('Do not regenerate a baseline to make a gate pass. The point of the delta gate is that the set of');
lines.push('tolerated failures only changes when a family\'s reason changes. If a family above goes green, that');
lines.push('is a *fix*, and the shrink should land in the commit that fixed it, with the family section updated.');
lines.push('');
lines.push('The gate itself was verified rather than trusted: feeding a CI log back against a baseline generated');
lines.push(`from that same log exits 0 with \`Matched: ${lTotal}\`, and deleting one entry from that baseline exits 1`);
lines.push('reporting exactly one new failure. So a red gate after a baseline change means a real delta, not a');
lines.push('parser that never matches.');
lines.push('');
lines.push([
    'Run-to-run churn was measured rather than assumed, by diffing the failure sets of two adjacent runs',
    '(`4aca1fe` then `d2a1a28`, whose only difference is the two job-id/mock fixes):',
    '',
    '- linux: 17 entries stopped failing and 8 started, every one of them in the files those commits touched.',
    '  **No unexplained churn**, so a Linux drift-red is always worth reading.',
    '- win32: same 17 stopped and 12 started, but only 8 of the additions are attributable. Four entries flipped',
    '  on their own -- `src/__tests__/session-start-background-output.test.ts`, `src/__tests__/session-start-script-context.test.ts`,',
    '  `src/__tests__/skill-entitlements-cross-surface.test.ts` and `tests/lint/inventory-graph-drift.test.ts`.',
    '  That is roughly 0.4% of the win32 set per run, so a windows-test drift that names only files like these is',
    '  a flake: re-run the job before treating it as a delta.',
    '',
    'The `tmux-worker-timing` family waits on worker log events with fixed timeouts and is the likeliest place',
    'for that kind of flip to appear next.',
    ''].join('\n'));

const out = lines.join('\n') + '\n';
if (args.includes('--write')) {
  writeFileSync('docs/KNOWN-FAILURES.md', out);
  console.log(`wrote docs/KNOWN-FAILURES.md (${lTotal} linux / ${wTotal} win32 across ${FAMILIES.length} families)`);
} else {
  process.stdout.write(out);
}
