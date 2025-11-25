//
// Copyright 2025 DXOS.org
//

import { type Event } from '@dxos/async';
import { type Database, type Entity } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';
import { type QueryAST } from '@dxos/echo-protocol';

// TODO(burdon): Multi-sort option.
export type Sort<T extends AnyProperties> = (a: T, b: T) => -1 | 0 | 1;

export interface QueryContext<T extends AnyProperties = AnyProperties, O extends Entity.Entity<T> = Entity.Entity<T>> {
  getResults(): Database.QueryResultEntry<O>[];

  // TODO(dmaretskyi): Update info?
  changed: Event<void>;

  /**
   * One-shot query.
   */
  run(query: QueryAST.Query, opts?: Database.QueryRunOptions): Promise<Database.QueryResultEntry<O>[]>;

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
