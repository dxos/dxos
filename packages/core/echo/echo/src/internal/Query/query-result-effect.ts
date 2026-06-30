//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Effectable from 'effect/Effectable';
import * as Option from 'effect/Option';

import { EffectEx } from '@dxos/effect';

import type * as QueryResult from '../../QueryResult';

/**
 * Wraps an effect that produces a {@link QueryResult.QueryResult} into a
 * {@link QueryResult.QueryResultEffect}, exposing `.run` and `.first` shorthands that execute the
 * query once. Shared by `Database.query` and `Feed.query` so both surfaces chain identically.
 */
export const makeQueryResultEffect = <T, E, R>(
  eff: Effect.Effect<QueryResult.QueryResult<T>, E, R>,
): QueryResult.QueryResultEffect<T, E, R> => {
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
