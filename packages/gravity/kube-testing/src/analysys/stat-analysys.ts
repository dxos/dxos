//
// Copyright 2023 DXOS.org
//

import { Series } from 'danfojs-node';

import { log } from '@dxos/log';

import { PlanResults } from '../plan/spec-base';
import { LogReader, TraceEvent } from './logging';

const seriesToJson = (s: Series) => {
  const indexes = s.index;
  return Object.fromEntries(
    (s.values as Array<number>).map((val, i) => {
      return [indexes[i], val];
    })
  );
};

const getStats = (series: number[], additionalMetrics: Record<string, number> = {}) => {
  const stats = new Series(series).describe() as Series;

  const values: number[] = [];
  const indexes: string[] = [];
  Object.entries(additionalMetrics).forEach(([key, value]) => {
    values.push(value);
    indexes.push(key);
  });

  stats.append(values, indexes, { inplace: true });
  stats.config.setMaxRow(20);
  stats.print();

  return seriesToJson(stats);
};

export const mapToJson = (m: Map<string, any>) => {
  return Object.fromEntries(
    Array.from(m.entries()).map(([key, val]) => {
      const decodeVal = (val: any): any => {
        if (val instanceof Map) {
          return mapToJson(val);
        }
        if (val instanceof Object) {
          return Object.fromEntries(Object.entries(val).map(([key, val]) => [key, decodeVal(val)]));
        }
        return val;
      };
      const decoded: any = decodeVal(val);
      return [key, decoded];
    })
  );
};

export const analyzeMessages = async (results: PlanResults) => {
  const messages = new Map<string, { sent?: number; received?: number }>();

  const reader = getReader(results);

  for await (const entry of reader) {
    if (entry.message !== 'dxos.test.signal') {
      continue;
    }
    const data: TraceEvent = entry.context;

    if (data.type !== 'SENT_MESSAGE' && data.type !== 'RECEIVE_MESSAGE') {
      continue;
    }
    if (!messages.has(data.message)) {
      messages.set(data.message, { sent: undefined, received: undefined });
    }

    switch (data.type) {
      case 'SENT_MESSAGE':
        messages.get(data.message)!.sent = entry.timestamp;
        break;
      case 'RECEIVE_MESSAGE':
        messages.get(data.message)!.received = entry.timestamp;
        break;
    }
  }

  const failures = Array.from(messages.values()).filter((x) => !x.received || !x.sent).length;
  const lagTimes = Array.from(messages.values())
    .filter((x) => !!x.sent && !!x.received)
    .map((x) => x.received! - x.sent!);

  return getStats(lagTimes, {
    failures,
    failureRate: failures / (lagTimes.length + failures),
    ...(await analyzeRunFailures(reader))
  });
};

export const analyzeSwarmEvents = async (results: PlanResults) => {
  const start = Date.now();
  /**
   * topic -> peerId -> { join: time, left: time, seen: peerId -> ts}
   */
  const topics = new Map<string, Map<string, { join?: number; leave?: number; seen: Map<string, number> }>>();

  const reader = getReader(results);

  for await (const entry of reader) {
    if (entry.message !== 'dxos.test.signal') {
      continue;
    }
    const data: TraceEvent = entry.context;

    //
    // Propagate map
    //
    if (
      data.type === 'JOIN_SWARM' ||
      data.type === 'LEAVE_SWARM' ||
      data.type === 'PEER_AVAILABLE' ||
      data.type === 'PEER_LEFT'
    ) {
      if (!topics.has(data.topic)) {
        topics.set(data.topic, new Map());
      }
      if (!topics.get(data.topic)!.has(data.peerId)) {
        topics.get(data.topic)!.set(data.peerId, { join: undefined, leave: undefined, seen: new Map() });
      }
    }
    switch (data.type) {
      case 'JOIN_SWARM': {
        topics.get(data.topic)!.get(data.peerId)!.join = entry.timestamp;
        break;
      }
      case 'LEAVE_SWARM': {
        topics.get(data.topic)!.get(data.peerId)!.leave = entry.timestamp;
        break;
      }
      case 'PEER_AVAILABLE': {
        const oldTimestamp = topics.get(data.topic)!.get(data.peerId)!.seen.get(data.discoveredPeer);
        if (oldTimestamp && oldTimestamp < entry.timestamp) {
          break;
        }
        topics.get(data.topic)!.get(data.peerId)!.seen.set(data.discoveredPeer, entry.timestamp);
        break;
      }
    }
  }
  let failures = 0;
  let ignored = 0;
  const discoverLag = [0];
  const failureTtt = []; // Time Together on Topic

  for (const [_, peersPerTopic] of topics.entries()) {
    for (const [peerId, timings] of peersPerTopic.entries()) {
      for (const [expectedPeer, expectedPeerTimings] of peersPerTopic.entries()) {
        if (expectedPeer === peerId) {
          continue;
        }

        if (
          timings.join === undefined ||
          timings.leave === undefined ||
          expectedPeerTimings.join === undefined ||
          expectedPeerTimings.leave === undefined
        ) {
          // Not enough information
          ignored++;
          continue;
        }

        const timeTogetherOnTopic = Math.min(
          expectedPeerTimings.leave - timings.join,
          timings.leave - expectedPeerTimings.join
        );

        if (timeTogetherOnTopic < 0) {
          // Different iterations, do not intersect in time
          continue;
        }

        if (timeTogetherOnTopic < 500) {
          // Same iteration, but very small time window to interact.
          ignored++;
          continue;
        }

        if (!timings.seen.has(expectedPeer)) {
          failureTtt.push(timeTogetherOnTopic);
          failures++;
          continue;
        }
        const discoverTime = timings.seen.get(expectedPeer)!;
        discoverLag.push(discoverTime - expectedPeerTimings.join);
      }
    }
  }

  log.info(`analyzeSwarmEvents: ${Date.now() - start}ms`);

  return getStats(discoverLag, {
    ignored,
    failures,
    failureRate: failures / (discoverLag.length + failures),
    fttMean: failureTtt.length > 0 ? new Series(failureTtt).mean() : NaN,
    ...(await analyzeRunFailures(reader))
  });
};

const getReader = (results: PlanResults) => {
  const start = Date.now();
  const reader = new LogReader();

  for (const { logFile } of Object.values(results.agents)) {
    reader.addFile(logFile);
  }

  log.info(`LogReader: ${Date.now() - start}ms`);
  return reader;
};

const analyzeRunFailures = async (reader: LogReader) => {
  const start = Date.now();
  /**
   * peerId -> {iterations: number, errors: number}
   */
  const peers = new Map<string, { errors: number; iterations: number }>();

  let errors = 0;
  let runs = 0;
  for await (const entry of reader) {
    if (!entry.message || !entry.message.startsWith('dxos.test.signal')) {
      continue;
    }

    const data: TraceEvent = entry.context;
    //
    // Propagate map
    //
    if (data.type === 'ITERATION_START' || data.type === 'ITERATION_ERROR') {
      if (!peers.has(data.peerId)) {
        peers.set(data.peerId, { errors: 0, iterations: 0 });
      }
      switch (data.type) {
        case 'ITERATION_START': {
          runs++;
          peers.get(data.peerId)!.iterations++;
          break;
        }
        case 'ITERATION_ERROR': {
          errors++;
          peers.get(data.peerId)!.errors++;
          break;
        }
      }
    }
  }

  for (const [_, { errors, iterations }] of peers.entries()) {
    if (iterations !== 1) {
      log.warn('Not one iteration per Peer');
    }
    if (errors > 1) {
      log.warn('More than one error per Peer');
    }
  }

  log.info(`analyzeRunFailures: ${Date.now() - start}ms`);
  return {
    runs,
    runErrors: errors,
    runErrorsRate: errors / runs
  };
};
