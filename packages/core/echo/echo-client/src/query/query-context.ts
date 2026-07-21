//
// Copyright 2025 DXOS.org
//

import { type Event } from '@dxos/async';
import { type Context } from '@dxos/context';
import { type Entity, type QueryResult } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import { type AnyProperties } from '@dxos/echo/internal';

// TODO(burdon): Multi-sort option.
export type Sort<T extends AnyProperties> = (a: T, b: T) => -1 | 0 | 1;

/**
 * Group membership carried on query-source entries. Internal transport only: the public
 * `QueryResult.Entry` intentionally omits this — grouping is surfaced to consumers via the assembled
 * flat aggregate records, which are the authoritative home for the key fields/count.
 */
export type EntryGroup = {
  key: Record<string, string | number | boolean | null>;
  count: number;
};

/**
 * A query-source result entry augmented with internal group membership.
 */
export type SourceEntry<O extends Entity.Unknown = Entity.Unknown> = QueryResult.EntityEntry<O> & {
  group?: EntryGroup;
};

export interface QueryContext<T extends AnyProperties = AnyProperties, O extends Entity.Entity<T> = Entity.Entity<T>> {
  getResults(): SourceEntry<O>[];

  /**
   * Whether the current query is served by at least one synchronous source. False when the query is
   * served only by asynchronous sources (e.g. a feed query served by the index), so callers can defer
   * the initial subscription event until real results arrive instead of emitting an empty snapshot.
   */
  isSynchronous(): boolean;

  // TODO(dmaretskyi): Update info?
  changed: Event<void>;

  /**
   * One-shot query.
   */
  run(ctx: Context, query: QueryAST.Query, opts?: QueryResult.RunOptions): Promise<SourceEntry<O>[]>;

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
