import { describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'child_process';
import { detectCli, detectAllClis } from '../cli-detection.js';
import { clearQoderCliCache } from '../../lib/qoder-cli.js';

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    spawnSync: vi.fn(actual.spawnSync),
  };
});

function setProcessPlatform(platform: NodeJS.Platform): () => void {
  const originalPlatform = process.platform;
  Object.defineProperty(process, 'platform', { value: platform, configurable: true });
  return () => {
    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
  };
}

describe('cli-detection', () => {
  it('uses shell:true for Windows provider version probes', () => {
    const mockSpawnSync = vi.mocked(spawnSync);
    const restorePlatform = setProcessPlatform('win32');

    mockSpawnSync
      .mockReturnValueOnce({ status: 0, stdout: 'codex 1.0.0', stderr: '', pid: 0, output: [], signal: null } as any)
      .mockReturnValueOnce({ status: 0, stdout: 'C:\\Tools\\codex.cmd', stderr: '', pid: 0, output: [], signal: null } as any);

    expect(detectCli('codex')).toEqual({
      available: true,
      version: 'codex 1.0.0',
      path: 'C:\\Tools\\codex.cmd',
    });

    expect(mockSpawnSync).toHaveBeenNthCalledWith(1, 'codex', ['--version'], { timeout: 5000, shell: true });
    expect(mockSpawnSync).toHaveBeenNthCalledWith(2, 'where', ['codex'], { timeout: 5000 });
    restorePlatform();
    mockSpawnSync.mockRestore();
  });
});

describe('detectAllClis', () => {
  // Qoder CN ships `qoderclicn`; the international CLI ships `qodercli`. The
  // probe used to hardcode the latter, which made every CN worker look like it
  // had no CLI installed. Pinning the override and asserting the probed name is
  // the only way this suite can tell the two builds apart.
  it('probes the binary the installed distribution ships', () => {
    const original = process.env.OMQ_QODER_CLI;
    process.env.OMQ_QODER_CLI = 'qoderclicn';
    clearQoderCliCache();

    const mockSpawnSync = vi.mocked(spawnSync);
    mockSpawnSync.mockReturnValue(
      { status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as any,
    );

    const detected = detectAllClis();

    expect(Object.keys(detected)).toContain('claude');
    const probed = mockSpawnSync.mock.calls.map((call) => call[0]);
    expect(probed).toContain('qoderclicn');
    expect(probed).not.toContain('qodercli');

    mockSpawnSync.mockRestore();
    if (original === undefined) delete process.env.OMQ_QODER_CLI;
    else process.env.OMQ_QODER_CLI = original;
    clearQoderCliCache();
  });
});
