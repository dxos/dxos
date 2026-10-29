//
// Copyright 2025 DXOS.org
//

import { type Event } from '@dxos/async';
import { type Context } from '@dxos/context';
import { type Entity, type QueryResult } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import { type AnyProperties } from '@dxos/echo/internal';
import { type QueryService } from '@dxos/protocols/rpc';

// TODO(burdon): Multi-sort option.
export type Sort<T extends AnyProperties> = (a: T, b: T) => -1 | 0 | 1;

/**
 * Group membership carried on query-source entries. Internal transport only: the public
 * `QueryResult.Entry` intentionally omits this - grouping is surfaced to consumers via the assembled
 * flat aggregate records, which are the authoritative home for the key fields/count.
 */
export type EntryGroup = {
  key: Record<string, string | number | boolean | null>;
  count: number;
  /** Scalar aggregates the source computed itself; present on a collapsed group record, which carries no members. */
  aggregates?: Record<string, string | number | boolean | null>;
};

/**
 * A query-source result entry augmented with internal group membership.
 */
export type SourceEntry<O extends Entity.Unknown = Entity.Unknown> = QueryResult.EntityEntry<O> & {
  group?: EntryGroup;
  record?: Readonly<Record<string, unknown>>;
  /** The state a remote evaluated the entry at; absent for an in-process entry and from an old host. */
  version?: QueryService.RowVersion;
  /** Every derivation of a remote traversal hit; absent when the remote could not state them all. */
  paths?: readonly (readonly QueryService.PathEdge[])[];
  /** The members of a remote collapsed group with their shares of its scalar aggregates. */
  manifest?: readonly QueryService.ManifestEntry[];
};

export type QueryContextRunOptions = QueryResult.RunOptions & {
  /**
   * Receives each part of the run's evaluation time (ms) as it is known: the local evaluation and every remote's
   * reported evaluation; time spent waiting for a remote or for documents to load is never reported.
   */
  onExecutionTime?: (executionTime: number) => void;
};

export interface QueryContext<T extends AnyProperties = AnyProperties, O extends Entity.Entity<T> = Entity.Entity<T>> {
  getResults(): SourceEntry<O>[];

  /**
   * Whether the current query is served by at least one synchronous source. False when the query is
   * served only by asynchronous sources (e.g. a feed query served by the index), so callers can defer
   * the initial subscription event until real results arrive instead of emitting an empty snapshot.
   */
  isSynchronous(): boolean;

  /**
   * Whether a source serving the current query has yet to answer, so {@link getResults} is only the
   * part of the result the sources that have answered know about.
   */
  hasPendingSources(): boolean;

  /** How much of the answer {@link getResults} holds; see {@link QueryResult.Completeness}. */
  getCompleteness(): QueryResult.Completeness;

  /** Per-source progress on the current query. */
  getSourceStates(): QueryResult.SourceState[];

  /**
   * Time (ms) the remote sources reported spending to evaluate their latest answers, summed; undefined when none
   * reported one, e.g. no remote serves the query.
   */
  getRemoteExecutionTime?(): number | undefined;

  // TODO(dmaretskyi): Update info?
  changed: Event<void>;

  /**
   * One-shot query.
   */
  run(ctx: Context, query: QueryAST.Query, opts?: QueryContextRunOptions): Promise<SourceEntry<O>[]>;

  /**
   * Set the filter and trigger continuous updates.
   */
  update(query: QueryAST.Query): void;

  /**
   * Start creating query sources and firing events.
   *
   * `start` and `stop` are re-entrant.
   */
  // TODO(dmaretskyi): Make async.
  start(): void;

  /**
   * Clear any resources associated with the query.
   *
   * `start` and `stop` are re-entrant.
   */
  // TODO(dmaretskyi): Make async.
  stop(): void;
}
