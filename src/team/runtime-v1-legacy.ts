/**
 * Retirement tombstones for the v1 team-runtime mutation entrypoints.
 *
 * The adopted ancestor refactor retired the v1 runtime surface: startTeam
 * fails closed with `team_start_unsafe_runtime_v1`, resumeTeam refuses state
 * without immutable instance ownership, and the retirement contract in
 * runtime.test.ts pins `spawnWorkerForTask`/`assignTask` to undefined on the
 * runtime module. The retained v1 coverage records still document the
 * rollback guarantees those entrypoints used to provide, so they import this
 * module instead: the fork's original signatures fail closed at the call
 * site with the retirement reason until the coverage is ported to the v2
 * operations (startTeamV2/monitorTeamV2 and the launch-attempt flow).
 */
import type { TeamRuntime } from './runtime.js';

export async function spawnWorkerForTask(
  _runtime: TeamRuntime,
  _workerNameValue: string,
  _taskIndex: number
): Promise<string> {
  throw new Error(
    'retired_v1_runtime:spawnWorkerForTask (the v1 mutation entrypoints fail closed; see runtime-v1-legacy.ts)',
  );
}

export async function assignTask(
  _teamName: string,
  _taskId: string,
  _targetWorkerName: string,
  _paneId: string,
  _sessionName: string,
  _cwd: string
): Promise<void> {
  throw new Error(
    'retired_v1_runtime:assignTask (the v1 mutation entrypoints fail closed; see runtime-v1-legacy.ts)',
  );
}
