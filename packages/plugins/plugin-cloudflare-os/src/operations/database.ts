//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj, type Ref } from '@dxos/echo';

/**
 * The database a connection ref lives in. The operation invoker provides no database for connector
 * operations, so each one derives it from its input ref, as the other connectors do.
 */
export const fromRef = (ref: Ref.Ref<Obj.Unknown>): Effect.Effect<Database.Database> => {
  const target = ref.target;
  const db = target ? Obj.getDatabase(target) : undefined;
  return db ? Effect.succeed(db) : Effect.die(new Error('No database for the connection ref.'));
};

/** Runs an effect against the database the ref lives in. */
export const withRefDatabase =
  (ref: Ref.Ref<Obj.Unknown>) =>
  <A, E>(effect: Effect.Effect<A, E, Database.Service>): Effect.Effect<A, E> =>
    fromRef(ref).pipe(Effect.flatMap((db) => effect.pipe(Effect.provide(Database.layer(db)))));
