//
// Copyright 2025 DXOS.org
//

import type * as Atom from '@effect-atom/atom/Atom';
import * as Effect from 'effect/Effect';
import * as Effectable from 'effect/Effectable';
import * as Option from 'effect/Option';

import { type CleanupFn } from '@dxos/async';
import { EffectEx } from '@dxos/effect';

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
   *
   * Memoized per QueryResult instance — repeated accesses on the same instance return the same
   * Atom. Safe only when the QueryResult is itself held stable across re-renders (e.g. behind a
   * `useMemo`). It must NOT be used in graph-builder connectors/actions or other atom computes,
   * where `db.query(...)` is called fresh on each re-evaluation: every run constructs a new
   * QueryResult and so a new atom + subscription, leaking the previous ones. Use the memoized
   * {@link atom} family there instead.
   */
  readonly atom: Atom.Atom<T[]>;
}

/**
 * Effect that returns a QueryResult when evaluated, but also has shorthand methods for running the query or getting the first result.
 */
export interface QueryResultEffect<T, E, R> extends Effect.Effect<QueryResult<T>, E, R> {
  run: Effect.Effect<T[], E, R>;
  first: Effect.Effect<Option.Option<T>, E, R>;

  // TODO(dmaretskyi): Considering adding `atom`, but since `Database.query` is used in imperative code only, I dont think it will be useful.
}

/**
 * Wraps an effect that produces a {@link QueryResult} into a {@link QueryResultEffect}, exposing
 * `.run` and `.first` shorthands that execute the query once. Shared by `Database.query` and
 * `Feed.query` so both surfaces chain identically.
 */
export const makeQueryResultEffect = <T, E, R>(
  eff: Effect.Effect<QueryResult<T>, E, R>,
): QueryResultEffect<T, E, R> => {
  return {
    run: Effect.flatMap(eff, (result) => EffectEx.promiseWithCauseCapture(() => result.run())),
    first: Effect.flatMap(eff, (result) =>
      EffectEx.promiseWithCauseCapture(async () => Option.fromNullable(await result.firstOrUndefined())),
    ),

    // Effect internals: the result is itself an Effect, so it carries the commit prototype.
    ...Effectable.CommitPrototype,
    commit() {
      return eff;
    },
    // Cast required: Effect's commit protocol is supplied at runtime via `CommitPrototype` and
    // cannot be expressed by the object literal's static type.
  } as any;
};
