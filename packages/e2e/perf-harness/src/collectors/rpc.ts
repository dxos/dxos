//
// Copyright 2026 DXOS.org
//

import { type Attached } from '../cdp.ts';
import { type RealmRpc } from '../types.ts';
import { percentile } from './responsiveness.ts';

/**
 * Global the RPC timing middleware publishes its counters under.
 *
 * Duplicated from `@dxos/worker-framework`'s `RpcTiming.RPC_TIMING_GLOBAL` rather than imported,
 * for the reason `collectors/disk.ts` duplicates the SQLite one: the harness reads it by
 * evaluating a string inside another realm, so the name crosses a process boundary as text and a
 * type-level import would buy nothing. Renaming it there means renaming it here.
 */
const RPC_TIMING_GLOBAL = '__dxosRpcTiming';

const EXPRESSION = `(() => {
  const read = globalThis['${RPC_TIMING_GLOBAL}'];
  return typeof read === 'function' ? JSON.stringify(read()) : null;
})()`;

/** A realm's counters at one boundary, with the harness clock reading that bounds the window. */
export type RpcReading = {
  name: string;
  kind: RealmRpc['kind'];
  readAt: number;
  calls: number;
  clientCalls: number;
  samples: Array<{ queueWaitMs?: number; serviceMs: number; at: number }>;
  clientSamples: Array<{ roundTripMs: number; at: number }>;
};

type RemoteResult = { result?: { value?: unknown } };

/**
 * Reads the RPC timings every instrumented realm publishes.
 *
 * Per realm rather than summed, unlike disk: queue wait IS the realm's event-loop responsiveness
 * measured from real traffic, so which realm produced it is the whole signal — a summed queue wait
 * across the tab and three workers answers no question anyone asks.
 */
export const readRpc = async (targets: Attached[]): Promise<RpcReading[]> => {
  const readings: RpcReading[] = [];
  for (const target of targets) {
    const response = await target.cdp.trySend<RemoteResult>('Runtime.evaluate', {
      expression: EXPRESSION,
      returnByValue: true,
    });
    const serialized = response?.result?.value;
    if (typeof serialized !== 'string') {
      continue;
    }
    // Serialized in the remote realm and parsed here, as `readDisk` does: a string is the one
    // shape no structured-clone edge case can mangle.
    let readout: Partial<Omit<RpcReading, 'name' | 'kind' | 'readAt'>>;
    try {
      readout = JSON.parse(serialized);
    } catch {
      continue;
    }
    readings.push({
      name: target.name,
      kind: target.kind,
      readAt: Date.now(),
      calls: readout.calls ?? 0,
      clientCalls: readout.clientCalls ?? 0,
      samples: readout.samples ?? [],
      clientSamples: readout.clientSamples ?? [],
    });
  }
  return readings;
};

/**
 * One realm's RPC activity over a stage, from its readings at the two boundaries.
 *
 * Counts are DIFFERENCED because the realm's totals are cumulative over its lifetime, while the
 * percentiles and maxima are computed from the samples the realm still holds, filtered to the
 * window. The two halves are read differently on purpose: a count cannot be recovered from a
 * bounded sample ring once it has evicted, and a max cannot be differenced at all.
 */
const summarize = (before: RpcReading | undefined, after: RpcReading): RealmRpc => {
  // A realm that appeared mid-stage has no opening reading; everything it recorded happened
  // inside this stage, so the window opens at zero rather than being skipped.
  const since = before?.readAt ?? 0;
  const served = after.samples.filter((sample) => sample.at >= since);
  const issued = after.clientSamples.filter((sample) => sample.at >= since);
  const queueWait = served.map((sample) => sample.queueWaitMs).filter((value) => value !== undefined);
  const service = served.map((sample) => sample.serviceMs);
  const roundTrip = issued.map((sample) => sample.roundTripMs);

  return {
    kind: after.kind,
    name: after.name,
    calls: after.calls - (before?.calls ?? 0),
    queueWaitP95Ms: percentile(queueWait, 0.95),
    queueWaitMaxMs: Math.round(Math.max(0, ...queueWait)),
    serviceMaxMs: Math.round(Math.max(0, ...service)),
    clientCalls: after.clientCalls - (before?.clientCalls ?? 0),
    roundTripP95Ms: percentile(roundTrip, 0.95),
    roundTripMaxMs: Math.round(Math.max(0, ...roundTrip)),
    samples: served.length,
    clientSamples: issued.length,
  };
};

/**
 * The RPC a stage accounted for, per realm.
 *
 * Counts come from differencing the running totals; percentiles and maxima come from the samples,
 * which the middleware keeps as a bounded ring. When a stage serves more calls than the ring
 * holds, `calls` exceeds `samples` — and that difference is the integrity column, because the
 * percentile then describes the tail of the stage rather than all of it.
 */
export const diffRpc = (before: RpcReading[], after: RpcReading[]): RealmRpc[] => {
  const opening = new Map(before.map((reading) => [reading.name, reading]));
  return after.map((reading) => summarize(opening.get(reading.name), reading));
};
