//
// Copyright 2023 DXOS.org
//

import type { Series } from 'danfojs-node';

import { log } from '@dxos/log';
import { entry, range } from '@dxos/util';

import { LogReader, type TraceEvent, zapPreprocessor } from './logging';
import { type PlanResults, type TestParams } from '../plan';
import { type SignalTestSpec } from '../spec';

const seriesToJson = (s: Series) => {
  const indexes = s.index;
  return Object.fromEntries(
    (s.values as Array<number>).map((val, i) => {
      return [indexes[i], val];
    }),
  );
};

const getStats = (series: number[], additionalMetrics: Record<string, number> = {}) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Series } = require('danfojs-node');
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
    }),
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
    ...(await analyzeRunFailures(reader)),
  });
};

export const analyzeSwarmEvents = async (params: TestParams<SignalTestSpec>, results: PlanResults) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Series } = require('danfojs-node');

  const start = Date.now();
  /**
   * topic -> peerId -> { join: time, left: time, seen: peerId -> ts}
   */
  const topics = new Map<
    string,
    Map<
      string,
      {
        join?: number;
        leave?: number;
        processed?: number;
        seen: Map<
          string,
          {
            discover?: number;
            notify?: number;
          }
        >;
      }
    >
  >();

  const reader = getReader(results);

  for (const i of range(params.spec.servers)) {
    reader.addFile(`${params.outDir}/signal-${i}.log`, { preprocessor: zapPreprocessor });
  }

  for await (const logEntry of reader) {
    switch (logEntry.message) {
      case 'dxos.test.signal': {
        const data: TraceEvent = logEntry.context;

        switch (data.type) {
          case 'JOIN_SWARM': {
            const timings = entry(topics, data.topic)
              .orInsert(new Map())
              .deep(data.peerId)
              .orInsert({ join: undefined, leave: undefined, seen: new Map() }).value;

            timings.join = logEntry.timestamp;
            break;
          }
          case 'LEAVE_SWARM': {
            const timings = entry(topics, data.topic)
              .orInsert(new Map())
              .deep(data.peerId)
              .orInsert({ join: undefined, leave: undefined, seen: new Map() }).value;

            timings.leave = logEntry.timestamp;
            break;
          }
          case 'PEER_AVAILABLE': {
            const timings = entry(topics, data.topic)
              .orInsert(new Map())
              .deep(data.peerId)
              .orInsert({ join: undefined, leave: undefined, seen: new Map() }).value;

            const discoverTimings = entry(timings.seen, data.discoveredPeer).orInsert({}).value;

            if (discoverTimings.discover && discoverTimings.discover < logEntry.timestamp) {
              break;
            }

            discoverTimings.discover = logEntry.timestamp;
            break;
          }
        }
        break;
      }
      case 'process event': {
        const data: { swarm: string; peer: string } = logEntry.context;

        const timings = entry(topics, data.swarm)
          .orInsert(new Map())
          .deep(data.peer)
          .orInsert({ join: undefined, leave: undefined, seen: new Map() }).value;

        timings.processed = logEntry.timestamp;
        break;
      }
      case 'notify client': {
        const data: { swarm: string; peer: string; discovered: string } = logEntry.context;

        const timings = entry(topics, data.swarm)
          .orInsert(new Map())
          .deep(data.peer)
          .orInsert({ join: undefined, leave: undefined, seen: new Map() }).value;

        const discoverTimings = entry(timings.seen, data.discovered).orInsert({}).value;

        if (!discoverTimings.notify) {
          discoverTimings.notify = logEntry.timestamp;
        }
        break;
      }
    }
  }

  let failures = 0;
  let ignored = 0;
  const discoverLag = [0];
  const processLag = [0];
  const notifyLag = [0];
  const failureTtt = [0]; // Time Together on Topic

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
          timings.leave - expectedPeerTimings.join,
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

        if (!timings.seen.get(expectedPeer)?.discover) {
          failureTtt.push(timeTogetherOnTopic);
          failures++;
          continue;
        }
        const discoverStats = timings.seen.get(expectedPeer)!;
        discoverLag.push(discoverStats.discover! - expectedPeerTimings.join);

        if (discoverStats.notify) {
          notifyLag.push(discoverStats.notify! - expectedPeerTimings.join!);
        }
      }

      if (timings.processed && timings.join) {
        processLag.push(timings.processed - timings.join);
      }
    }
  }

  log.info(`analyzeSwarmEvents: ${Date.now() - start}ms`);

  const processLagS = new Series(processLag);
  const notifyLagS = new Series(notifyLag);

  return getStats(discoverLag, {
    processMean: processLagS.mean(),
    processStd: processLagS.std(),
    notifyMean: notifyLagS.mean(),
    notifyStd: notifyLagS.std(),
    ignored,
    failures,
    failureRate: failures / (discoverLag.length + failures),
    fttMean: failureTtt.length > 0 ? new Series(failureTtt).mean() : NaN,
    ...(await analyzeRunFailures(reader)),
  });
};

export const getReader = (results: PlanResults) => {
  const start = Date.now();
  const reader = new LogReader();

  for (const [agentId, { logFile }] of Object.entries(results.agents)) {
    reader.addFile(logFile, { preprocessor: (line) => ({ ...line, context: { ...line?.context, agentId } }) });
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
    runErrorsRate: errors / runs,
  };
};
