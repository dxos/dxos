//
// Copyright 2025 DXOS.org
//

import { Context, Effect, Layer, Option, type Schema } from 'effect';

import { type Filter, type Live, Obj, type Query, type Ref, type Relation, type Type } from '@dxos/echo';
import type { EchoDatabase, FlushOptions, OneShotQueryResult, QueryResult, SchemaRegistryQuery } from '@dxos/echo-db';
import type { SchemaRegistryPreparedQuery } from '@dxos/echo-db';
import type { EchoSchema } from '@dxos/echo-schema';
import { promiseWithCauseCapture } from '@dxos/effect';
import { BaseError } from '@dxos/errors';
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

  static layer = (db: EchoDatabase): Layer.Layer<DatabaseService> => {
    return Layer.succeed(DatabaseService, DatabaseService.make(db));
  };

  /**
   * Resolves an object by its DXN.
   */
  static resolve: {
    // No type check.
    (dxn: DXN): Effect.Effect<Obj.Any | Relation.Any, never, DatabaseService>;
    // Check matches schema.
    <S extends Type.Obj.Any | Type.Relation.Any>(
      dxn: DXN,
      schema: S,
    ): Effect.Effect<Schema.Schema.Type<S>, ObjectNotFoundError, DatabaseService>;
  } = (<S extends Type.Obj.Any | Type.Relation.Any>(
    dxn: DXN,
    schema?: S,
  ): Effect.Effect<Schema.Schema.Type<S>, ObjectNotFoundError, DatabaseService> =>
    Effect.gen(function* () {
      const { db } = yield* DatabaseService;
      const object = yield* promiseWithCauseCapture(() =>
        db.graph
          .createRefResolver({
            context: {
              space: db.spaceId,
            },
          })
          .resolve(dxn),
      );

      if (!object) {
        return yield* Effect.fail(new ObjectNotFoundError({ dxn }));
      }
      invariant(!schema || Obj.instanceOf(schema, object), 'Object type mismatch.');
      return object as any;
    })) as any;

  /**
   * Loads an object reference.
   */
  static load: <T>(ref: Ref.Ref<T>) => Effect.Effect<T, ObjectNotFoundError, never> = Effect.fn(function* (ref) {
    const object = yield* promiseWithCauseCapture(() => ref.tryLoad());
    if (!object) {
      return yield* Effect.fail(new ObjectNotFoundError({ dxn: ref.dxn }));
    }
    return object;
  });

  /**
   * Loads an object reference option.
   */
  static loadOption: <T>(ref: Ref.Ref<T>) => Effect.Effect<Option.Option<T>, never, never> = Effect.fn(function* (ref) {
    const object = yield* DatabaseService.load(ref).pipe(
      Effect.catchTag('OBJECT_NOT_FOUND', () => Effect.succeed(undefined)),
    );
    return Option.fromNullable(object);
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
      Effect.flatMap((queryResult) => promiseWithCauseCapture(() => queryResult.run())),
    );

  static schemaQuery = <Q extends SchemaRegistryQuery>(
    query: Q,
  ): Effect.Effect<SchemaRegistryPreparedQuery<EchoSchema>, never, DatabaseService> =>
    DatabaseService.pipe(
      Effect.map(({ db }) => db.schemaRegistry.query(query)),
      Effect.withSpan('DatabaseService.schemaQuery'),
    );

  static runSchemaQuery = <Q extends SchemaRegistryQuery>(
    query: Q,
  ): Effect.Effect<EchoSchema[], never, DatabaseService> =>
    DatabaseService.schemaQuery(query).pipe(
      Effect.flatMap((queryResult) => promiseWithCauseCapture(() => queryResult.run())),
    );

  /**
   * Adds an object to the database.
   */
  static add = <T extends Obj.Any | Relation.Any>(obj: T): Effect.Effect<T, never, DatabaseService> =>
    DatabaseService.pipe(Effect.map(({ db }) => db.add(obj)));

  static flush = (opts?: FlushOptions) =>
    DatabaseService.pipe(Effect.flatMap(({ db }) => promiseWithCauseCapture(() => db.flush(opts))));
}

// TODO(burdon): Move to echo/errors.
class ObjectNotFoundError extends BaseError.extend('OBJECT_NOT_FOUND') {
  constructor(context?: Record<string, unknown>) {
    super('Object not found', { context });
  }
}
