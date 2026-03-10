//
// Copyright 2025 DXOS.org
//

import { type Event } from '@dxos/async';
import { type Context } from '@dxos/context';
import { type Entity, type QueryResult } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';
import { type QueryAST } from '@dxos/echo-protocol';

// TODO(burdon): Multi-sort option.
export type Sort<T extends AnyProperties> = (a: T, b: T) => -1 | 0 | 1;

export interface QueryContext<T extends AnyProperties = AnyProperties, O extends Entity.Entity<T> = Entity.Entity<T>> {
  getResults(ctx: Context): QueryResult.EntityEntry<O>[];

  // TODO(dmaretskyi): Update info?
  changed: Event<void>;

  /**
   * One-shot query.
   */
  run(ctx: Context, query: QueryAST.Query, opts?: QueryResult.RunOptions): Promise<QueryResult.EntityEntry<O>[]>;

  /**
   * Set the filter and trigger continuous updates.
   */
  update(ctx: Context, query: QueryAST.Query): void;

  /**
   * Start creating query sources and firing events.
   *
   * `start` and `stop` are re-entrant.
   */
  // TODO(dmaretskyi): Make async.
  start(ctx: Context): void;

  /**
   * Clear any resources associated with the query.
   *
   * `start` and `stop` are re-entrant.
   */
  // TODO(dmaretskyi): Make async.
  stop(ctx: Context): void;
}
