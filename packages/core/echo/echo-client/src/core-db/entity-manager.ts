//
// Copyright 2023 DXOS.org
//

import { next as A, getHeads } from '@automerge/automerge';
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
} from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf/stream';
import { Context, ContextDisposedError, cancelWithContext } from '@dxos/context';
import { raise, warnAfterTimeout } from '@dxos/debug';
import { type Database, Ref } from '@dxos/echo';
import {
  DatabaseDirectory,
  EncodedReference,
  type EntityStructure,
  SpaceDocVersion,
  type SpaceState,
} from '@dxos/echo-protocol';
import { type RefResolver, type RefResolverRequest, batchEvents } from '@dxos/echo/internal';
import { assertState, invariant } from '@dxos/invariant';
import { EID, type EntityId, type PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { RpcClosedError } from '@dxos/protocols';
import type { QueryService } from '@dxos/protocols/proto/dxos/echo/query';
import type { DataService, SpaceSyncState } from '@dxos/protocols/proto/dxos/echo/service';
import { trace } from '@dxos/tracing';
import { ComplexSet, chunkArray, deepMapValues } from '@dxos/util';

import { type ChangeEvent, type DocHandleProxy, RepoProxy, type SaveStateChangedEvent } from '../automerge';
import { type HypergraphImpl } from '../hypergraph';
import { type IDatabaseBinding, ObjectCore } from './object-core';
import {
  type AddCoreOptions,
  type AtomicReplaceObjectProps,
  type DocumentChanges,
  type GetObjectCoreByIdOptions,
  type ItemsUpdatedEvent,
  type LoadObjectDocumentOptions,
  type LoadObjectOptions,
  type SpaceDocumentHeads,
} from './types';
import { getInlineAndLinkChanges } from './util';

const THROTTLED_UPDATE_FREQUENCY = 10;

const TRACE_LOADING = false;

/**
 * Payload for the internal object-document-loaded notification.
 */
interface ObjectDocumentLoaded {
  handle: DocHandleProxy<DatabaseDirectory>;
  objectId: string;
}

/**
 * Payload for the internal object-unavailable notification.
 */
interface ObjectUnavailable {
  handle?: DocHandleProxy<DatabaseDirectory>;
  objectId: string;
}

type SpaceDocumentLinks = DatabaseDirectory['links'];

export type EntityManagerProps = {
  graph: HypergraphImpl;
  dataService: DataService;
  queryService: QueryService;
  spaceId: SpaceId;
  spaceKey: PublicKey;
};

/**
 * Core database implementation: owns all Automerge document management, object
 * storage, dependency tracking, and update scheduling for a single space.
 * DatabaseImpl holds a reference to this class and delegates all document and
 * object-core operations here.
 */
@trace.resource()
export class EntityManager implements IDatabaseBinding {
  private readonly _spaceKey: PublicKey;
  private readonly _spaceId: SpaceId;
  private readonly _hypergraph: HypergraphImpl;
  private _dataService: DataService;
  private _queryService: QueryService;
  readonly _repoProxy: RepoProxy;

  // ── Object storage ──────────────────────────────────────────────────────
  private readonly _objects = new Map<string, ObjectCore>();

  /**
   * Object ids whose backing document was determined to be not on local disk
   * via a `diskOnly` load probe. Used by `loadObjectCoreById` to bail out
   * of the wait without resolving when the doc would otherwise require
   * network delivery — turning previously infinite stalls into a fast
   * `undefined` return.
   */
  private readonly _unavailableObjects = new Set<EntityId>();

  /**
   * Per-entity closure-aware satisfaction requests. Strong-dependency satisfaction is delegated to
   * the {@link RefResolver}: each surfaced entity holds a disk-bound request whose `ready` state is
   * the surface gate, spanning same-space db, cross-space db, feed queues, and the registry.
   */
  private readonly _satisfactionRequests = new Map<EntityId, RefResolverRequest>();

  private _refResolver: RefResolver | undefined;

  private _ctx: Context | undefined;

  // ── Events ──────────────────────────────────────────────────────────────
  readonly _updateEvent = new Event<ItemsUpdatedEvent>();
  readonly saveStateChanged: ReadOnlyEvent<SaveStateChangedEvent>;

  /** Fires when the database has finished loading its initial space root document. */
  readonly opened = new Trigger();

  /** Fires when service connection is re-established after a leader change. */
  private readonly _reconnected = new Event<void>();

  // ── Automerge document state ────────────────────────────────────────────
  private _spaceRootDocHandle: DocHandleProxy<DatabaseDirectory> | null = null;

  private readonly _objectDocumentHandles = new Map<string, DocHandleProxy<DatabaseDirectory>>();

  private readonly _objectsPendingDocumentLoad = new Map<string, LoadObjectDocumentOptions>();

  private readonly _currentlyLoadingObjects = new ComplexSet<{ url: AutomergeUrl; objectId: string }>(
    ({ url, objectId }) => `${url}:${objectId}`,
  );

  private readonly _pendingDocumentCreations = new Map<string, Promise<void>>();

  // ── Update scheduling ────────────────────────────────────────────────────
  private _objectsForNextDbUpdate = new Set<string>();
  private _objectsForNextUpdate = new Set<string>();
  private _updateScheduler!: UpdateScheduler;

  // ── Private event field ──────────────────────────────────────────────────
  private readonly _rootChangedEvent = new Event<void>();

  constructor(options: EntityManagerProps) {
    this._spaceKey = options.spaceKey;
    this._spaceId = options.spaceId;
    this._hypergraph = options.graph;
    this._dataService = options.dataService;
    this._queryService = options.queryService;
    this._repoProxy = new RepoProxy(this._dataService, this._spaceId);
    this.saveStateChanged = this._repoProxy.saveStateChanged;
  }

  get spaceId(): SpaceId {
    return this._spaceId;
  }

  /** @deprecated Use spaceId. */
  get spaceKey(): PublicKey {
    return this._spaceKey;
  }

  get rootChanged(): ReadOnlyEvent<void> {
    return this._rootChangedEvent;
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /**
   * Opens the entity manager: starts the repo and wires up update scheduling.
   * Call `openWithSpaceState` afterwards to load documents once a root URL is known.
   */
  async open(ctx: Context): Promise<void> {
    this._ctx = ctx;
    this._updateScheduler = new UpdateScheduler(ctx, async () => this._emitDbUpdateEvents(ctx), {
      maxFrequency: THROTTLED_UPDATE_FREQUENCY,
    });

    await this._repoProxy.open();
    ctx.onDispose(() => this._unsubscribeFromHandles());
    ctx.onDispose(() => {
      for (const request of this._satisfactionRequests.values()) {
        request.abort();
      }
      this._satisfactionRequests.clear();
    });
  }

  /**
   * Performs initial AM document load after a rootUrl is known.
   * Called by DatabaseImpl when the first space root is available.
   */
  @trace.span({ showInBrowserTimeline: true, op: 'lifecycle' })
  async openWithSpaceState(ctx: Context, spaceState: SpaceState): Promise<void> {
    const start = performance.now();
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

    this.opened.wake();
  }

  /**
   * Update in response to a space root URL change after the initial load.
   */
  async updateSpaceState(ctx: Context, spaceState: SpaceState): Promise<void> {
    invariant(this._spaceRootDocHandle, 'Must be open');
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

  async close(): Promise<void> {
    this.opened.throw(new ContextDisposedError());
    this.opened.reset();
    await this._repoProxy.close();
  }

  // ── Core object operations ───────────────────────────────────────────────

  /** @deprecated Return only loaded objects. */
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

  async loadObjectCoreById(
    objectId: string,
    { timeout, returnWithUnsatisfiedDeps, diskOnly }: LoadObjectOptions = {},
  ): Promise<ObjectCore | undefined> {
    if (diskOnly && this._unavailableObjects.has(objectId)) {
      return undefined;
    }
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

  private _isCoreResolved(core: ObjectCore, returnWithUnsatisfiedDeps?: boolean): boolean {
    if (returnWithUnsatisfiedDeps || this._areDepsSatisfied(core)) {
      return true;
    }
    return this._areDepsResolved(core);
  }

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
    if (core.entityManager) {
      if (core.entityManager !== this) {
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

    this._markObjectAvailable(core.id);
  }

  removeCore(core: ObjectCore): void {
    invariant(this._objects.has(core.id));
    core.setDeleted(true);
  }

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

  async unlinkDeletedObjects({ batchSize = 10 }: { batchSize?: number } = {}): Promise<void> {
    const idChunks = chunkArray(this.getAllObjectIds(), batchSize);
    for (const ids of idChunks) {
      const objects = await this.batchLoadObjectCores(ids, { returnDeleted: true });
      const toUnlink = objects.filter((o) => o?.isDeleted()).map((o) => o!.id);
      this.unlinkObjects(toUnlink);
    }
  }

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

  async flush({ disk = true, indexes = true, updates = false }: Database.FlushOptions = {}): Promise<void> {
    log('flush', { disk, indexes, updates });
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

  /** @deprecated Use `flush()`. */
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

  getAllObjectIds(): string[] {
    if (!this._spaceRootDocHandle) {
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

  getLoadedDocumentHandles(): DocHandleProxy<any>[] {
    return Object.values(this._repoProxy.handles);
  }

  _updateServices({ dataService, queryService }: { dataService: DataService; queryService: QueryService }): void {
    this._dataService = dataService;
    this._queryService = queryService;
    this._repoProxy._updateDataService(dataService);
  }

  async _onReconnect(): Promise<void> {
    log('re-establishing database streams');
    await this._repoProxy._onReconnect();
    this._reconnected.emit();
  }

  // ── Document-handle public surface ───────────────────────────────────────

  getSpaceRootDocHandle(): DocHandleProxy<DatabaseDirectory> {
    invariant(this._spaceRootDocHandle, 'Database was not initialized with root object.');
    return this._spaceRootDocHandle;
  }

  getLinkedDocHandles(): DocHandleProxy<DatabaseDirectory>[] {
    const rootHandle = this._spaceRootDocHandle;
    return [...new Set(this._objectDocumentHandles.values())].filter((h) => h !== rootHandle);
  }

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

  // ── Document-handle private implementation ───────────────────────────────

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
    if (doc.access?.spaceId == null || doc.access?.spaceKey == null) {
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
      // spaceKey is deprecated but still written so older clients can resolve the owning space.
      access: { spaceId: this._spaceId, spaceKey: this._spaceKey.toHex() },
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
    await warnAfterTimeout(5_000, 'Automerge root doc load timeout (EntityManager)', async () => {
      await cancelWithContext(ctx, docHandle.whenReady());
    });

    return docHandle;
  }

  private _initDocAccess(handle: DocHandleProxy<DatabaseDirectory>): void {
    handle.change((newDoc: DatabaseDirectory) => {
      newDoc.access ??= {};
      newDoc.access.spaceId = this._spaceId;
      // spaceKey is deprecated but still written so older clients can resolve the owning space.
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

      if (opts.diskOnly) {
        const onDisk = await handle.whenSettledOnDisk();
        if (!onDisk) {
          this._currentlyLoadingObjects.delete({ url: handle.url, objectId });
          log('object document unavailable on disk', { objectId, docUrl: handle.url });
          this._onObjectUnavailable({ handle, objectId });
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

  // ── Private document change handlers ────────────────────────────────────

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
    this._rootChangedEvent.emit();
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

    // The body was previously marked unavailable but its bytes have now arrived (e.g. a peer
    // eventually delivered them); clear the mark so any in-flight body load resolves afresh.
    this._markObjectAvailable(objectId);

    if (this._objects.has(objectId)) {
      return;
    }

    this._createObjectInDocument(handle, objectId);
    // Surface the new body. The query pipeline re-evaluates strong-dep satisfaction through the
    // resolver; dependents whose closure includes this entity are woken by their satisfaction
    // request's load op transitioning to ready.
    this._scheduleThrottledUpdate([objectId]);
  }

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
    this._markObjectAvailable(objectId);
    this._onObjectBoundToDocument(docHandle, objectId);
    core.bind({
      db: this,
      docHandle,
      path: ['objects', core.id],
      assignFromLocalState: false,
    });

    return core;
  }

  /**
   * Whether the entity's full strong-dependency closure is loaded and satisfied.
   * Query paths require this before surfacing an object. Delegated to the resolver, so it spans
   * same-space / cross-space db objects, feed-queue objects, and registry types uniformly.
   */
  areStrongDepsSatisfied(core: ObjectCore): boolean {
    return this._areDepsSatisfied(core);
  }

  private _areDepsSatisfied(core: ObjectCore): boolean {
    return this._ensureSatisfactionRequest(core).state === 'ready';
  }

  /**
   * Returns true when the strong-dep closure is either satisfied OR settled `unavailable` at the
   * disk ceiling. Used by `loadObjectCoreById` so it resolves (with `undefined`) instead of waiting
   * forever when a dependency is unreachable on disk.
   */
  private _areDepsResolved(core: ObjectCore): boolean {
    const state = this._ensureSatisfactionRequest(core).state;
    return state === 'ready' || state === 'unavailable';
  }

  /**
   * Returns (creating on first use) the closure-aware satisfaction request for an entity. Surfacing
   * subscribes to its state changes so the query pipeline re-evaluates as the closure loads.
   */
  private _ensureSatisfactionRequest(core: ObjectCore): RefResolverRequest {
    let request = this._satisfactionRequests.get(core.id);
    if (request == null) {
      this._refResolver ??= this._hypergraph.createRefResolver({ context: { space: this._spaceId } });
      const uri = EID.make({ spaceId: this._spaceId, entityId: core.id });
      request = this._refResolver.resolve(uri, { source: 'disk' });
      this._satisfactionRequests.set(core.id, request);
      request.stateChanged.on(this._ctx!, () => this._scheduleThrottledUpdate([core.id]));
    }
    return request;
  }

  /**
   * Clears a stale `_unavailableObjects` mark once an object's body becomes available, waking any
   * in-flight body load. The mark is set when an id is probed (`diskOnly`) while absent from the
   * space directory; an object later materialized locally (added) or whose document arrives must
   * clear it, otherwise `diskOnly` loads keep short-circuiting to `undefined`.
   */
  private _markObjectAvailable(objectId: string): void {
    if (this._unavailableObjects.delete(objectId)) {
      this._scheduleThrottledUpdate([objectId]);
    }
  }

  private _onObjectUnavailable({ objectId }: ObjectUnavailable): void {
    if (this._unavailableObjects.has(objectId)) {
      return;
    }
    this._unavailableObjects.add(objectId);
    // Wake any in-flight body load so it settles `unavailable` instead of hanging; satisfaction
    // requests whose closure includes this body re-evaluate via their load op transitioning.
    this._scheduleThrottledUpdate([objectId]);
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

  // ── Update scheduling ────────────────────────────────────────────────────

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

const RPC_TIMEOUT = 20_000;

const DISABLE_THROTTLING = true;
