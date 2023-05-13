//
// Copyright 2023 DXOS.org
//

import { Series } from 'danfojs-node';

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
      let decoded = val;
      if (val instanceof Map) {
        decoded = mapToJson(val);
      }
      return [key, decoded];
    })
  );
};

export const analyzeMessages = async (results: PlanResults) => {
  const messages = new Map<string, { sent?: number; received?: number }>();
  const reader = new LogReader();

  for (const { logFile } of Object.values(results.agents)) {
    reader.addFile(logFile);
  }

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
  console.log('Succesfull messages', lagTimes.length);

  return getStats(lagTimes, { failures, failureRate: failures / lagTimes.length });
};

export const analyzeSwarmEvents = async (results: PlanResults) => {
  /**
   * topic -> peerId -> { join: time, left: time, seen: peerId -> ts}
   */
  const topics = new Map<string, Map<string, { join?: number; leave?: number; seen: Map<string, number> }>>();

  const reader = new LogReader();

  for (const { logFile } of Object.values(results.agents)) {
    reader.addFile(logFile);
  }

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
          continue;
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
    for (const [peerId, seen] of peersPerTopic.entries()) {
      for (const [expectedPeer, timings] of peersPerTopic.entries()) {
        if (expectedPeer === peerId) {
          continue;
        }
        const timeTogetherOnTopic = Math.min(seen.leave! - timings.join!, timings.leave! - seen.join!);
        if (timeTogetherOnTopic < 0) {
          continue;
        }
        if (timeTogetherOnTopic < 500) {
          // Different iterations, do not intersect in time
          if (timeTogetherOnTopic > 0) {
            ignored++;
          }
          continue;
        }
        if (!seen.seen.has(expectedPeer)) {
          failureTtt.push(timeTogetherOnTopic);
          failures++;
          continue;
        }
        const discoverTime = seen.seen.get(expectedPeer)!;
        discoverLag.push(discoverTime - timings.join!);
      }
    }
  }

  return getStats(discoverLag, {
    ignored,
    failures,
    failureRate: failures / discoverLag.length,
    fttMean: failureTtt.length > 0 ? new Series(failureTtt).mean() : NaN
  });
};
