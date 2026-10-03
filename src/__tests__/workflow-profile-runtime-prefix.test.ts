import { describe, expect, it } from 'vitest';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '..', '..');
const MIRRORS = [
  'scripts/lib/workflow-profile-runtime.mjs',
  'templates/hooks/lib/workflow-profile-runtime.mjs',
] as const;

async function loadParse(relativePath: string) {
  const mod = await import(pathToFileURL(join(REPO_ROOT, relativePath)).href);
  return mod.parseWorkflowInvocation as (prompt: string) => { kind: string; workflowName?: string; task?: string };
}

const VALID = { kind: 'valid', workflowName: 'release-flow', task: 'ship the release' } as const;

describe.each(MIRRORS)('named workflow invocation prefixes — %s', (relativePath) => {
  // This plugin registers as oh-my-qoder, so /omq: and /oh-my-qoder: are the
  // prefixes its own commands arrive with. Asserted at the parser rather than
  // through the hook: named workflow profiles need Linux flock (#14), so a
  // harness-level case could not pass on every host this gate runs on.
  it.each([
    '/autopilot --workflow release-flow ship the release',
    '/omq:autopilot --workflow release-flow ship the release',
    '/oh-my-qoder:autopilot --workflow release-flow ship the release',
    '/omc:autopilot --workflow release-flow ship the release',
    '/oh-my-claudecode:autopilot --workflow release-flow ship the release',
  ])('recognises a named workflow invocation from %s', async (prompt) => {
    const parse = await loadParse(relativePath);
    expect(parse(prompt)).toMatchObject(VALID);
  });

  it('does not treat a longer skill token as an autopilot invocation', async () => {
    const parse = await loadParse(relativePath);
    expect(parse('/omq:autopilotz --workflow release-flow ship it').kind).toBe('not-workflow-invocation');
  });

  it('agrees with the other mirror for every accepted prefix', async () => {
    const other = MIRRORS.find((m) => m !== relativePath)!;
    const parseHere = await loadParse(relativePath);
    const parseThere = await loadParse(other);
    for (const prompt of [
      '/autopilot --workflow release-flow a',
      '/omq:autopilot --workflow release-flow a',
      '/oh-my-qoder:autopilot --workflow release-flow a',
      '/omc:autopilot --workflow release-flow a',
    ]) {
      expect(parseHere(prompt)).toEqual(parseThere(prompt));
    }
  });
});
