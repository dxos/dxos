//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { TransportKind } from '@dxos/network-manager';
import { defaultMap, range } from '@dxos/util';

import { BORDER_COLORS, type LogReader, type SerializedLogEntry, getReader, renderPNG, showPNG } from '../analysys';
import { type SchedulerEnvImpl } from '../env';
import { type ReplicantsSummary, type TestPlan, type TestProps } from '../plan';
import { TransportReplicant } from '../replicants/transport-replicant';
import { TestBuilder as SignalTestBuilder } from '../test-builder';

export type TransportTestSpec = {
  replicants: number;
  swarmsPerReplicant: number;
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

export class TransportTestPlan implements TestPlan<TransportTestSpec> {
  signalBuilder = new SignalTestBuilder();
  onError?: (err: Error) => void;

  defaultSpec(): TransportTestSpec {
    return {
      replicants: 4,
      swarmsPerReplicant: 10,
      duration: 60_000,
      transport: TransportKind.WEB_RTC,
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

  async run(env: SchedulerEnvImpl<TransportTestSpec>, params: TestProps<TransportTestSpec>): Promise<void> {
    const signal = await this.signalBuilder.createSignalServer(0, params.outDir, params.spec.signalArguments, (err) => {
      log.error('error in signal server', { err });
      this.onError?.(err);
    });
    const signalUrl = signal.url();

    const swarmTopicIds = range(params.spec.swarmsPerReplicant).map(() => PublicKey.random().toHex());
    const swarmPeerIds = Array(params.spec.replicants)
      .fill(0)
      .map(() => PublicKey.random().toHex());

    for (let replicantIdx = 0; replicantIdx < params.spec.replicants; replicantIdx++) {
      await env.spawn(TransportReplicant, { platform: 'nodejs' });
    }

    await Promise.all(
      env.replicants.map(async (replicant, idx) =>
        replicant.brain.run({
          swarmPeerId: swarmPeerIds[idx],
          transport: params.spec.transport,
          signalUrl,

          amountOfReplicants: params.spec.replicants,
          swarmsPerReplicant: params.spec.swarmsPerReplicant,
          otherSwarmPeerIds: swarmPeerIds,
          swarmTopicIds,

          duration: params.spec.duration,
          repeatInterval: params.spec.repeatInterval,
          targetSwarmTimeout: params.spec.targetSwarmTimeout,
          fullSwarmTimeout: params.spec.fullSwarmTimeout,
          streamLoadInterval: params.spec.streamLoadInterval,
          streamLoadChunkSize: params.spec.streamLoadChunkSize,
          streamsDelay: params.spec.streamsDelay,
        }),
      ),
    );
  }

  async analyze(params: TestProps<TransportTestSpec>, results: ReplicantsSummary): Promise<any> {
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
  ): Promise<void> {
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
