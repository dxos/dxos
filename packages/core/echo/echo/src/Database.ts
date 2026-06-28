//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Effectable from 'effect/Effectable';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { QueryAST } from '@dxos/echo-protocol';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { EID, SpaceId, type URI } from '@dxos/keys';

import type * as Entity from './Entity';
import * as Err from './Err';
import type * as Feed from './Feed';
import type * as Filter from './Filter';
import * as Hypergraph from './Hypergraph';
import { type AnyProperties, EntityKind, KindId } from './internal/common/types';
// Deep import (not the `./internal/Entity` barrel) to avoid a cycle:
// Database → internal/Entity → entity → JsonSchema → Ref → Database.
import { isInstanceOf } from './internal/Entity/type-uri';
import type { Ref } from './internal/Ref/ref';
import type * as Obj from './Obj';
import type * as Query from './Query';
import type * as QueryResult from './QueryResult';
import type * as Registry from './Registry';
import type * as Type from './Type';

/**
 * `query` API function declaration.
 */
// TODO(burdon): Reconcile Query and Filter (should only have one root type).
export interface QueryFn {
  <Q extends Query.Any>(query: Q): QueryResult.QueryResult<Query.Type<Q>>;
  <F extends Filter.Any>(filter: F): QueryResult.QueryResult<Filter.Type<F>>;
}

/**
 * Common interface for Database, Feed, and Hypergraph.
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

/**
 * Rejects Type entities from {@link Database.add} at compile time via their `[KindId]` brand. Used
 * as `T & RejectTypeEntity<T>` to preserve inference of `T`. Bounding `add` on
 * `Obj.Unknown | Relation.Unknown` instead would reject broadly-typed instance adds (e.g.
 * `Entity.Any`, `Obj.OfShape<T>`), forcing casts repo-wide.
 */
export type RejectTypeEntity<T> = T extends { readonly [KindId]: EntityKind.Type }
  ? { __error: 'Type entities must be persisted via db.addType(), not db.add().' }
  : T;

export type FlushOptions = {
  /**
   * Write any pending changes to disk.
   * @default true
   */
  disk?: boolean;

  /**
   * Wait for pending index updates.
   * @default true
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

  get graph(): Hypergraph.Hypergraph;

  /**
   * Registry for this database. Delegates type lookups to the shared hypergraph registry.
   * To persist a schema so it replicates to other clients, add the type entity with
   * {@link addType} (e.g. `await db.addType(Type.makeObjectFromJsonSchema(...))`).
   */
  readonly registry: Registry.Registry;

  toJSON(): object;

  /**
   * Return object by local ID.
   * @deprecated Use `db.query(Filter.id(id)).runSync()[0]` for a working-set lookup, or resolve via a {@link Ref}.
   */
  getObjectById<T extends Obj.Unknown = Obj.OfShape<AnyProperties>>(
    id: string,
    opts?: GetObjectByIdOptions,
  ): T | undefined;

  /**
   * Query objects.
   */
  query: QueryFn;

  /**
   * Creates a reference to an existing object in the database.
   *
   * NOTE: The reference may be dangling if the object is not present in the database.
   * NOTE: Difference from `Ref.fromURI`
   * `Ref.fromURI(dxn)` returns an unhydrated reference. The `.load` and `.target` APIs will not work.
   * `db.makeRef(dxn)` is preferable in cases with access to the database.
   */
  makeRef<T extends Entity.Unknown = Entity.Unknown>(uri: URI.URI): Ref<T>;

  /**
   * Adds an object or relation to the database.
   *
   * Only Object and Relation entities are accepted. To persist a Type definition use
   * {@link addType} — passing a Type entity is rejected at compile time (and at runtime).
   */
  add<T extends Entity.Unknown = Entity.Unknown>(obj: T & RejectTypeEntity<T>, opts?: AddOptions): T;

  /**
   * Persists a Type definition (clones/forks the entity) so it replicates to other peers.
   *
   * Runs a conflict query first: if a type with the same typename + version already exists in
   * this space, the existing persisted entity is returned and no duplicate is created. This is
   * the only supported way to add Type entities — {@link add} rejects them.
   */
  addType<T extends Type.AnyEntity>(type: T): Promise<T>;

  /**
   * Removes object from the database.
   */
  // TODO(burdon): Return true if removed (currently throws if not present).
  remove(obj: Entity.Unknown): void;

  /**
   * Appends entities to a feed.
   *
   * The feed must already be stored in the database (added via {@link add}); its underlying
   * queue is addressed by the feed object's URI.
   */
  appendToFeed(feed: Feed.Feed, entities: Entity.Unknown[]): Promise<void>;

  /**
   * Removes entities from a feed.
   */
  deleteFromFeed(feed: Feed.Feed, entities: Entity.Unknown[]): Promise<void>;

  /**
   * Wait for all pending changes to be saved to disk.
   * Optionaly waits for changes to be propagated to indexes and event handlers.
   */
  flush(opts?: FlushOptions): Promise<void>;

  /**
   * Removes feed items by ID.
   */
  removeFeedItemsByIds(feed: Feed.Feed, ids: string[]): Promise<void>;

  /**
   * Queries items in a feed associated with this database.
   */
  queryFeed(feed: Feed.Feed, queryOrFilter: Query.Any | Filter.Any): QueryResult.QueryResult<any>;

  /**
   * Syncs a feed with the server.
   */
  syncFeed(feed: Feed.Feed, options?: Feed.SyncOptions): Promise<void>;

  /**
   * Returns queue replication backlog for the feed's namespace.
   */
  getFeedSyncState(feed: Feed.Feed): Promise<Feed.SyncState>;
}

export const isDatabase = (obj: unknown): obj is Database => {
  return obj ? typeof obj === 'object' && TypeId in obj && obj[TypeId] === TypeId : false;
};

export const Database: Schema.Schema<Database> = Schema.Any.pipe(Schema.filter((space) => isDatabase(space)));

/**
 * Effect service tag for Database dependency injection.
 */
export class Service extends Context.Tag('@dxos/echo/Database/Service')<
  Service,
  {
    readonly db: Database;
  }
>() {}

/**
 * Layer that provides a Database service that throws when accessed.
 * Useful as a default layer when no database is available.
 */
export const notAvailable = Layer.succeed(Service, {
  get db(): Database {
    throw new Error('Database not available');
  },
});

/**
 * Creates a Database service instance from a Database.
 */
export const makeService = (db: Database): Context.Tag.Service<Service> => {
  return {
    get db() {
      return db;
    },
  };
};

/**
 * Creates a Layer that provides the Database service.
 */
export const layer = (db: Database): Layer.Layer<Service> => {
  return Layer.succeed(Service, makeService(db));
};

/**
 * Returns the space ID of the database.
 */
export const spaceId = Effect.gen(function* () {
  const { db } = yield* Service;
  return db.spaceId;
});

/**
 * Resolves an object by its DXN.
 */
export const resolve: {
  // No type check.
  (ref: URI.URI | Ref<any>): Effect.Effect<Entity.Unknown, never, Service>;
  // Check matches schema.
  <S extends Type.AnyEntity>(
    ref: URI.URI | Ref<any>,
    schema: S,
  ): Effect.Effect<Type.InstanceType<S>, Err.EntityNotFoundError, Service>;
} = (<S extends Type.AnyEntity>(
  ref: URI.URI | Ref<any>,
  schema?: S,
): Effect.Effect<Type.InstanceType<S>, Err.EntityNotFoundError, Service> =>
  Effect.gen(function* () {
    const { db } = yield* Service;
    const scope = yield* Effect.serviceOption(Hypergraph.Service);
    const dxn = typeof ref === 'string' ? ref : ref.uri;
    // Resolve against a graph scoped to the allowlist when a confined session provides
    // Hypergraph.Service, so the session cannot reach a space outside it. Defaults to the home
    // `db.graph` (non-agent path).
    const graph = Option.match(scope, {
      onNone: () => db.graph,
      onSome: ({ allowlist }) => db.graph.scoped([...allowlist]),
    });
    const object = yield* EffectEx.promiseWithCauseCapture(() =>
      graph
        .createRefResolver({
          context: {
            space: db.spaceId,
          },
        })
        .resolveLegacy(dxn),
    );

    if (!object) {
      return yield* Effect.fail(new Err.EntityNotFoundError(dxn));
    }
    // `isInstanceOf` uses a conditional generic that TS can't resolve through
    // the local `S extends Type.AnyEntity` parameter — runtime accepts it fine.
    invariant(!schema || isInstanceOf(schema as any, object), 'Object type mismatch.');
    return object as any;
  }).pipe(Effect.withSpan('Database.resolve'))) as any;

/**
 * Loads an object reference.
 *
 * Catching not found error:
 *
 * ```ts
 * yield* load(ref).pipe(Effect.catchTag('EntityNotFoundError', () => Effect.succeed(undefined)));
 * ```
 *
 */
export const load: <T>(ref: Ref<T>) => Effect.Effect<T, Err.EntityNotFoundError, never> = Effect.fn('Database.load')(
  function* (ref) {
    // Confinement (agent firewall): deny loading a ref whose absolute URI names a space outside the
    // allowlist, so a foreign `echo://<otherSpace>/<id>` handle carried into a confined session (e.g.
    // via untrusted data / prompt injection) cannot be dereferenced. A relative ref (no embedded
    // space) targets the home space and is allowed. Absent Hypergraph.Service ⇒ unconfined.
    const scope = yield* Effect.serviceOption(Hypergraph.Service);
    if (Option.isSome(scope) && uriTargetsForeignSpace(ref.uri, scope.value.allowlist)) {
      return yield* Effect.fail(new Err.EntityNotFoundError(ref.uri));
    }
    const object = yield* EffectEx.promiseWithCauseCapture(() => ref.tryLoad());
    if (!object) {
      return yield* Effect.fail(new Err.EntityNotFoundError(ref.uri));
    }
    return object;
  },
);

/** True when `uri` is an absolute echo URI naming a space outside `allowlist` (relative ⇒ home ⇒ allowed). */
const uriTargetsForeignSpace = (uri: URI.URI, allowlist: readonly SpaceId[]): boolean => {
  const eid = EID.tryParse(uri);
  if (eid === undefined) {
    return false;
  }
  const spaceId = EID.getSpaceId(eid);
  return spaceId !== undefined && !allowlist.includes(spaceId);
};

/**
 * Adds an object or relation to the database.
 * @see {@link Database.add}
 */
export const add = <T extends Entity.Unknown>(obj: T & RejectTypeEntity<T>): Effect.Effect<T, never, Service> =>
  Service.pipe(Effect.map(({ db }) => db.add<T>(obj))).pipe(Effect.withSpan('Database.add'));

/**
 * Persists a Type definition to the database.
 * @see {@link Database.addType}
 */
export const addType = <T extends Type.AnyEntity>(type: T): Effect.Effect<T, never, Service> =>
  Service.pipe(Effect.flatMap(({ db }) => EffectEx.promiseWithCauseCapture(() => db.addType(type)))).pipe(
    Effect.withSpan('Database.addType'),
  );

/**
 * Removes an object from the database.
 * @see {@link Database.remove}
 */
export const remove = <T extends Entity.Unknown>(obj: T): Effect.Effect<void, never, Service> =>
  Service.pipe(Effect.map(({ db }) => db.remove(obj))).pipe(Effect.withSpan('Database.remove'));

/**
 * Appends entities to a feed.
 * @see {@link Database.appendToFeed}
 */
export const appendToFeed = (feed: Feed.Feed, entities: Entity.Unknown[]): Effect.Effect<void, never, Service> =>
  Service.pipe(
    Effect.flatMap(({ db }) => EffectEx.promiseWithCauseCapture(() => db.appendToFeed(feed, entities))),
  ).pipe(Effect.withSpan('Database.appendToFeed'));

/**
 * Removes entities from a feed.
 * @see {@link Database.deleteFromFeed}
 */
export const deleteFromFeed = (feed: Feed.Feed, entities: Entity.Unknown[]): Effect.Effect<void, never, Service> =>
  Service.pipe(
    Effect.flatMap(({ db }) => EffectEx.promiseWithCauseCapture(() => db.deleteFromFeed(feed, entities))),
  ).pipe(Effect.withSpan('Database.deleteFromFeed'));

/**
 * Flushes pending changes to disk.
 * @see {@link Database.flush}
 */
export const flush = (opts?: FlushOptions) =>
  Service.pipe(Effect.flatMap(({ db }) => EffectEx.promiseWithCauseCapture(() => db.flush(opts)))).pipe(
    Effect.withSpan('Database.flush'),
  );

/**
 * Creates a `QueryResult` object that can be subscribed to.
 */
export const query: {
  <Q extends Query.Any>(query: Q): QueryResult.QueryResultEffect<Query.Type<Q>, never, Service>;
  <F extends Filter.Any>(filter: F): QueryResult.QueryResultEffect<Filter.Type<F>, never, Service>;
} = (queryOrFilter: Query.Any | Filter.Any) =>
  Effect.gen(function* () {
    const { db } = yield* Service;
    const scope = yield* Effect.serviceOption(Hypergraph.Service);
    // A confined session (Hypergraph.Service present) may not read outside its allowlist. A query
    // that explicitly selects a foreign space is routed through a scoped graph, which has no source
    // for that space and so yields nothing. Every other query keeps `db.query`, preserving its
    // owning-space binding and feed/queue handling — and already confined to the home space, since
    // `db.query` binds unscoped selections to the owning space. See docs/design/agent-firewall.md.
    // TODO(wittjosiah): A T1 session (allowlist beyond the home space) needs a scoped multi-space
    // fan-out that still applies `db.query`'s feed handling; today only the home space is read.
    if (Option.isSome(scope) && queryTargetsForeignSpace(queryOrFilter, scope.value.allowlist)) {
      return db.graph.scoped([...scope.value.allowlist]).query(queryOrFilter as any) as QueryResult.QueryResult<any>;
    }
    return db.query(queryOrFilter as any) as QueryResult.QueryResult<any>;
  }).pipe(Effect.withSpan('Database.query'), makeQueryResultEffect);

/**
 * True when the query explicitly selects from a space outside `allowlist`. A `Scope.space` without a
 * `spaceId` targets the owning space (no explicit restriction); filters carry no space scope.
 */
const queryTargetsForeignSpace = (queryOrFilter: Query.Any | Filter.Any, allowlist: readonly SpaceId[]): boolean => {
  // A Filter carries no space scope; only a Query selects a space via `from(Scope.space)`. Test the
  // Filter brand inline (a value import of Filter would cycle through Database).
  if (!isQuery(queryOrFilter)) {
    return false;
  }
  let foreign = false;
  QueryAST.visit(queryOrFilter.ast, (node) => {
    if (node.type === 'from' && node.from._tag === 'scope') {
      for (const scope of node.from.scopes) {
        if (scope._tag === 'space' && scope.spaceId !== undefined && !allowlist.includes(SpaceId.make(scope.spaceId))) {
          foreign = true;
        }
      }
    }
  });
  return foreign;
};

/** Narrows the `query`/`filter` union to a Query via the Filter brand (see {@link queryTargetsForeignSpace}). */
const isQuery = (queryOrFilter: Query.Any | Filter.Any): queryOrFilter is Query.Any =>
  typeof queryOrFilter === 'object' && queryOrFilter !== null && !('~Filter' in queryOrFilter);

const makeQueryResultEffect = <T>(
  eff: Effect.Effect<QueryResult.QueryResult<T>, never, Service>,
): QueryResult.QueryResultEffect<T, never, Service> => {
  return {
    run: Effect.flatMap(eff, (result) => EffectEx.promiseWithCauseCapture(() => result.run())),
    first: Effect.flatMap(eff, (result) =>
      EffectEx.promiseWithCauseCapture(async () => Option.fromNullable(await result.firstOrUndefined())),
    ),

    // Effect internals
    ...Effectable.CommitPrototype,
    commit() {
      return eff;
    },
  } as any;
};
