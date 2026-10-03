import { describe, expect, it } from 'vitest';

import { CLI_WORKER_AGENT_TYPES, isCliWorkerAgentType } from '../cli-agent-types.js';
import type { CliAgentType } from '../model-contract.js';

// Annotated, not cast: a provider added to (or removed from) the CliAgentType
// union stops compiling here until this list is updated to match.
const PROVIDERS: Record<CliAgentType, true> = {
  claude: true,
  qwen: true,
  codex: true,
  gemini: true,
  cursor: true,
  grok: true,
  antigravity: true,
};
const ALL_PROVIDERS = Object.keys(PROVIDERS) as CliAgentType[];

describe('shared CLI worker provider set', () => {
  it('accepts every provider declared by the CliAgentType union', () => {
    for (const provider of ALL_PROVIDERS) {
      expect(isCliWorkerAgentType(provider)).toBe(true);
    }
  });

  it('names no provider outside the CliAgentType union', () => {
    for (const provider of CLI_WORKER_AGENT_TYPES) {
      expect(ALL_PROVIDERS).toContain(provider);
    }
  });

  it('rejects values that are not providers', () => {
    expect(isCliWorkerAgentType('qoder')).toBe(false);
    expect(isCliWorkerAgentType(undefined)).toBe(false);
    expect(isCliWorkerAgentType(7)).toBe(false);
  });
});
