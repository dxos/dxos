//
// Copyright 2024 DXOS.org
//

import { type Message } from '@automerge/automerge-repo';

import { type TimeAware, trace } from '@dxos/tracing';
import { CircularBuffer, SlidingWindowSummary, type SlidingWindowSummaryConfig, mapValues } from '@dxos/util';

import { type NetworkDataMonitor } from './echo-network-adapter';
import { type StorageAdapterDataMonitor } from './leveldb-storage-adapter';
import { isCollectionQueryMessage, isCollectionStateMessage } from './network-protocol';

const PER_SECOND_RATE_AVG_WINDOW_SIZE = 5;
const DEFAULT_AVG_WINDOW_SIZE = 25;

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
  private readonly _sizeByMessage: { [type: string]: SlidingWindowSummary } = {};
  private readonly _lastReceivedMessages = new CircularBuffer<StoredMessage>(100);
  private readonly _lastSentMessages = new CircularBuffer<StoredMessage>(100);

  private _connectionsCount = 0;

  constructor(private readonly _params: EchoDataMonitorOptions = { timeSeriesLength: 30 }) {}

  public tick(timeMs: number): void {
    this._advanceTimeWindow(timeMs - this._lastTick);
    this._lastTick = timeMs;
  }

  public computeStats(): EchoDataStats {
    return {
      meta: {
        rateAverageOverSeconds: PER_SECOND_RATE_AVG_WINDOW_SIZE,
      },
      storage: {
        reads: {
          payloadSize: this._storageAverages.loadedChunkSize.average(),
          opDuration: this._storageAverages.loadDuration.average(),
          countPerSecond: this._storageAverages.loadsPerSecond.average(),
        },
        writes: {
          payloadSize: this._storageAverages.storedChunkSize.average(),
          opDuration: this._storageAverages.storeDuration.average(),
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
        countByMessage: this._computeMessageHistogram('type'),
        avgSizeByMessage: mapValues(this._sizeByMessage, (summary) => summary.average()),
      },
    };
  }

  public get connectionsCount() {
    return this._connectionsCount;
  }

  /**
   * @internal
   */
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

  private _advanceTimeWindow(millisPassed: number): void {
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

  private _addToTimeSeries<T extends object>(values: T, timeSeries: TimeSeries<T>): void {
    for (const [key, value] of Object.entries(values)) {
      const values: (typeof value)[] = (timeSeries as any)[key];
      values.push(value);
      if (values.length > this._params.timeSeriesLength) {
        values.shift();
      }
    }
  }

  private _reportPerSecondRate(metrics: LocalCounters): void {
    const toReport: [string, number, SlidingWindowSummary][] = [
      ['storage.load', metrics.storage.loadedChunks, this._storageAverages.loadsPerSecond],
      ['storage.store', metrics.storage.storedChunks, this._storageAverages.storesPerSecond],
      ['network.receive', metrics.replication.received, this._replicationAverages.receivedPerSecond],
      ['network.send', metrics.replication.sent, this._replicationAverages.sentPerSecond],
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

  public recordPeerConnected(peerId: string): void {
    this._activeCounters.byPeerId[peerId] = createMessageCounter();
    this._connectionsCount++;
  }

  public recordPeerDisconnected(peerId: string): void {
    this._connectionsCount--;
    delete this._activeCounters.byPeerId[peerId];
  }

  public recordBytesStored(count: number): void {
    this._activeCounters.storage.storedChunks++;
    this._activeCounters.storage.storedBytes += count;
    this._storageAverages.storedChunkSize.record(count);
    trace.metrics.distribution('dxos.echo.storage.bytes-stored', count, { unit: 'bytes' });
  }

  public recordLoadDuration(durationMs: number): void {
    this._storageAverages.loadDuration.record(durationMs);
  }

  public recordStoreDuration(durationMs: number): void {
    this._storageAverages.storeDuration.record(durationMs);
  }

  public recordBytesLoaded(count: number): void {
    this._activeCounters.storage.loadedChunks++;
    this._activeCounters.storage.loadedBytes += count;
    this._storageAverages.loadedChunkSize.record(count);
    trace.metrics.distribution('dxos.echo.storage.bytes-loaded', count, { unit: 'bytes' });
  }

  public recordMessageSent(message: Message, duration: number): void {
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
    trace.metrics.distribution(`dxos.echo.${metricsGroupName}.bytes-sent`, bytes, { unit: 'bytes', tags });
    trace.metrics.distribution(`dxos.echo.${metricsGroupName}.send-duration`, duration, { unit: 'millisecond', tags });
    trace.metrics.increment(`dxos.echo.${metricsGroupName}.send-status`, 1, { tags: { ...tags, success: true } });
    const { messageSize, messageCounts } = this._getStatsForType(message);
    messageSize.record(bytes);
    messageCounts.sent++;
    this._lastSentMessages.push({ type: message.type, peerId: message.targetId });
  }

  public recordMessageReceived(message: Message): void {
    const bytes = getByteCount(message);
    const tags = { type: message.type };
    if (isAutomergeProtocolMessage(message)) {
      this._activeCounters.replication.received++;
      this._replicationAverages.receivedMessageSize.record(bytes);
      trace.metrics.distribution('dxos.echo.replication.bytes-received', bytes, { unit: 'bytes', tags });
    } else {
      trace.metrics.distribution('dxos.echo.collection-sync.bytes-received', bytes, { unit: 'bytes', tags });
    }
    const { messageSize, messageCounts } = this._getStatsForType(message);
    messageSize.record(bytes);
    messageCounts.received++;
    this._lastReceivedMessages.push({ type: message.type, peerId: message.senderId });
  }

  public recordMessageSendingFailed(message: Message): void {
    const tags = { type: message.type, success: false };
    if (isAutomergeProtocolMessage(message)) {
      this._activeCounters.replication.failed++;
      trace.metrics.increment('dxos.echo.replication.send-status', 1, { unit: 'bytes', tags });
    } else {
      trace.metrics.increment('dxos.echo.collection-sync.send-status', 1, { unit: 'bytes', tags });
    }
    const { messageCounts } = this._getStatsForType(message);
    messageCounts.failed++;
  }

  private _getStatsForType(message: Message): { messageCounts: MessageCounts; messageSize: SlidingWindowSummary } {
    const messageSize = (this._sizeByMessage[message.type] ??= createSlidingWindow());
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
  [Message: string]: {
    received: number;
    sent: number;
  };
};

export type EchoDataStats = {
  meta: {
    rateAverageOverSeconds: number;
  };
  storage: {
    reads: TimedDataOpStats;
    writes: TimedDataOpStats;
  };
  replicator: {
    connections: number;
    receivedMessages: BaseDataOpStats;
    sentMessages: TimedDataOpStats & { failedPerSecond: number };
    avgSizeByMessage: { [Message: string]: number };
    countByMessage: MessageAttributeHistogram;
  };
};

type StoredMessage = { type: string; peerId: string };

type StorageAverages = {
  storedChunkSize: SlidingWindowSummary;
  storesPerSecond: SlidingWindowSummary;
  loadedChunkSize: SlidingWindowSummary;
  loadsPerSecond: SlidingWindowSummary;
  loadDuration: SlidingWindowSummary;
  storeDuration: SlidingWindowSummary;
};

// TODO(burdon): Standardize: `sent`/`recv`.
type NetworkAverages = {
  receivedMessageSize: SlidingWindowSummary;
  receivedPerSecond: SlidingWindowSummary;
  sentMessageSize: SlidingWindowSummary;
  sentPerSecond: SlidingWindowSummary;
  sendDuration: SlidingWindowSummary;
  sendsFailedPerSecond: SlidingWindowSummary;
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

const isAutomergeProtocolMessage = (message: Message) =>
  !(isCollectionQueryMessage(message) || isCollectionStateMessage(message));

const createSlidingWindow = (overrides?: SlidingWindowSummaryConfig) =>
  new SlidingWindowSummary({ dataPoints: DEFAULT_AVG_WINDOW_SIZE, precision: 2, ...overrides });

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
  receivedMessageSize: createSlidingWindow(),
  sentMessageSize: createSlidingWindow(),
  sendDuration: createSlidingWindow(),
  receivedPerSecond: createSlidingWindow({ dataPoints: PER_SECOND_RATE_AVG_WINDOW_SIZE }),
  sentPerSecond: createSlidingWindow({ dataPoints: PER_SECOND_RATE_AVG_WINDOW_SIZE }),
  sendsFailedPerSecond: createSlidingWindow({ dataPoints: PER_SECOND_RATE_AVG_WINDOW_SIZE }),
});

const createStorageAverages = (): StorageAverages => ({
  storedChunkSize: createSlidingWindow(),
  loadedChunkSize: createSlidingWindow(),
  loadDuration: createSlidingWindow(),
  storeDuration: createSlidingWindow(),
  loadsPerSecond: createSlidingWindow({ dataPoints: PER_SECOND_RATE_AVG_WINDOW_SIZE }),
  storesPerSecond: createSlidingWindow({ dataPoints: PER_SECOND_RATE_AVG_WINDOW_SIZE }),
});

const getByteCount = (message: Message): number =>
  message.type.length +
  message.senderId.length +
  message.targetId.length +
  (message.data?.byteLength ?? 0) +
  (message.documentId?.length ?? 0);
