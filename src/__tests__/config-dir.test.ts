import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'fs';
import { homedir, tmpdir } from 'os';
import { basename, join, normalize, sep } from 'path';
import { pathToFileURL } from 'url';
import { getQoderConfigDir, getQoderRootConfigFileName, getDefaultConfigDirShellPath, isDefaultQoderConfigDir, resolveDefaultConfigDir } from '../utils/config-dir.js'
import { isValidTranscriptPath } from '../lib/worktree-paths.js';
import { findRuleFiles } from '../hooks/rules-injector/finder.js';

const originalConfigDir = process.env.QODER_CONFIG_DIR;

describe('getQoderConfigDir', () => {
  afterEach(() => {
    if (originalConfigDir === undefined) {
      delete process.env.QODER_CONFIG_DIR;
    } else {
      process.env.QODER_CONFIG_DIR = originalConfigDir;
    }
  });

  it('falls back to ~/.qoder when QODER_CONFIG_DIR is unset', () => {
    delete process.env.QODER_CONFIG_DIR;
    // An explicit home and env keep this independent of the machine running it.
    const home = mkdtempSync(join(tmpdir(), 'omq-config-home-'));
    expect(getQoderConfigDir({}, home)).toBe(normalize(join(home, '.qoder')));
    rmSync(home, { recursive: true, force: true });
  });

  it('falls back to ~/.qoder when QODER_CONFIG_DIR is empty', () => {
    process.env.QODER_CONFIG_DIR = '   ';
    const home = mkdtempSync(join(tmpdir(), 'omq-config-home-'));
    expect(getQoderConfigDir({ QODER_CONFIG_DIR: '   ' }, home)).toBe(normalize(join(home, '.qoder')));
    rmSync(home, { recursive: true, force: true });
  });

  it('resolves the Qoder CN root when the CN config dir holds CLI state', () => {
    const home = mkdtempSync(join(tmpdir(), 'omq-config-home-'));
    mkdirSync(join(home, '.qoder-cn'), { recursive: true });
    writeFileSync(join(home, '.qoder-cn', 'settings.json'), '{}');
    // A shared ~/.qoder (browser connector, hooks) must not win over CN state.
    mkdirSync(join(home, '.qoder', 'browser-connector'), { recursive: true });

    expect(getQoderConfigDir({}, home)).toBe(normalize(join(home, '.qoder-cn')));
    expect(resolveDefaultConfigDir(home)).toBe(normalize(join(home, '.qoder-cn')));
    rmSync(home, { recursive: true, force: true });
  });

  it('honours QODERCN_CONFIG_DIR when QODER_CONFIG_DIR is absent', () => {
    const home = mkdtempSync(join(tmpdir(), 'omq-config-home-'));
    expect(getQoderConfigDir({ QODERCN_CONFIG_DIR: join(home, 'cn-config') }, home))
      .toBe(normalize(join(home, 'cn-config')));
    rmSync(home, { recursive: true, force: true });
  });

  it('keeps $HOME unexpanded in shell defaults but swaps the directory name', () => {
    const home = mkdtempSync(join(tmpdir(), 'omq-config-home-'));
    mkdirSync(join(home, '.qoder-cn'), { recursive: true });
    writeFileSync(join(home, '.qoder-cn', 'settings.json'), '{}');
    try {
      // Generated hook/statusline commands are persisted, so they must not bake
      // in this machine's home directory.
      expect(getDefaultConfigDirShellPath(home)).toBe('$HOME/.qoder-cn');
      expect(isDefaultQoderConfigDir(join(home, '.qoder-cn'), home)).toBe(true);
      expect(isDefaultQoderConfigDir(`${join(home, '.qoder-cn')}${sep}`, home)).toBe(true);
      expect(isDefaultQoderConfigDir(join(home, '.qoder'), home)).toBe(false);

      rmSync(join(home, '.qoder-cn'), { recursive: true, force: true });
      expect(getDefaultConfigDirShellPath(home)).toBe('$HOME/.qoder');
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('names the root config JSON after the distribution', () => {
    const home = mkdtempSync(join(tmpdir(), 'omq-config-home-'));
    expect(getQoderRootConfigFileName(join(home, '.qoder-cn'))).toBe('.qoder-cn.json');
    expect(getQoderRootConfigFileName(join(home, '.qoder'))).toBe('.qoder.json');
    expect(getQoderRootConfigFileName(join(home, 'custom-config-dir'))).toBe('.qoder.json');
    rmSync(home, { recursive: true, force: true });
  });

  it('returns an absolute custom path unchanged aside from normalization', () => {
    process.env.QODER_CONFIG_DIR = join(tmpdir(), 'custom-claude-config', '..', 'custom-claude-config');
    expect(getQoderConfigDir()).toBe(normalize(join(tmpdir(), 'custom-claude-config', '..', 'custom-claude-config')));
  });

  it('expands a bare tilde to the home directory', () => {
    process.env.QODER_CONFIG_DIR = '~';
    expect(getQoderConfigDir()).toBe(normalize(homedir()));
  });

  it('expands a ~-prefixed config path', () => {
    process.env.QODER_CONFIG_DIR = '~/.qwen-alt';
    expect(getQoderConfigDir()).toBe(normalize(join(homedir(), '.qwen-alt')));
  });

  it('strips a trailing separator from custom paths', () => {
    process.env.QODER_CONFIG_DIR = join(tmpdir(), 'custom-claude-config') + '/';
    expect(getQoderConfigDir()).toBe(normalize(join(tmpdir(), 'custom-claude-config')));
    expect(getQoderConfigDir().endsWith('/')).toBe(false);
  });

  it('preserves a Windows drive root when trimming separators', async () => {
    process.env.QODER_CONFIG_DIR = 'C:\\';

    vi.resetModules();
    vi.doMock('node:os', () => ({
      homedir: () => 'C:\\Users\\tester',
    }));
    vi.doMock('node:path', async () => import('node:path/win32'));

    try {
      const { getQoderConfigDir: getWindowsConfigDir } = await import('../utils/config-dir.js');
      expect(getWindowsConfigDir()).toBe('C:\\');
    } finally {
      vi.doUnmock('node:os');
      vi.doUnmock('node:path');
      vi.resetModules();
    }
  });

  it('keeps every config-dir mirror on the same precedence and inference rules', () => {
    // The TypeScript helper and the three script mirrors are maintained by hand
    // in parallel, so each scenario must agree across all four implementations.
    const scenarios = [
      { name: 'QODER_CONFIG_DIR wins over QODERCN_CONFIG_DIR', qoder: 'primary', qodercn: 'fallback', expect: 'primary' },
      { name: 'QODERCN_CONFIG_DIR applies when QODER_CONFIG_DIR is absent', qoder: undefined, qodercn: 'fallback', expect: 'fallback' },
      { name: 'a CN state dir is inferred when nothing is configured', qoder: undefined, qodercn: undefined, expect: '.qoder-cn' },
      { name: 'an empty home falls back to the international root', qoder: undefined, qodercn: undefined, expect: '.qoder', intlHome: true },
    ] as const;

    for (const scenario of scenarios) {
      const home = mkdtempSync(join(tmpdir(), 'omq-mirror-home-'));
      if (scenario.expect === '.qoder-cn') {
        mkdirSync(join(home, '.qoder-cn'), { recursive: true });
        writeFileSync(join(home, '.qoder-cn', 'settings.json'), '{}');
      }
      const env: Record<string, string> = { HOME: home, USERPROFILE: home };
      if (scenario.qoder) env.QODER_CONFIG_DIR = join(home, scenario.qoder);
      if (scenario.qodercn) env.QODERCN_CONFIG_DIR = join(home, scenario.qodercn);
      const expected = join(home, scenario.expect.replace(/^\./, '.'));

      try {
        expect(getQoderConfigDir(env, home), scenario.name).toBe(normalize(expected));

        for (const [label, snippet] of [
          ['mjs', `import(${JSON.stringify(pathToFileURL(join(process.cwd(), 'scripts/lib/config-dir.mjs')).href)}).then(m=>process.stdout.write(m.getQoderConfigDir()))`],
          ['cjs', `process.stdout.write(require(${JSON.stringify(join(process.cwd(), 'scripts/lib/config-dir.cjs'))}).getQoderConfigDir())`],
        ] as const) {
          const out = execFileSync(process.execPath, ['-e', snippet], { env, encoding: 'utf-8' });
          expect(normalize(out.trim()), `${scenario.name} (${label})`).toBe(normalize(expected));
        }

        // The shell mirror is only compared where no path has to be echoed back
        // in it: Git Bash rewrites Windows-style $HOME, so passing an absolute
        // path in and comparing representations is meaningless here. The two
        // inference cases are exactly where the CN fix lives.
        if (!scenario.qoder && !scenario.qodercn) {
          const shOut = execFileSync('bash', ['-lc', [
            `. ${JSON.stringify(join(process.cwd(), 'scripts/lib/config-dir.sh'))}`,
            'resolve_claude_config_dir',
            'printf "%s\\n" "$HOME/.expected"',
          ].join('; ')], { env, encoding: 'utf-8' }).trim().split(/\r?\n/);
          const expectedFromShell = shOut[1].replace(/\/?\.expected$/, `/${scenario.expect}`);
          expect(shOut[0], `${scenario.name} (sh)`).toBe(expectedFromShell);
        }
      } finally {
        rmSync(home, { recursive: true, force: true });
      }
    }
  });

  it('keeps the script helper aligned with the TypeScript helper', async () => {
    process.env.QODER_CONFIG_DIR = '~/.qwen-alt';
    const output = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "import { getQoderConfigDir } from './scripts/lib/config-dir.mjs'; process.stdout.write(getQoderConfigDir());",
      ],
      {
        cwd: process.cwd(),
        env: process.env,
        encoding: 'utf-8',
      },
    );
    expect(output).toBe(normalize(join(homedir(), '.qwen-alt')));
  });

  it('find-node.sh resolves a ~-prefixed QODER_CONFIG_DIR before reading .omq-config.json', () => {
    const homeDir = mkdtempSync(join(tmpdir(), 'omq-find-node-home-'));
    const configDir = join(homeDir, '.qwen-alt');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(join(configDir, '.omq-config.json'), JSON.stringify({ nodeBinary: process.execPath }));

    const output = execFileSync(
      '/bin/sh',
      [join(process.cwd(), 'scripts', 'find-node.sh'), '-e', "process.stdout.write('ok')"],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          HOME: homeDir,
          PATH: '/bin:/usr/bin',
          QODER_CONFIG_DIR: '~/.qwen-alt',
        },
        encoding: 'utf-8',
      },
    );

    expect(output).toBe('ok');
  });

  it('shared shell helper expands a ~-prefixed QODER_CONFIG_DIR', () => {
    const homeDir = mkdtempSync(join(tmpdir(), 'omq-uninstall-home-'));
    const output = execFileSync('bash', ['-lc', `. "${join(process.cwd(), 'scripts', 'lib', 'config-dir.sh')}"; resolve_claude_config_dir`], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        HOME: homeDir,
        QODER_CONFIG_DIR: '~/.qwen-alt',
      },
      encoding: 'utf-8',
    });

    expect(output.trim()).toBe(join(homeDir, '.qwen-alt'));
  });

  it('keeps the CJS helper aligned with the TypeScript helper', () => {
    process.env.QODER_CONFIG_DIR = '~/.qwen-alt';
    const cjsPath = join(process.cwd(), 'scripts', 'lib', 'config-dir.cjs');
    const output = execFileSync(
      process.execPath,
      ['-e', `const { getQoderConfigDir } = require(${JSON.stringify(cjsPath)}); process.stdout.write(getQoderConfigDir());`],
      {
        cwd: process.cwd(),
        env: process.env,
        encoding: 'utf-8',
      },
    );
    expect(output).toBe(normalize(join(homedir(), '.qwen-alt')));
  });
});

describe('QODER_CONFIG_DIR downstream integration', () => {
  let origConfigDir: string | undefined;
  let tempDir: string;
  let tildeConfigDir: string;

  beforeEach(() => {
    origConfigDir = process.env.QODER_CONFIG_DIR;
    tempDir = join(tmpdir(), `omq-test-configdir-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    tildeConfigDir = join(homedir(), `.omq-test-configdir-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (origConfigDir === undefined) {
      delete process.env.QODER_CONFIG_DIR;
    } else {
      process.env.QODER_CONFIG_DIR = origConfigDir;
    }
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
    try {
      rmSync(tildeConfigDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it('accepts transcript paths under custom QODER_CONFIG_DIR', () => {
    process.env.QODER_CONFIG_DIR = '/opt/custom-claude-config';
    const transcriptPath = '/opt/custom-claude-config/projects/-foo/bar/session.jsonl';
    expect(isValidTranscriptPath(transcriptPath)).toBe(true);
  });

  it('accepts transcript paths when QODER_CONFIG_DIR uses a ~-prefixed path', () => {
    process.env.QODER_CONFIG_DIR = `~/${basename(tildeConfigDir)}`;
    const transcriptPath = join(tildeConfigDir, 'projects', '-foo', 'bar', 'session.jsonl');
    expect(isValidTranscriptPath(transcriptPath)).toBe(true);
  });

  it('discovers user rules from custom QODER_CONFIG_DIR/rules', () => {
    const customRulesDir = join(tempDir, 'rules');
    mkdirSync(customRulesDir, { recursive: true });
    writeFileSync(join(customRulesDir, 'my-rule.md'), '# My Rule\nRule content');

    process.env.QODER_CONFIG_DIR = tempDir;

    const candidates = findRuleFiles(null, '/some/file.ts');
    const globalRules = candidates.filter(c => c.isGlobal);

    expect(globalRules.length).toBeGreaterThanOrEqual(1);
    expect(globalRules.some(c => c.path.includes('my-rule.md'))).toBe(true);
  });

  it('uses the active config dir rather than default ~/.qoder/rules for user rules', () => {
    const customRulesDir = join(tempDir, 'rules');
    mkdirSync(customRulesDir, { recursive: true });
    writeFileSync(join(customRulesDir, 'custom-rule.md'), '# Custom Rule');

    process.env.QODER_CONFIG_DIR = tempDir;

    const candidates = findRuleFiles(null, '/some/file.ts');
    const globalRules = candidates.filter(c => c.isGlobal);

    expect(globalRules.some(c => c.path.includes('custom-rule.md'))).toBe(true);
  });

  it('discovers user rules when QODER_CONFIG_DIR uses a ~-prefixed path', () => {
    const customRulesDir = join(tildeConfigDir, 'rules');
    mkdirSync(customRulesDir, { recursive: true });
    writeFileSync(join(customRulesDir, 'tilde-rule.md'), '# Tilde Rule');

    process.env.QODER_CONFIG_DIR = `~/${basename(tildeConfigDir)}`;

    const candidates = findRuleFiles(null, '/some/file.ts');
    const globalRules = candidates.filter(c => c.isGlobal);

    expect(globalRules.some(c => c.path.includes('tilde-rule.md'))).toBe(true);
  });
});
