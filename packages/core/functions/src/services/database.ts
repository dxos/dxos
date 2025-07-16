//
// Copyright 2025 DXOS.org
//

import { Context, Effect, Layer } from 'effect';

import type { Obj, Ref, Relation } from '@dxos/echo';
import type { EchoDatabase } from '@dxos/echo-db';
import type { DXN } from '@dxos/keys';

export class DatabaseService extends Context.Tag('DatabaseService')<
  DatabaseService,
  {
    readonly db: EchoDatabase;
  }
>() {
  static notAvailable = Layer.succeed(DatabaseService, {
    get db(): EchoDatabase {
      throw new Error('Database not available');
    },
  });

  static make = (db: EchoDatabase): Context.Tag.Service<DatabaseService> => {
    return {
      get db() {
        return db;
      },
    };
  };

  static resolve: (dxn: DXN) => Effect.Effect<Obj.Any | Relation.Any, Error, DatabaseService> = Effect.fn(
    function* (dxn) {
      const { db } = yield* DatabaseService;
      return yield* Effect.tryPromise({
        try: () =>
          db.graph.createRefResolver({ context: { space: db.spaceId } }).resolve(dxn) as Promise<
            Obj.Any | Relation.Any
          >,
        catch: (error) => error as Error,
      });
    },
  );

  static loadRef: <T>(ref: Ref.Ref<T>) => Effect.Effect<T, Error, never> = Effect.fn(function* (ref) {
    return yield* Effect.tryPromise({
      try: () => ref.load(),
      catch: (error) => error as Error,
    });
  });
}
