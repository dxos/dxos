//
// Copyright 2025 DXOS.org
//

import { type QueryAST } from '@dxos/echo-protocol';
import { type DXN, type PublicKey, type SpaceId } from '@dxos/keys';
import { type QueryOptions as QueryOptionsProto } from '@dxos/protocols/proto/dxos/echo/filter';

import type * as Entity from './Entity';
import type { Filter, Query } from './query';
import type * as QueryResult from './QueryResult';
import type * as Ref from './Ref';

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

/**
 * ECHO Database interface.
 */
export interface Database extends Queryable {
  get spaceId(): SpaceId;

  // TODO(burdon): Move hypergraph def here.
  // get graph(): Hypergraph;

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
   * Query objects.
   */
  query: QueryFn;

  /**
   * Adds object to the database.
   */
  // TODO(burdon): Add batch.
  add<T extends Entity.Unknown = Entity.Unknown>(obj: T, opts?: AddOptions): T;

  /**
   * Removes object from the database.
   */
  // TODO(burdon): Return true if removed (currently throws if not present).
  remove(obj: Entity.Unknown): void;
}
