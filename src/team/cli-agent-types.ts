import type { CliAgentType } from './model-contract.js';

/**
 * The provider list shared by worker launch, dynamic scaling, and shutdown paths.
 *
 * It lives in its own dependency-free module because `model-contract.js` is
 * replaced wholesale by several suite mocks; consumers need the real membership
 * even in those suites.
 */
export const CLI_WORKER_AGENT_TYPES: ReadonlySet<CliAgentType> = new Set<CliAgentType>([
  'claude',
  'qwen',
  'codex',
  'gemini',
  'cursor',
  'grok',
  'antigravity',
]);

export function isCliWorkerAgentType(value: unknown): value is CliAgentType {
  return typeof value === 'string' && CLI_WORKER_AGENT_TYPES.has(value as CliAgentType);
}
