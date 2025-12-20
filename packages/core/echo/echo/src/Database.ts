//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import type * as Types from 'effect/Types';

import { type QueryAST } from '@dxos/echo-protocol';
import { promiseWithCauseCapture } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { type DXN, type PublicKey, type SpaceId } from '@dxos/keys';
import { type Live } from '@dxos/live-object';
import { type QueryOptions as QueryOptionsProto } from '@dxos/protocols/proto/dxos/echo/filter';

import type * as Entity from './Entity';
import * as Err from './Err';
import type * as Filter from './Filter';
import type * as Hypergraph from './Hypergraph';
import { isInstanceOf } from './internal';
import type * as Query from './Query';
import type * as QueryResult from './QueryResult';
import type * as Ref from './Ref';
import type * as SchemaRegistry from './SchemaRegistry';
import type * as Type from './Type';

/**
 * @deprecated Use `QueryAST.QueryOptions` instead.
 */
export type QueryOptions = {
  /**
   * @deprecated Use `spaceIds` instead.
   */
  spaces?: PublicKey[];

  /**
   * Query only in specific spaces.
   */
  // TODO(dmaretskyi): Change this to SpaceId.
  spaceIds?: string[];

  /**
   * Return only the first `limit` results.
   */
  limit?: number;

  /**
   * Query only local spaces, or remote on agent.
   * @default `QueryOptions.DataLocation.LOCAL`
   *
   * Options:
   *   - proto3_optional = true
   */
  // TODO(burdon): Remove?
  dataLocation?: QueryOptionsProto.DataLocation;
};

/**
 * `query` API function declaration.
 */
// TODO(burdon): Reconcile Query and Filter (should only have one root type).
// TODO(dmaretskyi): Remove query options.
export interface QueryFn {
  <Q extends Query.Any>(
    query: Q,
    options?: (QueryAST.QueryOptions & QueryOptions) | undefined,
  ): QueryResult.QueryResult<Query.Type<Q>>;

  <F extends Filter.Any>(
    filter: F,
    options?: (QueryAST.QueryOptions & QueryOptions) | undefined,
  ): QueryResult.QueryResult<Filter.Type<F>>;
}

/**
 * Common interface for Database and Queue.
 */
export interface Queryable {
  query: QueryFn;
}

export type GetObjectByIdOptions = {
  deleted?: boolean;
};

export type ObjectPlacement = 'root-doc' | 'linked-doc';

export type AddOptions = {
  /**
   * Where to place the object in the Automerge document tree.
   * Root document is always loaded with the space.
   * Linked documents are loaded lazily.
   * Placing large number of objects in the root document may slow down the initial load.
   *
   * @default 'linked-doc'
   */
  placeIn?: ObjectPlacement;
};

export type FlushOptions = {
  /**
   * Write any pending changes to disk.
   * @default true
   */
  disk?: boolean;

  /**
   * Wait for pending index updates.
   * @default false
   */
  indexes?: boolean;

  /**
   * Flush pending updates to objects and queries.
   * @default false
   */
  updates?: boolean;
};

/**
 * Identifier denoting an ECHO Database.
 */
export const TypeId = Symbol.for('@dxos/echo/Database');
export type TypeId = typeof TypeId;

/**
 * ECHO Database interface.
 */
export interface Database extends Queryable {
  readonly [TypeId]: TypeId;

  get spaceId(): SpaceId;

  // TODO(burdon): Can we move this into graph?
  get schemaRegistry(): SchemaRegistry.SchemaRegistry;

  /**
   * Get hypergraph.
   */
  get graph(): Hypergraph.Hypergraph;

  /**
   * Query objects.
   */
  query: QueryFn;

  /**
   * Creates a reference to an existing object in the database.
   *
   * NOTE: The reference may be dangling if the object is not present in the database.
   * NOTE: Difference from `Ref.fromDXN`
   * `Ref.fromDXN(dxn)` returns an unhydrated reference. The `.load` and `.target` APIs will not work.
   * `db.makeRef(dxn)` is preferable in cases with access to the database.
   */
  makeRef<T extends Entity.Unknown = Entity.Unknown>(dxn: DXN): Ref.Ref<T>;

  /**
   * Adds object to the database.
   */
  add<T extends Entity.Unknown = Entity.Unknown>(obj: T, opts?: AddOptions): T;

  /**
   * Removes object from the database.
   */
  // TODO(burdon): Return true if removed (currently throws if not present).
  remove(obj: Entity.Unknown): void;

  /**
   * Wait for all pending changes to be saved to disk.
   * Optionaly waits for changes to be propagated to indexes and event handlers.
   */
  flush(opts?: FlushOptions): Promise<void>;
}

export const isDatabase = (obj: unknown): obj is Database => {
  return obj ? typeof obj === 'object' && TypeId in obj && obj[TypeId] === TypeId : false;
};

export const Database: Schema.Schema<Database> = Schema.Any.pipe(Schema.filter((space) => isDatabase(space)));

export class Service extends Context.Tag('@dxos/echo/Database/Service')<
  Service,
  {
    readonly db: Database;
  }
>() {
  static notAvailable = Layer.succeed(Service, {
    get db(): Database {
      throw new Error('Database not available');
    },
  });

  static make = (db: Database): Context.Tag.Service<Service> => {
    return {
      get db() {
        return db;
      },
    };
  };

  static layer = (db: Database): Layer.Layer<Service> => {
    return Layer.succeed(Service, Service.make(db));
  };

  /**
   * Returns the space ID of the database.
   */
  static spaceId = Effect.gen(function* () {
    const { db } = yield* Service;
    return db.spaceId;
  });

  /**
   * Resolves an object by its DXN.
   */
  static resolve: {
    // No type check.
    (dxn: DXN): Effect.Effect<Entity.Unknown, never, Service>;
    // Check matches schema.
    <S extends Type.Entity.Any>(
      dxn: DXN,
      schema: S,
    ): Effect.Effect<Schema.Schema.Type<S>, Err.ObjectNotFoundError, Service>;
  } = (<S extends Type.Entity.Any>(
    dxn: DXN,
    schema?: S,
  ): Effect.Effect<Schema.Schema.Type<S>, Err.ObjectNotFoundError, Service> =>
    Effect.gen(function* () {
      const { db } = yield* Service;
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
        return yield* Effect.fail(new Err.ObjectNotFoundError(dxn));
      }
      invariant(!schema || isInstanceOf(schema, object), 'Object type mismatch.');
      return object as any;
    })) as any;

  /**
   * Loads an object reference.
   */
  static load: <T>(ref: Ref.Ref<T>) => Effect.Effect<T, Err.ObjectNotFoundError, never> = Effect.fn(function* (ref) {
    const object = yield* promiseWithCauseCapture(() => ref.tryLoad());
    if (!object) {
      return yield* Effect.fail(new Err.ObjectNotFoundError(ref.dxn));
    }
    return object;
  });

  /**
   * Loads an object reference option.
   */
  static loadOption: <T>(ref: Ref.Ref<T>) => Effect.Effect<Option.Option<T>, never, never> = Effect.fn(function* (ref) {
    const object = yield* Service.load(ref).pipe(
      Effect.catchTag('ObjectNotFoundError', () => Effect.succeed(undefined)),
    );

    return Option.fromNullable(object);
  });

  /**
   * @link EchoDatabase.add
   */
  static add = <T extends Entity.Unknown>(obj: T): Effect.Effect<T, never, Service> =>
    Service.pipe(Effect.map(({ db }) => db.add(obj)));

  /**
   * @link EchoDatabase.remove
   */
  static remove = <T extends Entity.Unknown>(obj: T): Effect.Effect<void, never, Service> =>
    Service.pipe(Effect.map(({ db }) => db.remove(obj)));

  /**
   * @link EchoDatabase.flush
   */
  static flush = (opts?: FlushOptions) =>
    Service.pipe(Effect.flatMap(({ db }) => promiseWithCauseCapture(() => db.flush(opts))));

  /**
   * Creates a `QueryResult` object that can be subscribed to.
   */
  static query: {
    <Q extends Query.Any>(query: Q): Effect.Effect<QueryResult.QueryResult<Live<Query.Type<Q>>>, never, Service>;
    <F extends Filter.Any>(filter: F): Effect.Effect<QueryResult.QueryResult<Live<Filter.Type<F>>>, never, Service>;
  } = (queryOrFilter: Query.Any | Filter.Any) =>
    Service.pipe(
      Effect.map(({ db }) => db.query(queryOrFilter as any) as QueryResult.QueryResult<Live<any>>),
      Effect.withSpan('Service.query'),
    );

  /**
   * Executes the query once and returns the results.
   */
  static runQuery: {
    <Q extends Query.Any>(query: Q): Effect.Effect<Live<Query.Type<Q>>[], never, Service>;
    <F extends Filter.Any>(filter: F): Effect.Effect<Live<Filter.Type<F>>[], never, Service>;
  } = (queryOrFilter: Query.Any | Filter.Any) =>
    Service.query(queryOrFilter as any).pipe(
      Effect.flatMap((queryResult) => promiseWithCauseCapture(() => queryResult.run())),
    );

  // TODO(dmaretskyi): Change API to `yield* Service.querySchema(...).first` and `yield* Service.querySchema(...).schema`.

  static schemaQuery = <Q extends Types.NoExcessProperties<SchemaRegistry.Query, Q>>(
    query?: Q & SchemaRegistry.Query,
  ): Effect.Effect<QueryResult.QueryResult<SchemaRegistry.ExtractQueryResult<Q>>, never, Service> =>
    Service.pipe(
      Effect.map(({ db }) => db.schemaRegistry.query(query)),
      Effect.withSpan('Service.schemaQuery'),
    );

  static runSchemaQuery = <Q extends Types.NoExcessProperties<SchemaRegistry.Query, Q>>(
    query?: Q & SchemaRegistry.Query,
  ): Effect.Effect<SchemaRegistry.ExtractQueryResult<Q>[], never, Service> =>
    Service.schemaQuery(query).pipe(Effect.flatMap((queryResult) => promiseWithCauseCapture(() => queryResult.run())));
}
