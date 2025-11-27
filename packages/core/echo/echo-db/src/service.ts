//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';
import type * as Types from 'effect/Types';

import {
  type Entity,
  type Filter,
  Obj,
  ObjectNotFoundError,
  type Query,
  type QueryResult,
  type Ref,
  type Type,
} from '@dxos/echo';
import { promiseWithCauseCapture } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { type DXN } from '@dxos/keys';
import { type Live } from '@dxos/live-object';

import type { FlushOptions } from './core-db';
import type {
  EchoDatabase,
  ExtractSchemaQueryResult,
  SchemaRegistryPreparedQuery,
  SchemaRegistryQuery,
} from './proxy-db';

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
    (dxn: DXN): Effect.Effect<Entity.Unknown, never, DatabaseService>;
    // Check matches schema.
    <S extends Type.Entity.Any>(
      dxn: DXN,
      schema: S,
    ): Effect.Effect<Schema.Schema.Type<S>, ObjectNotFoundError, DatabaseService>;
  } = (<S extends Type.Entity.Any>(
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
        return yield* Effect.fail(new ObjectNotFoundError(dxn));
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
      return yield* Effect.fail(new ObjectNotFoundError(ref.dxn));
    }
    return object;
  });

  /**
   * Loads an object reference option.
   */
  // TODO(burdon): Option?
  static loadOption: <T>(ref: Ref.Ref<T>) => Effect.Effect<Option.Option<T>, never, never> = Effect.fn(function* (ref) {
    const object = yield* DatabaseService.load(ref).pipe(
      Effect.catchTag('OBJECT_NOT_FOUND', () => Effect.succeed(undefined)),
    );
    return Option.fromNullable(object);
  });

  // TODO(burdon): Can we create a proxy for the following methods on EchoDatabase? Use @inheritDoc?
  // TODO(burdon): Figure out how to chain query().run();

  /**
   * @link EchoDatabase.add
   */
  static add = <T extends Entity.Unknown>(obj: T): Effect.Effect<T, never, DatabaseService> =>
    DatabaseService.pipe(Effect.map(({ db }) => db.add(obj)));

  /**
   * @link EchoDatabase.remove
   */
  static remove = <T extends Entity.Unknown>(obj: T): Effect.Effect<void, never, DatabaseService> =>
    DatabaseService.pipe(Effect.map(({ db }) => db.remove(obj)));

  /**
   * @link EchoDatabase.flush
   */
  static flush = (opts?: FlushOptions) =>
    DatabaseService.pipe(Effect.flatMap(({ db }) => promiseWithCauseCapture(() => db.flush(opts))));

  /**
   * @link EchoDatabase.getObjectById
   */
  static getObjectById = <T extends Entity.Unknown>(
    id: string,
  ): Effect.Effect<T | undefined, never, DatabaseService> => {
    return DatabaseService.pipe(Effect.map(({ db }) => db.getObjectById(id) as T | undefined));
  };

  // TODO(dmaretskyi): Change API to `yield* DatabaseService.query(...).first` and `yield* DatabaseService.query(...).objects`.

  /**
   * Creates a `QueryResult` object that can be subscribed to.
   */
  static query: {
    <Q extends Query.Any>(
      query: Q,
    ): Effect.Effect<QueryResult.QueryResult<Live<Query.Type<Q>>>, never, DatabaseService>;
    <F extends Filter.Any>(
      filter: F,
    ): Effect.Effect<QueryResult.QueryResult<Live<Filter.Type<F>>>, never, DatabaseService>;
  } = (queryOrFilter: Query.Any | Filter.Any) =>
    DatabaseService.pipe(
      Effect.map(({ db }) => db.query(queryOrFilter as any) as QueryResult.QueryResult<Live<any>>),
      Effect.withSpan('DatabaseService.query'),
    );

  /**
   * Executes the query once and returns the results.
   */
  static runQuery: {
    <Q extends Query.Any>(query: Q): Effect.Effect<QueryResult.OneShot<Live<Query.Type<Q>>>, never, DatabaseService>;
    <F extends Filter.Any>(filter: F): Effect.Effect<QueryResult.OneShot<Live<Filter.Type<F>>>, never, DatabaseService>;
  } = (queryOrFilter: Query.Any | Filter.Any) =>
    DatabaseService.query(queryOrFilter as any).pipe(
      Effect.flatMap((queryResult) => promiseWithCauseCapture(() => queryResult.run())),
    );

  // TODO(dmaretskyi): Change API to `yield* DatabaseService.querySchema(...).first` and `yield* DatabaseService.querySchema(...).schema`.

  static schemaQuery = <Query extends Types.NoExcessProperties<SchemaRegistryQuery, Query>>(
    query?: Query & SchemaRegistryQuery,
  ): Effect.Effect<SchemaRegistryPreparedQuery<ExtractSchemaQueryResult<Query>>, never, DatabaseService> =>
    DatabaseService.pipe(
      Effect.map(({ db }) => db.schemaRegistry.query(query)),
      Effect.withSpan('DatabaseService.schemaQuery'),
    );

  static runSchemaQuery = <Query extends Types.NoExcessProperties<SchemaRegistryQuery, Query>>(
    query?: Query & SchemaRegistryQuery,
  ): Effect.Effect<ExtractSchemaQueryResult<Query>[], never, DatabaseService> =>
    DatabaseService.schemaQuery(query).pipe(
      Effect.flatMap((queryResult) => promiseWithCauseCapture(() => queryResult.run())),
    );
}
