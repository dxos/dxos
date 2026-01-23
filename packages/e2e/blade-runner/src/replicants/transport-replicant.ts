//
// Copyright 2024 DXOS.org
//

import { asyncTimeout, scheduleTaskInterval, sleep } from '@dxos/async';
import { Context, cancelWithContext } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type TransportKind } from '@dxos/network-manager';
import { TestBuilder as NetworkManagerTestBuilder } from '@dxos/network-manager/testing';
import { type TestSwarmConnection } from '@dxos/network-manager/testing';
import { trace } from '@dxos/tracing';

import { type ReplicantEnv, ReplicantRegistry } from '../env';

//
// Copyright 2023 DXOS.org
//

export type ReplicantRunProps = {
  swarmPeerId: string;
  transport: TransportKind;
  signalUrl: string;

  amountOfReplicants: number;
  swarmsPerReplicant: number;
  otherSwarmPeerIds: string[];
  swarmTopicIds: string[];

  duration: number;
  repeatInterval: number;
  targetSwarmTimeout: number;
  fullSwarmTimeout: number;
  streamLoadInterval: number;
  streamLoadChunkSize: number;
  streamsDelay: number;
};

@trace.resource()
export class TransportReplicant {
  constructor(private readonly env: ReplicantEnv) {}

  // TODO(myklola): Refactor to a smaller methods.
  @trace.span()
  async run({
    swarmPeerId,
    transport,
    signalUrl,

    amountOfReplicants,
    swarmsPerReplicant,
    otherSwarmPeerIds,
    swarmTopicIds,

    duration,
    repeatInterval,
    targetSwarmTimeout,
    fullSwarmTimeout,
    streamLoadInterval,
    streamLoadChunkSize,
    streamsDelay,
  }: ReplicantRunProps): Promise<void> {
    const networkManagerBuilder = new NetworkManagerTestBuilder({
      signalHosts: [{ server: signalUrl }],
      transport,
    });

    const peer = networkManagerBuilder.createPeer(PublicKey.from(swarmPeerId));
    await peer.open();
    log.info('peer created', { swarmPeerId });

    log.info(`creating ${swarmTopicIds.length} swarms`, { swarmPeerId });

    // Swarms to join.
    const swarms = swarmTopicIds.map((swarmTopicId, swarmIdx) => {
      const swarmTopic = PublicKey.from(swarmTopicId);
      return peer.createSwarm(swarmTopic);
    });

    const delayedSwarm = peer.createSwarm(PublicKey.from('delayed'));

    log.info('swarms created', { swarmPeerId });

    const ctx = new Context();
    let testCounter = 0;

    const testRun = async () => {
      const context = ctx.derive({
        onError: (err) => {
          log.info('testRun iterration error', { iterationId: testCounter, err });
        },
      });

      log.info('testRun iteration', { iterationId: testCounter });

      // Join all swarms.
      // How many connections established within the target duration.
      {
        log.info('joining all swarms', { swarmPeerId });

        await Promise.all(
          swarms.map(async (swarm, swarmIdx) => {
            await joinSwarm({
              context,
              swarmIdx,
              swarmPeerId,
              amountOfReplicants,
              targetSwarmTimeout,
              fullSwarmTimeout,
              swarm,
            });
          }),
        );

        await this.env.syncBarrier(`swarms are ready on ${testCounter}`, amountOfReplicants);
      }

      await sleep(10_000);

      // Start streams on all swarms.
      {
        log.info('starting streams', { swarmPeerId });

        // TODO(egorgripasov): Multiply by iteration number.
        const targetStreams = (amountOfReplicants - 1) * swarmsPerReplicant;
        let actualStreams = 0;

        await forEachSwarmAndAgent(swarmPeerId, otherSwarmPeerIds, swarms, async (swarmIdx, swarm, swarmPeerId) => {
          const to = swarmPeerId;
          if (swarmPeerId > to) {
            return;
          }

          log.info('starting stream', { from: swarmPeerId, to, swarmIdx });
          try {
            const streamTag = `stream-test-${testCounter}-${swarmPeerId}-${swarmPeerId}-${swarmIdx}`;
            log.info('open stream', { streamTag });
            await swarm.protocol.openStream(
              PublicKey.from(swarmPeerId),
              streamTag,
              streamLoadInterval,
              streamLoadChunkSize,
            );
            actualStreams++;
            log.info('test stream started', { swarmPeerId, swarmIdx });
          } catch (error) {
            log.error('test stream failed', { swarmPeerId, swarmIdx, error });
          }
        });

        log.info('streams started', { testCounter, swarmPeerId, targetStreems: targetStreams, actualStreams });
        await this.env.syncBarrier(`streams are started at ${testCounter}`, amountOfReplicants);
      }

      await sleep(streamsDelay);

      // Test connections.
      {
        log.info('start testing connections', { swarmPeerId, testCounter });

        const targetConnections = (amountOfReplicants - 1) * swarmsPerReplicant;

        let actualConnections = 0;
        await forEachSwarmAndAgent(swarmPeerId, otherSwarmPeerIds, swarms, async (swarmIdx, swarm, swarmPeerId) => {
          log.info('testing connection', { swarmPeerId, swarmIdx });
          try {
            await swarm.protocol.testConnection(PublicKey.from(swarmPeerId), 'hello world');
            actualConnections++;
            log.info('test connection succeeded', { swarmPeerId, swarmIdx });
          } catch (error) {
            log.info('test connection failed', { swarmPeerId, swarmIdx, error });
          }
        });

        log.info('test connections done', { testCounter, swarmPeerId, targetConnections, actualConnections });
        await this.env.syncBarrier(`connections are tested on ${testCounter}`, amountOfReplicants);
      }

      // Test delayed swarm.
      {
        log.info('testing delayed swarm', { swarmPeerId, testCounter });
        await joinSwarm({
          context,
          swarmIdx: swarmTopicIds.length,
          swarmPeerId,
          amountOfReplicants,
          targetSwarmTimeout,
          fullSwarmTimeout,
          swarm: delayedSwarm,
        });

        await Promise.all(
          otherSwarmPeerIds
            .filter((other) => other !== swarmPeerId)
            .map(async (swarmPeerId) => {
              try {
                await delayedSwarm.protocol.testConnection(PublicKey.from(swarmPeerId), 'hello world');
              } catch (error) {
                log.info('test delayed swarm failed', { swarmPeerId, error });
              }
            }),
        );

        await leaveSwarm({
          context,
          swarmIdx: swarmTopicIds.length,
          swarm: delayedSwarm,
          swarmPeerId,
          fullSwarmTimeout,
        });

        await this.env.syncBarrier(`delayed swarm is tested on ${testCounter}`, amountOfReplicants);
      }

      // Close streams.
      {
        log.info('closing streams', { swarmPeerId });

        await forEachSwarmAndAgent(swarmPeerId, otherSwarmPeerIds, swarms, async (swarmIdx, swarm, swarmPeerId) => {
          log.info('closing stream', { swarmPeerId, swarmIdx });
          try {
            const streamTag = `stream-test-${testCounter}-${swarmPeerId}-${swarmPeerId}-${swarmIdx}`;
            const stats = await swarm.protocol.closeStream(PublicKey.from(swarmPeerId), streamTag);

            log.info('test stream closed', { swarmPeerId, swarmIdx, ...stats });
          } catch (error) {
            log.info('test stream closing failed', { swarmPeerId, swarmIdx, error });
          }
        });

        log.info('streams closed', { testCounter, swarmPeerId });
        await this.env.syncBarrier(`streams are closed at ${testCounter}`, amountOfReplicants);
      }

      // Leave all swarms.
      {
        log.info('closing all swarms');

        await Promise.all(
          swarms.map(async (swarm, swarmIdx) => {
            await leaveSwarm({ context, swarmIdx, swarm, swarmPeerId, fullSwarmTimeout });
          }),
        );
      }
    };

    scheduleTaskInterval(
      ctx,
      async () => {
        await this.env.syncBarrier(`iteration-${testCounter}`, amountOfReplicants);
        await asyncTimeout(testRun(), duration);
        testCounter++;
      },
      repeatInterval,
    );
    await sleep(duration);
    await ctx.dispose();

    log.info('test completed', { swarmPeerId });
  }
}

ReplicantRegistry.instance.register(TransportReplicant);

type JoinSwarmOptions = {
  context: Context;
  swarmIdx: number;
  swarmPeerId: string;
  amountOfReplicants: number;
  targetSwarmTimeout: number;
  fullSwarmTimeout: number;
  swarm: TestSwarmConnection;
};

type LeaveSwarmOptions = {
  context: Context;
  swarmIdx: number;
  swarm: TestSwarmConnection;
  fullSwarmTimeout: number;
  swarmPeerId: string;
};

/**
 * Join swarm and wait till all peers are connected.
 */
export const joinSwarm = async ({
  context,
  swarmIdx,
  swarmPeerId,
  amountOfReplicants,
  targetSwarmTimeout,
  fullSwarmTimeout,
  swarm,
}: JoinSwarmOptions) => {
  log.info('joining swarm', { swarmPeerId, swarmIdx, swarmTopic: swarm.topic });
  await cancelWithContext(context, swarm.join());

  log.info('swarm joined', { swarmPeerId, swarmIdx, swarmTopic: swarm.topic });

  await sleep(targetSwarmTimeout);

  log.info('number of connections within duration', {
    swarmPeerId,
    swarmIdx,
    swarmTopic: swarm.topic,
    connections: swarm.protocol.connections.size,
    amountOfReplicants,
  });

  /**
   * Wait till all peers are connected (with timeout).
   */
  const waitTillConnected = async () => {
    await cancelWithContext(
      context,
      swarm.protocol.connected.waitForCondition(() => swarm.protocol.connections.size === amountOfReplicants - 1),
    );
    log.info('all peers connected', { swarmPeerId, swarmIdx, swarmTopic: swarm.topic });
  };

  asyncTimeout(waitTillConnected(), fullSwarmTimeout).catch((error) => {
    log.info('all peers not connected', {
      swarmPeerId,
      swarmIdx,
      swarmTopic: swarm.topic,
      connections: swarm.protocol.connections.size,
      amountOfReplicants,
    });
  });
};

/**
 * Leave swarm and wait till all peers are disconnected.
 */
export const leaveSwarm = async ({ context, swarmIdx, swarm, swarmPeerId, fullSwarmTimeout }: LeaveSwarmOptions) => {
  log.info('closing swarm', { swarmPeerId, swarmIdx, swarmTopic: swarm.topic });
  await cancelWithContext(context, swarm.leave());
  log.info('swarm closed', { swarmPeerId, swarmIdx, swarmTopic: swarm.topic });

  /**
   * Wait till all peers are disconnected (with timeout).
   */
  const waitTillDisconnected = async () => {
    await cancelWithContext(
      context,
      swarm.protocol.disconnected.waitForCondition(() => swarm.protocol.connections.size === 0),
    );
    log.info('all peers disconnected', { swarmPeerId, swarmIdx, swarmTopic: swarm.topic });
  };

  asyncTimeout(waitTillDisconnected(), fullSwarmTimeout).catch((error) => {
    log.info('all peers not disconnected', {
      swarmPeerId,
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
  swarmPeerId: string,
  agentIds: string[],
  swarms: TestSwarmConnection[],
  callback: (swarmIdx: number, swarm: TestSwarmConnection, swarmPeerId: string) => Promise<void>,
) => {
  await Promise.all(
    agentIds
      .filter((id) => id !== swarmPeerId)
      .map(async (swarmPeerId) => {
        for await (const [swarmIdx, swarm] of swarms.entries()) {
          await callback(swarmIdx, swarm, swarmPeerId);
        }
      }),
  );
};
