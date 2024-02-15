//
// Copyright 2022 DXOS.org
//

import { Event, type ReadOnlyEvent } from '@dxos/async';
import { UpdateEvent, type BatchUpdate, type DatabaseProxy, type ItemManager } from '@dxos/echo-db';
import { type QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';

import { PublicKey } from '@dxos/keys';
import { AutomergeDb, type AutomergeContext } from './automerge';
import { type Hypergraph } from './hypergraph';
import { EchoLegacyDatabase } from './legacy-database';
import { TypedObject, type EchoObject } from './object';
import { type FilterSource, type Query } from './query';

export interface EchoDatabase {
  get graph(): Hypergraph;

  get spaceKey(): PublicKey;

  getObjectById<T extends EchoObject>(id: string): T | undefined;

  /**
   * Adds object to the database.
   */
  add<T extends EchoObject>(obj: T): T;

  /**
   * Removes object from the database.
   */
  remove<T extends EchoObject>(obj: T): void;

  /**
   * Query objects.
   */
  query<T extends TypedObject>(filter?: FilterSource<T>, options?: QueryOptions): Query<T>;

  /**
   * Wait for all pending changes to be saved to disk.
   */
  flush(): Promise<void>;

  /**
   * All loaded objects.
   * @deprecated Use query instead.
   */
  get objects(): EchoObject[];

  /**
   * @deprecated
   */
  readonly pendingBatch: ReadOnlyEvent<BatchUpdate>;

  /**
   * @deprecated
   */
  readonly automerge: AutomergeDb;

  /**
   * @deprecated
   */
  readonly _backend: DatabaseProxy;

  /**
   * @deprecated
   */
  clone<T extends EchoObject>(obj: T): void;
}

/**
 * API for the database.
 * Implements EchoDatabase interface.
 */
export class EchoDatabaseImpl implements EchoDatabase {
  /**
   * @internal
   */
  _legacy: EchoLegacyDatabase;

  constructor(itemManager: ItemManager, backend: DatabaseProxy, graph: Hypergraph, automergeContext: AutomergeContext) {
    this._legacy = new EchoLegacyDatabase(itemManager, backend, graph, automergeContext);
  }

  get graph(): Hypergraph {
    return this._legacy.graph;
  }

  get spaceKey(): PublicKey {
    return this._legacy.spaceKey;
  }

  getObjectById<T extends EchoObject>(id: string): T | undefined {
    return this._legacy.getObjectById(id);
  }

  add<T extends EchoObject>(obj: T): T {
    return this._legacy.add(obj);
  }

  remove<T extends EchoObject>(obj: T): void {
    return this._legacy.remove(obj);
  }

  query<T extends TypedObject>(filter?: FilterSource<T> | undefined, options?: QueryOptions | undefined): Query<T> {
    return this._legacy.query(filter, options);
  }

  flush(): Promise<void> {
    return this._legacy.flush();
  }

  /**
   * @internal
   */
  get _updateEvent(): Event<UpdateEvent> {
    return this._legacy._updateEvent;
  }

  /**
   * @deprecated
   */
  get objects(): EchoObject[] {
    return this._legacy.objects;
  }

  /**
   * @deprecated
   */
  get pendingBatch(): ReadOnlyEvent<BatchUpdate> {
    return this._legacy.pendingBatch;
  }

  /**
   * @deprecated
   */
  get automerge(): AutomergeDb {
    return this._legacy.automerge;
  }

  /**
   * @deprecated
   */
  get _backend(): DatabaseProxy {
    return this._legacy._backend;
  }

  /**
   * @deprecated
   */
  clone<T extends EchoObject>(obj: T): void {
    return this._legacy.clone(obj);
  }
}
