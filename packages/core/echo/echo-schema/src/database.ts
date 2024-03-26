//
// Copyright 2022 DXOS.org
//

import { Event, type ReadOnlyEvent } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { type QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';

import {
  AutomergeDb,
  AutomergeObject,
  type AutomergeContext,
  type AutomergeObjectCore,
  type InitRootProxyFn,
} from './automerge';
import { createEchoReactiveObject, initEchoReactiveObjectRootProxy } from './effect/echo-handler';
import { type EchoReactiveObject, getSchema } from './effect/reactive';
import { type Hypergraph } from './hypergraph';
import { base, isAutomergeObject, type EchoObject, type OpaqueEchoObject, type TypedObject } from './object';
import { type Filter, type FilterSource, type Query } from './query';

export interface EchoDatabase {
  get graph(): Hypergraph;

  get spaceKey(): PublicKey;

  getObjectById<T extends EchoObject>(id: string): T | undefined;

  /**
   * Adds object to the database.
   */
  add<T extends OpaqueEchoObject>(obj: T): T extends EchoObject ? T : EchoReactiveObject<T>;

  /**
   * Removes object from the database.
   */
  remove<T extends OpaqueEchoObject>(obj: T): void;

  /**
   * Query objects.
   */
  query(): Query<TypedObject>;
  query<T extends OpaqueEchoObject = TypedObject>(
    filter?: Filter<T> | undefined,
    options?: QueryOptions | undefined,
  ): Query<T>;
  query<T extends {}>(filter?: T | undefined, options?: QueryOptions | undefined): Query<TypedObject>;

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

  useReactiveObjectApi?: boolean;
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

  private _useReactiveObjectApi: boolean;

  constructor(params: EchoDatabaseParams) {
    const initRootProxyFn: InitRootProxyFn = (core: AutomergeObjectCore) => {
      if (this._useReactiveObjectApi) {
        initEchoReactiveObjectRootProxy(core);
      } else {
        const obj = new AutomergeObject();
        obj[base]._core = core;
        core.rootProxy = obj;
      }
    };

    this._automerge = new AutomergeDb(params.graph, params.automergeContext, params.spaceKey, initRootProxyFn, this);
    this._useReactiveObjectApi = params.useReactiveObjectApi ?? false;
  }

  get graph(): Hypergraph {
    return this._automerge.graph;
  }

  get spaceKey(): PublicKey {
    return this._automerge.spaceKey;
  }

  getObjectById<T extends EchoObject>(id: string): T | undefined {
    return this._automerge.getObjectById(id) as T | undefined;
  }

  add<T extends OpaqueEchoObject>(obj: T): T extends EchoObject ? T : EchoReactiveObject<{ [K in keyof T]: T[K] }> {
    if (!this._useReactiveObjectApi) {
      invariant(isAutomergeObject(obj));
      this._automerge.add(obj);
      return obj as any;
    } else {
      invariant(!isAutomergeObject(obj));
      const schema = getSchema(obj);
      if (schema != null && !this.graph.types.isEffectSchemaRegistered(schema)) {
        throw createSchemaNotRegisteredError();
      }
      const echoObj = createEchoReactiveObject(obj);
      this._automerge.add(echoObj);
      return echoObj as any;
    }
  }

  remove<T extends OpaqueEchoObject>(obj: T): void {
    invariant(isAutomergeObject(obj));
    return this._automerge.remove(obj);
  }

  query(): Query<TypedObject>;
  query<T extends OpaqueEchoObject>(filter?: Filter<T> | undefined, options?: QueryOptions | undefined): Query<T>;
  query<T extends {}>(filter?: T | undefined, options?: QueryOptions | undefined): Query<TypedObject>;
  query<T extends OpaqueEchoObject>(
    filter?: FilterSource<T> | undefined,
    options?: QueryOptions | undefined,
  ): Query<T> {
    options ??= {};
    options.spaces = [this.spaceKey];

    return this._automerge.graph.query(filter, options);
  }

  async flush(): Promise<void> {
    // TODO(dmaretskyi): Noop until we implement flushing with automerger.
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
