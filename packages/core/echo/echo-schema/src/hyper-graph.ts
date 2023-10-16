//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { type QueryOptions, type UpdateEvent } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { ComplexMap } from '@dxos/util';

import { type EchoDatabase } from './database';
import { type Filter, Query, type TypeFilter } from './query';
import { TypeCollection } from './type-collection';
import { type TypedObject } from './typed-object';

/**
 * Manages cross-space database interactions.
 */
export class HyperGraph {
  private readonly _databases = new ComplexMap<PublicKey, EchoDatabase>(PublicKey.hash);
  private readonly _types = new TypeCollection();
  private readonly _updateEvent = new Event<UpdateEvent>();

  get types(): TypeCollection {
    return this._types;
  }

  addTypes(types: TypeCollection) {
    this._types.mergeSchema(types);
    return this;
  }

  /**
   * Register a database in hyper-graph.
   */
  _register(spaceKey: PublicKey, database: EchoDatabase) {
    this._databases.set(spaceKey, database);
    database._updateEvent.on(this._updateEvent.emit.bind(this._updateEvent));
  }

  /**
   * Filter by type.
   */
  // TODO(burdon): Additional filters?
  query<T extends TypedObject>(filter: TypeFilter<T>, options?: QueryOptions): Query<T>;
  query(filter?: Filter<any>, options?: QueryOptions): Query;
  query(filter: Filter<any>, options?: QueryOptions): Query {
    return new Query(
      new ComplexMap(
        PublicKey.hash,
        Array.from(this._databases.entries()).map(([key, db]) => [key, db._objects]),
      ),
      this._updateEvent,
      filter,
      options,
    );
  }
}
