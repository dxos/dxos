//
// Copyright 2023 DXOS.org
//

import { asyncTimeout, sleep, scheduleTaskInterval } from '@dxos/async';
import { cancelWithContext, Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { TestBuilder as NetworkManagerTestBuilder, TestSwarmConnection } from '@dxos/network-manager/testing';
import { defaultMap, range } from '@dxos/util';

import { LogReader, SerializedLogEntry, getReader, BORDER_COLORS, renderPNG, showPng } from '../analysys';
import { AgentEnv, PlanResults, TestParams, TestPlan } from '../plan';
import { TestBuilder as SignalTestBuilder } from '../test-builder';

export type TransportTestSpec = {
  agents: number;
  swarmsPerAgent: number;
  duration: number;

  transport: 'webrtc' | 'webrtc-proxy';

  streamLoadInterval: number;
  streamLoadChunkSize: number;

  targetSwarmTimeout: number;
  fullSwarmTimeout: number;
  iterationDelay: number;
  streamsDelay: number;
  repeatInterval: number;

  signalArguments: string[];
};

export type TransportAgentConfig = {
  agentIdx: number;
  signalUrl: string;
  swarmTopicIds: string[];
};

export class TransportTestPlan implements TestPlan<TransportTestSpec, TransportAgentConfig> {
  signalBuilder = new SignalTestBuilder();

  async init({ spec, outDir }: TestParams<TransportTestSpec>): Promise<TransportAgentConfig[]> {
    const signal = await this.signalBuilder.createServer(0, outDir, spec.signalArguments);

    const swarmTopicIds = range(spec.swarmsPerAgent).map(() => PublicKey.random().toHex());
    return range(spec.agents).map((agentIdx) => ({
      agentIdx,
      signalUrl: signal.url(),
      swarmTopicIds,
    }));
  }

  async run(env: AgentEnv<TransportTestSpec, TransportAgentConfig>): Promise<void> {
    const { config, spec, agents } = env.params;
    const { agentIdx, swarmTopicIds, signalUrl } = config;

    const numAgents = Object.keys(agents).length;

    log.info('run', {
      agentIdx,
      runnerAgentIdx: config.agentIdx,
      agentId: env.params.agentId.substring(0, 8),
    });

    const networkManagerBuilder = new NetworkManagerTestBuilder({
      signalHosts: [{ server: signalUrl }],
      bridge: spec.transport === 'webrtc-proxy',
    });

    const peer = networkManagerBuilder.createPeer(PublicKey.from(env.params.agentId));
    await peer.open();
    log.info('peer created', { agentIdx });

    log.info(`creating ${swarmTopicIds.length} swarms`, { agentIdx });

    // Swarms to join.
    const swarms = swarmTopicIds.map((swarmTopicId, swarmIdx) => {
      const swarmTopic = PublicKey.from(swarmTopicId);
      return peer.createSwarm(swarmTopic);
    });

    const delayedSwarm = peer.createSwarm(PublicKey.from('delayed'));

    log.info('swarms created', { agentIdx });

    /**
     * Join swarm and wait till all peers are connected.
     */
    const joinSwarm = async (context: Context, swarmIdx: number, swarm: any) => {
      log.info('joining swarm', { agentIdx, swarmIdx, swarmTopic: swarm.topic });
      await cancelWithContext(context, swarm.join());

      log.info('swarm joined', { agentIdx, swarmIdx, swarmTopic: swarm.topic });
      await sleep(spec.targetSwarmTimeout);
      log.info('number of connections within duration', {
        agentIdx,
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
          swarm.protocol.connected.waitForCondition(
            () => swarm.protocol.connections.size === Object.keys(agents).length - 1,
          ),
        );
        log.info('all peers connected', { agentIdx, swarmIdx, swarmTopic: swarm.topic });
      };

      asyncTimeout(waitTillConnected(), spec.fullSwarmTimeout).catch((error) => {
        log.info('all peers not connected', {
          agentIdx,
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
    const leaveSwarm = async (context: Context, swarmIdx: number, swarm: any) => {
      log.info('closing swarm', { agentIdx, swarmIdx, swarmTopic: swarm.topic });
      await cancelWithContext(context, swarm.leave());
      log.info('swarm closed', { agentIdx, swarmIdx, swarmTopic: swarm.topic });

      /**
       * Wait till all peers are disconnected (with timeout).
       */
      const waitTillDisconnected = async () => {
        await cancelWithContext(
          context,
          swarm.protocol.disconnected.waitForCondition(() => swarm.protocol.connections.size === 0),
        );
        log.info('all peers disconnected', { agentIdx, swarmIdx, swarmTopic: swarm.topic });
      };

      asyncTimeout(waitTillDisconnected(), spec.fullSwarmTimeout).catch((error) => {
        log.info('all peers not disconnected', {
          agentIdx,
          swarmIdx,
          swarmTopic: swarm.topic,
          connections: swarm.protocol.connections.size,
        });
      });
    };

    /**
     * Iterate over all swarms and all agents.
     */
    const forEachSwarmAndAgent = async (
      callback: (swarmIdx: number, swarm: TestSwarmConnection, agentId: string) => Promise<void>,
    ) => {
      await Promise.all(
        Object.keys(env.params.agents)
          .filter((agentId) => agentId !== env.params.agentId)
          .map(async (agentId) => {
            for await (const [swarmIdx, swarm] of swarms.entries()) {
              await callback(swarmIdx, swarm, agentId);
            }
          }),
      );
    };

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
        log.info('joining all swarms', { agentIdx });

        await Promise.all(
          swarms.map(async (swarm, swarmIdx) => {
            await joinSwarm(context, swarmIdx, swarm);
          }),
        );

        await env.syncBarrier(`swarms are ready on ${testCounter}`);
      }

      await sleep(10_000);

      // Start streams on all swarms.
      {
        log.info('starting streams', { agentIdx });

        // TODO(egorgripasov): Multiply by iterration number.
        const targetStreems = (numAgents - 1) * spec.swarmsPerAgent;
        let actualStreams = 0;

        await forEachSwarmAndAgent(async (swarmIdx, swarm, agentId) => {
          const to = env.params.agents[agentId].agentIdx;
          if (agentIdx > to) {
            return;
          }

          log.info('starting stream', { from: agentIdx, to, swarmIdx });
          try {
            const streamTag = `stream-test-${testCounter}-${env.params.agentId}-${agentId}-${swarmIdx}`;
            log.info('open stream', { streamTag });
            await swarm.protocol.openStream(
              PublicKey.from(agentId),
              streamTag,
              spec.streamLoadInterval,
              spec.streamLoadChunkSize,
            );
            actualStreams++;
            log.info('test stream started', { agentIdx, swarmIdx });
          } catch (error) {
            log.error('test stream failed', { agentIdx, swarmIdx, error });
          }
        });

        log.info('streams started', { testCounter, agentIdx, targetStreems, actualStreams });
        await env.syncBarrier(`streams are started at ${testCounter}`);
      }

      await sleep(spec.streamsDelay);

      // Test connections.
      {
        log.info('start testing connections', { agentIdx, testCounter });

        const targetConnections = (numAgents - 1) * spec.swarmsPerAgent;
        let actualConnections = 0;

        await forEachSwarmAndAgent(async (swarmIdx, swarm, agentId) => {
          log.info('testing connection', { agentIdx, swarmIdx });
          try {
            await swarm.protocol.testConnection(PublicKey.from(agentId), 'hello world');
            actualConnections++;
            log.info('test connection succeded', { agentIdx, swarmIdx });
          } catch (error) {
            log.info('test connection failed', { agentIdx, swarmIdx, error });
          }
        });

        log.info('test connections done', { testCounter, agentIdx, targetConnections, actualConnections });
        await env.syncBarrier(`connections are tested on ${testCounter}`);
      }

      // Test delayed swarm.
      {
        log.info('testing delayed swarm', { agentIdx, testCounter });
        await joinSwarm(context, swarmTopicIds.length, delayedSwarm);

        await Promise.all(
          Object.keys(env.params.agents)
            .filter((agentId) => agentId !== env.params.agentId)
            .map(async (agentId) => {
              try {
                await delayedSwarm.protocol.testConnection(PublicKey.from(agentId), 'hello world');
              } catch (error) {
                log.info('test delayed swarm failed', { agentIdx, error });
              }
            }),
        );

        await leaveSwarm(context, swarmTopicIds.length, delayedSwarm);

        await env.syncBarrier(`delayed swarm is tested on ${testCounter}`);
      }

      // Close streams.
      {
        log.info('closing streams', { agentIdx });

        await forEachSwarmAndAgent(async (swarmIdx, swarm, agentId) => {
          log.info('closing stream', { agentIdx, swarmIdx });
          try {
            const streamTag = `stream-test-${testCounter}-${env.params.agentId}-${agentId}-${swarmIdx}`;
            const stats = await swarm.protocol.closeStream(PublicKey.from(agentId), streamTag);

            log.info('test stream closed', { agentIdx, swarmIdx, ...stats });
          } catch (error) {
            log.info('test stream closing failed', { agentIdx, swarmIdx, error });
          }
        });

        log.info('streams closed', { testCounter, agentIdx });
        await env.syncBarrier(`streams are closed at ${testCounter}`);
      }

      // Leave all swarms.
      {
        log.info('closing all swarms');

        await Promise.all(
          swarms.map(async (swarm, swarmIdx) => {
            await leaveSwarm(context, swarmIdx, swarm);
          }),
        );
      }
    };

    scheduleTaskInterval(
      ctx,
      async () => {
        await env.syncBarrier(`iteration-${testCounter}`);
        await asyncTimeout(testRun(), spec.duration);
        testCounter++;
      },
      spec.repeatInterval,
    );
    await sleep(spec.duration);
    await ctx.dispose();

    log.info('test completed', { agentIdx });
  }

  async finish(params: TestParams<TransportTestSpec>, results: PlanResults): Promise<any> {
    await this.signalBuilder.destroy();
    log.info('finished shutdown');

    const reader = getReader(results);

    const muxerStats = new Map<string, SerializedLogEntry<TeleportStatsLog>[]>();
    const testStats = new Map<string, SerializedLogEntry<TestStatsLog>[]>();

    reader.forEach((entry: SerializedLogEntry<any>) => {
      switch (entry.message) {
        case 'dxos.mesh.teleport.stats': {
          const { localPeerId, remotePeerId } = entry.context as TeleportStatsLog;
          const key = `connection-${PublicKey.from(localPeerId).truncate()}-${PublicKey.from(remotePeerId).truncate()}`;
          defaultMap(muxerStats, key, []).push(entry);
          break;
        }
        case 'dxos.test.stream-stats': {
          const { from, to } = entry.context as TestStatsLog;
          const key = `stream-${PublicKey.from(from).truncate()}-${PublicKey.from(to).truncate()}`;
          defaultMap(testStats, key, []).push(entry);
          break;
        }
      }
    });

    let colorIdx = 0;
    showPng(
      await renderPNG({
        type: 'scatter',
        data: {
          datasets: [
            ...Array.from(muxerStats.entries()).map(([key, entries]) => ({
              label: `${key}-sent`,
              showLine: true,
              data: entries.map((entry) => ({
                x: entry.timestamp,
                y: entry.context.bytesSent,
              })),
              backgroundColor: BORDER_COLORS[colorIdx++ % BORDER_COLORS.length],
            })),
            // ...Array.from(muxerStats.entries()).map(([key, entries]) => ({
            //   label: `${key}-received`,
            //   showLine: true,
            //   data: entries.map((entry) => ({
            //     x: entry.timestamp,
            //     y: entry.context.bytesReceived,
            //   })),
            //   backgroundColor: BORDER_COLORS[colorIdx++ % BORDER_COLORS.length],
            // })),
            ...Array.from(testStats.entries()).map(([key, entries]) => ({
              label: `${key}-sent`,
              showLine: true,
              data: entries.map((entry) => ({
                x: entry.timestamp,
                y: entry.context.bytesSent,
              })),
              backgroundColor: BORDER_COLORS[colorIdx++ % BORDER_COLORS.length],
            })),
            // ...Array.from(testStats.entries()).map(([key, entries]) => ({
            //   label: `${key}-received`,
            //   showLine: true,
            //   data: entries.map((entry) => ({
            //     x: entry.timestamp,
            //     y: entry.context.bytesReceived,
            //   })),
            //   backgroundColor: BORDER_COLORS[colorIdx++ % BORDER_COLORS.length],
            // })),
          ],
        },
        options: {},
      }),
    );

    //
    // Connections.
    //
    return analyzeConnections(reader);
  }
}

type TeleportStatsLog = {
  localPeerId: string;
  remotePeerId: string;
  bytesSent: number;
  bytesReceived: number;
};

type TestStatsLog = {
  streamTag: string;
  bytesSent: number;
  bytesReceived: number;
  sendErrors: number;
  receiveErrors: number;
  from: string;
  to: string;
};

type ConnectionsStats = {
  peerId: string;
  successful: number;
  failed: number;
  maxConcurrentInits: number;
};

type ConnectionEntry = {
  sessionId: string;
  topic: string;
  localPeerId: string;
  remotePeerId: string;
  initiator: string;
  agentId: string;
  initiate: number;
  connected: number;
  error: number;
  closed: number;
};

const analyzeConnections = (reader: LogReader): ConnectionsStats[] => {
  /**
   * peerId -> sessionId -> ConnectionEntry
   */
  const peerConnections = new Map<string, Map<string, ConnectionEntry>>();

  reader.forEach((entry: SerializedLogEntry<any>) => {
    let connections = peerConnections.get(entry.context.agentId);
    if (!connections) {
      connections = new Map<string, ConnectionEntry>();
      peerConnections.set(entry.context.agentId, connections);
    }

    switch (entry.message) {
      case 'dxos.mesh.connection.construct': {
        connections.set((entry.context as ConnectionEntry).sessionId, entry.context);
        break;
      }
      case 'dxos.mesh.connection.open': {
        const connection = connections.get((entry.context as ConnectionEntry).sessionId);
        invariant(connection, 'connection not found');
        connection.initiate = entry.timestamp;
        break;
      }
      case 'dxos.mesh.connection.error': {
        const connection = connections.get((entry.context as ConnectionEntry).sessionId);
        invariant(connection, 'connection not found');
        connection.error = entry.timestamp;
        break;
      }
      case 'dxos.mesh.connection.closed': {
        const connection = connections.get((entry.context as ConnectionEntry).sessionId);
        invariant(connection, 'connection not found');
        connection.closed = entry.timestamp;
        break;
      }
      case 'dxos.mesh.connection.connected': {
        const connection = connections.get((entry.context as ConnectionEntry).sessionId);
        invariant(connection, 'connection not found');
        connection.connected = entry.timestamp;
        break;
      }
    }
  });

  const perPeerConnectionsStats: ConnectionsStats[] = [];

  peerConnections.forEach((connections, peerId) => {
    const stats: ConnectionsStats = {
      peerId,
      successful: 0,
      failed: 0,
      maxConcurrentInits: 0,
    };

    {
      const minTimestamp = Math.min(
        ...Array.from(connections.values()).map((entry) => entry.initiate ?? Infinity),
        Infinity,
      );
      const maxTimestamp = Math.max(
        ...Array.from(connections.values())
          .map((entry) => [entry.closed ?? 0, entry.error ?? 0, entry.connected ?? 0])
          .flat(),
        0,
      );

      let concurrentInits: number[] | undefined;
      try {
        concurrentInits = Array(maxTimestamp - minTimestamp).fill(0);
      } catch (e) {
        log.error('error', { minTimestamp, maxTimestamp, connections });
      }

      connections.forEach((entry) => {
        if (entry.error && !entry.connected && entry.initiate) {
          stats.failed++;
        }
        if (entry.connected) {
          stats.successful++;
        }

        concurrentInits?.forEach((_, idx) => {
          if (
            idx >= entry.initiate - minTimestamp &&
            idx <
              Math.min(entry.closed ?? Infinity, entry.connected ?? Infinity, entry.error ?? Infinity) - minTimestamp
          ) {
            concurrentInits![idx]++;
          }
        });
      });
      stats.maxConcurrentInits = Math.max(...(concurrentInits ?? []), 0);
    }

    perPeerConnectionsStats.push(stats);
  });
  log.info('connections stats', { connections: perPeerConnectionsStats });

  return perPeerConnectionsStats;
};
