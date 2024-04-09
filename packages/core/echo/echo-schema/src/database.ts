//
// Copyright 2022 DXOS.org
//

import { Event, type ReadOnlyEvent } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { type QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';

import { AutomergeDb, type AutomergeContext, type AutomergeObjectCore, type InitRootProxyFn } from './automerge';
import { DynamicSchemaRegistry } from './effect/dynamic/schema-registry';
import { createEchoReactiveObject, initEchoReactiveObjectRootProxy } from './effect/echo-handler';
import { type EchoReactiveObject, getSchema, isEchoReactiveObject, type ReactiveObject } from './effect/reactive';
import { type Hypergraph } from './hypergraph';
import { type EchoObject, type OpaqueEchoObject } from './object';
import { type Filter, type FilterSource, type Query } from './query';

export interface EchoDatabase {
  get graph(): Hypergraph;

  get spaceKey(): PublicKey;

  getObjectById<T extends OpaqueEchoObject>(id: string): T | undefined;

  /**
   * Adds object to the database.
   */
  add<T extends {} = any>(obj: ReactiveObject<T>): EchoReactiveObject<T>;

  /**
   * Removes object from the database.
   */
  remove<T extends OpaqueEchoObject>(obj: T): void;

  /**
   * Query objects.
   */
  query(): Query<EchoReactiveObject<any>>;
  query<T extends OpaqueEchoObject>(filter?: Filter<T> | undefined, options?: QueryOptions | undefined): Query<T>;
  query<T extends {}>(filter?: T | undefined, options?: QueryOptions | undefined): Query<EchoReactiveObject<any>>;

  /**
   * Wait for all pending changes to be saved to disk.
   */
  flush(): Promise<void>;

  /**
   * All loaded objects.
   * @deprecated Use query instead.
   */
  get objects(): EchoObject[];

  get schemaRegistry(): DynamicSchemaRegistry;

  /**
   * @deprecated
   */
  readonly pendingBatch: ReadOnlyEvent<unknown>;

  /**
   * @deprecated
   */
  readonly automerge: AutomergeDb;
}

export type EchoDatabaseParams = {
  graph: Hypergraph;
  automergeContext: AutomergeContext;
  spaceKey: PublicKey;
};

/**
 * API for the database.
 * Implements EchoDatabase interface.
 */
export class EchoDatabaseImpl implements EchoDatabase {
  /**
   * @internal
   */
  _automerge: AutomergeDb;

  public readonly schemaRegistry: DynamicSchemaRegistry;

  constructor(params: EchoDatabaseParams) {
    const initRootProxyFn: InitRootProxyFn = (core: AutomergeObjectCore) => {
      initEchoReactiveObjectRootProxy(core);
    };

    this._automerge = new AutomergeDb(params.graph, params.automergeContext, params.spaceKey, initRootProxyFn, this);
    this.schemaRegistry = new DynamicSchemaRegistry(this);
  }

  get graph(): Hypergraph {
    return this._automerge.graph;
  }

  get spaceKey(): PublicKey {
    return this._automerge.spaceKey;
  }

  getObjectById<T extends OpaqueEchoObject>(id: string): T | undefined {
    return this._automerge.getObjectById(id) as T | undefined;
  }

  add<T extends OpaqueEchoObject>(obj: T): T extends EchoObject ? T : EchoReactiveObject<{ [K in keyof T]: T[K] }> {
    if (isEchoReactiveObject(obj)) {
      this._automerge.add(obj);
      return obj as any;
    } else {
      const schema = getSchema(obj);
      if (schema != null) {
        if (!this.schemaRegistry.isRegistered(schema) && !this.graph.types.isEffectSchemaRegistered(schema)) {
          throw createSchemaNotRegisteredError();
        }
      }
      const echoObj = createEchoReactiveObject(obj);
      this._automerge.add(echoObj);
      return echoObj as any;
    }
  }

  remove<T extends OpaqueEchoObject>(obj: T): void {
    invariant(isEchoReactiveObject(obj));
    return this._automerge.remove(obj);
  }

  query(): Query<EchoReactiveObject<any>>;
  query<T extends OpaqueEchoObject = EchoReactiveObject<any>>(
    filter?: Filter<T> | undefined,
    options?: QueryOptions | undefined,
  ): Query<T>;

  query<T extends {}>(filter?: T | undefined, options?: QueryOptions | undefined): Query<EchoReactiveObject<any> & T>;
  query<T extends OpaqueEchoObject>(
    filter?: FilterSource<T> | undefined,
    options?: QueryOptions | undefined,
  ): Query<T> {
    options ??= {};
    options.spaces = [this.spaceKey];

    return this._automerge.graph.query(filter, options);
  }

  async flush(): Promise<void> {
    await this._automerge.flush();
  }

  /**
   * @deprecated
   */
  get objects(): EchoObject[] {
    return this._automerge.allObjects();
  }

  /**
   * @deprecated
   */
  readonly pendingBatch = new Event<unknown>();

  /**
   * @deprecated
   */
  get automerge(): AutomergeDb {
    return this._automerge;
  }
}

const createSchemaNotRegisteredError = () => {
  return new Error('Schema not registered in Hypergraph: call registerEffectSchema before adding an object');
};
