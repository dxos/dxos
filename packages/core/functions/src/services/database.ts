//
// Copyright 2025 DXOS.org
//

import { Context, Effect, Layer, type Schema } from 'effect';

import { type Filter, type Live, Obj, type Query, type Ref, type Type } from '@dxos/echo';
import type { EchoDatabase, OneShotQueryResult, QueryResult } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import type { DXN } from '@dxos/keys';

export class DatabaseService extends Context.Tag('@dxos/functions/DatabaseService')<
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

  static makeLayer = (db: EchoDatabase): Layer.Layer<DatabaseService> => {
    return Layer.succeed(DatabaseService, DatabaseService.make(db));
  };

  /**
   * Resolves an object by its DXN.
   */
  // TODO(burdon): Multiple signatures depending on args.
  static resolve = <S extends Type.Obj.Any>(
    dxn: DXN,
    schema?: S,
    required?: boolean,
  ): Effect.Effect<Schema.Schema.Type<S>, Error, DatabaseService> =>
    Effect.gen(function* () {
      const { db } = yield* DatabaseService;
      return yield* Effect.tryPromise({
        try: async () => {
          const object = await db.graph
            .createRefResolver({
              context: {
                space: db.spaceId,
              },
            })
            .resolve(dxn);
          invariant(!required || object != null, 'Object not found.');
          invariant(!required || !schema || Obj.instanceOf(schema, object), 'Object type mismatch.');
          return object as Schema.Schema.Type<S>;
        },
        catch: (error) => error as Error,
      });
    });

  /**
   * Loads an object reference.
   */
  static load: <T>(ref: Ref.Ref<T>) => Effect.Effect<T, never, never> = Effect.fn(function* (ref) {
    return yield* Effect.promise(() => ref.load());
  });

  /**
   * Creates a `QueryResult` object that can be subscribed to.
   */
  static query: {
    <Q extends Query.Any>(query: Q): Effect.Effect<QueryResult<Live<Query.Type<Q>>>, never, DatabaseService>;
    <F extends Filter.Any>(filter: F): Effect.Effect<QueryResult<Live<Filter.Type<F>>>, never, DatabaseService>;
  } = (queryOrFilter: Query.Any | Filter.Any) =>
    DatabaseService.pipe(
      Effect.map(({ db }) => db.query(queryOrFilter as any)),
      Effect.withSpan('DatabaseService.query'),
    );

  /**
   * Executes the query once and returns the results.
   */
  static runQuery: {
    <Q extends Query.Any>(query: Q): Effect.Effect<OneShotQueryResult<Live<Query.Type<Q>>>, never, DatabaseService>;
    <F extends Filter.Any>(filter: F): Effect.Effect<OneShotQueryResult<Live<Filter.Type<F>>>, never, DatabaseService>;
  } = (queryOrFilter: Query.Any | Filter.Any) =>
    DatabaseService.query(queryOrFilter as any).pipe(
      Effect.flatMap((queryResult) => Effect.promise(() => queryResult.run())),
    );
}
