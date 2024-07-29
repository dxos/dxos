//
// Copyright 2024 DXOS.org
//

import { type Message } from '@dxos/automerge/automerge-repo';
import { CustomCounter, type TimeAware, trace } from '@dxos/tracing';
import { CircularBuffer, mapValues, RunningWindowSummary } from '@dxos/util';

import { type NetworkDataMonitor } from './echo-network-adapter';
import { type StorageAdapterDataMonitor } from './leveldb-storage-adapter';
import { isCollectionQueryMessage, isCollectionStateMessage } from './network-protocol';

export type EchoDataMonitorOptions = {
  timeSeriesLength: number;
};

@trace.resource()
export class EchoDataMonitor implements StorageAdapterDataMonitor, NetworkDataMonitor, TimeAware {
  private _lastTick = 0;

  private _activeCounters = createLocalCounters();
  private _lastCompleteCounters: LocalCounters | undefined;
  private readonly _localTimeSeries = createLocalTimeSeries();
  private readonly _storageAverages = createStorageAverages();
  private readonly _replicationAverages = createNetworkAverages();
  private readonly _sizeByMessageType: { [type: string]: RunningWindowSummary } = {};
  private readonly _lastReceivedMessages = new CircularBuffer<StoredMessage>(100);
  private readonly _lastSentMessages = new CircularBuffer<StoredMessage>(100);

  private _connectionsCount = 0;

  @trace.metricsCounter()
  private readonly _stats = new CustomCounter(() => this.computeStats());

  @trace.metricsCounter()
  private readonly _timeSeries = new CustomCounter(() => this._localTimeSeries);

  constructor(private readonly _params: EchoDataMonitorOptions = { timeSeriesLength: 30 }) {}

  public tick(timeMs: number) {
    this._advanceTimeWindow(timeMs - this._lastTick);
    this._lastTick = timeMs;
  }

  public computeStats(): EchoDataStats {
    return {
      storage: {
        reads: {
          payloadSize: this._storageAverages.loadedChunkSize.average(),
          opDuration: 0,
          countPerSecond: this._storageAverages.loadsPerSecond.average(),
        },
        writes: {
          payloadSize: this._storageAverages.storedChunkSize.average(),
          opDuration: 0,
          countPerSecond: this._storageAverages.storesPerSecond.average(),
        },
      },
      replicator: {
        connections: this._connectionsCount,
        receivedMessages: {
          payloadSize: this._replicationAverages.receivedMessageSize.average(),
          countPerSecond: this._replicationAverages.receivedPerSecond.average(),
        },
        sentMessages: {
          payloadSize: this._replicationAverages.sentMessageSize.average(),
          opDuration: this._replicationAverages.sendDuration.average(),
          countPerSecond: this._replicationAverages.sentPerSecond.average(),
          failedPerSecond: this._replicationAverages.sendsFailedPerSecond.average(),
        },
        countByMessageType: this._computeMessageHistogram('type'),
        avgSizeByMessageType: mapValues(this._sizeByMessageType, (summary) => summary.average()),
      },
    };
  }

  @trace.info()
  public get connectionsCount() {
    return this._connectionsCount;
  }

  /**
   * @internal
   */
  @trace.info({ depth: 3 })
  get lastPerSecondStats() {
    return this._lastCompleteCounters;
  }

  /**
   * @internal
   */
  get timeSeries() {
    return { ...this._localTimeSeries.storage, ...this._localTimeSeries.replication };
  }

  /**
   * @internal
   */
  get messagesByPeerId() {
    return this._computeMessageHistogram('peerId');
  }

  private _advanceTimeWindow(millisPassed: number) {
    const oldMetrics = Object.freeze(this._activeCounters);
    this._activeCounters = createLocalCounters();
    this._lastCompleteCounters = oldMetrics;
    for (const peerId of Object.keys(oldMetrics.byPeerId)) {
      this._activeCounters.byPeerId[peerId] = createMessageCounter();
    }
    this._addToTimeSeries(oldMetrics.replication, this._localTimeSeries.replication);
    this._addToTimeSeries(oldMetrics.storage, this._localTimeSeries.storage);
    // Prevent skewed measurements of incomplete buckets / after CPU freezes.
    if (Math.abs(millisPassed - 1000) < 100) {
      this._reportPerSecondRate(oldMetrics);
    }
  }

  private _addToTimeSeries<T extends object>(values: T, timeSeries: TimeSeries<T>) {
    for (const [key, value] of Object.entries(values)) {
      const values: (typeof value)[] = (timeSeries as any)[key];
      values.push(value);
      if (values.length > this._params.timeSeriesLength) {
        values.shift();
      }
    }
  }

  private _reportPerSecondRate(metrics: LocalCounters) {
    const toReport: [string, number, RunningWindowSummary][] = [
      ['storage.load', metrics.storage.loadedChunks, this._storageAverages.loadsPerSecond],
      ['storage.store', metrics.storage.storedChunks, this._storageAverages.storesPerSecond],
      ['storage.receive', metrics.replication.received, this._replicationAverages.receivedPerSecond],
      ['storage.send', metrics.replication.sent, this._replicationAverages.sentPerSecond],
    ];
    for (const [metricName, metric, summary] of toReport) {
      summary.record(metric);
      if (metric > 0) {
        trace.metrics.distribution(`dxos.echo.${metricName}-rate`, metric);
        trace.metrics.increment(`dxos.echo.${metricName}`, 1, { tags: { status: 'busy' } });
      } else {
        trace.metrics.increment(`dxos.echo.${metricName}`, 1, { tags: { status: 'idle' } });
      }
    }
    this._replicationAverages.sendsFailedPerSecond.record(metrics.replication.failed);
  }

  public recordPeerConnected(peerId: string) {
    this._activeCounters.byPeerId[peerId] = createMessageCounter();
    this._connectionsCount++;
  }

  public recordPeerDisconnected(peerId: string) {
    this._connectionsCount--;
    delete this._activeCounters.byPeerId[peerId];
  }

  public recordBytesStored(count: number) {
    this._activeCounters.storage.storedChunks++;
    this._activeCounters.storage.storedBytes += count;
    this._storageAverages.storedChunkSize.record(count);
    trace.metrics.distribution('dxos.echo.storage.bytes-stored', count, { unit: 'bytes' });
  }

  public recordBytesLoaded(count: number) {
    this._activeCounters.storage.loadedChunks++;
    this._activeCounters.storage.loadedBytes += count;
    this._storageAverages.loadedChunkSize.record(count);
    trace.metrics.distribution('dxos.echo.storage.bytes-loaded', count, { unit: 'bytes' });
  }

  public recordMessageSent(message: Message, duration: number) {
    let metricsGroupName;
    const bytes = getByteCount(message);
    const tags = { type: message.type };
    if (isAutomergeProtocolMessage(message)) {
      this._activeCounters.replication.sent++;
      this._replicationAverages.sendDuration.record(duration);
      this._replicationAverages.sentMessageSize.record(bytes);
      metricsGroupName = 'replication';
    } else {
      metricsGroupName = 'collection-sync';
    }
    trace.metrics.distribution(`dxos.echo.${metricsGroupName}.bytes-out`, bytes, { unit: 'bytes', tags });
    trace.metrics.distribution(`dxos.echo.${metricsGroupName}.send-duration`, duration, { unit: 'millisecond', tags });
    const { messageSize, messageCounts } = this._getStatsForType(message);
    messageSize.record(bytes);
    messageCounts.sent++;
    this._lastSentMessages.push({ type: message.type, peerId: message.targetId });
  }

  public recordMessageReceived(message: Message) {
    const bytes = getByteCount(message);
    const tags = { type: message.type };
    if (isAutomergeProtocolMessage(message)) {
      this._activeCounters.replication.received++;
      this._replicationAverages.receivedMessageSize.record(bytes);
      trace.metrics.distribution('dxos.echo.replication.bytes-in', bytes, { unit: 'bytes', tags });
    } else {
      trace.metrics.distribution('dxos.echo.collection-sync.bytes-in', bytes, { unit: 'bytes', tags });
    }
    const { messageSize, messageCounts } = this._getStatsForType(message);
    messageSize.record(bytes);
    messageCounts.received++;
    this._lastReceivedMessages.push({ type: message.type, peerId: message.senderId });
  }

  public recordMessageSendingFailed(message: Message) {
    const tags = { type: message.type };
    if (isAutomergeProtocolMessage(message)) {
      this._activeCounters.replication.failed++;
      trace.metrics.distribution('dxos.echo.replication.send-failed', 1, { unit: 'bytes', tags });
    } else {
      trace.metrics.distribution('dxos.echo.collection-sync.send-failed', 1, { unit: 'bytes', tags });
    }
    const { messageCounts } = this._getStatsForType(message);
    messageCounts.failed++;
  }

  private _getStatsForType(message: Message) {
    const messageSize = (this._sizeByMessageType[message.type] ??= createRunningAverage());
    const messageCounts = (this._activeCounters.byType[message.type] ??= createMessageCounter());
    return { messageCounts, messageSize };
  }

  private _computeMessageHistogram(groupKey: keyof StoredMessage): MessageAttributeHistogram {
    const result: MessageAttributeHistogram = {};
    for (const receivedMessage of this._lastReceivedMessages) {
      const counters = (result[receivedMessage[groupKey]] ??= { received: 0, sent: 0 });
      counters.received++;
    }
    for (const receivedMessage of this._lastSentMessages) {
      const counters = (result[receivedMessage[groupKey]] ??= { received: 0, sent: 0 });
      counters.sent++;
    }
    return result;
  }
}

type BaseDataOpStats = {
  payloadSize: number;
  countPerSecond: number;
};

export type TimedDataOpStats = BaseDataOpStats & { opDuration: number };

type TimeSeries<T extends object> = { [key in keyof T]: T[key][] };

type StorageCounts = {
  storedChunks: number;
  storedBytes: number;
  loadedChunks: number;
  loadedBytes: number;
};
type StorageCountTimeSeries = TimeSeries<StorageCounts>;

type MessageCounts = {
  sent: number;
  received: number;
  failed: number;
};
type MessageCountTimeSeries = TimeSeries<MessageCounts>;

type MessageAttributeHistogram = {
  [messageType: string]: {
    received: number;
    sent: number;
  };
};

export type EchoDataStats = {
  storage: {
    reads: TimedDataOpStats;
    writes: TimedDataOpStats;
  };
  replicator: {
    connections: number;
    receivedMessages: BaseDataOpStats;
    sentMessages: TimedDataOpStats & { failedPerSecond: number };
    avgSizeByMessageType: { [messageType: string]: number };
    countByMessageType: MessageAttributeHistogram;
  };
};

type StoredMessage = { type: string; peerId: string };

type StorageAverages = {
  storedChunkSize: RunningWindowSummary;
  storesPerSecond: RunningWindowSummary;
  loadedChunkSize: RunningWindowSummary;
  loadsPerSecond: RunningWindowSummary;
};

type NetworkAverages = {
  receivedMessageSize: RunningWindowSummary;
  receivedPerSecond: RunningWindowSummary;
  sentMessageSize: RunningWindowSummary;
  sentPerSecond: RunningWindowSummary;
  sendDuration: RunningWindowSummary;
  sendsFailedPerSecond: RunningWindowSummary;
};

type LocalCounters = {
  storage: StorageCounts;
  replication: MessageCounts;
  byPeerId: { [peerId: string]: MessageCounts };
  byType: { [type: string]: MessageCounts };
};

type LocalTimeSeries = {
  storage: StorageCountTimeSeries;
  replication: MessageCountTimeSeries;
};

const isAutomergeProtocolMessage = (message: Message) => {
  return !(isCollectionQueryMessage(message) || isCollectionStateMessage(message));
};

const createRunningAverage = () => new RunningWindowSummary({ dataPoints: 25, precision: 2 });

const createLocalCounters = (): LocalCounters => ({
  storage: { loadedBytes: 0, storedBytes: 0, storedChunks: 0, loadedChunks: 0 },
  replication: createMessageCounter(),
  byPeerId: {},
  byType: {},
});

const createLocalTimeSeries = (): LocalTimeSeries => ({
  storage: { loadedBytes: [], storedBytes: [], storedChunks: [], loadedChunks: [] },
  replication: { sent: [], failed: [], received: [] },
});

const createMessageCounter = (): MessageCounts => ({ sent: 0, received: 0, failed: 0 });

const createNetworkAverages = (): NetworkAverages => ({
  receivedMessageSize: createRunningAverage(),
  sentMessageSize: createRunningAverage(),
  sendDuration: createRunningAverage(),
  receivedPerSecond: createRunningAverage(),
  sentPerSecond: createRunningAverage(),
  sendsFailedPerSecond: createRunningAverage(),
});

const createStorageAverages = (): StorageAverages => ({
  storedChunkSize: createRunningAverage(),
  loadedChunkSize: createRunningAverage(),
  loadsPerSecond: createRunningAverage(),
  storesPerSecond: createRunningAverage(),
});

const getByteCount = (message: Message): number => {
  return (
    message.type.length +
    message.senderId.length +
    message.targetId.length +
    (message.data?.byteLength ?? 0) +
    (message.documentId?.length ?? 0)
  );
};
