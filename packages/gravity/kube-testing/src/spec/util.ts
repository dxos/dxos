//
// Copyright 2023 DXOS.org
//

import { TestSwarmConnection } from '@dxos/network-manager/testing';

/**
 * Iterate over all swarms and all agents.
 */
export const forEachSwarmAndAgent = async (
  agentId: string,
  agentIds: string[],
  swarms: TestSwarmConnection[],
  callback: (swarmIdx: number, swarm: TestSwarmConnection, agentId: string) => Promise<void>,
) => {
  await Promise.all(
    agentIds
      .filter((id) => id !== agentId)
      .map(async (agentId) => {
        for await (const [swarmIdx, swarm] of swarms.entries()) {
          await callback(swarmIdx, swarm, agentId);
        }
      }),
  );
};
