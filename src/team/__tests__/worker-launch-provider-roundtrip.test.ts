import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  loadWorkerLaunchAttempt,
  prepareWorkerLaunchAttempt,
} from '../worker-launch-ack.js';
import type { CliAgentType } from '../model-contract.js';

// The annotation (not a cast) is exhaustiveness-checked, so a provider added to
// the union without a matching launch-ack path fails to compile instead of being
// silently unrepresentable at runtime.
const PROVIDERS: Record<CliAgentType, true> = {
  claude: true,
  qwen: true,
  codex: true,
  gemini: true,
  cursor: true,
  grok: true,
  antigravity: true,
};
const ALL_PROVIDERS = Object.keys(PROVIDERS) as CliAgentType[];

// The adopted launch-ack contract binds every attempt to the owning team
// instance; the roundtrip pins one fixed valid instance id for all providers.
const FIXED_INSTANCE_ID = '77777777-7777-4777-8777-777777777777';

describe('worker launch attempt provider coverage', () => {
  let cwd = '';

  afterEach(async () => {
    if (cwd) await rm(cwd, { recursive: true, force: true });
    cwd = '';
  });

  it.each(ALL_PROVIDERS)('reads back the launch attempt it wrote for the %s provider', async (provider) => {
    cwd = await mkdtemp(join(tmpdir(), `worker-launch-${provider}-`));

    const prepared = await prepareWorkerLaunchAttempt({
      cwd,
      teamName: 'rt-team',
      workerName: 'worker-1',
      instanceId: FIXED_INSTANCE_ID,
      paneId: '%7',
      provider,
      runtimeCliPath: '/runtime-cli.cjs',
    });

    const loaded = await loadWorkerLaunchAttempt({
      cwd,
      teamName: 'rt-team',
      workerName: 'worker-1',
      instanceId: FIXED_INSTANCE_ID,
      paneId: '%7',
      provider,
      attemptId: prepared.attempt_id,
      runtimeCliPath: '/runtime-cli.cjs',
    });

    expect(loaded).toMatchObject({ attempt_id: prepared.attempt_id, provider });
  });
});
