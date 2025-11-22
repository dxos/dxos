//
// Copyright 2025 DXOS.org
//

import { type CleanupFn } from '@dxos/async';
import { type DXN, type PublicKey, type SpaceId } from '@dxos/keys';
import { type Live } from '@dxos/live-object';
import { type QueryAST } from '@dxos/echo-protocol';

import { type BaseObject, type HasId } from './internal';
import { type Filter, type Query } from './query';
import type * as Ref from './Ref';

export type QueryResultEntry<T extends BaseObject = BaseObject> = {
  id: string;

  // TODO(burdon): Rename DatabaseId?
  spaceId: SpaceId;

  /**
   * May not be present for remote results.
   */
  object?: T;

  match?: {
    // TODO(dmaretskyi): text positional info.

    /**
     * Higher means better match.
     */
    rank: number;
  };

  /**
   * Query resolution metadata.
   */
  // TODO(dmaretskyi): Rename to meta?
  resolution?: {
    // TODO(dmaretskyi): Make this more generic.
    source: 'remote' | 'local' | 'index';

    /**
     * Query resolution time in milliseconds.
     */
    time: number;
  };
};

export type OneShotQueryResult<T extends BaseObject = BaseObject> = {
  results: QueryResultEntry<T>[];
  objects: T[];
};

export type QuerySubscriptionOptions = {
  /**
   * Fire the callback immediately.
   */
  fire?: boolean;
};

export interface QueryResult<T extends BaseObject = BaseObject> {
  readonly query: Query<T>;
  readonly results: QueryResultEntry<T>[];
  readonly objects: T[];

  run(opts?: QueryRunOptions): Promise<OneShotQueryResult<T>>;
  runSync(): QueryResultEntry<T>[];
  first(opts?: QueryRunOptions): Promise<T>;
  subscribe(callback?: (query: QueryResult<T>) => void, opts?: QuerySubscriptionOptions): CleanupFn;
}

export type QueryRunOptions = {
  timeout?: number;
};

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
};

/**
 * `query` API function declaration.
 */
export interface QueryFn {
  // TODO(dmaretskyi): Remove query options.
  <Q extends Query.Any>(
    query: Q,
    options?: (QueryAST.QueryOptions & QueryOptions) | undefined,
  ): QueryResult<Query.Type<Q>>;
  <F extends Filter.Any>(
    filter: F,
    options?: (QueryAST.QueryOptions & QueryOptions) | undefined,
  ): QueryResult<Filter.Type<F>>;
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

// TODO(burdon): Deconstruct into aspects.
export interface Database extends Queryable {
  // get spaceKey(): PublicKey;
  get spaceId(): SpaceId;

  // TODO(burdon): Implement.
  // get graph(): Hypergraph;
  // get schemaRegistry(): EchoSchemaRegistry;

  // toJSON(): object;

  /**
   * Creates a reference to an existing object in the database.
   *
   * NOTE: The reference may be dangling if the object is not present in the database.
   *
   * ## Difference from `Ref.fromDXN`
   *
   * `Ref.fromDXN(dxn)` returns an unhydrated reference. The `.load` and `.target` APIs will not work.
   * `db.ref(dxn)` is preferable in cases with access to the database.
   */
  ref<T extends BaseObject = any>(dxn: DXN): Ref.Ref<T>;

  /**
   * Query objects.
   */
  query: QueryFn;

  /**
   * Adds object to the database.
   */
  // TODO(dmaretskyi): Lock to Obj.Any | Relation.Any.
  add<T extends BaseObject>(obj: Live<T>, opts?: AddOptions): Live<T & HasId>;

  /**
   * Removes object from the database.
   */
  // TODO(dmaretskyi): Lock to Obj.Any | Relation.Any.
  remove<T extends BaseObject & HasId>(obj: T): void;

  /**
   * Wait for all pending changes to be saved to disk.
   */
  // flush(opts?: FlushOptions): Promise<void>;

  //
  // REMOVE
  //

  /**
   * Get the current sync state.
   */
  // getSyncState(): Promise<SpaceSyncState>;

  /**
   * Get notification about the sync progress with other peers.
   */
  // subscribeToSyncState(ctx: Context, cb: (state: SpaceSyncState) => void): CleanupFn;

  /**
   * Run migrations.
   */
  // runMigrations(migrations: ObjectMigration[]): Promise<void>;

  /**
   * Insert new objects.
   * @deprecated Use `add` instead.
   */
  // TODO(burdon): Remove.
  // TODO(dmaretskyi): Support meta.
  // insert(data: unknown): Promise<unknown>;

  /**
   * Update objects.
   * @deprecated Directly mutate the object.
   */
  // TODO(burdon): Remove.
  // update(filter: Filter.Any, operation: unknown): Promise<void>;

  /**
   * @deprecated Use `ref` instead.
   */
  // getObjectById<T>(id: string, opts?: GetObjectByIdOptions): Live<T> | undefined;

  /**
   * Get notification about the data being saved to disk.
   */
  // readonly saveStateChanged: ReadOnlyEvent<SaveStateChangedEvent>;

  /**
   * @deprecated
   */
  // readonly pendingBatch: ReadOnlyEvent<unknown>;

  /**
   * @deprecated
   */
  // readonly coreDatabase: CoreDatabase;
}
