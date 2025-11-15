//
// Copyright 2023 DXOS.org
//

import { type Heads, getHeads } from '@automerge/automerge';
import { type AutomergeUrl, type DocumentId, interpretAsDocumentId } from '@automerge/automerge-repo';

import {
  type CleanupFn,
  Event,
  type ReadOnlyEvent,
  TimeoutError,
  Trigger,
  UpdateScheduler,
  asyncTimeout,
  runInContextAsync,
  synchronized,
} from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf/stream';
import { Context, ContextDisposedError } from '@dxos/context';
import { raise } from '@dxos/debug';
import { type ObjectId, Ref } from '@dxos/echo/internal';
import {
  type DatabaseDirectory,
  type ObjectStructure,
  Reference,
  type SpaceState,
  encodeReference,
} from '@dxos/echo-protocol';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { invariant } from '@dxos/invariant';
import { type DXN, type PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import type { QueryService } from '@dxos/protocols/proto/dxos/echo/query';
import type { DataService, SpaceSyncState } from '@dxos/protocols/proto/dxos/echo/service';
import { trace } from '@dxos/tracing';
import { chunkArray, deepMapValues, defaultMap } from '@dxos/util';

import { type ChangeEvent, type DocHandleProxy, RepoProxy, type SaveStateChangedEvent } from '../automerge';
import { type Hypergraph } from '../hypergraph';

import {
  type AutomergeDocumentLoader,
  AutomergeDocumentLoaderImpl,
  type DocumentChanges,
  type ObjectDocumentLoaded,
} from './automerge-doc-loader';
import { ObjectCore } from './object-core';
import { getInlineAndLinkChanges } from './util';
import { type Database } from '@dxos/echo';

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

export type AddCoreOptions = {
  /**
   * Where to place the object in the Automerge document tree.
   * Root document is always loaded with the space.
   * Linked documents are loaded lazily.
   * Placing large number of objects in the root document may slow down the initial load.
   *
   * @default 'linked-doc'
   */
  placeIn?: Database.ObjectPlacement;
};

const TRACE_LOADING = false;

/**
 *
 */
// TODO(burdon): Document.
@trace.resource()
export class CoreDatabase {
  private readonly _hypergraph: Hypergraph;
  private readonly _dataService: DataService;
  private readonly _queryService: QueryService;
  private readonly _repoProxy: RepoProxy;
  private readonly _spaceId: SpaceId;
  private readonly _spaceKey: PublicKey;
  private readonly _objects = new Map<string, ObjectCore>();

  /**
   * DXN string -> ObjectId.
   * Stores the targets of strong dependencies to the objects that depend on them.
   * When we load an object that doesn't have it's strong deps resolved, we wait for the deps to be loaded first.
   */
  private readonly _strongDepsIndex = new Map<string, ObjectId[]>();

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

  readonly saveStateChanged: ReadOnlyEvent<SaveStateChangedEvent>;

  constructor({ graph, dataService, queryService, spaceId, spaceKey }: CoreDatabaseParams) {
    this._hypergraph = graph;
    this._dataService = dataService;
    this._queryService = queryService;
    this._spaceId = spaceId;
    this._spaceKey = spaceKey;
    this._repoProxy = new RepoProxy(this._dataService, this._spaceId);
    this.saveStateChanged = this._repoProxy.saveStateChanged;
    this._automergeDocLoader = new AutomergeDocumentLoaderImpl(this._repoProxy, spaceId, spaceKey);
  }

  toJSON() {
    return {
      id: this._spaceId,
      objects: this._objects.size,
    };
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
  async open(spaceState: SpaceState): Promise<void> {
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
      const spaceRootDoc: DatabaseDirectory = spaceRootDocHandle.doc();
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
    if (elapsed > 1_000) {
      log.warn('slow AM open', { docId: spaceState.rootUrl, duration: elapsed });
    }

    this._state = CoreDatabaseState.OPEN;
    this.opened.wake();
  }

  // TODO(dmaretskyi): Cant close while opening.
  @synchronized
  async close(): Promise<void> {
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
  async updateSpaceState(spaceState: SpaceState): Promise<void> {
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
    const rootDoc = this._automergeDocLoader.getSpaceRootDocHandle().doc();
    if (!rootDoc) {
      return [];
    }

    return [...new Set([...Object.keys(rootDoc.objects ?? {}), ...Object.keys(rootDoc.links ?? {})])];
  }

  getNumberOfInlineObjects(): number {
    return Object.keys(this._automergeDocLoader.getSpaceRootDocHandle().doc()?.objects ?? {}).length;
  }

  getNumberOfLinkedObjects(): number {
    return Object.keys(this._automergeDocLoader.getSpaceRootDocHandle().doc()?.links ?? {}).length;
  }

  getTotalNumberOfObjects(): number {
    return this.getNumberOfInlineObjects() + this.getNumberOfLinkedObjects();
  }

  /**
   * @deprecated
   * Return only loaded objects.
   */
  allObjectCores(): ObjectCore[] {
    return Array.from(this._objects.values());
  }

  getObjectCoreById(id: string, { load = true }: GetObjectCoreByIdOptions = {}): ObjectCore | undefined {
    if (!this._automergeDocLoader.hasRootHandle) {
      throw new Error('Database is not ready.');
    }

    const objCore = this._objects.get(id);
    if (load && !objCore) {
      this._automergeDocLoader.loadObjectDocument(id);
      return undefined;
    }

    invariant(objCore instanceof ObjectCore);
    return objCore;
  }

  // TODO(Mykola): Reconcile with `getObjectById`.
  async loadObjectCoreById(
    objectId: string,
    { timeout, returnWithUnsatisfiedDeps }: LoadObjectOptions = {},
  ): Promise<ObjectCore | undefined> {
    const core = this.getObjectCoreById(objectId);
    if (core && (returnWithUnsatisfiedDeps || this._areDepsSatisfied(core))) {
      return core;
    }
    const isReady = () => {
      const core = this.getObjectCoreById(objectId);
      return core ? returnWithUnsatisfiedDeps || this._areDepsSatisfied(core) : false;
    };
    const waitForUpdate = this._updateEvent
      .waitFor((event) => event.itemsUpdated.some(({ id }) => id === objectId) && isReady())
      .then(() => this.getObjectCoreById(objectId));
    this._automergeDocLoader.loadObjectDocument(objectId);

    return timeout ? asyncTimeout(waitForUpdate, timeout) : waitForUpdate;
  }

  async batchLoadObjectCores(
    objectIds: string[],
    {
      inactivityTimeout = 30_000,
      returnDeleted = false,
      returnWithUnsatisfiedDeps = false,
      failOnTimeout = false,
    }: {
      inactivityTimeout?: number;
      returnDeleted?: boolean;
      returnWithUnsatisfiedDeps?: boolean;
      failOnTimeout?: boolean;
    } = {},
  ): Promise<(ObjectCore | undefined)[]> {
    if (!this._automergeDocLoader.hasRootHandle) {
      throw new Error('Database is not ready.');
    }

    const result: (ObjectCore | undefined)[] = new Array(objectIds.length);
    const objectsToLoad: Array<{ id: string; resultIndex: number }> = [];
    for (let i = 0; i < objectIds.length; i++) {
      const objectId = objectIds[i];

      if (!this._automergeDocLoader.objectPresent(objectId)) {
        result[i] = undefined;
        continue;
      }

      const core = this.getObjectCoreById(objectId, { load: true });
      if (!returnDeleted && this._objects.get(objectId)?.isDeleted()) {
        result[i] = undefined;
      } else if (!returnWithUnsatisfiedDeps && core && !this._areDepsSatisfied(core)) {
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

    const startTime = TRACE_LOADING ? performance.now() : 0;
    const diagnostics: string[] = [];
    try {
      return await new Promise((resolve, reject) => {
        let unsubscribe: CleanupFn | null = null;
        let inactivityTimeoutTimer: any | undefined;
        const scheduleInactivityTimeout = () => {
          inactivityTimeoutTimer = setTimeout(() => {
            unsubscribe?.();
            if (failOnTimeout) {
              diagnostics.push('inactivity-rejected');
              reject(new TimeoutError(inactivityTimeout));
            } else {
              diagnostics.push('inactivity-resolved');
              resolve(result);
            }
          }, inactivityTimeout);
        };
        unsubscribe = this._updateEvent.on(({ itemsUpdated }) => {
          const updatedIds = itemsUpdated.map((v) => v.id);
          for (let i = objectsToLoad.length - 1; i >= 0; i--) {
            const objectToLoad = objectsToLoad[i];
            if (updatedIds.includes(objectToLoad.id)) {
              clearTimeout(inactivityTimeoutTimer);

              const isDeleted = this._objects.get(objectToLoad.id)?.isDeleted();
              const depsUnsatisfied =
                this._objects.get(objectToLoad.id) && !this._areDepsSatisfied(this._objects.get(objectToLoad.id)!);

              if (!returnDeleted && isDeleted) {
                diagnostics.push('object-deleted');
                result[objectToLoad.resultIndex] = undefined;
              } else if (!returnWithUnsatisfiedDeps && depsUnsatisfied) {
                diagnostics.push('deps-unsatisfied');
                result[objectToLoad.resultIndex] = undefined;
              } else {
                result[objectToLoad.resultIndex] = this.getObjectCoreById(objectToLoad.id)!;
              }

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
    } finally {
      if (TRACE_LOADING) {
        log.info('loading objects', { objectIds, elapsed: performance.now() - startTime, diagnostics });
      }
    }
  }

  addCore(core: ObjectCore, opts?: AddCoreOptions): void {
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

    let spaceDocHandle: DocHandleProxy<DatabaseDirectory>;
    const placement = opts?.placeIn ?? 'linked-doc';
    switch (placement) {
      case 'linked-doc': {
        spaceDocHandle = this._automergeDocLoader.createDocumentForObject(core.id);
        spaceDocHandle.on('change', this._onDocumentUpdate);
        break;
      }
      // TODO(dmaretskyi): In the future we should forbid object placement in the root doc.
      case 'root-doc': {
        spaceDocHandle = this._automergeDocLoader.getSpaceRootDocHandle();
        this._automergeDocLoader.onObjectBoundToDocument(spaceDocHandle, core.id);
        break;
      }
      default:
        throw new TypeError(`Unknown object placement: ${placement}`);
    }

    core.bind({
      db: this,
      docHandle: spaceDocHandle,
      path: ['objects', core.id],
      assignFromLocalState: true,
    });
  }

  removeCore(core: ObjectCore): void {
    invariant(this._objects.has(core.id));
    core.setDeleted(true);
  }

  /**
   * Removes an object link from the space root document.
   */
  unlinkObjects(objectIds: string[]): void {
    const root = this._automergeDocLoader.getSpaceRootDocHandle();
    for (const objectId of objectIds) {
      if (!root.doc().links?.[objectId]) {
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
  async unlinkDeletedObjects({ batchSize = 10 }: { batchSize?: number } = {}): Promise<void> {
    const idChunks = chunkArray(this.getAllObjectIds(), batchSize);
    for (const ids of idChunks) {
      const objects = await this.batchLoadObjectCores(ids, { returnDeleted: true });
      const toUnlink = objects.filter((o) => o?.isDeleted()).map((o) => o!.id);
      this.unlinkObjects(toUnlink);
    }
  }

  /**
   * Resets the object to the new state.
   * Intended way to change the type of the object (for schema migrations).
   * Any concurrent changes made by other peers will be overwritten.
   */
  async atomicReplaceObject(id: ObjectId, params: AtomicReplaceObjectParams): Promise<void> {
    const { data, type } = params;

    const core = await this.loadObjectCoreById(id);
    invariant(core);

    const mappedData = deepMapValues(data, (value, recurse) => {
      if (Ref.isRef(value)) {
        return { '/': value.dxn.toString() };
      }
      return recurse(value);
    });
    delete mappedData.id;
    invariant(mappedData['@type'] === undefined);
    invariant(mappedData['@meta'] === undefined);

    const existingStruct: ObjectStructure = core.getDecoded([]) as any;
    const newStruct: ObjectStructure = {
      ...existingStruct,
      data: mappedData,
    };

    if (type !== undefined) {
      newStruct.system!.type = encodeReference(Reference.fromDXN(type));
    }

    core.setDecoded([], newStruct);
  }

  async flush({ disk = true, indexes = false, updates = false }: FlushOptions = {}): Promise<void> {
    log('flush', { disk, indexes, updates });
    if (disk) {
      await this._repoProxy.flush();
      await this._dataService.flush(
        { documentIds: this._automergeDocLoader.getAllHandles().map((handle) => handle.documentId) },
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
    const doc = root.doc();
    if (!doc) {
      return { heads: {} };
    }

    const headsStates = await this._dataService.getDocumentHeads(
      {
        documentIds: Object.values(doc.links ?? {}).map((link) =>
          interpretAsDocumentId(link.toString() as AutomergeUrl),
        ),
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
  async waitUntilHeadsReplicated(heads: SpaceDocumentHeads): Promise<void> {
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
    const doc = root.doc();
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
  async updateIndexes(): Promise<void> {
    await this._dataService.updateIndexes(undefined, { timeout: 0 });
  }

  async getSyncState(): Promise<SpaceSyncState> {
    const value = await Stream.first(
      this._dataService.subscribeSpaceSyncState({ spaceId: this.spaceId }, { timeout: RPC_TIMEOUT }),
    );
    return value ?? raise(new Error('Failed to get sync state'));
  }

  subscribeToSyncState(ctx: Context, callback: (state: SpaceSyncState) => void): CleanupFn {
    const stream = this._dataService.subscribeSpaceSyncState({ spaceId: this.spaceId }, { timeout: RPC_TIMEOUT });
    stream.subscribe(
      (data) => {
        void runInContextAsync(ctx, () => callback(data));
      },
      (err) => {
        if (err) {
          ctx.raise(err);
        }
      },
    );
    ctx.onDispose(() => stream.close());
    return () => stream.close();
  }

  getLoadedDocumentHandles(): DocHandleProxy<any>[] {
    return Object.values(this._repoProxy.handles);
  }

  private async _handleSpaceRootDocumentChange(
    spaceRootDocHandle: DocHandleProxy<DatabaseDirectory>,
    objectsToLoad: string[],
  ): Promise<void> {
    const spaceRootDoc: DatabaseDirectory = spaceRootDocHandle.doc();
    const inlinedObjectIds = new Set(Object.keys(spaceRootDoc.objects ?? {}));
    const linkedObjectIds = new Map(Object.entries(spaceRootDoc.links ?? {}).map(([k, v]) => [k, v.toString()]));

    const objectsToRebind = new Map<string, { handle: DocHandleProxy<DatabaseDirectory>; objectIds: string[] }>();
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
        const existing = objectsToRebind.get(newObjectDocUrl.toString());
        if (existing != null) {
          existing.objectIds.push(object.id);
          continue;
        }
        const newDocHandle = this._repoProxy.find(newObjectDocUrl as DocumentId);
        await newDocHandle.whenReady();
        newDocHandle.doc();
        objectsToRebind.set(newObjectDocUrl.toString(), { handle: newDocHandle, objectIds: [object.id] });
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

  private _emitObjectUpdateEvent(itemsUpdated: string[]): void {
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
  private readonly _onDocumentUpdate = (event: ChangeEvent<DatabaseDirectory>) => {
    const documentChanges = this._processDocumentUpdate(event);
    this._rebindObjects(event.handle, documentChanges.objectsToRebind);
    this._automergeDocLoader.onObjectLinksUpdated(documentChanges.linkedDocuments);
    this._createInlineObjects(event.handle, documentChanges.createdObjectIds);
    this._emitObjectUpdateEvent(documentChanges.updatedObjectIds);
    this._scheduleThrottledDbUpdate(documentChanges.updatedObjectIds);
  };

  private _processDocumentUpdate(event: ChangeEvent<DatabaseDirectory>): DocumentChanges {
    const { inlineChangedObjects, linkedDocuments } = getInlineAndLinkChanges(event);
    const createdObjectIds: string[] = [];
    const objectsToRebind: string[] = [];
    for (const updatedObject of inlineChangedObjects) {
      const objectCore = this._objects.get(updatedObject);
      if (!objectCore) {
        createdObjectIds.push(updatedObject);
      } else if (objectCore?.docHandle && objectCore.docHandle.url !== event.handle.url) {
        log.verbose('object bound to incorrect document, going to rebind', {
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

  private _unsubscribeFromHandles(): void {
    for (const docHandle of Object.values(this._repoProxy.handles)) {
      docHandle.off('change', this._onDocumentUpdate);
    }
  }

  private _onObjectDocumentLoaded({ handle, objectId }: ObjectDocumentLoaded): void {
    handle.on('change', this._onDocumentUpdate);
    const core = this._createObjectInDocument(handle, objectId);
    if (this._areDepsSatisfied(core)) {
      this._scheduleThrottledUpdate([objectId]);
    } else {
      for (const dep of core.getStrongDependencies()) {
        if (dep.isLocalObjectId()) {
          const id = dep.parts[1];
          this._automergeDocLoader.loadObjectDocument(id);
        }
      }
    }
    for (const dep of this._strongDepsIndex.get(objectId) ?? []) {
      const core = this._objects.get(dep);
      if (core && this._areDepsSatisfied(core)) {
        this._scheduleThrottledUpdate([core.id]);
      }
    }
  }

  /**
   * Loads all objects on open and handles objects that are being created not by this client.
   */
  private _createInlineObjects(docHandle: DocHandleProxy<DatabaseDirectory>, objectIds: string[]): void {
    for (const id of objectIds) {
      invariant(!this._objects.has(id));
      this._createObjectInDocument(docHandle, id);
    }
  }

  private _createObjectInDocument(docHandle: DocHandleProxy<DatabaseDirectory>, objectId: string): ObjectCore {
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

    const deps = core.getStrongDependencies();
    for (const dxn of deps) {
      if (!dxn.isLocalObjectId()) {
        continue;
      }
      const depObjectId = dxn.parts[1];
      if (this._objects.has(depObjectId)) {
        continue;
      }

      defaultMap(this._strongDepsIndex, depObjectId, []).push(core.id);
    }

    return core;
  }

  private _areDepsSatisfied(core: ObjectCore, seen?: Set<ObjectId>): boolean {
    seen ??= new Set<ObjectId>();
    const deps = core.getStrongDependencies();

    seen.add(core.id);
    return deps.every((dep) => {
      if (!dep.isLocalObjectId()) {
        return true;
      }
      const depObjectId = dep.parts[1];
      const depCore = this._objects.get(depObjectId);
      if (!depCore) {
        return false;
      }
      if (seen.has(depCore.id)) {
        return true;
      }
      return this._areDepsSatisfied(depCore, seen);
    });
  }

  private _rebindObjects(docHandle: DocHandleProxy<DatabaseDirectory>, objectIds: string[]): void {
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
  private _emitDbUpdateEvents(): void {
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
  private _scheduleThrottledUpdate(objectId: string[]): void {
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
  private _scheduleThrottledDbUpdate(objectId: string[]): void {
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

export type LoadObjectOptions = {
  timeout?: number;
  /**
   * Will not eagerly preload strong deps.
   */
  returnWithUnsatisfiedDeps?: boolean;
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
  heads: Record<DocumentId, Heads>;
};

export type GetObjectCoreByIdOptions = {
  /**
   * Request the object to be loaded if it is not already loaded.
   * @default true
   */
  load?: boolean;
};

export type AtomicReplaceObjectParams = {
  /**
   * Update data.
   * NOTE: This is not merged with the existing data.
   */
  data: any;

  /**
   * Update object type.
   */
  type?: DXN;
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
