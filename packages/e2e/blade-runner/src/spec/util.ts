//
// Copyright 2023 DXOS.org
//

import { asyncTimeout, sleep } from '@dxos/async';
import { cancelWithContext, type Context } from '@dxos/context';
import { log } from '@dxos/log';
import { type TestSwarmConnection } from '@dxos/network-manager/testing';

type JoinSwarmOptions = {
  context: Context;
  swarmIdx: number;
  replicantId: number;
  numAgents: number;
  targetSwarmTimeout: number;
  fullSwarmTimeout: number;
  swarm: TestSwarmConnection;
};

type LeaveSwarmOptions = {
  context: Context;
  swarmIdx: number;
  swarm: TestSwarmConnection;
  fullSwarmTimeout: number;
  replicantId: number;
};

/**
 * Join swarm and wait till all peers are connected.
 */
export const joinSwarm = async ({
  context,
  swarmIdx,
  replicantId,
  numAgents,
  targetSwarmTimeout,
  fullSwarmTimeout,
  swarm,
}: JoinSwarmOptions) => {
  log.info('joining swarm', { replicantId, swarmIdx, swarmTopic: swarm.topic });
  await cancelWithContext(context, swarm.join());

  log.info('swarm joined', { replicantId, swarmIdx, swarmTopic: swarm.topic });

  await sleep(targetSwarmTimeout);

  log.info('number of connections within duration', {
    replicantId,
    swarmIdx,
    swarmTopic: swarm.topic,
    connections: swarm.protocol.connections.size,
    numAgents,
  });

  /**
   * Wait till all peers are connected (with timeout).
   */
  const waitTillConnected = async () => {
    await cancelWithContext(
      context,
      swarm.protocol.connected.waitForCondition(() => swarm.protocol.connections.size === numAgents - 1),
    );
    log.info('all peers connected', { replicantId, swarmIdx, swarmTopic: swarm.topic });
  };

  asyncTimeout(waitTillConnected(), fullSwarmTimeout).catch((error) => {
    log.info('all peers not connected', {
      replicantId,
      swarmIdx,
      swarmTopic: swarm.topic,
      connections: swarm.protocol.connections.size,
      numAgents,
    });
  });
};

/**
 * Leave swarm and wait till all peers are disconnected.
 */
export const leaveSwarm = async ({ context, swarmIdx, swarm, replicantId, fullSwarmTimeout }: LeaveSwarmOptions) => {
  log.info('closing swarm', { replicantId, swarmIdx, swarmTopic: swarm.topic });
  await cancelWithContext(context, swarm.leave());
  log.info('swarm closed', { replicantId, swarmIdx, swarmTopic: swarm.topic });

  /**
   * Wait till all peers are disconnected (with timeout).
   */
  const waitTillDisconnected = async () => {
    await cancelWithContext(
      context,
      swarm.protocol.disconnected.waitForCondition(() => swarm.protocol.connections.size === 0),
    );
    log.info('all peers disconnected', { replicantId, swarmIdx, swarmTopic: swarm.topic });
  };

  asyncTimeout(waitTillDisconnected(), fullSwarmTimeout).catch((error) => {
    log.info('all peers not disconnected', {
      replicantId,
      swarmIdx,
      swarmTopic: swarm.topic,
      connections: swarm.protocol.connections.size,
    });
  });
};

/**
 * Iterate over all swarms and all agents.
 */
export const forEachSwarmAndAgent = async (
  replicantId: string,
  agentIds: string[],
  swarms: TestSwarmConnection[],
  callback: (swarmIdx: number, swarm: TestSwarmConnection, replicantId: string) => Promise<void>,
) => {
  await Promise.all(
    agentIds
      .filter((id) => id !== replicantId)
      .map(async (replicantId) => {
        for await (const [swarmIdx, swarm] of swarms.entries()) {
          await callback(swarmIdx, swarm, replicantId);
        }
      }),
  );
};
