//
// Copyright 2023 DXOS.org
//

import { next as A, type Heads, getHeads } from '@automerge/automerge';
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
import { cancelWithContext, Context, ContextDisposedError } from '@dxos/context';
import { raise, warnAfterTimeout } from '@dxos/debug';
import { type Database, Ref } from '@dxos/echo';
import {
  DatabaseDirectory,
  EncodedReference,
  type EntityMeta,
  type EntityStructure,
  SpaceDocVersion,
  type SpaceState,
} from '@dxos/echo-protocol';
import { batchEvents } from '@dxos/echo/internal';
import { assertState, invariant } from '@dxos/invariant';
import { EID, type EntityId, type PublicKey, type SpaceId, type URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { RpcClosedError } from '@dxos/protocols';
import type { QueryService } from '@dxos/protocols/proto/dxos/echo/query';
import type { DataService, SpaceSyncState } from '@dxos/protocols/proto/dxos/echo/service';
import { trace } from '@dxos/tracing';
import { chunkArray, ComplexSet, deepMapValues, defaultMap } from '@dxos/util';

import { type ChangeEvent, type DocHandleProxy, RepoProxy, type SaveStateChangedEvent } from '../automerge';
import { type HypergraphImpl } from '../hypergraph';
import { ObjectCore } from './object-core';
import { getInlineAndLinkChanges } from './util';

export type InitRootProxyFn = (core: ObjectCore) => void;

export type CoreDatabaseProps = {
  graph: HypergraphImpl;
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

/**
 * Options for {@link CoreDatabase.loadObjectDocument}.
 */
export interface LoadObjectDocumentOptions {
  /**
   * If `true`, do not block on the network for the linked document; wait
   * only for the worker-side disk probe to settle. If the doc is on disk,
   * loading proceeds normally and `onObjectDocumentLoaded` fires once the
   * handle is ready. If the doc is not on disk, `onObjectUnavailable`
   * fires immediately and `onObjectDocumentLoaded` is not emitted (until
   * and unless the doc is later delivered from the network and a separate,
   * non-disk-only load is issued).
   *
   * Use this for query-driven dependency loads where waiting on network
   * latency would stall the query pipeline.
   */
  diskOnly?: boolean;
}

type SpaceDocumentLinks = DatabaseDirectory['links'];

/**
 * Payload for the internal object-document-loaded notification.
 */
interface ObjectDocumentLoaded {
  handle: DocHandleProxy<DatabaseDirectory>;
  objectId: string;
}

/**
 * Payload for the internal object-unavailable notification.
 * `handle` is absent when the object id has no entry in the space directory.
 */
interface ObjectUnavailable {
  handle?: DocHandleProxy<DatabaseDirectory>;
  objectId: string;
}

const TRACE_LOADING = false;

//
// TODO(burdon): Document.
@trace.resource()
export class CoreDatabase {
  private readonly _spaceKey: PublicKey;
  private readonly _spaceId: SpaceId;
  private readonly _hypergraph: HypergraphImpl;
  private readonly _dataService: DataService;
  private readonly _queryService: QueryService;
  private readonly _repoProxy: RepoProxy;
  private readonly _objects = new Map<string, ObjectCore>();

  /**
   * DXN string -> EntityId.
   * Stores the targets of strong dependencies to the objects that depend on them.
   * When we load an object that doesn't have it's strong deps resolved, we wait for the deps to be loaded first.
   */
  private readonly _strongDepsIndex = new Map<string, EntityId[]>();

  /**
   * Object ids whose backing document was determined to be not on local disk
   * via a `diskOnly` load probe. Used by `loadObjectCoreById` to bail out
   * of the wait without resolving when the doc would otherwise require
   * network delivery — turning previously infinite stalls into a fast
   * `undefined` return.
   */
  private readonly _unavailableObjects = new Set<EntityId>();

  readonly _updateEvent = new Event<ItemsUpdatedEvent>();

  private _state = CoreDatabaseState.CLOSED;

  private _ctx = Context.default();

  // TODO(dmaretskyi): Refactor this.
  public readonly opened = new Trigger();

  readonly rootChanged = new Event<void>();

  readonly saveStateChanged: ReadOnlyEvent<SaveStateChangedEvent>;

  /** Fires when service connection is re-established after a leader change. */
  private readonly _reconnected = new Event<void>();

  // ── Inlined doc-loader state ────────────────────────────────────────────

  /** Handle for the space root automerge document. */
  private _spaceRootDocHandle: DocHandleProxy<DatabaseDirectory> | null = null;

  /**
   * Object id → handle of the document where the object is stored inline.
   */
  private readonly _objectDocumentHandles = new Map<string, DocHandleProxy<DatabaseDirectory>>();

  /**
   * Objects that were requested via `_loadObjectDocument` but whose root-document
   * links haven't arrived yet. Carries the load preference so the preference is
   * propagated when the link shows up in `_onObjectLinksUpdated`.
   */
  private readonly _objectsPendingDocumentLoad = new Map<string, LoadObjectDocumentOptions>();

  /**
   * Prevents multiple concurrent loads of the same document.
   * This can happen on SpaceRootHandle switch because we don't cancel the previous load.
   */
  private readonly _currentlyLoadingObjects = new ComplexSet<{ url: AutomergeUrl; objectId: string }>(
    ({ url, objectId }) => `${url}:${objectId}`,
  );

  /** Pending document creation promises, used by `_waitForPendingCreations`. */
  private readonly _pendingDocumentCreations = new Map<string, Promise<void>>();

  constructor({ graph, dataService, queryService, spaceId, spaceKey }: CoreDatabaseProps) {
    this._hypergraph = graph;
    this._dataService = dataService;
    this._queryService = queryService;
    this._spaceId = spaceId;
    this._spaceKey = spaceKey;
    this._repoProxy = new RepoProxy(this._dataService, this._spaceId);
    this.saveStateChanged = this._repoProxy.saveStateChanged;
  }

  toJSON() {
    return {
      id: this._spaceId,
      objects: this._objects.size,
    };
  }

  get graph(): HypergraphImpl {
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
  async open(ctx: Context, spaceState: SpaceState): Promise<void> {
    const start = performance.now();
    if (this._state !== CoreDatabaseState.CLOSED) {
      log.info('Already open');
      return;
    }
    this._state = CoreDatabaseState.OPENING;

    this._ctx = new Context({ parent: ctx });
    this._updateScheduler = new UpdateScheduler(this._ctx, async () => this._emitDbUpdateEvents(this._ctx), {
      maxFrequency: THROTTLED_UPDATE_FREQUENCY,
    });

    await this._repoProxy.open();
    this._ctx.onDispose(() => this._unsubscribeFromHandles());

    try {
      await this._loadSpaceRootDocHandle(ctx, spaceState);
      const spaceRootDocHandle = this.getSpaceRootDocHandle();
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
    this._ctx = Context.default();

    await this._repoProxy.close();
  }

  /**
   * Update DB in response to space state change.
   * Can be used to change the root AM document.
   */
  // TODO(dmaretskyi): should it be synchronized and/or cancelable?
  @synchronized
  async updateSpaceState(ctx: Context, spaceState: SpaceState): Promise<void> {
    invariant(this._ctx, 'Must be open');
    const currentRootUrl = this.getSpaceRootDocHandle().url;
    if (spaceState.rootUrl === currentRootUrl) {
      return;
    }
    this._unsubscribeFromHandles();
    const objectIdsToLoad = this._clearHandleReferences();

    try {
      await this._loadSpaceRootDocHandle(ctx, spaceState);
      const spaceRootDocHandle = this.getSpaceRootDocHandle();
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

    const hasLoadedHandles = this._getAllDocHandles().length > 0;
    if (!hasLoadedHandles) {
      return [];
    }
    const rootDoc = this.getSpaceRootDocHandle().doc();
    if (!rootDoc) {
      return [];
    }

    return [...new Set([...Object.keys(rootDoc.objects ?? {}), ...Object.keys(rootDoc.links ?? {})])];
  }

  getNumberOfInlineObjects(): number {
    return Object.keys(this.getSpaceRootDocHandle().doc()?.objects ?? {}).length;
  }

  getNumberOfLinkedObjects(): number {
    return Object.keys(this.getSpaceRootDocHandle().doc()?.links ?? {}).length;
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
    if (!this._spaceRootDocHandle) {
      throw new Error('Database is not ready.');
    }

    const objCore = this._objects.get(id);
    if (!objCore) {
      if (load) {
        this._loadObjectDocument(id);
      }
      return undefined;
    }

    invariant(objCore instanceof ObjectCore);
    return objCore;
  }

  // TODO(Mykola): Reconcile with `getObjectById`.
  async loadObjectCoreById(
    objectId: string,
    { timeout, returnWithUnsatisfiedDeps, diskOnly }: LoadObjectOptions = {},
  ): Promise<ObjectCore | undefined> {
    // Object's own doc was previously determined unavailable on disk by a
    // (system-driven or explicit) `diskOnly` probe. Short-circuit with
    // `undefined` only for `diskOnly` callers so they don't hang waiting
    // for a doc that isn't on disk; non-`diskOnly` callers must still be
    // allowed to wait for the network. The mark is cleared by
    // `_onObjectDocumentLoaded` if the doc later arrives over the network
    // (the loader's fire-and-forget continuation will wake any in-flight
    // wait), which lets a fresh `diskOnly` call succeed too.
    if (diskOnly && this._unavailableObjects.has(objectId)) {
      return undefined;
    }
    // `load: false` so we don't trigger an implicit (non-`diskOnly`)
    // load via `getObjectCoreById`'s default behavior; the explicit
    // `_loadObjectDocument(..., { diskOnly })` below carries the
    // caller's preference end-to-end.
    const cachedCore = this.getObjectCoreById(objectId, { load: false });
    if (cachedCore && this._isCoreResolved(cachedCore, returnWithUnsatisfiedDeps)) {
      return this._coreOrUndefined(cachedCore, returnWithUnsatisfiedDeps);
    }

    const isReady = () => {
      if (diskOnly && this._unavailableObjects.has(objectId)) {
        return true;
      }
      const core = this.getObjectCoreById(objectId, { load: false });
      return core != null && this._isCoreResolved(core, returnWithUnsatisfiedDeps);
    };

    const waitForUpdate = this._updateEvent.waitFor(
      (event) => event.itemsUpdated.some(({ id }) => id === objectId) && isReady(),
    );
    this._loadObjectDocument(objectId, { diskOnly });

    await (timeout ? asyncTimeout(waitForUpdate, timeout) : waitForUpdate);

    if (diskOnly && this._unavailableObjects.has(objectId)) {
      return undefined;
    }
    const finalCore = this.getObjectCoreById(objectId, { load: false });
    if (!finalCore) {
      return undefined;
    }
    return this._coreOrUndefined(finalCore, returnWithUnsatisfiedDeps);
  }

  /**
   * A core is "resolved" for the purposes of `loadObjectCoreById` when its
   * deps are either fully satisfied OR every unsatisfied dep is known
   * unavailable. Either way, there is no further progress to wait for.
   */
  private _isCoreResolved(core: ObjectCore, returnWithUnsatisfiedDeps?: boolean): boolean {
    if (returnWithUnsatisfiedDeps || this._areDepsSatisfied(core)) {
      return true;
    }
    return this._areDepsResolved(core);
  }

  /**
   * Apply the `returnWithUnsatisfiedDeps` contract: by default callers
   * only receive a core when all strong deps loaded; otherwise return
   * `undefined`. With the flag set, return the core regardless.
   */
  private _coreOrUndefined(core: ObjectCore, returnWithUnsatisfiedDeps?: boolean): ObjectCore | undefined {
    if (returnWithUnsatisfiedDeps || this._areDepsSatisfied(core)) {
      return core;
    }
    return undefined;
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
    if (!this._spaceRootDocHandle) {
      throw new Error('Database is not ready.');
    }

    const result: (ObjectCore | undefined)[] = new Array(objectIds.length);
    const objectsToLoad: Array<{ id: string; resultIndex: number }> = [];
    for (let i = 0; i < objectIds.length; i++) {
      const objectId = objectIds[i];

      if (!this._objectPresent(objectId)) {
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
    this._loadObjectDocument(idsToLoad);

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
        spaceDocHandle = this._createDocumentForObject(core.id);
        spaceDocHandle.on('change', this._onDocumentUpdate);
        break;
      }
      // TODO(dmaretskyi): In the future we should forbid object placement in the root doc.
      case 'root-doc': {
        spaceDocHandle = this.getSpaceRootDocHandle();
        this._onObjectBoundToDocument(spaceDocHandle, core.id);
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

    // A prior `diskOnly` probe (e.g. resolving this object by ref before it was added) may have
    // marked the id unavailable; it is now locally present, so clear the mark and wake dependents.
    this._markObjectAvailable(core.id);
  }

  removeCore(core: ObjectCore): void {
    invariant(this._objects.has(core.id));
    core.setDeleted(true);
  }

  /**
   * Removes an object link from the space root document.
   */
  unlinkObjects(objectIds: string[]): void {
    const root = this.getSpaceRootDocHandle();
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
  async atomicReplaceObject(id: EntityId, params: AtomicReplaceObjectProps): Promise<void> {
    const { data, type, meta } = params;

    const core = await this.loadObjectCoreById(id);
    invariant(core);

    const mappedData = deepMapValues(data, (value, recurse) => {
      if (Ref.isRef(value)) {
        return { '/': value.uri };
      }
      if (value instanceof Uint8Array) {
        return value;
      }
      return recurse(value);
    });
    delete mappedData.id;
    invariant(mappedData['@type'] === undefined);
    invariant(mappedData['@meta'] === undefined);

    // deepMapValues is used to clone the automerge doc to avoid "Cannot create a reference to an existing document object" error.
    const existingStruct: EntityStructure = deepMapValues(core.getDecoded([]), (value, recurse) =>
      value instanceof Uint8Array ? value : recurse(value),
    );
    const newStruct: EntityStructure = {
      ...existingStruct,
      data: mappedData,
    };

    if (type !== undefined) {
      newStruct.system!.type = EncodedReference.fromURI(type);
    }

    if (meta !== undefined) {
      newStruct.meta = { ...existingStruct.meta, ...meta };
    }

    core.setDecoded([], newStruct);
  }

  // TODO(wittjosiah): Handle RpcClosedError and TimeoutError during reconnection gracefully.
  async flush({ disk = true, indexes = true, updates = false }: Database.FlushOptions = {}): Promise<void> {
    log('flush', { disk, indexes, updates });
    // Wait for pending document creations to complete before flushing.
    await this._waitForPendingCreations();
    if (disk) {
      await this._repoProxy.flush();
      await this._dataService.flush(
        {
          documentIds: this._getAllDocHandles()
            .map((handle) => handle.documentId)
            .filter((id): id is DocumentId => id != null),
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
    const root = this.getSpaceRootDocHandle();
    const doc = root.doc();
    if (!doc || root.documentId == null) {
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
    const root = this.getSpaceRootDocHandle();
    const doc = root.doc();
    invariant(doc);
    invariant(root.documentId, 'Space root document must have documentId');

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
   * @deprecated Use `flush()`.
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
    let currentStream: ReturnType<DataService['subscribeSpaceSyncState']> | undefined;

    const setupStream = () => {
      currentStream = this._dataService.subscribeSpaceSyncState({ spaceId: this.spaceId }, { timeout: RPC_TIMEOUT });
      currentStream.subscribe(
        (data) => {
          void runInContextAsync(ctx, () => callback(data));
        },
        (err) => {
          if (err instanceof RpcClosedError) {
            // Wait for reconnection and re-establish the stream.
            this._reconnected.once(ctx, () => setupStream());
          } else if (err) {
            ctx.raise(err);
          }
        },
      );
    };

    setupStream();
    ctx.onDispose(() => currentStream?.close());
    return () => currentStream?.close();
  }

  /**
   * Update service references after reconnection.
   */
  _updateServices({ dataService, queryService }: { dataService: DataService; queryService: QueryService }): void {
    (this as any)._dataService = dataService;
    (this as any)._queryService = queryService;
    this._repoProxy._updateDataService(dataService);
  }

  /**
   * Handle reconnection to re-establish RPC streams.
   */
  async _onReconnect(): Promise<void> {
    log('re-establishing database streams');
    await this._repoProxy._onReconnect();
    this._reconnected.emit();
  }

  getLoadedDocumentHandles(): DocHandleProxy<any>[] {
    return Object.values(this._repoProxy.handles);
  }

  // ── Inlined doc-loader public surface ────────────────────────────────────

  /**
   * Returns the space root document handle.
   */
  getSpaceRootDocHandle(): DocHandleProxy<DatabaseDirectory> {
    invariant(this._spaceRootDocHandle, 'Database was not initialized with root object.');
    return this._spaceRootDocHandle;
  }

  /**
   * Returns handles linked from the space root handle.
   */
  getLinkedDocHandles(): DocHandleProxy<DatabaseDirectory>[] {
    return [...new Set(this._objectDocumentHandles.values())];
  }

  /**
   * Returns the automerge document id for the object's document, or `undefined`
   * when the object is not yet materialized or not in this space.
   */
  getObjectDocumentId(objectId: string): string | undefined {
    invariant(this._spaceRootDocHandle, 'Database was not initialized with root object.');
    const spaceRootDoc = this._spaceRootDocHandle.doc();
    invariant(spaceRootDoc);
    if (spaceRootDoc.objects?.[objectId]) {
      return this._spaceRootDocHandle.documentId;
    }
    const documentUrl = this._getLinkedDocumentUrl(objectId);
    return documentUrl && interpretAsDocumentId(documentUrl.toString() as AutomergeUrl);
  }

  // ── Inlined doc-loader private implementation ─────────────────────────────

  @trace.span({ showInBrowserTimeline: true, op: 'lifecycle' })
  private async _loadSpaceRootDocHandle(ctx: Context, spaceState: SpaceState): Promise<void> {
    if (this._spaceRootDocHandle != null) {
      return;
    }
    if (!spaceState.rootUrl) {
      throw new Error('Database opened with no rootUrl');
    }

    const existingDocHandle = await this._initDocHandle(ctx, spaceState.rootUrl);
    const doc = existingDocHandle.doc();
    invariant(doc);
    invariant(doc.version === SpaceDocVersion.CURRENT);
    if (doc.access == null) {
      this._initDocAccess(existingDocHandle);
    }
    this._spaceRootDocHandle = existingDocHandle;
  }

  private _objectPresent(id: EntityId): boolean {
    assertState(this._spaceRootDocHandle, 'Database was not initialized with root object.');
    return (
      DatabaseDirectory.getInlineObject(this._spaceRootDocHandle.doc(), id) != null ||
      DatabaseDirectory.getLink(this._spaceRootDocHandle.doc(), id) != null
    );
  }

  private _loadObjectDocument(objectIdOrMany: string | string[], opts: LoadObjectDocumentOptions = {}): void {
    const objectIds = Array.isArray(objectIdOrMany) ? objectIdOrMany : [objectIdOrMany];
    let hasUrlsToLoad = false;
    const urlsToLoad: DatabaseDirectory['links'] = {};
    for (const objectId of objectIds) {
      invariant(this._spaceRootDocHandle, 'Database was not initialized with root object.');
      if (this._objectDocumentHandles.has(objectId) || this._objectsPendingDocumentLoad.has(objectId)) {
        continue;
      }
      const documentUrl = this._getLinkedDocumentUrl(objectId);
      if (documentUrl == null) {
        // The id has no entry in the space directory (neither inline nor
        // link) — a dangling reference as far as the current state is
        // concerned. Surface "unavailable" right away so dependents (e.g.
        // query hydration waiting on strong deps) resolve instead of
        // hanging. Keep the pending entry: if a link arrives later via
        // root-doc sync, `_onObjectLinksUpdated` loads it and
        // `_onObjectDocumentLoaded` clears the unavailable mark.
        this._objectsPendingDocumentLoad.set(objectId, opts);
        const isInline = DatabaseDirectory.getInlineObject(this._spaceRootDocHandle.doc(), objectId) != null;
        if (!isInline) {
          log('object absent from space directory, marking unavailable', { objectId });
          this._onObjectUnavailable({ objectId });
        } else {
          log('loading delayed until object links are initialized', { objectId });
        }
      } else {
        urlsToLoad[objectId] = documentUrl;
        hasUrlsToLoad = true;
      }
    }
    if (hasUrlsToLoad) {
      this._loadLinkedObjects(urlsToLoad, opts);
    }
  }

  private _onObjectLinksUpdated(links: SpaceDocumentLinks): void {
    if (!links) {
      return;
    }
    // Load links that were previously requested and are waiting. Group by
    // the load preference (e.g. `diskOnly`) carried over from the original
    // `_loadObjectDocument` call so each batch passes through with its own options.
    const linksAwaitingLoad = Object.entries(links).filter(([objectId]) =>
      this._objectsPendingDocumentLoad.has(objectId),
    );
    if (linksAwaitingLoad.length > 0) {
      const groups = new Map<boolean, typeof linksAwaitingLoad>();
      for (const entry of linksAwaitingLoad) {
        const opts = this._objectsPendingDocumentLoad.get(entry[0]) ?? {};
        const key = !!opts.diskOnly;
        const bucket = groups.get(key) ?? [];
        bucket.push(entry);
        groups.set(key, bucket);
      }
      for (const [diskOnly, entries] of groups) {
        this._loadLinkedObjects(Object.fromEntries(entries), { diskOnly });
      }
    }
    linksAwaitingLoad.forEach(([objectId]) => this._objectsPendingDocumentLoad.delete(objectId));

    // Load newly discovered links that we are not already tracking.
    // System-driven background prefetch: always `diskOnly: true` so the
    // disk-probe / `_onObjectUnavailable` path can fire. If the doc later
    // arrives over the network, `_onObjectDocumentLoaded` is emitted in
    // the normal way and any prior "unavailable" mark is cleared.
    const newLinks = Object.entries(links).filter(
      ([objectId]) => !this._objectDocumentHandles.has(objectId) && !this._objectsPendingDocumentLoad.has(objectId),
    );
    if (newLinks.length > 0) {
      this._loadLinkedObjects(Object.fromEntries(newLinks), { diskOnly: true });
    }
  }

  private _onObjectBoundToDocument(handle: DocHandleProxy<DatabaseDirectory>, objectId: string): void {
    this._objectDocumentHandles.set(objectId, handle);
  }

  private _createDocumentForObject(objectId: string): DocHandleProxy<DatabaseDirectory> {
    invariant(this._spaceRootDocHandle, 'Database was not initialized with root object.');
    const spaceDocHandle = this._repoProxy.create<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceKey: this._spaceKey.toHex() },
    });
    const creationPromise = spaceDocHandle
      .whenReady()
      .then(() => {
        if (this._spaceRootDocHandle == null) {
          log.warn('space root document handle is not available, skipping object binding', { objectId });
          return;
        }
        const url = spaceDocHandle.url;
        if (url == null) {
          log.warn('document has no url after whenReady, skipping object binding', { objectId });
          return;
        }
        this._spaceRootDocHandle.change((newDoc: DatabaseDirectory) => {
          newDoc.links ??= {};
          newDoc.links[objectId] = new A.RawString(url);
        });
      })
      .finally(() => {
        this._pendingDocumentCreations.delete(objectId);
      });
    this._pendingDocumentCreations.set(objectId, creationPromise);
    this._onObjectBoundToDocument(spaceDocHandle, objectId);

    return spaceDocHandle;
  }

  private async _waitForPendingCreations(): Promise<void> {
    await Promise.all([...this._pendingDocumentCreations.values()]);
  }

  /**
   * @returns objectIds for which we had document handles or were loading one.
   */
  private _clearHandleReferences(): string[] {
    const objectsWithHandles = [...this._objectDocumentHandles.keys()];
    this._objectDocumentHandles.clear();
    this._spaceRootDocHandle = null;
    return objectsWithHandles;
  }

  private _getAllDocHandles(): DocHandleProxy<DatabaseDirectory>[] {
    return this._spaceRootDocHandle != null
      ? [this._spaceRootDocHandle, ...new Set(this._objectDocumentHandles.values())]
      : [];
  }

  private _getLinkedDocumentUrl(objectId: string): AutomergeUrl | undefined {
    const spaceRootDoc = this._spaceRootDocHandle?.doc();
    invariant(spaceRootDoc);
    return (spaceRootDoc.links ?? {})[objectId]?.toString() as AutomergeUrl;
  }

  private _loadLinkedObjects(links: SpaceDocumentLinks, opts: LoadObjectDocumentOptions = {}): void {
    if (!links) {
      return;
    }
    for (const [objectId, automergeUrlData] of Object.entries(links)) {
      const automergeUrl = automergeUrlData.toString();
      const logMeta = { objectId, automergeUrl };
      const objectDocumentHandle = this._objectDocumentHandles.get(objectId);
      // Skip if object is already bound to a different document.
      if (objectDocumentHandle?.url != null && objectDocumentHandle.url !== automergeUrl) {
        log.warn('object already inlined in a different document, ignoring the link', {
          ...logMeta,
          actualDocumentUrl: objectDocumentHandle.url,
        });
        continue;
      }
      if (objectDocumentHandle?.url === automergeUrl) {
        log.warn('object document was already loaded', logMeta);
        continue;
      }
      const handle = this._repoProxy.find<DatabaseDirectory>(automergeUrl as DocumentId);
      log.debug('document loading triggered', logMeta);
      this._objectDocumentHandles.set(objectId, handle);
      void this._loadHandleForObject(handle, objectId, opts);
    }
  }

  private async _initDocHandle(ctx: Context, url: string): Promise<DocHandleProxy<DatabaseDirectory>> {
    const docHandle = this._repoProxy.find<DatabaseDirectory>(url as DocumentId);
    await warnAfterTimeout(5_000, 'Automerge root doc load timeout (CoreDatabase)', async () => {
      await cancelWithContext(ctx, docHandle.whenReady());
    });

    return docHandle;
  }

  private _initDocAccess(handle: DocHandleProxy<DatabaseDirectory>): void {
    handle.change((newDoc: DatabaseDirectory) => {
      newDoc.access ??= { spaceKey: this._spaceKey.toHex() };
      newDoc.access.spaceKey = this._spaceKey.toHex();
    });
  }

  private async _loadHandleForObject(
    handle: DocHandleProxy<DatabaseDirectory>,
    objectId: string,
    opts: LoadObjectDocumentOptions = {},
  ): Promise<void> {
    invariant(handle.url, 'Document URL is not available');
    try {
      if (this._currentlyLoadingObjects.has({ url: handle.url, objectId })) {
        log.verbose('document is already loading', { objectId });
        return;
      }
      this._currentlyLoadingObjects.add({ url: handle.url, objectId });

      // Disk-only path: wait for the worker to settle the disk probe; if
      // the doc is not on disk, surface "unavailable" without ever
      // blocking on the network.
      if (opts.diskOnly) {
        const onDisk = await handle.whenSettledOnDisk();
        if (!onDisk) {
          this._currentlyLoadingObjects.delete({ url: handle.url, objectId });
          log('object document unavailable on disk', { objectId, docUrl: handle.url });
          this._onObjectUnavailable({ handle, objectId });
          // The handle stays attached to the repo: the worker continues
          // to fetch over the network. Background-wait for that so we can
          // surface a normal `_onObjectDocumentLoaded` event if/when the
          // bytes do arrive — that path clears `_unavailableObjects` and
          // unblocks any subsequent loads.
          handle
            .whenReady()
            .then(() => {
              if (this._objectDocumentHandles.get(objectId) !== handle) {
                return;
              }
              this._onObjectDocumentLoaded({ handle, objectId });
            })
            .catch((err) => log.verbose('background network wait failed', { objectId, err }));
          return;
        }
        // Doc is on disk and the worker is loading the bytes; fall through
        // to the standard `whenReady` wait, which now resolves quickly.
      }

      await handle.whenReady();
      this._currentlyLoadingObjects.delete({ url: handle.url, objectId });

      const logMeta = { objectId, docUrl: handle.url };
      const objectDocHandle = this._objectDocumentHandles.get(objectId);
      if (objectDocHandle?.url != null && objectDocHandle.url !== handle.url) {
        log.warn('object was rebound while a document was loading, discarding handle', logMeta);
        return;
      }
      this._onObjectDocumentLoaded({ handle, objectId });
    } catch (err) {
      this._currentlyLoadingObjects.delete({ url: handle.url, objectId });
      log.warn('failed to load a document, retrying', {
        objectId,
        automergeUrl: handle.url,
        err,
      });
      await this._loadHandleForObject(handle, objectId, opts);
    }
  }

  // ── Original private methods ──────────────────────────────────────────────

  private async _handleSpaceRootDocumentChange(
    spaceRootDocHandle: DocHandleProxy<DatabaseDirectory>,
    objectsToLoad: string[],
  ): Promise<void> {
    const spaceRootUrl = spaceRootDocHandle.url;
    if (spaceRootUrl == null) {
      log.warn('space root document has no url');
      return;
    }

    const spaceRootDoc: DatabaseDirectory = spaceRootDocHandle.doc();
    const inlinedObjectIds = new Set(Object.keys(spaceRootDoc.objects ?? {}));
    const linkedObjectIds = new Map(Object.entries(spaceRootDoc.links ?? {}).map(([k, v]) => [k, v.toString()]));

    const objectsToRebind = new Map<string, { handle: DocHandleProxy<DatabaseDirectory>; objectIds: string[] }>();
    objectsToRebind.set(spaceRootUrl, { handle: spaceRootDocHandle, objectIds: [] });

    const objectsToRemove: string[] = [];
    const objectsToCreate = [...inlinedObjectIds.values()].filter((oid) => !this._objects.has(oid));

    for (const object of this._objects.values()) {
      if (inlinedObjectIds.has(object.id)) {
        if (object.docHandle?.url != null && object.docHandle.url === spaceRootUrl) {
          continue;
        }
        objectsToRebind.get(spaceRootUrl)!.objectIds.push(object.id);
      } else if (linkedObjectIds.has(object.id)) {
        const newObjectDocUrl = linkedObjectIds.get(object.id)!;
        if (object.docHandle?.url != null && object.docHandle.url === newObjectDocUrl) {
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
        this._loadObjectDocument(objectId);
      }
    }
    this._onObjectLinksUpdated(spaceRootDoc.links);
    this.rootChanged.emit();
  }

  private _emitObjectUpdateEvent(itemsUpdated: string[]): void {
    if (itemsUpdated.length === 0) {
      return;
    }

    batchEvents(() => {
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
    this._onObjectLinksUpdated(documentChanges.linkedDocuments);
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
      } else if (
        objectCore.docHandle?.url != null &&
        event.handle.url != null &&
        objectCore.docHandle.url !== event.handle.url
      ) {
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

    // The dep was previously marked unavailable but its bytes have now
    // arrived (e.g. a peer eventually delivered them); clear the mark so
    // any new `loadObjectCoreById` waiters for this object — or for its
    // dependents — see a fresh resolution.
    this._markObjectAvailable(objectId);

    // Skip objects that were already materialized locally.
    if (this._objects.has(objectId)) {
      return;
    }

    const core = this._createObjectInDocument(handle, objectId);
    const depsSatisfied = this._areDepsSatisfied(core);
    if (depsSatisfied) {
      this._scheduleThrottledUpdate([objectId]);
    } else {
      // Recursive strong-dep loads always use `diskOnly: true`. Deps are
      // a system-internal hydration step, not a user-driven request: we
      // surface a clear "unavailable" signal instead of blocking on the
      // network. Callers that explicitly want network-backed dep loading
      // can issue per-dep requests themselves.
      for (const dep of core.getStrongDependencies()) {
        if (!EID.isLocal(dep)) {
          continue;
        }
        const id = EID.getEntityId(dep);
        if (id) {
          this._loadObjectDocument(id, { diskOnly: true });
        }
      }
    }
    const queue = [objectId],
      seen = new Set<string>();
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);

      if (this._objects.has(id)) {
        for (const dep of this._strongDepsIndex.get(id) ?? []) {
          queue.push(dep);
          const core = this._objects.get(dep);
          if (core && this._areDepsSatisfied(core)) {
            this._scheduleThrottledUpdate([core.id]);
          }
        }
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
    // Clear any stale unavailable mark: the object is now materialized in a document.
    this._markObjectAvailable(objectId);
    this._onObjectBoundToDocument(docHandle, objectId);
    core.bind({
      db: this,
      docHandle,
      path: ['objects', core.id],
      assignFromLocalState: false,
    });

    const deps = core.getStrongDependencies();
    for (const dep of deps) {
      if (!EID.isLocal(dep)) {
        continue;
      }
      const depObjectId = EID.getEntityId(dep);
      if (!depObjectId || this._objects.has(depObjectId)) {
        continue;
      }

      defaultMap(this._strongDepsIndex, depObjectId, []).push(core.id);
    }

    return core;
  }

  /**
   * Whether every local strong dependency is loaded and satisfied.
   * Query paths require this before surfacing an object.
   */
  areStrongDepsSatisfied(core: ObjectCore): boolean {
    return this._areDepsSatisfied(core);
  }

  private _areDepsSatisfied(core: ObjectCore, seen?: Set<EntityId>): boolean {
    seen ??= new Set<EntityId>();
    const deps = core.getStrongDependencies();

    seen.add(core.id);
    return deps.every((dep) => {
      if (!EID.isLocal(dep)) {
        return true;
      }
      const depObjectId = EID.getEntityId(dep);
      if (!depObjectId) {
        return true;
      }
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

  /**
   * Returns true when every strong dep is either loaded (== `_areDepsSatisfied`)
   * OR has been determined unavailable on disk. Used by `loadObjectCoreById`
   * so it can resolve (with `undefined`) instead of waiting forever when a
   * recursive dep doc is unreachable. Recursive strong-dep loads always
   * use `diskOnly: true`, so deps surface as unavailable promptly even for
   * non-`diskOnly` top-level callers.
   */
  private _areDepsResolved(core: ObjectCore, seen?: Set<EntityId>): boolean {
    seen ??= new Set<EntityId>();
    const deps = core.getStrongDependencies();

    seen.add(core.id);
    return deps.every((dep) => {
      if (!EID.isLocal(dep)) {
        return true;
      }
      const depObjectId = EID.getEntityId(dep);
      if (!depObjectId || this._unavailableObjects.has(depObjectId)) {
        return true;
      }
      const depCore = this._objects.get(depObjectId);
      if (!depCore) {
        return false;
      }
      if (seen.has(depCore.id)) {
        return true;
      }
      return this._areDepsResolved(depCore, seen);
    });
  }

  /**
   * Clears a stale `_unavailableObjects` mark once an object becomes available and wakes its
   * dependents so any `loadObjectCoreById` waiter — or query hydration that dropped the object —
   * re-evaluates. The mark is set when an id is probed (`diskOnly`) while absent from the space
   * directory; an object later materialized locally (added) or whose document arrives must clear
   * it, otherwise `diskOnly` loads keep short-circuiting to `undefined` until the database is rebuilt.
   */
  private _markObjectAvailable(objectId: string): void {
    if (this._unavailableObjects.delete(objectId)) {
      this._scheduleThrottledUpdate([objectId, ...(this._strongDepsIndex.get(objectId) ?? [])]);
    }
  }

  private _onObjectUnavailable({ objectId }: ObjectUnavailable): void {
    if (this._unavailableObjects.has(objectId)) {
      return;
    }
    this._unavailableObjects.add(objectId);
    // Walk transitive dependents (`A → B → C`, C unavailable wakes B
    // and A) so any `loadObjectCoreById` waiter higher up in the chain
    // re-evaluates `_areDepsResolved` and resolves with `undefined`
    // instead of hanging. Mirrors the BFS in `_onObjectDocumentLoaded`.
    const toWake = new Set<EntityId>([objectId]);
    const queue: EntityId[] = [objectId];
    while (queue.length > 0) {
      const id = queue.shift()!;
      for (const dep of this._strongDepsIndex.get(id) ?? []) {
        if (!toWake.has(dep)) {
          toWake.add(dep);
          queue.push(dep);
        }
      }
    }
    this._scheduleThrottledUpdate([...toWake]);
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
      this._onObjectBoundToDocument(docHandle, objectId);
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
  private _updateScheduler = new UpdateScheduler(this._ctx, async () => this._emitDbUpdateEvents(this._ctx), {
    maxFrequency: THROTTLED_UPDATE_FREQUENCY,
  });

  @trace.span({ showInBrowserTimeline: true, showInRemoteTracing: false })
  private _emitDbUpdateEvents(_ctx: Context): void {
    const fullUpdateIds = [...this._objectsForNextUpdate];
    const allDbUpdates = new Set([...this._objectsForNextUpdate, ...this._objectsForNextDbUpdate]);
    this._objectsForNextUpdate.clear();
    this._objectsForNextDbUpdate.clear();

    batchEvents(() => {
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

  /**
   * Allow deleted objects to be returned.
   * @default false
   */
  allowDeleted?: boolean;

  /**
   * Resolve as soon as the worker-side disk probe settles instead of
   * waiting for the network. If the document for the requested object —
   * or any of its strong dependencies — is not on local storage, the call
   * returns `undefined` (or, with `returnWithUnsatisfiedDeps: true`, the
   * partial core) instead of stalling. Recursive strong-dep loads inherit
   * this preference. Used by query-driven loads where waiting on network
   * latency would stall the query pipeline.
   *
   * @default false
   */
  diskOnly?: boolean;
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

export type AtomicReplaceObjectProps = {
  /**
   * Update data.
   * NOTE: This is not merged with the existing data.
   */
  data: any;

  /**
   * Update object type — either a typename DXN or a stored-schema EID
   * (see `getSchemaURI`).
   */
  type?: URI.URI;

  /**
   * Optional partial meta patch — merged into the existing object meta.
   * Fields explicitly set to `undefined` overwrite the previous value with `undefined`.
   */
  meta?: Partial<EntityMeta>;
};

/**
 * Changes derived from an automerge document-change event.
 */
export interface DocumentChanges {
  createdObjectIds: string[];
  updatedObjectIds: string[];
  objectsToRebind: string[];
  linkedDocuments: {
    [echoUri: string]: AutomergeUrl;
  };
}

const RPC_TIMEOUT = 20_000;

const DISABLE_THROTTLING = true;
