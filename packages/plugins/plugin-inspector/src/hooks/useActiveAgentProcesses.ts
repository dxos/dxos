//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { useAtomValue } from '@effect-atom/atom-react';

import { AGENT_PROCESS_KEY } from '@dxos/assistant';
import { Process } from '@dxos/functions-runtime';
import { type SpaceId } from '@dxos/keys';
import { useComputeRuntimeService } from '@dxos/plugin-automation/hooks';

const emptyAtom = Atom.make(() => [] as const);

/**
 * Returns active agent processes for a space.
 * Filters for processes with the agent process key that are running or hibernating.
 */
export const useActiveAgentProcesses = (spaceId?: SpaceId): readonly Process.Info[] => {
  const runtime = useComputeRuntimeService(Process.ProcessMonitorService, spaceId);
  const allProcesses = useAtomValue(runtime?.processTreeAtom ?? emptyAtom);

  return allProcesses.filter(
    (process) =>
      process.key === AGENT_PROCESS_KEY &&
      (process.state === Process.State.RUNNING || process.state === Process.State.HYBERNATING),
  );
};
