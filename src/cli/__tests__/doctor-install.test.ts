import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('node:child_process', () => ({ execSync: vi.fn(() => '/fake/npm/root\n') }));

import { probeModule, collectInstallReport, doctorInstallCommand } from '../commands/doctor-install.js';

function makeModuleRoot(available: string[]): string {
  const root = mkdtempSync(join(tmpdir(), 'omq-doctor-install-'));
  for (const name of available) {
    const dir = join(root, 'node_modules', ...name.split('/'));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version: '1.0.0', main: 'index.js' }));
    writeFileSync(join(dir, 'index.js'), `module.exports = { name: ${JSON.stringify(name)} };`);
  }
  return root;
}

describe('omq doctor install', () => {
  let root: string | undefined;

  beforeEach(() => {
  });

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('distinguishes a loadable module from an absent one', () => {
    root = makeModuleRoot(['ajv']);
    expect(probeModule(root, 'ajv')).toMatchObject({ name: 'ajv', status: 'ok' });

    const missing = probeModule(root, '@ast-grep/napi');
    expect(missing.status).toBe('missing');
    // The point of reporting it: the caller needs to know what stops working.
    expect(missing.degraded).toContain('ast_grep_search');
  });

  it('reports an incomplete payload and a non-ok verdict for a bare install', async () => {
    root = makeModuleRoot([]);
    const report = collectInstallReport(root);

    expect(report.root).toBe(root);
    expect(report.rootSource).toBe('flag-or-env');
    expect(report.payload.valid).toBe(false);
    expect(report.payload.errors.length).toBeGreaterThan(0);
    expect(report.modules.filter(m => m.status === 'missing').length).toBe(4);
    expect(report.npmRootGlobal).toBe('/fake/npm/root');
    expect(report.nodePathIncludesNpmRoot).toBe(false);

    const logged: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args) => { logged.push(args.join(' ')); });
    const exitCode = await doctorInstallCommand({ pluginDir: root });
    spy.mockRestore();

    expect(exitCode).toBe(1);
    expect(logged.join('\n')).toContain('install check: FAILED');
  });

  it('passes --json through to a parseable report', async () => {
    root = makeModuleRoot(['ajv', 'ajv-formats']);
    const logged: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args) => { logged.push(args.join(' ')); });
    const exitCode = await doctorInstallCommand({ pluginDir: root, json: true });
    spy.mockRestore();

    const parsed = JSON.parse(logged.join('\n'));
    expect(parsed.modules.map((m: { name: string }) => m.name)).toEqual(
      expect.arrayContaining(['ajv', 'ajv-formats']),
    );
    // The required externals load, so the only remaining failure is the incomplete
    // payload: that is the difference between "broken" and "degraded".
    expect(parsed.modules.filter((m: { status: string }) => m.status !== 'ok').map((m: { name: string }) => m.name)).
      toEqual(['@ast-grep/napi', 'better-sqlite3']);
    expect(parsed.payload.valid).toBe(false);
    expect(parsed.ok).toBe(false);
    expect(exitCode).toBe(1);
  });
});
