//
// Copyright 2026 DXOS.org
//

import { trace } from '@dxos/tracing';

/**
 * Execution metrics of every query in this process sharing one query text (`Query.pretty`).
 */
export type QueryMetrics = {
  /** The query text, which is the grouping key. */
  query: string;
  /** Query results constructed for this query. */
  created: number;
  /** One-shot executions (`run`, `first`, …). */
  runs: number;
  /** Times a subscription started the query reactively. */
  subscriptions: number;
  /** Reactive queries currently running. */
  active: number;
  /** Reactive result recomputations. */
  updates: number;
  /** Timed executions: one-shot runs, and reactive starts up to the first complete answer. */
  executions: number;
  /** Total, slowest and most recent execution time (ms). */
  totalTime: number;
  maxTime: number;
  lastTime: number;
  /** Slowest single reactive recomputation (ms). */
  maxUpdateTime: number;
  /** Items in the most recent result, and the most ever returned. */
  lastCount: number;
  maxCount: number;
  /** Wall-clock time (ms since epoch) the query last fired or updated. */
  lastSeen: number;
};

/** Distinct query texts kept; an id-bearing query text is unique per id, so the set is otherwise unbounded. */
const MAX_ENTRIES = 1_000;

const createEntry = (query: string): QueryMetrics => ({
  query,
  created: 0,
  runs: 0,
  subscriptions: 0,
  active: 0,
  updates: 0,
  executions: 0,
  totalTime: 0,
  maxTime: 0,
  lastTime: 0,
  maxUpdateTime: 0,
  lastCount: 0,
  maxCount: 0,
  lastSeen: 0,
});

/**
 * Process-wide query metrics, recorded by `QueryResultImpl` and read by devtools.
 */
class QueryMetricsRegistry {
  readonly #entries = new Map<string, QueryMetrics>();

  /** Snapshot of every query's metrics, as plain copies. */
  getMetrics(): QueryMetrics[] {
    return Array.from(this.#entries.values(), (entry) => ({ ...entry }));
  }

  /** Clears the counters; running queries keep their active count so it stays truthful. */
  reset(): void {
    for (const [key, entry] of this.#entries) {
      if (entry.active > 0) {
        this.#entries.set(key, { ...createEntry(key), active: entry.active, lastSeen: entry.lastSeen });
      } else {
        this.#entries.delete(key);
      }
    }
  }

  created(query: string): void {
    this.#touch(query).created++;
  }

  started(query: string): void {
    const entry = this.#touch(query);
    entry.subscriptions++;
    entry.active++;
  }

  stopped(query: string): void {
    const entry = this.#entries.get(query);
    if (entry && entry.active > 0) {
      entry.active--;
    }
  }

  executed(query: string, duration: number, count: number, kind: 'run' | 'reactive'): void {
    const entry = this.#touch(query);
    if (kind === 'run') {
      entry.runs++;
    }
    entry.executions++;
    entry.totalTime += duration;
    entry.maxTime = Math.max(entry.maxTime, duration);
    entry.lastTime = duration;
    this.#count(entry, count);
  }

  updated(query: string, duration: number, count: number): void {
    const entry = this.#touch(query);
    entry.updates++;
    entry.maxUpdateTime = Math.max(entry.maxUpdateTime, duration);
    this.#count(entry, count);
  }

  #count(entry: QueryMetrics, count: number): void {
    entry.lastCount = count;
    entry.maxCount = Math.max(entry.maxCount, count);
  }

  /** Returns the entry, moved to the back so eviction drops the least recently seen. */
  #touch(query: string): QueryMetrics {
    const entry = this.#entries.get(query) ?? createEntry(query);
    this.#entries.delete(query);
    this.#entries.set(query, entry);
    entry.lastSeen = Date.now();
    if (this.#entries.size > MAX_ENTRIES) {
      for (const [key, candidate] of this.#entries) {
        if (candidate.active === 0) {
          this.#entries.delete(key);
          break;
        }
      }
    }
    return entry;
  }
}

/**
 * Query metrics of this process, grouped by query text.
 */
export const queryMetrics = new QueryMetricsRegistry();

trace.diagnostic({
  id: 'client-query-metrics',
  name: 'Query Metrics (Client)',
  fetch: () => queryMetrics.getMetrics(),
});
