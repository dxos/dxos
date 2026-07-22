//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Filter, type Type } from '@dxos/echo';

/**
 * Deterministic DB-state assertion for a Scorer to check (TESTING.md dimension G) — real DB
 * state, not the agent's self-reported completion.
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

/** Same lookup as `objectExists`, but returns the matching object (or `undefined`) for further inspection. */
export const findObject = <T extends Type.AnyEntity>(
  type: T,
  predicate: (obj: Type.InstanceType<T>) => boolean,
): Effect.Effect<Type.InstanceType<T> | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const { db } = yield* Database.Service;
    const results = yield* Effect.promise(() => db.query(Filter.type(type)).run());
    return results.find(predicate);
  });
