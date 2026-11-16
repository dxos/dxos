//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ConnectorSync from '@dxos/app-toolkit/ConnectorSync';
import { type Database, Obj, type Ref } from '@dxos/echo';

/**
 * The database the object a ref names lives in, loading the ref when its target is not live.
 *
 * In Composer an operation's input refs are live, so `ref.target` is set. A host that hydrates refs from their wire
 * form — the EDGE bundle host, operation-service — hands over an unloaded ref with only a resolver attached, so
 * reading `ref.target` alone finds no object and therefore no database.
 */
export const databaseOf = (
  ref: Ref.Ref<Obj.Unknown>,
): Effect.Effect<Database.Database, ConnectorSync.DatabaseMissingError> =>
  Effect.gen(function* () {
    const target = ref.target ?? (yield* Effect.promise(() => ref.tryLoad()));
    const db = target ? Obj.getDatabase(target) : undefined;
    if (!db) {
      return yield* Effect.fail(new ConnectorSync.DatabaseMissingError());
    }
    return db;
  });
