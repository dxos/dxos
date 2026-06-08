//
// Copyright 2025 DXOS.org
//

import type * as Atom from '@effect-atom/atom/Atom';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { type CleanupFn } from '@dxos/async';

import type * as Entity from './Entity';

/**
 * Individual query result entry.
 */
export type Entry<T> = {
  id: string;

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

// TODO(burdon): Should T be constrained to Entity.Any?
export interface QueryResult<T> {
  /**
   * Currently available results along with their match metadata.
   */
  readonly entries: Entry<T>[];

  /**
   * Currently available results.
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
   * Returns first result if there is one.
   */
  firstOrUndefined(opts?: RunOptions): Promise<T | undefined>;

  /**
   * Subscribes to changes in query results.
   */
  subscribe(callback?: (query: QueryResult<T>) => void, opts?: SubscriptionOptions): CleanupFn;

  /**
   * Self-updating atom. Updates automatically when query results change.
   * Memoized per QueryResult instance — repeated accesses return the same Atom.
   */
  get atom(): Atom.Atom<T[]>;
}

/**
 * Effect that returns a QueryResult when evaluated, but also has shorthand methods for running the query or getting the first result.
 */
export interface QueryResultEffect<T, E, R> extends Effect.Effect<QueryResult<T>, E, R> {
  run: Effect.Effect<T[], E, R>;
  first: Effect.Effect<Option.Option<T>, E, R>;
}
