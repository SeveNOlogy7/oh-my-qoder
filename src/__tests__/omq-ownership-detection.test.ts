/**
 * Brand detection for OMQ-owned hooks and statuslines.
 *
 * These predicates decide what the installer is allowed to overwrite or merge, so
 * both the wrong-brand answer and the over-broad answer are bugs: false negatives
 * leave a stale second statusline configured, false positives let OMQ rewrite
 * another product's hooks.
 */
import { describe, expect, it } from 'vitest';
import { isOmqHook, isOmqStatusLine } from '../installer/index.js';

describe('isOmqHook', () => {
  it('recognises an OMQ-branded install path', () => {
    expect(isOmqHook('node /home/u/.qoder-cn/plugins/cache/omq/oh-my-qoder/0.1.0/hooks/session-start.mjs')).toBe(true);
  });

  it('still recognises the ancestor path an upgraded install keeps', () => {
    expect(isOmqHook('node /home/u/.claude/plugins/cache/omc/oh-my-claudecode/5.0.0/hooks/session-start.mjs')).toBe(true);
  });

  it('recognises a known hook filename under a hooks directory', () => {
    expect(isOmqHook('node /home/u/.qoder/hooks/keyword-detector.mjs')).toBe(true);
  });

  it('does not claim another product hooks', () => {
    expect(isOmqHook('node /home/u/.claude/hooks/somebody-else.mjs')).toBe(false);
    expect(isOmqHook('python3 /opt/tools/watch.py')).toBe(false);
  });

  it('does not match a brand substring inside a longer word', () => {
    expect(isOmqHook('node /home/u/omqbuster/hooks/somebody-else.mjs')).toBe(false);
  });
});

describe('isOmqStatusLine', () => {
  it('matches the legacy string form', () => {
    expect(isOmqStatusLine('~/.qoder/hud/omq-hud.mjs')).toBe(true);
  });

  it('matches the object form for both brands', () => {
    expect(isOmqStatusLine({ type: 'command', command: 'node /home/u/.qoder/hud/omq-hud.mjs' })).toBe(true);
    expect(isOmqStatusLine({ type: 'command', command: 'node /home/u/.claude/hud/omc-hud.mjs' })).toBe(true);
  });

  it('rejects unrelated and empty values', () => {
    expect(isOmqStatusLine(undefined)).toBe(false);
    expect(isOmqStatusLine(null)).toBe(false);
    expect(isOmqStatusLine({ type: 'command', command: 'node /usr/local/bin/other-statusline.js' })).toBe(false);
  });
});
