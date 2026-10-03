import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const NODE = process.execPath;
const REPO_ROOT = resolve(join(__dirname, '..', '..'));
const SCRIPT_PATH = join(REPO_ROOT, 'scripts', 'post-tool-rules-injector.mjs');

function runHook(input: Record<string, unknown>, extraEnv?: Record<string, string>) {
  const raw = execFileSync(NODE, [SCRIPT_PATH], {
    input: JSON.stringify(input),
    encoding: 'utf-8',
    env: {
      ...process.env,
      CLAUDE_PLUGIN_ROOT: REPO_ROOT,
      NODE_ENV: 'test',
      ...extraEnv,
    },
    timeout: 15000,
  }).trim();

  return JSON.parse(raw) as {
    continue: boolean;
    suppressOutput?: boolean;
    hookSpecificOutput?: { hookEventName?: string; additionalContext?: string };
  };
}

describe('post-tool-rules-injector.mjs skip guards (DISABLE_OMQ / OMQ_SKIP_HOOKS)', () => {
  // A payload with a file_path drives the hook into its rules-processing path, so a
  // hook that ignores the kill switch would NOT emit the bare `{ continue: true }`
  // that a guarded short-circuit produces.
  const INPUT = {
    tool_name: 'Read',
    tool_input: { file_path: 'README.md' },
    session_id: 'abc',
  };

  function expectSkipped(extraEnv: Record<string, string>) {
    // Guarded hooks short-circuit before any processing with a bare continue.
    expect(runHook(INPUT, extraEnv)).toEqual({ continue: true });
  }

  it('no-ops when DISABLE_OMQ=1', () => {
    expectSkipped({ DISABLE_OMQ: '1', OMQ_SKIP_HOOKS: '' });
  });

  it('no-ops when DISABLE_OMQ=true', () => {
    expectSkipped({ DISABLE_OMQ: 'true', OMQ_SKIP_HOOKS: '' });
  });

  it('no-ops when OMQ_SKIP_HOOKS contains the post-tool-use event token', () => {
    expectSkipped({ DISABLE_OMQ: '', OMQ_SKIP_HOOKS: 'post-tool-use' });
  });

  it('honors whitespace and commas in OMQ_SKIP_HOOKS', () => {
    expectSkipped({ DISABLE_OMQ: '', OMQ_SKIP_HOOKS: ' keyword-detector , post-tool-use ' });
  });

  it('does not short-circuit when skip vars are empty', () => {
    // Not skipped: the hook runs its processing path, which always adds
    // suppressOutput (or injected context) rather than a bare continue.
    expect(runHook(INPUT, { DISABLE_OMQ: '', OMQ_SKIP_HOOKS: '' })).not.toEqual({ continue: true });
  });

  it('does not short-circuit for an unrelated OMQ_SKIP_HOOKS token', () => {
    expect(runHook(INPUT, { DISABLE_OMQ: '', OMQ_SKIP_HOOKS: 'keyword-detector' })).not.toEqual({
      continue: true,
    });
  });

  it('processes normally when DISABLE_OMQ=false', () => {
    expect(runHook(INPUT, { DISABLE_OMQ: 'false', OMQ_SKIP_HOOKS: '' })).not.toEqual({
      continue: true,
    });
  });
});
