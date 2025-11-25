//
// Copyright 2025 DXOS.org
//

import { type Event } from '@dxos/async';
import { type Database } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';
import { type QueryAST } from '@dxos/echo-protocol';

// TODO(burdon): Multi-sort option.
export type Sort<T extends AnyProperties> = (a: T, b: T) => -1 | 0 | 1;

// TODO(burdon): Narrow types (Entity.Any: requires Any to extend AnyProperties).
export interface QueryContext<T extends AnyProperties = AnyProperties> {
  getResults(): Database.QueryResultEntry<T>[];

  // TODO(dmaretskyi): Update info?
  changed: Event<void>;

  /**
   * One-shot query.
   */
  run(query: QueryAST.Query, opts?: Database.QueryRunOptions): Promise<Database.QueryResultEntry<T>[]>;

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
