//
// Copyright 2022 DXOS.org
//

import { Event, type ReadOnlyEvent, synchronized } from '@dxos/async';
import { LifecycleState, Resource } from '@dxos/context';
import {
  type EchoReactiveObject,
  getProxyHandlerSlot,
  getSchema,
  isReactiveObject,
  type ReactiveObject,
} from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { type PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';
import { defaultMap } from '@dxos/util';

import { DynamicSchemaRegistry } from './dynamic-schema-registry';
import {
  type AutomergeContext,
  CoreDatabase,
  getObjectCore,
  type LoadObjectOptions,
  type ObjectCore,
} from '../core-db';
import { createEchoObject, initEchoReactiveObjectRootProxy, isEchoObject } from '../echo-handler';
import { EchoReactiveHandler } from '../echo-handler/echo-handler';
import { type ProxyTarget } from '../echo-handler/echo-proxy-target';
import { type Hypergraph } from '../hypergraph';
import { type Filter, type FilterSource, type Query } from '../query';

export type GetObjectByIdOptions = {
  deleted?: boolean;
};

export interface EchoDatabase {
  get spaceKey(): PublicKey;

  get spaceId(): SpaceId;

  get schema(): DynamicSchemaRegistry;

  /**
   * All loaded objects.
   * @deprecated Use query instead.
   */
  get objects(): EchoReactiveObject<any>[];

  get graph(): Hypergraph;

  getObjectById<T extends {} = any>(id: string, opts?: GetObjectByIdOptions): EchoReactiveObject<T> | undefined;

  /**
   * @deprecated Awaiting API review.
   */
  loadObjectById<T extends {} = any>(
    id: string,
    options?: { timeout?: number },
  ): Promise<EchoReactiveObject<T> | undefined>;

  /**
   * @deprecated Awaiting API review.
   */
  batchLoadObjects<T extends {} = any>(
    ids: string[],
    options?: { inactivityTimeout?: number },
  ): Promise<Array<EchoReactiveObject<T> | undefined>>;

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
  readonly coreDatabase: CoreDatabase;
}

export type EchoDatabaseParams = {
  graph: Hypergraph;
  automergeContext: AutomergeContext;

  spaceId: SpaceId;

  /** @deprecated Use spaceId */
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
  _coreDatabase: CoreDatabase;

  public readonly schema: DynamicSchemaRegistry;

  private _rootUrl: string | undefined = undefined;

  /**
   * Mapping `object core` -> `root proxy` (User facing proxies).
   * @internal
   */
  readonly _rootProxies = new Map<ObjectCore, EchoReactiveObject<any>>();

  constructor(params: EchoDatabaseParams) {
    super();

    this._coreDatabase = new CoreDatabase(params.graph, params.automergeContext, params.spaceId, params.spaceKey);
    this.schema = new DynamicSchemaRegistry(this);
  }

  get graph(): Hypergraph {
    return this._coreDatabase.graph;
  }

  get spaceKey(): PublicKey {
    return this._coreDatabase.spaceKey;
  }

  get spaceId(): SpaceId {
    return this._coreDatabase.spaceId;
  }

  get rootUrl(): string | undefined {
    return this._rootUrl;
  }

  @synchronized
  protected override async _open(): Promise<void> {
    if (this._rootUrl !== undefined) {
      await this._coreDatabase.open({ rootUrl: this._rootUrl });
    }
  }

  @synchronized
  protected override async _close(): Promise<void> {
    await this._coreDatabase.close();
  }

  @synchronized
  async setSpaceRoot(rootUrl: string) {
    log('setSpaceRoot', { rootUrl });
    const firstTime = this._rootUrl === undefined;
    this._rootUrl = rootUrl;
    if (this._lifecycleState === LifecycleState.OPEN) {
      if (firstTime) {
        await this._coreDatabase.open({ rootUrl });
      } else {
        await this._coreDatabase.update({ rootUrl });
      }
    }
  }

  getObjectById(id: string, { deleted = false } = {}): EchoReactiveObject<any> | undefined {
    const core = this._coreDatabase.getObjectCoreById(id);
    if (!core || (core.isDeleted() && !deleted)) {
      return undefined;
    }

    const object = defaultMap(this._rootProxies, core, () => initEchoReactiveObjectRootProxy(core, this));
    invariant(isReactiveObject(object));
    return object;
  }

  // TODO(Mykola): Reconcile with `getObjectById` and 'batchLoadObjects'.
  /**
   * @deprecated Awaiting API review.
   */
  async loadObjectById<T = any>(
    objectId: string,
    options: LoadObjectOptions = {},
  ): Promise<EchoReactiveObject<T> | undefined> {
    const core = await this._coreDatabase.loadObjectCoreById(objectId, options);

    if (!core || core?.isDeleted()) {
      return undefined;
    }

    const object = defaultMap(this._rootProxies, core, () => initEchoReactiveObjectRootProxy(core, this));
    invariant(isReactiveObject(object));
    return object;
  }

  /**
   * @deprecated Awaiting API review.
   */
  async batchLoadObjects(
    objectIds: string[],
    { inactivityTimeout = 30000 }: { inactivityTimeout?: number } = {},
  ): Promise<Array<EchoReactiveObject<any> | undefined>> {
    const cores = await this._coreDatabase.batchLoadObjectCores(objectIds, { inactivityTimeout });
    const objects = cores.map((core) => {
      if (!core || core.isDeleted()) {
        return undefined;
      }

      const object = defaultMap(this._rootProxies, core, () => initEchoReactiveObjectRootProxy(core, this));
      invariant(isReactiveObject(object));
      return object;
    });
    return objects;
  }

  add<T extends ReactiveObject<any>>(obj: T): EchoReactiveObject<{ [K in keyof T]: T[K] }> {
    let echoObject = obj;
    if (!isEchoObject(echoObject)) {
      const schema = getSchema(obj);

      if (schema != null) {
        if (!this.schema.hasSchema(schema) && !this.graph.schemaRegistry.hasSchema(schema)) {
          throw createSchemaNotRegisteredError(schema);
        }
      }
      echoObject = createEchoObject(obj);
    }
    invariant(isEchoObject(echoObject));
    this._rootProxies.set(getObjectCore(echoObject), echoObject);

    const target = getProxyHandlerSlot(echoObject).target as ProxyTarget;
    EchoReactiveHandler.instance.setDatabase(target, this);
    EchoReactiveHandler.instance.saveRefs(target);
    this._coreDatabase.addCore(getObjectCore(echoObject));

    return echoObject as any;
  }

  remove<T extends EchoReactiveObject<any>>(obj: T): void {
    invariant(isEchoObject(obj));
    return this._coreDatabase.removeCore(getObjectCore(obj));
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
    return this._coreDatabase.graph.query(filter, {
      ...options,
      spaceIds: [this.spaceId],
      spaces: [this.spaceKey],
    });
  }

  async flush(): Promise<void> {
    await this._coreDatabase.flush();
  }

  /**
   * @deprecated
   */
  get objects(): EchoReactiveObject<any>[] {
    // Initialize all proxies.
    for (const core of this._coreDatabase.allObjectCores()) {
      defaultMap(this._rootProxies, core, () => initEchoReactiveObjectRootProxy(core, this));
    }
    return Array.from(this._rootProxies.values());
  }

  /**
   * @deprecated
   */
  readonly pendingBatch = new Event<unknown>();

  /**
   * @deprecated
   */
  get coreDatabase(): CoreDatabase {
    return this._coreDatabase;
  }
}

const createSchemaNotRegisteredError = (schema?: any) => {
  const message = 'Schema not registered';

  if (schema?.typename) {
    return new Error(`${message} Schema: ${schema.typename}`);
  }

  return new Error(message);
};
