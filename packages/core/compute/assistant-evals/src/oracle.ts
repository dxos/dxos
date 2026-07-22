//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Filter, type Type } from '@dxos/echo';

/**
 * Dimension-G code-side oracle: queries the DB for an object of `type` matching `predicate`,
 * rather than trusting the agent's own self-reported completion. Deterministic wherever its
 * input (the DB state) is — reproducible against a scripted run, statistical against a live one.
 */
export const objectExists = <T extends Type.AnyEntity>(
  type: T,
  predicate: (obj: Type.InstanceType<T>) => boolean,
): Effect.Effect<boolean, never, Database.Service> =>
  Effect.gen(function* () {
    const { db } = yield* Database.Service;
    const results = yield* Effect.promise(() => db.query(Filter.type(type)).run());
    return results.some(predicate);
  });
