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
import { QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';
import type { QueryService } from '@dxos/protocols/proto/dxos/echo/query';
import type { DataService } from '@dxos/protocols/proto/dxos/echo/service';
import { defaultMap } from '@dxos/util';

import { DynamicSchemaRegistry } from './dynamic-schema-registry';
import { CoreDatabase, type FlushOptions, getObjectCore, type LoadObjectOptions, type ObjectCore } from '../core-db';
import { createEchoObject, initEchoReactiveObjectRootProxy, isEchoObject } from '../echo-handler';
import { EchoReactiveHandler } from '../echo-handler/echo-handler';
import { type ProxyTarget } from '../echo-handler/echo-proxy-target';
import { type Hypergraph } from '../hypergraph';
import { type FilterSource, type QueryFn } from '../query';

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
  query: QueryFn;

  /**
   * Wait for all pending changes to be saved to disk.
   */
  flush(opts?: FlushOptions): Promise<void>;

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
  dataService: DataService;
  queryService: QueryService;

  spaceId: SpaceId;

  /**
   * Run a reactive query for a set of dynamic schema.
   * @default true
   */
  reactiveSchemaQuery?: boolean;

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

    this._coreDatabase = new CoreDatabase({
      graph: params.graph,
      dataService: params.dataService,
      queryService: params.queryService,
      spaceId: params.spaceId,
      spaceKey: params.spaceKey,
    });
    this.schema = new DynamicSchemaRegistry({ db: this, reactiveQuery: params.reactiveSchemaQuery });
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

  // Odd way to define methods types from a typedef.
  declare query: QueryFn;
  static {
    this.prototype.query = this.prototype._query;
  }

  private _query(filter?: FilterSource, options?: QueryOptions) {
    return this._coreDatabase.graph.query(filter, {
      ...options,
      spaceIds: [this.spaceId],
      spaces: [this.spaceKey],
    });
  }

  async flush(opts?: FlushOptions): Promise<void> {
    await this._coreDatabase.flush(opts);
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
