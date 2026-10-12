import { afterEach, describe, expect, it, vi } from 'vitest';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { getOmcRoot } from '../lib/worktree-paths.js';
import { pathToFileURL } from 'node:url';

const REPO_ROOT = process.cwd();
const RUN_CJS = join(REPO_ROOT, 'scripts', 'run.cjs');
const SESSION_END_SCRIPTS = [
  ['session-end', join(REPO_ROOT, 'scripts', 'session-end.mjs')],
  ['wiki-session-end', join(REPO_ROOT, 'scripts', 'wiki-session-end.mjs')],
] as const;
const IS_CI = process.env.CI === 'true' || process.env.CI === '1';
// Keep the strict local regression ceiling while allowing bounded GitHub-hosted
// process startup contention during the full parallel suite. A win32 dev host pays
// a 150-250ms cold start per spawned runner (node boot + Defender) on top of the
// runner's own 300ms shipped foreground budget - measured 265-600ms per spawn on
// this host family (w7-spawn-measure.txt: bare spawn 161-191ms; configured
// adapters 265ms; under the vitest worker pool 350-600ms), so the POSIX-shaped
// 500ms local ceiling cannot absorb it. The same hazard is recorded by the
// runner itself as WINDOWS_GENERIC_STARTUP_MS. 900ms stays far below the hang
// this suite guards (#3477: the process must exit terminally, not wait for
// SessionStart).
const WIN32_LOCAL_CEILING_MS = 900;
const COMMAND_CEILING_MS = IS_CI ? 1_500 : process.platform === 'win32' ? WIN32_LOCAL_CEILING_MS : 500;
const SEQUENTIAL_CEILING_MS = IS_CI ? 3_000 : process.platform === 'win32' ? 2 * WIN32_LOCAL_CEILING_MS : 1_000;
const HAS_GENERATED_DIST = existsSync(join(REPO_ROOT, 'dist', 'hooks', 'session-end', 'worker.js'));
const TEST_PRODUCER_GRACE_MS = '25';
// The worker's required actions have a 9s budget; allow that bounded contract
// plus process-startup/runner contention under the full suite.
const DETACHED_WORKER_CEILING_MS = IS_CI ? 25_000 : 5_000;

interface ExitResult {
  elapsedMs: number;
  code: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
}

function runUntilClose(
  script: string,
  cwd: string,
  input: string | undefined,
  ceilingMs = COMMAND_CEILING_MS,
  extraEnv: NodeJS.ProcessEnv = {},
): Promise<ExitResult> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(process.execPath, [RUN_CJS, script], {
      cwd,
      env: {
        ...process.env,
        HOME: cwd,
        USERPROFILE: cwd,
        ...extraEnv,
        CLAUDE_PLUGIN_ROOT: REPO_ROOT,
        CLAUDE_CONFIG_DIR: join(cwd, '.claude'),
      },
      stdio: ['pipe', 'ignore', 'ignore'],
      windowsHide: true,
    });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, ceilingMs);

    child.once('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ elapsedMs: Date.now() - startedAt, code, signal, timedOut });
    });

    if (input !== undefined) child.stdin.end(input);
  });
}

function expectPromptExit(result: ExitResult, ceilingMs = COMMAND_CEILING_MS): void {
  expect(result.timedOut).toBe(false);
  expect(result.signal).toBeNull();
  expect(result.code).toBe(0);
  expect(result.elapsedMs).toBeLessThanOrEqual(ceilingMs);
}

function validSessionEndInput(cwd: string, sessionId: string): string {
  return JSON.stringify({
    session_id: sessionId,
    transcript_path: join(cwd, 'transcript.jsonl'),
    cwd,
    permission_mode: 'default',
    hook_event_name: 'SessionEnd',
    reason: 'clear',
  });
}

function configureDeferredAdapters(cwd: string): void {
  const configDir = join(cwd, '.claude');
  mkdirSync(configDir, { recursive: true });
  writeFileSync(join(configDir, '.omq-config.json'), JSON.stringify({
    notifications: { enabled: true },
    stopHookCallbacks: { file: { enabled: true, path: join(cwd, 'callback.md'), format: 'markdown' } },
  }));
}

async function waitForTerminalCallback(cwd: string, sessionId: string): Promise<void> {
  const callbackPath = join(cwd, 'callback.md');
  const manifestPath = join(getOmcRoot(cwd), 'state', 'session-end-jobs', `${sessionId}.json`);
  let deadline = Date.now() + DETACHED_WORKER_CEILING_MS;
  const hardCeiling = Date.now() + DETACHED_WORKER_CEILING_MS * 2;
  let lastRevision = -1;
  let lastPhase = '';

  while (Date.now() < deadline && Date.now() < hardCeiling) {
    if (existsSync(callbackPath) && existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as {
          phase: string;
          revision: number;
          owner: unknown;
          actions: Record<string, { status: string }>;
        };
        if (manifest.revision !== lastRevision || manifest.phase !== lastPhase) {
          lastRevision = manifest.revision;
          lastPhase = manifest.phase;
          deadline = Math.min(hardCeiling, Date.now() + (IS_CI ? 10_000 : 5_000));
        }
        if (manifest.phase === 'complete' && manifest.owner === null && manifest.actions.callback?.status === 'completed') {
          await new Promise<void>((resolve) => setTimeout(resolve, 250));
          return;
        }
      } catch {
        // Read or parse collision during concurrent atomic write; retry on next tick
      }
    } else if (existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as { phase: string; revision: number };
        if (manifest.revision !== lastRevision || manifest.phase !== lastPhase) {
          lastRevision = manifest.revision;
          lastPhase = manifest.phase;
          deadline = Math.min(hardCeiling, Date.now() + (IS_CI ? 10_000 : 5_000));
        }
      } catch {
        // Read or parse collision
      }
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  let manifest: { phase?: string; owner?: unknown; actions?: Record<string, { status?: string; error?: string }> } | null = null;
  try {
    if (existsSync(manifestPath)) {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    }
  } catch {
    manifest = null;
  }
  const callback = manifest?.actions?.callback;
  throw new Error(`detached SessionEnd worker did not complete its callback: phase=${manifest?.phase ?? 'missing'} owner=${manifest?.owner === null ? 'none' : typeof manifest?.owner} callback=${callback?.status ?? 'missing'} error=${callback?.error ?? 'none'} file=${existsSync(callbackPath)}`);
}

describe('SessionEnd run.cjs process exit regressions (#3477)', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const directory of tempDirs.splice(0)) {
      rmSync(directory, { recursive: true, force: true, maxRetries: 40, retryDelay: 25 });
    }
    vi.unstubAllEnvs();
  });

  function createProject(): string {
    const cwd = mkdtempSync(join(homedir(), 'omq-session-end-process-exit-'));
    tempDirs.push(cwd);
    vi.stubEnv('HOME', cwd);
    vi.stubEnv('USERPROFILE', cwd);
    vi.stubEnv('OMQ_STATE_DIR', '');
    writeFileSync(join(cwd, 'transcript.jsonl'), '');
    mkdirSync(getOmcRoot(cwd), { recursive: true });
    return cwd;
  }

  it.each(SESSION_END_SCRIPTS)('%s exits with no bytes and an open stdin pipe', async (_name, script) => {
    const result = await runUntilClose(script, createProject(), undefined);
    expectPromptExit(result);
  });

  it.skipIf(!HAS_GENERATED_DIST).each(SESSION_END_SCRIPTS)('%s terminates a live manifest-lock contender within the foreground ceiling', async (_name, script) => {
    const cwd = createProject();
    const sessionId = `live-manifest-lock-${_name}`;
    const jobsDir = join(cwd, '.omq', 'state', 'session-end-jobs');
    mkdirSync(jobsDir, { recursive: true });
    writeFileSync(join(jobsDir, `${sessionId}.json.lock`), JSON.stringify({
      pid: process.pid, processStartIdentity: null, nonce: 'live-owner', createdAt: new Date().toISOString(),
    }));
    expectPromptExit(await runUntilClose(script, cwd, validSessionEndInput(cwd, sessionId)));
  });

  it.skipIf(!HAS_GENERATED_DIST).each(SESSION_END_SCRIPTS)('%s exits after promptly closed valid SessionEnd JSON with configured adapters', async (_name, script) => {
    const cwd = createProject();
    configureDeferredAdapters(cwd);
    const sessionId = `configured-${_name}`;

    const result = await runUntilClose(script, cwd, validSessionEndInput(cwd, sessionId));
    expectPromptExit(result);

    if (_name === 'session-end') {
      const manifestPath = join(getOmcRoot(cwd), 'state', 'session-end-jobs', `${sessionId}.json`);
      const deadline = Date.now() + (IS_CI ? 1_000 : 250);
      while (!existsSync(manifestPath) && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(existsSync(manifestPath)).toBe(true);
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as { actions: Record<string, { phase: string }> };
      expect(manifest.actions.callback.phase).toBe('deferred-best-effort');
      expect(manifest.actions.notification.phase).toBe('deferred-best-effort');
    }
  });

  it.skipIf(!HAS_GENERATED_DIST)('keeps the detached worker alive through producer grace and exits terminally without SessionStart', async () => {
    const cwd = createProject();
    const sessionId = 'detached-worker-producer-grace';
    configureDeferredAdapters(cwd);

    expectPromptExit(await runUntilClose(
      join(REPO_ROOT, 'scripts', 'session-end.mjs'),
      cwd,
      validSessionEndInput(cwd, sessionId),
      COMMAND_CEILING_MS,
      {
        NODE_ENV: 'test',
        // The runner (scripts/run.cjs) reads the OMQ_ spelling; with the win32
        // 900ms ceiling the ancestor's max(450, ceiling-50)=850 budget plus
        // ~200ms startup would overrun the ceiling by arithmetic, so the local
        // bound stays the fixed 450ms test budget (startup fits inside 900ms).
        OMQ_SESSION_END_TEST_FOREGROUND_TIMEOUT_MS: String(IS_CI ? COMMAND_CEILING_MS - 50 : 450),
        OMQ_SESSION_END_TEST_PRODUCER_GRACE_MS: TEST_PRODUCER_GRACE_MS,
      },
    ));

    await waitForTerminalCallback(cwd, sessionId);
  });

  it.skipIf(!HAS_GENERATED_DIST)('uses the generated dist closure: the shipped worker imports and can execute', async () => {
    const distWorker = join(REPO_ROOT, 'dist', 'hooks', 'session-end', 'worker.js');
    const distManifest = join(REPO_ROOT, 'dist', 'hooks', 'session-end', 'cleanup-manifest.js');
    expect(readFileSync(distWorker, 'utf8')).toContain("getProcessStartIdentity");

    const { prepareCoreManifest, sealCoreManifest, sealWikiManifest, mutateSessionEndJob, readSessionEndJob } =
      await import(pathToFileURL(distManifest).href) as typeof import('../hooks/session-end/cleanup-manifest.js');
    const { processSessionEndWorker } = await import(pathToFileURL(distWorker).href) as typeof import('../hooks/session-end/worker.js');
    const cwd = createProject();
    const sessionId = 'dist-worker-executes';
    expect(prepareCoreManifest(cwd, sessionId, {})).not.toBeNull();
    expect(sealCoreManifest(cwd, sessionId)).not.toBeNull();
    expect(sealWikiManifest(cwd, sessionId)).not.toBeNull();
    let manifest = readSessionEndJob(cwd, sessionId)!;
    for (const name of Object.keys(manifest.actions)) {
      manifest = mutateSessionEndJob(cwd, sessionId, manifest.revision, (job) => {
        const action = job.actions[name as keyof typeof job.actions];
        action.status = 'completed';
        action.runner = { attempt: 1, runnerNonce: `${name}-terminal`, phase: 'terminal', deadlineAt: new Date().toISOString() };
      })!;
    }

    await processSessionEndWorker({ directory: cwd, sessionId });
    expect(readSessionEndJob(cwd, sessionId)).toMatchObject({ phase: 'complete', owner: null });
  });

  it.skipIf(!HAS_GENERATED_DIST)('keeps configured callbacks, proxies, and custom CA out of the foreground process', async () => {
    const cwd = createProject();
    configureDeferredAdapters(cwd);
    const caPath = join(cwd, 'test-ca.pem');
    writeFileSync(caPath, 'not a certificate');

    const result = await runUntilClose(
      join(REPO_ROOT, 'scripts', 'session-end.mjs'),
      cwd,
      validSessionEndInput(cwd, 'configured-network-routing'),
      COMMAND_CEILING_MS,
      {
        HTTPS_PROXY: 'http://127.0.0.1:9',
        HTTP_PROXY: 'http://127.0.0.1:9',
        NODE_EXTRA_CA_CERTS: caPath,
      },
    );
    expectPromptExit(result);
    const manifestPath = join(getOmcRoot(cwd), 'state', 'session-end-jobs', 'configured-network-routing.json');
    const publicationDeadline = Date.now() + 2_000;
    while (!existsSync(manifestPath) && Date.now() < publicationDeadline) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { actions: Record<string, { phase: string }> };
    expect(manifest.actions.callback.phase).toBe('deferred-best-effort');
    expect(manifest.actions.notification.phase).toBe('deferred-best-effort');
  });

  it.skipIf(!HAS_GENERATED_DIST)('wiki-session-end exits without waiting for a live wiki lock', async () => {
    const cwd = createProject();
    configureDeferredAdapters(cwd);
    const wikiDir = join(getOmcRoot(cwd), 'wiki');
    mkdirSync(wikiDir, { recursive: true });
    writeFileSync(join(getOmcRoot(cwd), '.omc-config.json'), JSON.stringify({ wiki: { autoCapture: true } }));
    writeFileSync(join(wikiDir, '.wiki-lock.lock'), JSON.stringify({ pid: process.pid, timestamp: Date.now() }));

    const result = await runUntilClose(
      join(REPO_ROOT, 'scripts', 'wiki-session-end.mjs'),
      cwd,
      validSessionEndInput(cwd, 'wiki-live-lock'),
    );
    expectPromptExit(result);
  });

  it.skipIf(!HAS_GENERATED_DIST)('runs the SessionEnd pair sequentially within the combined foreground budget', async () => {
    const cwd = createProject();
    configureDeferredAdapters(cwd);
    const startedAt = Date.now();

    for (const [name, script] of SESSION_END_SCRIPTS) {
      expectPromptExit(await runUntilClose(script, cwd, validSessionEndInput(cwd, `sequential-${name}`)));
    }

    expect(Date.now() - startedAt).toBeLessThanOrEqual(SEQUENTIAL_CEILING_MS);
  });
});
