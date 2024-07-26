//
// Copyright 2024 DXOS.org
//

import { type Message } from '@dxos/automerge/automerge-repo';
import { log } from '@dxos/log';
import { type TimeAware, trace } from '@dxos/tracing';

import { type NetworkDataMonitor } from './echo-network-adapter';
import { type StorageAdapterDataMonitor } from './leveldb-storage-adapter';
import { isCollectionQueryMessage, isCollectionStateMessage } from './network-protocol';

export type EchoDataMonitorOptions = {
  buckets: number;
};

type ByteCounts = { bytesIn: number; bytesOut: number };

type MessageCounts = {
  sent: number;
  sendDuration: number;
  received: number;
  failed: number;
};

type LocalMetrics = {
  storage: ByteCounts & {
    storedChunks: number;
    loadedChunks: number;
  };

  connectionCount: number;
  replication: ByteCounts & MessageCounts;
  collectionSync: ByteCounts & MessageCounts;
  byMessageType: { [type: string]: MessageCounts };
  byPeerId: { [peerId: string]: MessageCounts };
};

@trace.resource()
export class EchoDataMonitor implements StorageAdapterDataMonitor, NetworkDataMonitor, TimeAware {
  @trace.info()
  private _buckets: LocalMetrics[] = [];

  private _localMetrics: LocalMetrics = createLocalCounters();

  private _lastTick = 0;

  constructor(private readonly _params: EchoDataMonitorOptions = { buckets: 5 }) {}

  public tick(timeMs: number) {
    this._advanceTimeWindow(timeMs - this._lastTick);
    this._lastTick = timeMs;
  }

  private _advanceTimeWindow(millisPassed: number) {
    const oldMetrics = this._localMetrics;
    this._localMetrics = createLocalCounters();
    this._localMetrics.connectionCount = oldMetrics.connectionCount;
    for (const peerId of Object.keys(oldMetrics)) {
      this._localMetrics.byPeerId[peerId] = createMessageCounter();
    }
    this._buckets.push(oldMetrics);
    if (this._buckets.length > this._params.buckets) {
      this._buckets.shift();
    }
    if (Math.abs(millisPassed - 1000) < 0) {
      this._reportPerSecondRate(oldMetrics);
    }
  }

  private _reportPerSecondRate(metrics: LocalMetrics) {
    const toReport: [string, number][] = [
      ['storage.load', metrics.storage.loadedChunks],
      ['storage.store', metrics.storage.storedChunks],
      ['storage.receive', metrics.replication.received],
      ['storage.send', metrics.replication.sent],
    ];
    for (const [metricName, metric] of toReport) {
      if (metric > 0) {
        trace.metrics.distribution(`dxos.echo.${metricName}-rate`, metric);
        trace.metrics.increment(`dxos.echo.${metricName}`, 1, { tags: { status: 'busy' } });
      } else {
        trace.metrics.increment(`dxos.echo.${metricName}`, 1, { tags: { status: 'idle' } });
      }
    }
  }

  public recordPeerConnected(peerId: string) {
    this._localMetrics.byPeerId[peerId] = createMessageCounter();
    this._localMetrics.connectionCount++;
  }

  public recordPeerDisconnected(peerId: string) {
    this._localMetrics.connectionCount--;
    delete this._localMetrics.byPeerId[peerId];
  }

  public recordBytesStored(count: number) {
    this._localMetrics.storage.bytesIn += count;
    this._localMetrics.storage.storedChunks++;
    trace.metrics.distribution('dxos.echo.storage.bytes-stored', count, { unit: 'bytes' });
  }

  public recordBytesLoaded(args: { byteCount: number; chunkCount: number }) {
    if (args.chunkCount > 0) {
      this._localMetrics.storage.bytesIn += args.byteCount;
      this._localMetrics.storage.storedChunks += args.chunkCount;
      trace.metrics.distribution('dxos.echo.storage.bytes-loaded', args.byteCount / args.chunkCount, { unit: 'bytes' });
    }
  }

  public recordMessageSent(message: Message, duration: number) {
    const bytes = getByteCount(message);
    const { metricsGroup, metricsGroupName } = this._getMetricsGroup(message);

    const tags = { type: message.type };
    trace.metrics.distribution(`dxos.echo.${metricsGroupName}.bytes-out`, bytes, { unit: 'bytes', tags });
    trace.metrics.distribution(`dxos.echo.${metricsGroupName}.send-duration`, duration, { unit: 'millisecond', tags });

    metricsGroup.sendDuration += duration;
    metricsGroup.bytesOut += bytes;
    metricsGroup.sent++;

    this._updateGroupedMetrics(message, message.targetId, (counts) => {
      counts.sent++;
      counts.sendDuration += duration;
    });
  }

  public recordMessageReceived(message: Message) {
    const bytes = getByteCount(message);
    const { metricsGroup, metricsGroupName } = this._getMetricsGroup(message);

    const tags = { type: message.type };
    trace.metrics.distribution(`dxos.echo.${metricsGroupName}.bytes-in`, bytes, { unit: 'bytes', tags });

    metricsGroup.bytesIn += bytes;
    metricsGroup.received++;

    this._updateGroupedMetrics(message, message.senderId, (counts) => counts.received++);
  }

  public recordMessageSendingFailed(message: Message) {
    const { metricsGroup, metricsGroupName } = this._getMetricsGroup(message);
    const tags = { type: message.type };
    trace.metrics.increment(`dxos.echo.${metricsGroupName}.send-failed`, 1, { tags });
    metricsGroup.failed++;
    this._updateGroupedMetrics(message, message.targetId, (counts) => counts.failed++);
  }

  private _updateGroupedMetrics(message: Message, peerId: string, update: (counts: MessageCounts) => void) {
    const byMessageType = (this._localMetrics.byMessageType[message.type] ??= createMessageCounter());
    update(byMessageType);
    const byPeer = this._localMetrics.byPeerId[peerId];
    if (byPeer) {
      update(byPeer);
    } else {
      const messageDirection = message.targetId === peerId ? 'to' : 'from';
      log.warn(`record a message ${messageDirection} unknown peer`, { type: message.type, peerId });
    }
  }

  private _getMetricsGroup(message: Message) {
    if (isCollectionSyncMessage(message)) {
      return { metricsGroup: this._localMetrics.collectionSync, metricsGroupName: 'collection-sync' };
    } else {
      return { metricsGroup: this._localMetrics.replication, metricsGroupName: 'replication' };
    }
  }
}

const isCollectionSyncMessage = (message: Message) => {
  return isCollectionQueryMessage(message) || isCollectionStateMessage(message);
};

const getByteCount = (message: Message): number => {
  return (
    message.type.length +
    message.senderId.length +
    message.targetId.length +
    (message.data?.byteLength ?? 0) +
    (message.documentId?.length ?? 0)
  );
};

const createLocalCounters = (): LocalMetrics => ({
  connectionCount: 0,
  storage: { ...createByteCounter(), storedChunks: 0, loadedChunks: 0 },
  replication: { ...createByteCounter(), ...createMessageCounter() },
  collectionSync: { ...createByteCounter(), ...createMessageCounter() },
  byMessageType: {},
  byPeerId: {},
});

const createMessageCounter = (): MessageCounts => ({
  sent: 0,
  sendDuration: 0,
  received: 0,
  failed: 0,
});

const createByteCounter = (): ByteCounts => ({ bytesOut: 0, bytesIn: 0 });
