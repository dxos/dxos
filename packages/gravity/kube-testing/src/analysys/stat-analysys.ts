//
// Copyright 2023 DXOS.org
//

import { Series } from 'danfojs-node';

import { PlanResults } from '../plan/spec-base';
import { LogReader, TraceEvent } from './reducer';

const seriesToJson = (s: Series) => {
  const indexes = s.index;
  return Object.fromEntries(
    (s.values as Array<number>).map((val, i) => {
      return [indexes[i], val];
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
  console.log(
    'Succesfull messages',
    Array.from(messages.values())
      .filter((x) => !!x.sent && !!x.received)
      .map((x) => x.received! - x.sent!).length
  );
  const lagTimes = new Series(
    Array.from(messages.values())
      .filter((x) => !!x.sent && !!x.received)
      .map((x) => x.received! - x.sent!)
  );

  const stats = lagTimes.describe() as Series;
  stats.append([failures], ['failures'], { inplace: true });

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

export const analyzeSwarmEvents = async (results: PlanResults) => {
  /**
   * topic -> (peer -> join/leave)
   */
  const expectedTopics = new Map<string, Map<string, { join?: number; leave?: number }>>();

  /**
   * peer -> (topic -> (peer  -> timestamp))
   */
  const seenPeers = new Map<string, Map<string, Map<string, number>>>();
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
    // Propagate `topics` map
    //
    if (data.type === 'JOIN_SWARM' || data.type === 'LEAVE_SWARM') {
      if (!expectedTopics.has(data.topic)) {
        expectedTopics.set(data.topic, new Map());
      }
      if (!expectedTopics.get(data.topic)!.has(data.peerId)) {
        expectedTopics.get(data.topic)!.set(data.peerId, { join: undefined, leave: undefined });
      }
    }
    switch (data.type) {
      case 'JOIN_SWARM': {
        expectedTopics.get(data.topic)!.get(data.peerId)!.join = entry.timestamp;
        break;
      }
      case 'LEAVE_SWARM': {
        expectedTopics.get(data.topic)!.get(data.peerId)!.leave = entry.timestamp;
        break;
      }
    }
    //
    // Propagate `seenPeers` map
    //
    if (data.type === 'PEER_AVAILABLE' || data.type === 'PEER_LEFT') {
      if (!seenPeers.has(data.peerId)) {
        seenPeers.set(data.peerId, new Map());
      }
      if (!seenPeers.get(data.peerId)!.has(data.topic)) {
        seenPeers.get(data.peerId)!.set(data.topic, new Map());
      }
    }
    switch (data.type) {
      case 'PEER_AVAILABLE': {
        const oldTimestamp = seenPeers.get(data.peerId)!.get(data.topic)!.get(data.discoveredPeer);
        if (oldTimestamp && oldTimestamp < entry.timestamp) {
          continue;
        }
        seenPeers.get(data.peerId)!.get(data.topic)!.set(data.discoveredPeer, entry.timestamp);
        break;
      }
    }
  }

  let failures = 0;
  const discoverLag = [];

  for (const [peer, joinedTopics] of seenPeers.entries()) {
    for (const [topic, peersPerTopic] of joinedTopics.entries()) {
      const expectedPeers = expectedTopics.get(topic);

      for (const [expectedPeer, timings] of expectedPeers!.entries()) {
        if (expectedPeer === peer) {
          continue;
        }
        if (!peersPerTopic.has(expectedPeer)) {
          failures++;
          continue;
        }
        const discoverTime = peersPerTopic.get(expectedPeer)!;
        if (discoverTime < timings.join! || timings.leave! < discoverTime) {
          continue;
        }
        discoverLag.push(discoverTime - timings.join!);
      }
    }
  }

  const lagTimes = new Series(discoverLag);
  const stats = lagTimes.describe() as Series;
  stats.append([failures], ['failures'], { inplace: true });

  stats.print();

  return seriesToJson(stats);
};
