//
// Copyright 2022 DXOS.org
//

import { Event, type ReadOnlyEvent, synchronized } from '@dxos/async';
import { type Context, LifecycleState, Resource } from '@dxos/context';
import { type EchoReactiveObject, getSchema, type ReactiveObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { type QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';

import { type AutomergeContext, AutomergeDb, type AutomergeObjectCore, type InitRootProxyFn } from './automerge';
import { DynamicSchemaRegistry } from './dynamic-schema-registry';
import { createEchoObject, initEchoReactiveObjectRootProxy, isEchoObject } from './echo-handler';
import { type Hypergraph } from './hypergraph';
import { type Filter, type FilterSource, type Query } from './query';

export interface EchoDatabase {
  get spaceKey(): PublicKey;

  // TODO(burdon): Should this be public?
  get schemaRegistry(): DynamicSchemaRegistry;

  /**
   * All loaded objects.
   * @deprecated Use query instead.
   */
  get objects(): EchoReactiveObject<any>[];

  get graph(): Hypergraph;

  getObjectById<T extends {} = any>(id: string): EchoReactiveObject<T> | undefined;

  /**
   * Adds object to the database.
   */
  add<T extends {} = any>(obj: ReactiveObject<T>): EchoReactiveObject<T>;

  /**
   * Removes object from the database.
   */
  remove<T extends EchoReactiveObject<any>>(obj: T): void;

  /**
   * Query objects.
   */
  query(): Query;
  query<T extends {} = any>(filter?: Filter<T> | undefined, options?: QueryOptions | undefined): Query<T>;
  query<T extends {} = any>(filter?: T | undefined, options?: QueryOptions | undefined): Query;

  /**
   * Wait for all pending changes to be saved to disk.
   */
  flush(): Promise<void>;

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
export class EchoDatabaseImpl extends Resource implements EchoDatabase {
  /**
   * @internal
   */
  _automerge: AutomergeDb;

  public readonly schemaRegistry: DynamicSchemaRegistry;

  private _rootUrl: string | undefined = undefined;

  constructor(params: EchoDatabaseParams) {
    super();
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

  get rootUrl(): string | undefined {
    return this._rootUrl;
  }

  @synchronized
  protected override async _open(ctx: Context): Promise<void> {
    if (this._rootUrl !== undefined) {
      await this._automerge.open({ rootUrl: this._rootUrl });
    }
  }

  @synchronized
  protected override async _close(ctx: Context): Promise<void> {}

  @synchronized
  async setSpaceRoot(rootUrl: string) {
    const firstTime = this._rootUrl === undefined;
    this._rootUrl = rootUrl;
    if (this._lifecycleState === LifecycleState.OPEN) {
      if (firstTime) {
        await this._automerge.open({ rootUrl });
      } else {
        await this._automerge.update({ rootUrl });
      }
    }
  }

  getObjectById<T extends EchoReactiveObject<any>>(id: string): T | undefined {
    return this._automerge.getObjectById(id) as T | undefined;
  }

  add<T extends ReactiveObject<any>>(obj: T): EchoReactiveObject<{ [K in keyof T]: T[K] }> {
    if (isEchoObject(obj)) {
      this._automerge.add(obj);
      return obj as any;
    } else {
      const schema = getSchema(obj);

      if (schema != null) {
        if (!this.schemaRegistry.isRegistered(schema) && !this.graph.runtimeSchemaRegistry.hasSchema(schema)) {
          throw createSchemaNotRegisteredError(schema);
        }
      }

      const echoObj = createEchoObject(obj);
      this._automerge.add(echoObj);
      return echoObj as any;
    }
  }

  remove<T extends EchoReactiveObject<any>>(obj: T): void {
    invariant(isEchoObject(obj));
    return this._automerge.remove(obj);
  }

  query(): Query<EchoReactiveObject<any>>;
  query<T extends EchoReactiveObject<any> = EchoReactiveObject<any>>(
    filter?: Filter<T> | undefined,
    options?: QueryOptions | undefined,
  ): Query<T>;

  query<T extends {}>(filter?: T | undefined, options?: QueryOptions | undefined): Query<EchoReactiveObject<any> & T>;
  query<T extends EchoReactiveObject<any>>(
    filter?: FilterSource<T> | undefined,
    options?: QueryOptions | undefined,
  ): Query<T> {
    return this._automerge.graph.query(filter, {
      ...options,
      spaces: [this.spaceKey],
    });
  }

  async flush(): Promise<void> {
    await this._automerge.flush();
  }

  /**
   * @deprecated
   */
  get objects(): EchoReactiveObject<any>[] {
    return this._automerge.allObjectCores().map((core) => core.rootProxy as EchoReactiveObject<any>);
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

const createSchemaNotRegisteredError = (schema?: any) => {
  const message = 'Schema not registered';

  if (schema?.typename) {
    return new Error(`${message} Schema: ${schema.typename}`);
  }

  return new Error(message);
};
