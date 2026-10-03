import { describe, it, expect } from 'vitest';
import { isExplicitCancelCommand, type StopContext } from '../index.js';

// The slash-cancel matcher accepts all four family prefixes: this fork's own
// `oh-my-qoder:` / `omq:` spellings plus the ancestor `oh-my-claudecode:` /
// `omc:` forms still pasted from older sessions (family convention: accept all
// four inbound, never emit ancestor spellings).
describe('isExplicitCancelCommand — four-prefix union', () => {
  const accepted = [
    '/cancel',
    '/cancel --force',
    '/omq:cancel',
    '/omq:cancel --force',
    '/oh-my-qoder:cancel',
    '/oh-my-qoder:cancel --force',
    '/omc:cancel',
    '/oh-my-claudecode:cancel --force',
  ];

  for (const prompt of accepted) {
    it(`accepts "${prompt}"`, () => {
      expect(isExplicitCancelCommand({ prompt } as StopContext)).toBe(true);
    });
  }

  // Negative controls: the relaxation must not degrade into "match anything".
  const rejected = [
    '/cancelx',
    '/omq:cancelx',
    '/omq:cancelful',
    'please run /omq:cancel',
    '/omq:cancel extra args',
    '/omq:cancel --force now',
    '/other:cancel',
    '/ralph continue working',
  ];

  for (const prompt of rejected) {
    it(`rejects "${prompt}"`, () => {
      expect(isExplicitCancelCommand({ prompt } as StopContext)).toBe(false);
    });
  }

  it('returns false without a prompt', () => {
    expect(isExplicitCancelCommand({} as StopContext)).toBe(false);
  });
});
