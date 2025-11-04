//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';
import type * as Types from 'effect/Types';
import { Record } from 'effect';

import {
  type Filter,
  type Live,
  Obj,
  ObjectNotFoundError,
  type Query,
  type Ref,
  type Relation,
  type Type,
} from '@dxos/echo';
import type {
  EchoDatabase,
  ExtractSchemaQueryResult,
  FlushOptions,
  OneShotQueryResult,
  QueryResult,
  SchemaRegistryQuery,
} from '@dxos/echo-db';
import type { SchemaRegistryPreparedQuery } from '@dxos/echo-db';
import { promiseWithCauseCapture } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import type { DXN } from '@dxos/keys';
import { Rx, Registry } from '@effect-rx/rx';

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
  static add = <T extends Obj.Any | Relation.Any>(obj: T): Effect.Effect<T, never, DatabaseService> =>
    DatabaseService.pipe(Effect.map(({ db }) => db.add(obj)));

  /**
   * @link EchoDatabase.remove
   */
  static remove = <T extends Obj.Any | Relation.Any>(obj: T): Effect.Effect<void, never, DatabaseService> =>
    DatabaseService.pipe(Effect.map(({ db }) => db.remove(obj)));

  /**
   * @link EchoDatabase.flush
   */
  static flush = (opts?: FlushOptions) =>
    DatabaseService.pipe(Effect.flatMap(({ db }) => promiseWithCauseCapture(() => db.flush(opts))));

  /**
   * @link EchoDatabase.getObjectById
   */
  static getObjectById = <T extends Obj.Any | Relation.Any>(
    id: string,
  ): Effect.Effect<Live<T> | undefined, never, DatabaseService> => {
    return DatabaseService.pipe(Effect.map(({ db }) => db.getObjectById(id)));
  };

  // TODO(dmaretskyi): Change API to `yield* DatabaseService.query(...).first` and `yield* DatabaseService.query(...).objects`.

  /**
   * Queries the database. Allows one-shot execution and subscription.
   *
   * Examples:
   * ```ts
   * const queryResult = yield* DatabaseService.query(...).objects;
   *
   * const query = yield* DatabaseService.query(...);
   * Rx.subscribe(query.rx, (objects) => {
   *   console.log(objects);
   * });
   * ```
   */
  static query: {
    <Q extends Query.Any>(query: Q): QueryResultEffect<Live<Query.Type<Q>>>;
    <F extends Filter.Any>(filter: F): QueryResultEffect<Live<Filter.Type<F>>>;
  } = (queryOrFilter: Query.Any | Filter.Any) => {
    const effect = DatabaseService.pipe(
      Effect.map(({ db }) => {
        const query = db.query(queryOrFilter as any);

        return {
          objects: Effect.gen(function* () {
            const { objects } = yield* Effect.promise(() => query.run());
            return objects;
          }),
          rx: Rx.make((get) => {
            get.addFinalizer(
              query.subscribe(
                (queryResult) => {
                  get.setSelf(queryResult.objects);
                },
                { fire: true },
              ),
            );
            return query.runSync();
          }),
        } satisfies QueryResultEx<any>;
      }),
      Effect.withSpan('DatabaseService.query'),
    );

    return Object.create(effect, {
      objects: {
        value: effect.pipe(Effect.flatMap((queryResult) => queryResult.objects)),
      },
    });
  };

  /**
   * Executes the query once and returns the results.
   * @deprecated use `DatabaseService.query(...).objects`
   */
  static runQuery: {
    <Q extends Query.Any>(query: Q): Effect.Effect<OneShotQueryResult<Live<Query.Type<Q>>>, never, DatabaseService>;
    <F extends Filter.Any>(filter: F): Effect.Effect<OneShotQueryResult<Live<Filter.Type<F>>>, never, DatabaseService>;
  } = (queryOrFilter: Query.Any | Filter.Any) =>
    DatabaseService.query(queryOrFilter as any).pipe(
      Effect.flatMap((queryResult) => queryResult.objects),
      Effect.map((objects) => ({ results: [], objects })),
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

export interface QueryResultEx<T> {
  readonly objects: Effect.Effect<T[]>;
  readonly rx: Rx.Rx<T[]>;
}

export interface QueryResultEffect<T> extends Effect.Effect<QueryResultEx<T>> {
  readonly objects: Effect.Effect<T[], never, DatabaseService>;
}

const addPropsOnEffect = <T, E, R, P extends { readonly [key: keyof any]: any }>(
  effect: Effect.Effect<T, E, R>,
  props: P,
): Effect.Effect<T, E, R> & P => {
  return Object.create(
    effect,
    Record.map(props, (value): PropertyDescriptor => ({ value })),
  );
};
