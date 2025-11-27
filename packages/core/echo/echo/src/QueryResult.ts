//
// Copyright 2025 DXOS.org
//

import { type CleanupFn } from '@dxos/async';
import { type SpaceId } from '@dxos/keys';

import type * as Entity from './Entity';

/**
 * Individual query result entry.
 */
export type Entry<T> = {
  id: string;

  spaceId: SpaceId;

  /**
   * May not be present for remote results.
   */
  result?: T;

  match?: {
    // TODO(dmaretskyi): text positional info.

    /**
     * Higher means better match.
     */
    rank: number;
  };

  /**
   * Query resolution metadata.
   */
  // TODO(dmaretskyi): Rename to meta?
  resolution?: {
    // TODO(dmaretskyi): Make this more generic.
    source: 'remote' | 'local' | 'index';

    /**
     * Query resolution time in milliseconds.
     */
    time: number;
  };
};

/**
 * Invidual query result entry for a database Entity.
 */
export type EntityEntry<T extends Entity.Unknown = Entity.Unknown> = Entry<T>;

export type RunOptions = {
  timeout?: number;
};

export type SubscriptionOptions = {
  /**
   * Fire the callback immediately.
   */
  fire?: boolean;
};

export interface QueryResult<T> {
  /**
   * Currently available results along with their match metadata.
   *
   * @reactive
   */
  readonly entries: Entry<T>[];

  /**
   * Currently available results.
   *
   * @reactive
   */
  readonly results: T[];

  /**
   * Returns all known results.
   */
  run(opts?: RunOptions): Promise<T[]>;

  /**
   * Returns all known results along with their match metadata.
   */
  runEntries(opts?: RunOptions): Promise<Entry<T>[]>;

  /**
   * Returns currently available results synchronously.
   */
  runSync(): T[];

  /**
   * Returns currently available results synchronously along with their match metadata.
   */
  runSyncEntries(): Entry<T>[];

  /**
   * Returns first result.
   */
  first(opts?: RunOptions): Promise<T>;

  /**
   * Subscribes to changes in query results.
   */
  subscribe(callback?: (query: QueryResult<T>) => void, opts?: SubscriptionOptions): CleanupFn;
}
