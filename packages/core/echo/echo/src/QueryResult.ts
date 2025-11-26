//
// Copyright 2025 DXOS.org
//

import { type CleanupFn } from '@dxos/async';
import { type SpaceId } from '@dxos/keys';

import type * as Entity from './Entity';
import type { Query } from './query';

/**
 * Individual query result entry.
 */
export type Entry<T extends Entity.Unknown = Entity.Unknown> = {
  id: string;

  spaceId: SpaceId;

  /**
   * May not be present for remote results.
   */
  object?: T;

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

export type OneShotResult<T extends Entity.Unknown = Entity.Unknown> = {
  results: Entry<T>[];
  objects: T[];
};

export type SubscriptionOptions = {
  /**
   * Fire the callback immediately.
   */
  fire?: boolean;
};

// TODO(burdon): Narrow types.
export interface QueryResult<T extends Entity.Unknown = Entity.Unknown> {
  readonly query: Query<T>;
  readonly results: Entry<T>[];
  readonly objects: T[];

  run(opts?: RunOptions): Promise<OneShotResult<T>>;
  runSync(): Entry<T>[];
  first(opts?: RunOptions): Promise<T>;

  subscribe(callback?: (query: QueryResult<T>) => void, opts?: SubscriptionOptions): CleanupFn;
}

export type RunOptions = {
  timeout?: number;
};
