//
// Copyright 2023 DXOS.org
//

import {
  asyncTimeout,
  Event,
  synchronized,
  TimeoutError,
  Trigger,
  UpdateScheduler,
  type UnsubscribeCallback,
} from '@dxos/async';
import { getHeads } from '@dxos/automerge/automerge';
import { interpretAsDocumentId, type AutomergeUrl, type DocumentId } from '@dxos/automerge/automerge-repo';
import { Context, ContextDisposedError } from '@dxos/context';
import { type SpaceDoc, type SpaceState } from '@dxos/echo-protocol';
import { TYPE_PROPERTIES } from '@dxos/echo-schema';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { invariant } from '@dxos/invariant';
import { type PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import type { QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';
import type { QueryService } from '@dxos/protocols/proto/dxos/echo/query';
import type { DataService, SpaceSyncState } from '@dxos/protocols/proto/dxos/echo/service';
import { trace } from '@dxos/tracing';
import { chunkArray } from '@dxos/util';

import {
  AutomergeDocumentLoaderImpl,
  type AutomergeDocumentLoader,
  type DocumentChanges,
  type ObjectDocumentLoaded,
} from './automerge-doc-loader';
import { CoreDatabaseQueryContext } from './core-database-query-context';
import { ObjectCore } from './object-core';
import { getInlineAndLinkChanges } from './utils';
import { RepoProxy, type ChangeEvent, type DocHandleProxy } from '../client';
import { type Hypergraph } from '../hypergraph';
import { Filter, Query, type FilterSource, type QueryFn } from '../query';

export type InitRootProxyFn = (core: ObjectCore) => void;

export type CoreDatabaseParams = {
  graph: Hypergraph;
  dataService: DataService;
  queryService: QueryService;
  spaceId: SpaceId;
  spaceKey: PublicKey;
};

/**
 * Maximum number of remote update notifications per second.
 */
const THROTTLED_UPDATE_FREQUENCY = 10;

@trace.resource()
export class CoreDatabase {
  private readonly _hypergraph: Hypergraph;
  private readonly _dataService: DataService;
  private readonly _queryService: QueryService;
  private readonly _repoProxy: RepoProxy;
  private readonly _spaceId: SpaceId;
  private readonly _spaceKey: PublicKey;

  private readonly _objects = new Map<string, ObjectCore>();

  readonly _updateEvent = new Event<ItemsUpdatedEvent>();

  private _state = CoreDatabaseState.CLOSED;

  private _ctx = new Context();

  // TODO(dmaretskyi): Refactor this.
  public readonly opened = new Trigger();

  /**
   * @internal
   */
  readonly _automergeDocLoader: AutomergeDocumentLoader;

  readonly rootChanged = new Event<void>();

  constructor(params: CoreDatabaseParams) {
    this._hypergraph = params.graph;
    this._dataService = params.dataService;
    this._queryService = params.queryService;
    this._spaceId = params.spaceId;
    this._spaceKey = params.spaceKey;
    this._repoProxy = new RepoProxy(this._dataService, this._spaceId);
    this._automergeDocLoader = new AutomergeDocumentLoaderImpl(params.spaceId, this._repoProxy, params.spaceKey);
  }

  get graph(): Hypergraph {
    return this._hypergraph;
  }

  get spaceId(): SpaceId {
    return this._spaceId;
  }

  /**
   * @deprecated
   */
  get spaceKey(): PublicKey {
    return this._spaceKey;
  }

  // TODO(dmaretskyi): Stop exposing repo.
  // Currently needed for migration-builder and unit-tests.
  get _repo(): RepoProxy {
    return this._repoProxy;
  }

  @synchronized
  async open(spaceState: SpaceState) {
    const start = performance.now();
    if (this._state !== CoreDatabaseState.CLOSED) {
      log.info('Already open');
      return;
    }
    this._state = CoreDatabaseState.OPENING;

    await this._repoProxy.open();
    this._ctx.onDispose(this._unsubscribeFromHandles.bind(this));
    this._automergeDocLoader.onObjectDocumentLoaded.on(this._ctx, this._onObjectDocumentLoaded.bind(this));

    try {
      await this._automergeDocLoader.loadSpaceRootDocHandle(this._ctx, spaceState);
      const spaceRootDocHandle = this._automergeDocLoader.getSpaceRootDocHandle();
      const spaceRootDoc: SpaceDoc = spaceRootDocHandle.docSync();
      invariant(spaceRootDoc);
      const objectIds = Object.keys(spaceRootDoc.objects ?? {});
      this._createInlineObjects(spaceRootDocHandle, objectIds);
      spaceRootDocHandle.on('change', this._onDocumentUpdate);
    } catch (err) {
      if (err instanceof ContextDisposedError) {
        return;
      }
      log.catch(err);
      throw err;
    }

    const elapsed = performance.now() - start;
    if (elapsed > 1000) {
      log.warn('slow AM open', { docId: spaceState.rootUrl, duration: elapsed });
    }

    this._state = CoreDatabaseState.OPEN;
    this.opened.wake();
  }

  // TODO(dmaretskyi): Cant close while opening.
  @synchronized
  async close() {
    if (this._state === CoreDatabaseState.CLOSED) {
      return;
    }
    this._state = CoreDatabaseState.CLOSED;

    this.opened.throw(new ContextDisposedError());
    this.opened.reset();

    await this._ctx.dispose();
    this._ctx = new Context();

    await this._repoProxy.close();
  }

  /**
   * Update DB in response to space state change.
   * Can be used to change the root AM document.
   */
  // TODO(dmaretskyi): should it be synchronized and/or cancelable?
  @synchronized
  async update(spaceState: SpaceState) {
    invariant(this._ctx, 'Must be open');
    if (spaceState.rootUrl === this._automergeDocLoader.getSpaceRootDocHandle().url) {
      return;
    }
    this._unsubscribeFromHandles();
    const objectIdsToLoad = this._automergeDocLoader.clearHandleReferences();

    try {
      await this._automergeDocLoader.loadSpaceRootDocHandle(this._ctx, spaceState);
      const spaceRootDocHandle = this._automergeDocLoader.getSpaceRootDocHandle();
      await this._handleSpaceRootDocumentChange(spaceRootDocHandle, objectIdsToLoad);
      spaceRootDocHandle.on('change', this._onDocumentUpdate);
    } catch (err) {
      if (err instanceof ContextDisposedError) {
        return;
      }
      log.catch(err);
      throw err;
    }
  }

  /**
   * Returns ids for loaded and not loaded objects.
   */
  getAllObjectIds(): string[] {
    if (this._state !== CoreDatabaseState.OPEN) {
      return [];
    }

    const hasLoadedHandles = this._automergeDocLoader.getAllHandles().length > 0;
    if (!hasLoadedHandles) {
      return [];
    }
    const rootDoc = this._automergeDocLoader.getSpaceRootDocHandle().docSync();
    if (!rootDoc) {
      return [];
    }

    return [...new Set([...Object.keys(rootDoc.objects ?? {}), ...Object.keys(rootDoc.links ?? {})])];
  }

  getNumberOfInlineObjects(): number {
    return Object.keys(this._automergeDocLoader.getSpaceRootDocHandle().docSync()?.objects ?? {}).length;
  }

  getNumberOfLinkedObjects(): number {
    return Object.keys(this._automergeDocLoader.getSpaceRootDocHandle().docSync()?.links ?? {}).length;
  }

  getTotalNumberOfObjects(): number {
    return this.getNumberOfInlineObjects() + this.getNumberOfLinkedObjects();
  }

  /**
   * @deprecated
   * Return only loaded objects.
   */
  allObjectCores() {
    return Array.from(this._objects.values());
  }

  getObjectCoreById(id: string, { load = true }: GetObjectCoreByIdOptions = {}): ObjectCore | undefined {
    const objCore = this._objects.get(id);
    if (load && !objCore) {
      this._automergeDocLoader.loadObjectDocument(id);
      return undefined;
    }

    invariant(objCore instanceof ObjectCore);
    return objCore;
  }

  // TODO(Mykola): Reconcile with `getObjectById`.
  async loadObjectCoreById(objectId: string, { timeout }: LoadObjectOptions = {}): Promise<ObjectCore | undefined> {
    const core = this.getObjectCoreById(objectId);
    if (core) {
      return core;
    }
    const waitForUpdate = this._updateEvent
      .waitFor((event) => {
        console.log(
          'test for',
          objectId,
          JSON.stringify(event),
          event.itemsUpdated.some(({ id }) => id === objectId),
        );
        return event.itemsUpdated.some(({ id }) => id === objectId);
      })
      .then(() => {
        console.log('load object');
        return this.getObjectCoreById(objectId);
      });
    this._automergeDocLoader.loadObjectDocument(objectId);

    return timeout ? asyncTimeout(waitForUpdate, timeout) : waitForUpdate;
  }

  async batchLoadObjectCores(
    objectIds: string[],
    { inactivityTimeout = 30000, returnDeleted = false }: { inactivityTimeout?: number; returnDeleted?: boolean } = {},
  ): Promise<(ObjectCore | undefined)[]> {
    const result: (ObjectCore | undefined)[] = new Array(objectIds.length);
    const objectsToLoad: Array<{ id: string; resultIndex: number }> = [];
    for (let i = 0; i < objectIds.length; i++) {
      const objectId = objectIds[i];
      const core = this.getObjectCoreById(objectId);
      if (!returnDeleted && this._objects.get(objectId)?.isDeleted()) {
        result[i] = undefined;
      } else if (core != null) {
        result[i] = core;
      } else {
        objectsToLoad.push({ id: objectId, resultIndex: i });
      }
    }
    if (objectsToLoad.length === 0) {
      return result;
    }
    const idsToLoad = objectsToLoad.map((v) => v.id);
    this._automergeDocLoader.loadObjectDocument(idsToLoad);

    return new Promise((resolve, reject) => {
      let unsubscribe: UnsubscribeCallback | null = null;
      let inactivityTimeoutTimer: any | undefined;
      const scheduleInactivityTimeout = () => {
        inactivityTimeoutTimer = setTimeout(() => {
          unsubscribe?.();
          reject(new TimeoutError(inactivityTimeout));
        }, inactivityTimeout);
      };
      unsubscribe = this._updateEvent.on(({ itemsUpdated }) => {
        const updatedIds = itemsUpdated.map((v) => v.id);
        for (let i = objectsToLoad.length - 1; i >= 0; i--) {
          const objectToLoad = objectsToLoad[i];
          if (updatedIds.includes(objectToLoad.id)) {
            clearTimeout(inactivityTimeoutTimer);
            result[objectToLoad.resultIndex] =
              !returnDeleted && this._objects.get(objectToLoad.id)?.isDeleted()
                ? undefined
                : this.getObjectCoreById(objectToLoad.id)!;
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

  // Odd way to define methods types from a typedef.
  declare query: QueryFn;
  static {
    this.prototype.query = this.prototype._query;
  }

  private _query(filter?: FilterSource, options?: QueryOptions) {
    return new Query(
      new CoreDatabaseQueryContext(this, this._queryService),
      Filter.from(filter, { ...options, spaceIds: [this.spaceId] }),
    );
  }

  // TODO(dmaretskyi): Rename `addObjectCore`.
  addCore(core: ObjectCore) {
    if (core.database) {
      // Already in the database.
      if (core.database !== this) {
        throw new Error('Object already belongs to another database');
      }

      if (core.isDeleted()) {
        core.setDeleted(false);
      }

      return;
    }

    invariant(!this._objects.has(core.id));
    this._objects.set(core.id, core);

    // TODO: create all objects as linked.
    // This is a temporary solution to get quick benefit from lazily-loaded separate-document objects.
    // All objects should be created linked to root space doc after query indexing is ready to make them
    // discoverable.
    let spaceDocHandle: DocHandleProxy<SpaceDoc>;
    if (shouldObjectGoIntoFragmentedSpace(core)) {
      spaceDocHandle = this._automergeDocLoader.createDocumentForObject(core.id);
      spaceDocHandle.on('change', this._onDocumentUpdate);
    } else {
      spaceDocHandle = this._automergeDocLoader.getSpaceRootDocHandle();
      this._automergeDocLoader.onObjectBoundToDocument(spaceDocHandle, core.id);
    }

    core.bind({
      db: this,
      docHandle: spaceDocHandle,
      path: ['objects', core.id],
      assignFromLocalState: true,
    });
  }

  // TODO(dmaretskyi): Rename `removeObjectCore`.
  removeCore(core: ObjectCore) {
    invariant(this._objects.has(core.id));
    core.setDeleted(true);
  }

  /**
   * Removes an object link from the space root document.
   */
  unlinkObjects(objectIds: string[]) {
    const root = this._automergeDocLoader.getSpaceRootDocHandle();
    for (const objectId of objectIds) {
      if (!root.docSync().links?.[objectId]) {
        throw new Error(`Link not found: ${objectId}`);
      }
    }
    root.change((doc) => {
      for (const objectId of objectIds) {
        delete doc.links![objectId];
      }
    });
  }

  /**
   * Removes all objects that are marked as deleted.
   */
  async unlinkDeletedObjects({ batchSize = 10 }: { batchSize?: number } = {}) {
    const idChunks = chunkArray(this.getAllObjectIds(), batchSize);
    for (const ids of idChunks) {
      const objects = await this.batchLoadObjectCores(ids, { returnDeleted: true });
      const toUnlink = objects.filter((o) => o?.isDeleted()).map((o) => o!.id);
      this.unlinkObjects(toUnlink);
    }
  }

  async flush({ disk = true, indexes = false, updates = false }: FlushOptions = {}): Promise<void> {
    if (disk) {
      await this._repoProxy.flush();
      await this._dataService.flush(
        {
          documentIds: this._automergeDocLoader.getAllHandles().map((handle) => handle.documentId),
        },
        { timeout: RPC_TIMEOUT },
      );
    }

    if (indexes) {
      await this._dataService.updateIndexes(undefined, { timeout: 0 });
    }

    if (updates) {
      await this._updateScheduler.runBlocking();
    }
  }

  /**
   * Returns document heads for all documents in the space.
   */
  async getDocumentHeads(): Promise<SpaceDocumentHeads> {
    const root = this._automergeDocLoader.getSpaceRootDocHandle();
    const doc = root.docSync();
    if (!doc) {
      return { heads: {} };
    }

    const headsStates = await this._dataService.getDocumentHeads(
      {
        documentIds: Object.values(doc.links ?? {}).map((link) => interpretAsDocumentId(link as AutomergeUrl)),
      },
      { timeout: RPC_TIMEOUT },
    );

    const heads: Record<string, string[]> = {};
    for (const state of headsStates.heads.entries ?? []) {
      heads[state.documentId] = state.heads ?? [];
    }

    heads[root.documentId] = getHeads(doc);

    return { heads };
  }

  /**
   * Ensures that document heads have been replicated on the ECHO host.
   * Waits for the changes to be flushed to disk.
   * Does not ensure that this data has been propagated to the client.
   *
   * Note:
   *   For queries to return up-to-date results, the client must call `this.updateIndexes()`.
   *   This is also why flushing to disk is important.
   */
  // TODO(dmaretskyi): Find a way to ensure client propagation.
  async waitUntilHeadsReplicated(heads: SpaceDocumentHeads) {
    await this._dataService.waitUntilHeadsReplicated(
      {
        heads: {
          entries: Object.entries(heads.heads).map(([documentId, heads]) => ({ documentId, heads })),
        },
      },
      { timeout: 0 },
    );
  }

  /**
   * Returns document heads for all documents in the space.
   */
  async reIndexHeads(): Promise<void> {
    const root = this._automergeDocLoader.getSpaceRootDocHandle();
    const doc = root.docSync();
    invariant(doc);

    await this._dataService.reIndexHeads(
      {
        documentIds: [
          root.documentId,
          ...Object.values(doc.links ?? {}).map((link) => interpretAsDocumentId(link as AutomergeUrl)),
        ],
      },
      { timeout: 0 },
    );
  }

  /**
   * @deprecated Use `flush({ indexes: true })`.
   */
  async updateIndexes() {
    await this._dataService.updateIndexes(undefined, { timeout: 0 });
  }

  async getSyncState(): Promise<SpaceSyncState> {
    return this._dataService.getSpaceSyncState({ spaceId: this.spaceId }, { timeout: RPC_TIMEOUT });
  }

  getLoadedDocumentHandles(): DocHandleProxy<any>[] {
    return Object.values(this._repoProxy.handles);
  }

  private async _handleSpaceRootDocumentChange(spaceRootDocHandle: DocHandleProxy<SpaceDoc>, objectsToLoad: string[]) {
    const spaceRootDoc: SpaceDoc = spaceRootDocHandle.docSync();
    const inlinedObjectIds = new Set(Object.keys(spaceRootDoc.objects ?? {}));
    const linkedObjectIds = new Map(Object.entries(spaceRootDoc.links ?? {}));

    const objectsToRebind = new Map<string, { handle: DocHandleProxy<SpaceDoc>; objectIds: string[] }>();
    objectsToRebind.set(spaceRootDocHandle.url, { handle: spaceRootDocHandle, objectIds: [] });

    const objectsToRemove: string[] = [];
    const objectsToCreate = [...inlinedObjectIds.values()].filter((oid) => !this._objects.has(oid));

    for (const object of this._objects.values()) {
      if (inlinedObjectIds.has(object.id)) {
        if (spaceRootDocHandle.url === object.docHandle?.url) {
          continue;
        }
        objectsToRebind.get(spaceRootDocHandle.url)!.objectIds.push(object.id);
      } else if (linkedObjectIds.has(object.id)) {
        const newObjectDocUrl = linkedObjectIds.get(object.id)!;
        if (newObjectDocUrl === object.docHandle?.url) {
          continue;
        }
        const existing = objectsToRebind.get(newObjectDocUrl);
        if (existing != null) {
          existing.objectIds.push(object.id);
          continue;
        }
        const newDocHandle = this._repoProxy.find(newObjectDocUrl as DocumentId);
        await newDocHandle.doc();
        objectsToRebind.set(newObjectDocUrl, { handle: newDocHandle, objectIds: [object.id] });
      } else {
        objectsToRemove.push(object.id);
      }
    }

    objectsToRemove.forEach((oid) => this._objects.delete(oid));
    this._createInlineObjects(spaceRootDocHandle, objectsToCreate);
    for (const { handle, objectIds } of objectsToRebind.values()) {
      this._rebindObjects(handle, objectIds);
    }
    for (const objectId of objectsToLoad) {
      if (!this._objects.has(objectId)) {
        this._automergeDocLoader.loadObjectDocument(objectId);
      }
    }
    this._automergeDocLoader.onObjectLinksUpdated(spaceRootDoc.links);
    this.rootChanged.emit();
  }

  private _emitObjectUpdateEvent(itemsUpdated: string[]) {
    if (itemsUpdated.length === 0) {
      return;
    }

    compositeRuntime.batch(() => {
      for (const id of itemsUpdated) {
        const objCore = this._objects.get(id);
        if (objCore) {
          objCore.notifyUpdate();
        }
      }
    });
  }

  /**
   * Keep as field to have a reference to pass for unsubscribing from handle changes.
   */
  private readonly _onDocumentUpdate = (event: ChangeEvent<SpaceDoc>) => {
    const documentChanges = this._processDocumentUpdate(event);
    this._rebindObjects(event.handle, documentChanges.objectsToRebind);
    this._automergeDocLoader.onObjectLinksUpdated(documentChanges.linkedDocuments);
    this._createInlineObjects(event.handle, documentChanges.createdObjectIds);
    this._emitObjectUpdateEvent(documentChanges.updatedObjectIds);
    this._scheduleThrottledDbUpdate(documentChanges.updatedObjectIds);
  };

  private _processDocumentUpdate(event: ChangeEvent<SpaceDoc>): DocumentChanges {
    const { inlineChangedObjects, linkedDocuments } = getInlineAndLinkChanges(event);
    const createdObjectIds: string[] = [];
    const objectsToRebind: string[] = [];
    for (const updatedObject of inlineChangedObjects) {
      const objectCore = this._objects.get(updatedObject);
      if (!objectCore) {
        createdObjectIds.push(updatedObject);
      } else if (objectCore?.docHandle && objectCore.docHandle.url !== event.handle.url) {
        log.warn('object bound to incorrect document, going to rebind', {
          updatedObject,
          documentUrl: objectCore.docHandle.url,
          actualUrl: event.handle.url,
        });
        objectsToRebind.push(updatedObject);
      }
    }

    return {
      updatedObjectIds: inlineChangedObjects,
      objectsToRebind,
      createdObjectIds,
      linkedDocuments,
    };
  }

  private _unsubscribeFromHandles() {
    for (const docHandle of Object.values(this._repoProxy.handles)) {
      docHandle.off('change', this._onDocumentUpdate);
    }
  }

  private _onObjectDocumentLoaded({ handle, objectId }: ObjectDocumentLoaded) {
    handle.on('change', this._onDocumentUpdate);
    this._createObjectInDocument(handle, objectId);
    this._scheduleThrottledUpdate([objectId]);
  }

  /**
   * Loads all objects on open and handles objects that are being created not by this client.
   */
  private _createInlineObjects(docHandle: DocHandleProxy<SpaceDoc>, objectIds: string[]) {
    for (const id of objectIds) {
      invariant(!this._objects.has(id));
      this._createObjectInDocument(docHandle, id);
    }
  }

  private _createObjectInDocument(docHandle: DocHandleProxy<SpaceDoc>, objectId: string) {
    invariant(!this._objects.get(objectId));
    const core = new ObjectCore();
    core.id = objectId;
    this._objects.set(core.id, core);
    this._automergeDocLoader.onObjectBoundToDocument(docHandle, objectId);
    core.bind({
      db: this,
      docHandle,
      path: ['objects', core.id],
      assignFromLocalState: false,
    });
  }

  private _rebindObjects(docHandle: DocHandleProxy<SpaceDoc>, objectIds: string[]) {
    for (const objectId of objectIds) {
      const objectCore = this._objects.get(objectId);
      invariant(objectCore);
      objectCore.bind({
        db: this,
        docHandle,
        path: objectCore.mountPath,
        assignFromLocalState: false,
      });
      this._automergeDocLoader.onObjectBoundToDocument(docHandle, objectId);
    }
  }

  /**
   * Throttled db query updates. Signal updates were already emitted for these objects to immediately
   * update the UI. This happens for locally changed objects (_onDocumentUpdate).
   */
  private _objectsForNextDbUpdate = new Set<string>();
  /**
   * Objects for which we throttled a db update event and a signal update event.
   * This happens for objects which were loaded for the first time (_onObjectDocumentLoaded).
   */
  private _objectsForNextUpdate = new Set<string>();
  private readonly _updateScheduler = new UpdateScheduler(this._ctx, async () => this._emitDbUpdateEvents(), {
    maxFrequency: THROTTLED_UPDATE_FREQUENCY,
  });

  @trace.span({ showInBrowserTimeline: true })
  private _emitDbUpdateEvents() {
    const fullUpdateIds = [...this._objectsForNextUpdate];
    const allDbUpdates = new Set([...this._objectsForNextUpdate, ...this._objectsForNextDbUpdate]);
    this._objectsForNextUpdate.clear();
    this._objectsForNextDbUpdate.clear();

    compositeRuntime.batch(() => {
      if (allDbUpdates.size > 0) {
        this._updateEvent.emit({
          spaceId: this.spaceId,
          itemsUpdated: [...allDbUpdates].map((id) => ({ id })),
        });
      }
      this._emitObjectUpdateEvent(fullUpdateIds);
    });
  }

  // TODO(dmaretskyi): Pass all remote updates through this.
  // Scheduled db and signal update events.
  private _scheduleThrottledUpdate(objectId: string[]) {
    for (const id of objectId) {
      this._objectsForNextUpdate.add(id);
    }
    if (DISABLE_THROTTLING) {
      this._updateScheduler.forceTrigger();
    } else {
      this._updateScheduler.trigger();
    }
  }

  // Scheduled db update event only.
  private _scheduleThrottledDbUpdate(objectId: string[]) {
    for (const id of objectId) {
      this._objectsForNextDbUpdate.add(id);
    }
    if (DISABLE_THROTTLING) {
      this._updateScheduler.forceTrigger();
    } else {
      this._updateScheduler.trigger();
    }
  }
}

export interface ItemsUpdatedEvent {
  spaceId: SpaceId;
  itemsUpdated: Array<{ id: string }>;
}

export const shouldObjectGoIntoFragmentedSpace = (core: ObjectCore) => {
  // NOTE: We need to store properties in the root document since space-list initialization
  //       expects it to be loaded as space become available.
  return core.getType()?.objectId !== TYPE_PROPERTIES;
};

export type LoadObjectOptions = {
  timeout?: number;
};

enum CoreDatabaseState {
  CLOSED,
  OPENING,
  OPEN,
}

export type SpaceDocumentHeads = {
  /**
   * DocumentId => Heads.
   */
  heads: Record<string, string[]>;
};

export type GetObjectCoreByIdOptions = {
  /**
   * Request the object to be loaded if it is not already loaded.
   * @default true
   */
  load?: boolean;
};

export type FlushOptions = {
  /**
   * Write any pending changes to disk.
   * @default true
   */
  disk?: boolean;

  /**
   * Wait for pending index updates.
   * @default false
   */
  indexes?: boolean;

  /**
   * Flush pending updates to objects and queries.
   * @default false
   */
  updates?: boolean;
};

const RPC_TIMEOUT = 20_000;

const DISABLE_THROTTLING = true;
