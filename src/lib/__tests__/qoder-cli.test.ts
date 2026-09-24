import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

vi.mock('node:child_process', () => ({ spawnSync: vi.fn() }));

// The resolver falls back to the distribution implied by the config root, so
// pin it instead of inheriting whatever this machine has installed.
vi.mock('../../utils/config-dir.js', () => ({
  QODER_CN_CONFIG_DIR_NAME: '.qoder-cn',
  getInferredConfigDir: () => (globalThis as any).__omqDefaultConfigRoot ?? join('/home/u', '.qoder'),
}));

const mockSpawnSync = vi.mocked(spawnSync);

function binariesProbed(): string[] {
  return mockSpawnSync.mock.calls.map(call => String((call as unknown as [string, string[]])[1][0]));
}

describe('qoder-cli flavor resolution', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    mockSpawnSync.mockReset();
    mockSpawnSync.mockImplementation(() => ({ status: 1 }) as never);
    delete process.env.OMQ_QODER_CLI;
    delete process.env.OMQ_QODER_CLI_NPM_PACKAGE;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  async function load() {
    return import('../qoder-cli.js');
  }

  it('prefers the CN executable when both are on PATH', async () => {
    mockSpawnSync.mockImplementation(() => ({ status: 0 }) as never);
    const { qoderCliBinary, qoderCliNpmPackage } = await load();

    expect(qoderCliBinary()).toBe('qoderclicn');
    expect(qoderCliNpmPackage()).toBe('@qodercn-ai/qoderclicn');
  });

  it('falls back to the international flavor when neither is installed', async () => {
    const { qoderCliBinary, qoderCliNpmPackage } = await load();

    expect(qoderCliBinary()).toBe('qodercli');
    expect(qoderCliNpmPackage()).toBe('@qoder-ai/qodercli');
    expect(binariesProbed()).toEqual(['qoderclicn', 'qodercli']);
  });

  it('falls back to the CN flavor when a CN config root exists but the CLI is off PATH', async () => {
    (globalThis as any).__omqDefaultConfigRoot = join('/home/u', '.qoder-cn');
    try {
      const { qoderCliBinary, qoderCliNpmPackage } = await load();

      expect(qoderCliBinary()).toBe('qoderclicn');
      expect(qoderCliNpmPackage()).toBe('@qodercn-ai/qoderclicn');
    } finally {
      delete (globalThis as any).__omqDefaultConfigRoot;
    }
  });

  it('uses the international flavor when only it is on PATH', async () => {
    mockSpawnSync.mockImplementation((_cmd: string, args?: readonly string[]) => ({
      status: args?.[0] === 'qodercli' ? 0 : 1,
    }) as never);
    const { qoderCliBinary } = await load();

    expect(qoderCliBinary()).toBe('qodercli');
  });

  it('honours OMQ_QODER_CLI and pairs it with the known npm package', async () => {
    process.env.OMQ_QODER_CLI = 'qodercli';
    const { qoderCliBinary, qoderCliNpmPackage } = await load();

    expect(qoderCliBinary()).toBe('qodercli');
    expect(qoderCliNpmPackage()).toBe('@qoder-ai/qodercli');
    expect(mockSpawnSync).not.toHaveBeenCalled();
  });

  it('accepts an unrecognised binary only with an explicit npm package', async () => {
    process.env.OMQ_QODER_CLI = 'qoder-cli-custom';
    process.env.OMQ_QODER_CLI_NPM_PACKAGE = '@acme/qoder-cli';
    const { qoderCliBinary, qoderCliNpmPackage } = await load();

    expect(qoderCliBinary()).toBe('qoder-cli-custom');
    expect(qoderCliNpmPackage()).toBe('@acme/qoder-cli');
  });

  it('rejects shell metacharacters in the override instead of interpolating them', async () => {
    process.env.OMQ_QODER_CLI = 'qodercli && curl evil.example';
    const { qoderCliBinary } = await load();

    expect(() => qoderCliBinary()).toThrow(/Invalid OMQ_QODER_CLI binary name/);
  });

  it('caches the probe until the cache is cleared', async () => {
    const { qoderCliBinary, clearQoderCliCache } = await load();
    mockSpawnSync.mockClear();

    qoderCliBinary();
    qoderCliBinary();
    expect(mockSpawnSync).toHaveBeenCalledTimes(2);

    clearQoderCliCache();
    qoderCliBinary();
    expect(mockSpawnSync).toHaveBeenCalledTimes(4);
  });
});
