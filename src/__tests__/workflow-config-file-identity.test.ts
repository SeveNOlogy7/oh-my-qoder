import { describe, it, expect, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error -- plain-JS hook library without type declarations; the
// existing suites spawn it, this one imports the pure path resolver directly.
import { resolveProjectWorkflowConfig } from '../../scripts/lib/workflow-profile-runtime.mjs';

// #53 (Loren 2026-10-01, dossier item 6b): the project workflow/keyword config
// file converges on `.qoder/qoder.jsonc`. The ancestor `.claude/omc.jsonc`
// spelling stays readable for ONE release as read-only compat (family
// convention: tolerate inbound ancestor text, never emit it), and when both
// exist the fork spelling wins. Nothing in the fork writes omc.jsonc.

const tempDirs: string[] = [];

function mkRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'omq-config-identity-'));
  tempDirs.push(dir);
  execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 't@example.invalid'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 't'], { cwd: dir, stdio: 'ignore' });
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()!;
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
  }
});

describe('project workflow config file identity (#53)', () => {
  it('reads only the ancestor .claude/omc.jsonc as compat when nothing else exists', () => {
    const repo = mkRepo();
    mkdirSync(join(repo, '.claude'), { recursive: true });
    writeFileSync(join(repo, '.claude', 'omc.jsonc'), '{ "autopilot": { "workflows": {} } }', 'utf-8');

    expect(resolveProjectWorkflowConfig(repo)).toBe(join(repo, '.claude', 'omc.jsonc'));
  });

  it('reads .qoder/qoder.jsonc when only it exists', () => {
    const repo = mkRepo();
    mkdirSync(join(repo, '.qoder'), { recursive: true });
    writeFileSync(join(repo, '.qoder', 'qoder.jsonc'), '{ "autopilot": { "workflows": {} } }', 'utf-8');

    expect(resolveProjectWorkflowConfig(repo)).toBe(join(repo, '.qoder', 'qoder.jsonc'));
  });

  it('prefers .qoder/qoder.jsonc when both spellings exist', () => {
    const repo = mkRepo();
    mkdirSync(join(repo, '.claude'), { recursive: true });
    mkdirSync(join(repo, '.qoder'), { recursive: true });
    writeFileSync(join(repo, '.claude', 'omc.jsonc'), '{ "autopilot": { "workflows": {} } }', 'utf-8');
    writeFileSync(join(repo, '.qoder', 'qoder.jsonc'), '{ "autopilot": { "workflows": {} } }', 'utf-8');

    expect(resolveProjectWorkflowConfig(repo)).toBe(join(repo, '.qoder', 'qoder.jsonc'));
  });

  it('defaults to the .qoder/qoder.jsonc path when neither exists (the only written shape)', () => {
    const repo = mkRepo();
    expect(resolveProjectWorkflowConfig(repo)).toBe(join(repo, '.qoder', 'qoder.jsonc'));
  });

  it('keeps the scripts and templates workflow-profile-runtime mirrors identical', () => {
    const extract = (file: string): string => {
      const source = readFileSync(file, 'utf-8');
      const match = source.match(/function pickWorkflowConfigAt[\s\S]*?^}/m);
      expect(match, `resolver block missing in ${file}`).toBeTruthy();
      return (match as RegExpMatchArray)[0];
    };

    expect(extract('scripts/lib/workflow-profile-runtime.mjs'))
      .toBe(extract('templates/hooks/lib/workflow-profile-runtime.mjs'));
  });
});

describe('keyword-detector keywordDetector.disabled config identity (#53)', () => {
  function runDetector(cwd: string, prompt: string): { hookSpecificOutput?: { additionalContext?: string } } {
    const raw = execFileSync(process.execPath, [join(process.cwd(), 'scripts', 'keyword-detector.mjs')], {
      input: JSON.stringify({
        hook_event_name: 'UserPromptSubmit',
        cwd,
        session_id: 'sess-config-identity',
        prompt,
      }),
      encoding: 'utf-8',
      env: { ...process.env, NODE_ENV: 'test', OMQ_SKIP_HOOKS: '', OMQ_STATE_DIR: undefined },
      timeout: 20000,
    }).trim();
    return JSON.parse(raw);
  }

  it('honors keywordDetector.disabled from .qoder/qoder.jsonc', () => {
    const repo = mkRepo();
    mkdirSync(join(repo, '.qoder'), { recursive: true });
    writeFileSync(join(repo, '.qoder', 'qoder.jsonc'), '{ "keywordDetector": { "disabled": ["autopilot"] } }', 'utf-8');

    const output = runDetector(repo, 'autopilot fix this');
    expect(JSON.stringify(output)).not.toContain('[MAGIC KEYWORD: AUTOPILOT]');
  });

  it('still honors the ancestor .claude/omc.jsonc spelling as compat', () => {
    const repo = mkRepo();
    mkdirSync(join(repo, '.claude'), { recursive: true });
    writeFileSync(join(repo, '.claude', 'omc.jsonc'), '{ "keywordDetector": { "disabled": ["autopilot"] } }', 'utf-8');

    const output = runDetector(repo, 'autopilot fix this');
    expect(JSON.stringify(output)).not.toContain('[MAGIC KEYWORD: AUTOPILOT]');
  });

  it('prefers .qoder/qoder.jsonc when both spellings carry different values', () => {
    const repo = mkRepo();
    mkdirSync(join(repo, '.claude'), { recursive: true });
    mkdirSync(join(repo, '.qoder'), { recursive: true });
    writeFileSync(join(repo, '.claude', 'omc.jsonc'), '{ "keywordDetector": { "disabled": ["autopilot"] } }', 'utf-8');
    writeFileSync(join(repo, '.qoder', 'qoder.jsonc'), '{ "keywordDetector": { "disabled": [] } }', 'utf-8');

    const output = runDetector(repo, 'autopilot fix this');
    // qoder.jsonc disables nothing -> autopilot fires; omc.jsonc's disable list loses.
    expect(JSON.stringify(output)).toContain('[MAGIC KEYWORD: AUTOPILOT]');
  });
});
