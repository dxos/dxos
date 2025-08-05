//
// Copyright 2025 DXOS.org
//

import { Context, Effect, Layer } from 'effect';

import type { Filter, Live, Obj, Query, Ref, Relation } from '@dxos/echo';
import type { EchoDatabase, OneShotQueryResult, QueryResult } from '@dxos/echo-db';
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

  /**
   * Adds an object to the database.
   */
  static add = <T extends Obj.Any | Relation.Any>(obj: T): Effect.Effect<T, never, DatabaseService> =>
    DatabaseService.pipe(Effect.map(({ db }) => db.add(obj)));
}
