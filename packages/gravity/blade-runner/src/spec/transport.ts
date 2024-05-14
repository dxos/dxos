//
// Copyright 2023 DXOS.org
//

import { asyncTimeout, sleep, scheduleTaskInterval } from '@dxos/async';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { TransportKind } from '@dxos/network-manager';
import { TestBuilder as NetworkManagerTestBuilder } from '@dxos/network-manager/testing';
import { defaultMap, range } from '@dxos/util';

import { forEachSwarmAndAgent, joinSwarm, leaveSwarm } from './util';
import { type LogReader, type SerializedLogEntry, getReader, BORDER_COLORS, renderPNG, showPNG } from '../analysys';
import { type ReplicantRunOptions, type AgentEnv, type ReplicantsSummary, type TestParams, type TestPlan } from '../plan';
import { TestBuilder as SignalTestBuilder } from '../test-builder';

export type TransportTestSpec = {
  agents: number;
  swarmsPerAgent: number;
  duration: number;

  transport: TransportKind;

  streamLoadInterval: number;
  streamLoadChunkSize: number;

  targetSwarmTimeout: number;
  fullSwarmTimeout: number;
  iterationDelay: number;
  streamsDelay: number;
  repeatInterval: number;

  signalArguments: string[];
  showPNG: boolean;
};

export type TransportAgentConfig = {
  replicantId: number;
  signalUrl: string;
  swarmTopicIds: string[];
};

export class TransportTestPlan implements TestPlan<TransportTestSpec, TransportAgentConfig> {
  signalBuilder = new SignalTestBuilder();
  onError?: (err: Error) => void;

  defaultSpec(): TransportTestSpec {
    return {
      agents: 4,
      swarmsPerAgent: 10,
      duration: 60_000,
      transport: TransportKind.SIMPLE_PEER,
      targetSwarmTimeout: 10_000,
      fullSwarmTimeout: 60_000,
      iterationDelay: 1_000,
      streamsDelay: 60_000,
      signalArguments: ['globalsubserver'],
      repeatInterval: 5_000,
      streamLoadInterval: 1,
      streamLoadChunkSize: 5_000_000,
      showPNG: true,
    };
  }

  async init({ spec, outDir }: TestParams<TransportTestSpec>): Promise<ReplicantRunOptions<TransportAgentConfig>[]> {
    const signal = await this.signalBuilder.createSignalServer(0, outDir, spec.signalArguments, (err) => {
      log.error('error in signal server', { err });
      this.onError?.(err);
    });

    const swarmTopicIds = range(spec.swarmsPerAgent).map(() => PublicKey.random().toHex());
    return range(spec.agents).map((replicantId) => ({
      config: {
        replicantId,
        signalUrl: signal.url(),
        swarmTopicIds,
      },
    }));
  }

  async run(env: AgentEnv<TransportTestSpec, TransportAgentConfig>): Promise<void> {
    const { config, spec, agents } = env.params;
    const { replicantId, swarmTopicIds, signalUrl } = config;

    const numAgents = Object.keys(agents).length;

    log.info('run', {
      replicantId,
    });

    const networkManagerBuilder = new NetworkManagerTestBuilder({
      signalHosts: [{ server: signalUrl }],
      transport: spec.transport,
    });

    const peer = networkManagerBuilder.createPeer(PublicKey.from(env.params.replicantId));
    await peer.open();
    log.info('peer created', { replicantId });

    log.info(`creating ${swarmTopicIds.length} swarms`, { replicantId });

    // Swarms to join.
    const swarms = swarmTopicIds.map((swarmTopicId, swarmIdx) => {
      const swarmTopic = PublicKey.from(swarmTopicId);
      return peer.createSwarm(swarmTopic);
    });

    const delayedSwarm = peer.createSwarm(PublicKey.from('delayed'));

    log.info('swarms created', { replicantId });

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
        log.info('joining all swarms', { replicantId });

        await Promise.all(
          swarms.map(async (swarm, swarmIdx) => {
            await joinSwarm({
              context,
              swarmIdx,
              replicantId,
              numAgents,
              targetSwarmTimeout: spec.targetSwarmTimeout,
              fullSwarmTimeout: spec.fullSwarmTimeout,
              swarm,
            });
          }),
        );

        await env.syncBarrier(`swarms are ready on ${testCounter}`);
      }

      await sleep(10_000);

      // Start streams on all swarms.
      {
        log.info('starting streams', { replicantId });

        // TODO(egorgripasov): Multiply by iteration number.
        const targetStreams = (numAgents - 1) * spec.swarmsPerAgent;
        let actualStreams = 0;

        await forEachSwarmAndAgent(
          env.params.replicantId,
          Object.keys(env.params.agents),
          swarms,
          async (swarmIdx, swarm, replicantId) => {
            const to = env.params.agents[replicantId].config.replicantId;
            if (replicantId > to) {
              return;
            }

            log.info('starting stream', { from: replicantId, to, swarmIdx });
            try {
              const streamTag = `stream-test-${testCounter}-${env.params.replicantId}-${replicantId}-${swarmIdx}`;
              log.info('open stream', { streamTag });
              await swarm.protocol.openStream(
                PublicKey.from(replicantId),
                streamTag,
                spec.streamLoadInterval,
                spec.streamLoadChunkSize,
              );
              actualStreams++;
              log.info('test stream started', { replicantId, swarmIdx });
            } catch (error) {
              log.error('test stream failed', { replicantId, swarmIdx, error });
            }
          },
        );

        log.info('streams started', { testCounter, replicantId, targetStreems: targetStreams, actualStreams });
        await env.syncBarrier(`streams are started at ${testCounter}`);
      }

      await sleep(spec.streamsDelay);

      // Test connections.
      {
        log.info('start testing connections', { replicantId, testCounter });

        const targetConnections = (numAgents - 1) * spec.swarmsPerAgent;

        let actualConnections = 0;
        await forEachSwarmAndAgent(
          env.params.replicantId,
          Object.keys(env.params.agents),
          swarms,
          async (swarmIdx, swarm, replicantId) => {
            log.info('testing connection', { replicantId, swarmIdx });
            try {
              await swarm.protocol.testConnection(PublicKey.from(replicantId), 'hello world');
              actualConnections++;
              log.info('test connection succeeded', { replicantId, swarmIdx });
            } catch (error) {
              log.info('test connection failed', { replicantId, swarmIdx, error });
            }
          },
        );

        log.info('test connections done', { testCounter, replicantId, targetConnections, actualConnections });
        await env.syncBarrier(`connections are tested on ${testCounter}`);
      }

      // Test delayed swarm.
      {
        log.info('testing delayed swarm', { replicantId, testCounter });
        await joinSwarm({
          context,
          swarmIdx: swarmTopicIds.length,
          replicantId,
          numAgents,
          targetSwarmTimeout: spec.targetSwarmTimeout,
          fullSwarmTimeout: spec.fullSwarmTimeout,
          swarm: delayedSwarm,
        });

        await Promise.all(
          Object.keys(env.params.agents)
            .filter((replicantId) => replicantId !== env.params.replicantId)
            .map(async (replicantId) => {
              try {
                await delayedSwarm.protocol.testConnection(PublicKey.from(replicantId), 'hello world');
              } catch (error) {
                log.info('test delayed swarm failed', { replicantId, error });
              }
            }),
        );

        await leaveSwarm({
          context,
          swarmIdx: swarmTopicIds.length,
          swarm: delayedSwarm,
          replicantId,
          fullSwarmTimeout: spec.fullSwarmTimeout,
        });

        await env.syncBarrier(`delayed swarm is tested on ${testCounter}`);
      }

      // Close streams.
      {
        log.info('closing streams', { replicantId });

        await forEachSwarmAndAgent(
          env.params.replicantId,
          Object.keys(env.params.agents),
          swarms,
          async (swarmIdx, swarm, replicantId) => {
            log.info('closing stream', { replicantId, swarmIdx });
            try {
              const streamTag = `stream-test-${testCounter}-${env.params.replicantId}-${replicantId}-${swarmIdx}`;
              const stats = await swarm.protocol.closeStream(PublicKey.from(replicantId), streamTag);

              log.info('test stream closed', { replicantId, swarmIdx, ...stats });
            } catch (error) {
              log.info('test stream closing failed', { replicantId, swarmIdx, error });
            }
          },
        );

        log.info('streams closed', { testCounter, replicantId });
        await env.syncBarrier(`streams are closed at ${testCounter}`);
      }

      // Leave all swarms.
      {
        log.info('closing all swarms');

        await Promise.all(
          swarms.map(async (swarm, swarmIdx) => {
            await leaveSwarm({ context, swarmIdx, swarm, replicantId, fullSwarmTimeout: spec.fullSwarmTimeout });
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

    log.info('test completed', { replicantId });
  }

  async finish(params: TestParams<TransportTestSpec>, results: ReplicantsSummary): Promise<any> {
    await this.signalBuilder.destroy();

    const muxerStats = new Map<string, SerializedLogEntry<TeleportStatsLog>[]>();
    const testStats = new Map<string, SerializedLogEntry<TestStatsLog>[]>();

    const reader = getReader(results);
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

    if (params.spec.showPNG) {
      await this.generatePNG(muxerStats, testStats);
    }

    //
    // Connections.
    //
    return analyzeConnections(reader);
  }

  private async generatePNG(
    muxerStats: Map<string, SerializedLogEntry<TeleportStatsLog>[]>,
    testStats: Map<string, SerializedLogEntry<TestStatsLog>[]>,
  ) {
    let colorIdx = 0;
    showPNG(
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
  replicantId: string;
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
    let connections = peerConnections.get(entry.context.replicantId);
    if (!connections) {
      connections = new Map<string, ConnectionEntry>();
      peerConnections.set(entry.context.replicantId, connections);
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
