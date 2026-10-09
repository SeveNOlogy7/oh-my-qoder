import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT_PATH = join(process.cwd(), 'scripts', 'project-memory-posttool.mjs');
const tempDirs: string[] = [];
const SKIP_ENVIRONMENTS: Record<string, string>[] = [
  { DISABLE_OMQ: '1' },
  { DISABLE_OMQ: 'true' },
  { OMQ_SKIP_HOOKS: 'project-memory-posttool' },
  { OMQ_SKIP_HOOKS: ' keyword-detector , post-tool-use ' },
];

function runHook(env: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), 'project-memory-posttool-'));
  tempDirs.push(root);
  mkdirSync(join(root, '.git'));
  mkdirSync(join(root, '.omq'));
  mkdirSync(join(root, 'scripts', 'lib'), { recursive: true });
  const copiedScriptPath = join(root, 'scripts', 'project-memory-posttool.mjs');
  writeFileSync(copiedScriptPath, readFileSync(SCRIPT_PATH));
  writeFileSync(
    join(root, 'scripts', 'lib', 'stdin.mjs'),
    readFileSync(join(process.cwd(), 'scripts', 'lib', 'stdin.mjs')),
  );
  const memoryPath = join(root, '.omq', 'project-memory.json');
  const memory = JSON.stringify({
    version: '1.0.0',
    lastScanned: Date.now(),
    projectRoot: root,
    techStack: { languages: [], frameworks: [], packageManager: null, runtime: null },
    build: { buildCommand: null, testCommand: null, lintCommand: null, devCommand: null, scripts: {} },
    conventions: { namingStyle: null, importStyle: null, testPattern: null, fileOrganization: null },
    structure: { isMonorepo: false, workspaces: [], mainDirectories: [], gitBranches: null },
    customNotes: [],
    directoryMap: {},
    hotPaths: [],
    userDirectives: [],
  });
  writeFileSync(memoryPath, memory);
  const result = spawnSync(process.execPath, [copiedScriptPath], {
    cwd: root,
    encoding: 'utf8',
    input: JSON.stringify({
      cwd: root,
      tool_name: 'Read',
      tool_input: { file_path: join(root, 'README.md') },
      tool_response: 'ok',
    }),
    env: { ...process.env, DISABLE_OMQ: '', OMQ_SKIP_HOOKS: '', OMQ_DEBUG: '1', ...env },
  });
  expect(result.status, result.stderr).toBe(0);
  return {
    output: JSON.parse(result.stdout),
    stderr: result.stderr,
    memory: readFileSync(memoryPath, 'utf8'),
    expectedMemory: memory,
  };
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('project-memory-posttool skip guards', () => {
  it.each(SKIP_ENVIRONMENTS)('does not touch project memory when disabled by %j', (env) => {
    const result = runHook(env);
    expect(result.output).toEqual({ continue: true });
    expect(result.stderr).toBe('');
    expect(result.memory).toBe(result.expectedMemory);
  });
});
