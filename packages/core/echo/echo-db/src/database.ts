//
// Copyright 2022 DXOS.org
//

import {
  Event,
  type ReadOnlyEvent,
  synchronized,
  asyncTimeout,
  type UnsubscribeCallback,
  TimeoutError,
} from '@dxos/async';
import { type Context, LifecycleState, Resource } from '@dxos/context';
import { type EchoReactiveObject, getSchema, type ReactiveObject, isReactiveObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { type QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';
import { defaultMap } from '@dxos/util';

import { type AutomergeContext, AutomergeDb, type AutomergeObjectCore, getAutomergeObjectCore } from './automerge';
import { DynamicSchemaRegistry } from './dynamic-schema-registry';
import { createEchoObject, initEchoReactiveObjectRootProxy, isEchoObject } from './echo-handler';
import { EchoReactiveHandler } from './echo-handler/echo-handler';
import { type Hypergraph } from './hypergraph';
import { type Filter, type FilterSource, type Query } from './query';

export type GetObjectByIdOptions = {
  deleted?: boolean;
};

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

  getObjectById<T extends {} = any>(id: string, opts?: GetObjectByIdOptions): EchoReactiveObject<T> | undefined;
  loadObjectById<T extends {} = any>(
    id: string,
    options?: { timeout?: number },
  ): Promise<EchoReactiveObject<T> | undefined>;
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

  /**
   * Mapping `object core` -> `root proxy` (User facing proxies).
   * @internal
   */
  readonly _rootProxies = new Map<AutomergeObjectCore, EchoReactiveObject<any>>();

  constructor(params: EchoDatabaseParams) {
    super();

    this._automerge = new AutomergeDb(params.graph, params.automergeContext, params.spaceKey, this);
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

  getObjectById(id: string, { deleted = false } = {}): EchoReactiveObject<any> | undefined {
    const objCore = this._automerge.getObjectCoreById(id);
    if (!objCore || (objCore.isDeleted() && !deleted)) {
      return undefined;
    }

    const root = defaultMap(this._rootProxies, objCore, () => initEchoReactiveObjectRootProxy(objCore));
    invariant(isReactiveObject(root));
    return root as any;
  }

  // TODO(Mykola): Reconcile with `getObjectById`.
  async loadObjectById<T = any>(
    objectId: string,
    { timeout }: { timeout?: number } = {},
  ): Promise<EchoReactiveObject<T> | undefined> {
    // Check if deleted.
    if (this._automerge._objects.get(objectId)?.isDeleted()) {
      return Promise.resolve(undefined);
    }

    const obj = this.getObjectById(objectId);
    if (obj) {
      return Promise.resolve(obj);
    }
    this._automerge._automergeDocLoader.loadObjectDocument(objectId);
    const waitForUpdate = this._automerge._updateEvent
      .waitFor((event) => event.itemsUpdated.some(({ id }) => id === objectId))
      .then(() => this.getObjectById(objectId));

    return timeout ? asyncTimeout(waitForUpdate, timeout) : waitForUpdate;
  }

  async batchLoadObjects(
    objectIds: string[],
    { inactivityTimeout = 30000 }: { inactivityTimeout?: number } = {},
  ): Promise<Array<EchoReactiveObject<any> | undefined>> {
    const result = new Array(objectIds.length);
    const objectsToLoad: Array<{ id: string; resultIndex: number }> = [];
    for (let i = 0; i < objectIds.length; i++) {
      const objectId = objectIds[i];
      const object = this.getObjectById(objectId);
      if (this._automerge._objects.get(objectId)?.isDeleted()) {
        result[i] = undefined;
      } else if (object != null) {
        result[i] = object;
      } else {
        objectsToLoad.push({ id: objectId, resultIndex: i });
      }
    }
    if (objectsToLoad.length === 0) {
      return result;
    }
    const idsToLoad = objectsToLoad.map((v) => v.id);
    this.automerge._automergeDocLoader.loadObjectDocument(idsToLoad);

    return new Promise((resolve, reject) => {
      let unsubscribe: UnsubscribeCallback | null = null;
      let inactivityTimeoutTimer: any | undefined;
      const scheduleInactivityTimeout = () => {
        inactivityTimeoutTimer = setTimeout(() => {
          unsubscribe?.();
          reject(new TimeoutError(inactivityTimeout));
        }, inactivityTimeout);
      };
      unsubscribe = this._automerge._updateEvent.on(({ itemsUpdated }) => {
        const updatedIds = itemsUpdated.map((v) => v.id);
        for (let i = objectsToLoad.length - 1; i >= 0; i--) {
          const objectToLoad = objectsToLoad[i];
          if (updatedIds.includes(objectToLoad.id)) {
            clearTimeout(inactivityTimeoutTimer);
            result[objectToLoad.resultIndex] = this._automerge._objects.get(objectToLoad.id)?.isDeleted()
              ? undefined
              : this.getObjectById(objectToLoad.id)!;
            objectsToLoad.splice(i, 1);
            scheduleInactivityTimeout();
          }
        }
        if (objectsToLoad.length === 0) {
          clearTimeout(inactivityTimeoutTimer);
          unsubscribe?.();
          resolve(result);
        }
      });
      scheduleInactivityTimeout();
    });
  }

  add<T extends ReactiveObject<any>>(obj: T): EchoReactiveObject<{ [K in keyof T]: T[K] }> {
    let echoObject = obj;
    if (!isEchoObject(echoObject)) {
      const schema = getSchema(obj);

      if (schema != null) {
        if (!this.schemaRegistry.isRegistered(schema) && !this.graph.runtimeSchemaRegistry.hasSchema(schema)) {
          throw createSchemaNotRegisteredError(schema);
        }
      }
      echoObject = createEchoObject(obj);
    }
    invariant(isEchoObject(echoObject));
    this._rootProxies.set(getAutomergeObjectCore(echoObject), echoObject);
    this._automerge.add(echoObject);
    EchoReactiveHandler.instance.saveLinkedObjects(echoObject as any);
    return echoObject as any;
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
    return Array.from(this._rootProxies.values());
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
