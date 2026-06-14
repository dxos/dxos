//
// Copyright 2023 DXOS.org
//

import { type Doc, type Heads, getHeads, next as A } from '@automerge/automerge';
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
import { type Database, Ref } from '@dxos/echo';
import {
  type BranchRecord,
  DatabaseDirectory,
  EncodedReference,
  type EntityMeta,
  type EntityStructure,
  type SpaceState,
} from '@dxos/echo-protocol';
import { batchEvents } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { EID, type EntityId, type PublicKey, type SpaceId, type URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { RpcClosedError } from '@dxos/protocols';
import type { QueryService } from '@dxos/protocols/proto/dxos/echo/query';
import type { DataService, SpaceSyncState } from '@dxos/protocols/proto/dxos/echo/service';
import { trace } from '@dxos/tracing';
import { chunkArray, deepMapValues, defaultMap } from '@dxos/util';

import { type ChangeEvent, type DocHandleProxy, RepoProxy, type SaveStateChangedEvent } from '../automerge';
import { type HypergraphImpl } from '../hypergraph';
import {
  type AutomergeDocumentLoader,
  AutomergeDocumentLoaderImpl,
  type DocumentChanges,
  type ObjectDocumentLoaded,
  type ObjectUnavailable,
} from './automerge-doc-loader';
import { type BranchStore, forkDump, referencedObjectIds } from './branching';
import { ObjectCore } from './object-core';
import { getInlineAndLinkChanges } from './util';

export type InitRootProxyFn = (core: ObjectCore) => void;

export type CoreDatabaseProps = {
  graph: HypergraphImpl;
  dataService: DataService;
  queryService: QueryService;
  spaceId: SpaceId;
  spaceKey: PublicKey;
  /** Device-local persistence for the current-branch selection (non-synced). In-memory if omitted. */
  branchStore?: BranchStore;
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
  private readonly _spaceKey: PublicKey;
  private readonly _spaceId: SpaceId;
  private readonly _hypergraph: HypergraphImpl;
  private readonly _dataService: DataService;
  private readonly _queryService: QueryService;
  private readonly _repoProxy: RepoProxy;
  private readonly _objects = new Map<string, ObjectCore>();

  /**
   * Device-local, non-synced: object id -> currently-selected branch name ('main' omitted).
   * Hydrated from {@link _branchStore} on open (if provided) and persisted on switch.
   */
  private readonly _currentBranches = new Map<string, string>();

  /** Optional device-local persistence for {@link _currentBranches} (survives reload, never syncs). */
  private readonly _branchStore?: BranchStore;

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

  /**
   * @internal
   */
  readonly _automergeDocLoader: AutomergeDocumentLoader;

  readonly rootChanged = new Event<void>();

  /** Fires after any branch operation (create / switch / merge / delete) for reactive branch UI. */
  readonly branchesChanged = new Event<void>();

  readonly saveStateChanged: ReadOnlyEvent<SaveStateChangedEvent>;

  /** Fires when service connection is re-established after a leader change. */
  private readonly _reconnected = new Event<void>();

  constructor({ graph, dataService, queryService, spaceId, spaceKey, branchStore }: CoreDatabaseProps) {
    this._hypergraph = graph;
    this._dataService = dataService;
    this._queryService = queryService;
    this._spaceId = spaceId;
    this._spaceKey = spaceKey;
    this._branchStore = branchStore;
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
    this._automergeDocLoader.onObjectDocumentLoaded.on(this._ctx, this._onObjectDocumentLoaded.bind(this));
    this._automergeDocLoader.onObjectUnavailable.on(this._ctx, this._onObjectUnavailable.bind(this));

    try {
      await this._automergeDocLoader.loadSpaceRootDocHandle(ctx, spaceState);
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

    // Restore device-local branch selections (e.g. after a reload) and re-bind each branched subtree
    // to its selected branch — objects otherwise load on `main`.
    if (this._branchStore) {
      await this._hydrateCurrentBranches();
    }
  }

  private async _hydrateCurrentBranches(): Promise<void> {
    try {
      const entries = await this._branchStore!.load();
      for (const [objectId, name] of Object.entries(entries)) {
        this._currentBranches.set(objectId, name);
      }
      const reapplied = new Set<string>();
      for (const [objectId, name] of Object.entries(entries)) {
        if (name === 'main' || reapplied.has(objectId) || !this.getBranchRegistry(objectId)?.[name]) {
          continue;
        }
        reapplied.add(objectId);
        await this.switchBranch(objectId, name);
      }
    } catch (err) {
      log.warn('failed to hydrate current branches', { err });
    }
  }

  private _persistCurrentBranches(): void {
    if (!this._branchStore) {
      return;
    }
    void this._branchStore
      .save(Object.fromEntries(this._currentBranches))
      .catch((err) => log.warn('failed to persist current branches', { err }));
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
    const currentRootUrl = this._automergeDocLoader.getSpaceRootDocHandle().url;
    if (spaceState.rootUrl === currentRootUrl) {
      return;
    }
    this._unsubscribeFromHandles();
    const objectIdsToLoad = this._automergeDocLoader.clearHandleReferences();

    try {
      await this._automergeDocLoader.loadSpaceRootDocHandle(ctx, spaceState);
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
    if (!objCore) {
      if (load) {
        this._automergeDocLoader.loadObjectDocument(id);
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
    // `loadObjectDocument(..., { diskOnly })` below carries the
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
    this._automergeDocLoader.loadObjectDocument(objectId, { diskOnly });

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

  //
  // Branching.
  // A branch is a writable alternate timeline of an object subtree: each member's document is forked
  // into a separate (synced) branch document; the space-root `branches` registry maps branch name ->
  // member doc url. The currently-selected branch is device-local (never synced).
  //

  /** The branch name this device currently views the object on; `'main'` (the object's main doc) by default. */
  getCurrentBranch(objectId: string): string {
    return this._currentBranches.get(objectId) ?? 'main';
  }

  /** The synced branch registry for a subtree-root object (undefined if it has no branches). */
  getBranchRegistry(rootObjectId: string): Record<string, BranchRecord> | undefined {
    return DatabaseDirectory.getBranches(this._automergeDocLoader.getSpaceRootDocHandle().doc(), rootObjectId);
  }

  /**
   * All branch names available for an object, including the implicit `'main'` (always first).
   * Works for a subtree root or any of its members (members inherit the root's branches).
   */
  listBranches(objectId: string): string[] {
    const rootId = this.getBranchRegistry(objectId) ? objectId : this._findBranchRootFor(objectId);
    return ['main', ...Object.keys((rootId && this.getBranchRegistry(rootId)) || {})];
  }

  /** The subtree root that owns the branch set containing `objectId`, if any. */
  private _findBranchRootFor(objectId: string): string | undefined {
    const branches = this._automergeDocLoader.getSpaceRootDocHandle().doc().branches ?? {};
    for (const [rootId, byName] of Object.entries(branches)) {
      for (const record of Object.values(byName)) {
        if (record.members[objectId]) {
          return rootId;
        }
      }
    }
    return undefined;
  }

  /**
   * Fork the object and its referenced subtree into a new branch. Does not switch to it.
   * @param opts.fromHeads Fork the root from a historical frontier instead of its tip.
   */
  async createBranch(rootObjectId: string, name: string, opts?: { fromHeads?: Heads }): Promise<void> {
    invariant(name !== 'main', "'main' is the implicit default branch");
    invariant(!this.getBranchRegistry(rootObjectId)?.[name], `branch already exists: ${name}`);
    const rootCore = this._objects.get(rootObjectId) ?? (await this.loadObjectCoreById(rootObjectId)) ?? undefined;
    invariant(rootCore, 'root object not found');

    const members = await this._collectSubtree(rootCore);
    const memberUrls: BranchRecord['members'] = {};
    for (const member of members) {
      invariant(this._hasOwnDocument(member.id), 'cannot branch an inline object (promotion not yet implemented)');
      // `fromHeads` is the root's historical frontier; children fork at their own current heads.
      const atHeads = opts?.fromHeads && member.id === rootObjectId ? opts.fromHeads : undefined;
      // No `change` listener here: the object stays on its current branch; the branch doc only needs
      // to exist and replicate (referenced via the registry below). A listener is attached on switch.
      const handle = this._repo.import<DatabaseDirectory>(forkDump(member.getDoc() as Doc<any>, atHeads));
      await handle.whenReady();
      invariant(handle.url, 'branch document has no url');
      memberUrls[member.id] = handle.url;
    }

    const spaceRoot = this._automergeDocLoader.getSpaceRootDocHandle();
    const baseHeads = opts?.fromHeads ?? getHeads(rootCore.getDoc() as Doc<any>);
    const createdAt = Date.now();
    spaceRoot.change((doc: DatabaseDirectory) => {
      // Assign through re-read doc proxies (not a chained `??=` result, which returns the orphan
      // literal under Automerge and silently drops the write).
      doc.branches ??= {};
      doc.branches[rootObjectId] ??= {};
      doc.branches[rootObjectId][name] = { members: memberUrls, baseHeads, createdAt };
    });
    this.branchesChanged.emit();
  }

  /**
   * Switch the object's subtree to a branch (or back to `'main'`). Cascades to every subtree member
   * and rebinds each `ObjectCore` to that branch's document, so the object shows the branch
   * consistently regardless of how it is later accessed. The selection is device-local.
   */
  async switchBranch(rootObjectId: string, name: string): Promise<void> {
    const registry = this.getBranchRegistry(rootObjectId);
    if (name !== 'main') {
      invariant(registry?.[name], `branch not found: ${name}`);
    }
    // Membership is consistent across branches, so the union covers every member to (re)bind.
    const memberIds = new Set<string>([rootObjectId]);
    for (const record of Object.values(registry ?? {})) {
      for (const id of Object.keys(record.members)) {
        memberIds.add(id);
      }
    }
    for (const memberId of memberIds) {
      await this._rebindMemberToBranch(memberId, name, registry);
      if (name === 'main') {
        this._currentBranches.delete(memberId);
      } else {
        this._currentBranches.set(memberId, name);
      }
    }
    this._persistCurrentBranches();
    this._scheduleThrottledUpdate([...memberIds]);
    this.branchesChanged.emit();
  }

  /**
   * Fold a branch's changes back into main across the subtree via `A.merge` (well-defined because
   * the branch shares fork ancestry with main). Then switch back to main; optionally delete.
   */
  async mergeBranch(rootObjectId: string, name: string, opts?: { deleteAfter?: boolean }): Promise<void> {
    invariant(name !== 'main', 'cannot merge main into itself');
    const record = this.getBranchRegistry(rootObjectId)?.[name];
    invariant(record, `branch not found: ${name}`);
    for (const [memberId, urlData] of Object.entries(record.members)) {
      const branchHandle = this._repo.find<DatabaseDirectory>(urlData.toString() as DocumentId);
      await branchHandle.whenReady();
      const branchDoc = branchHandle.doc() as Doc<any>;
      const mainHandle = await this._mainDocHandle(memberId);
      mainHandle.update((doc) => A.merge(doc as Doc<any>, branchDoc) as any);
    }
    await this.switchBranch(rootObjectId, 'main');
    if (opts?.deleteAfter) {
      this.deleteBranch(rootObjectId, name);
    }
  }

  /** Remove a branch from the registry (its documents lose their sync reference). Cannot delete main. */
  deleteBranch(rootObjectId: string, name: string): void {
    invariant(name !== 'main', 'cannot delete the main branch');
    const spaceRoot = this._automergeDocLoader.getSpaceRootDocHandle();
    const memberIds = Object.keys(this.getBranchRegistry(rootObjectId)?.[name]?.members ?? {});
    spaceRoot.change((doc: DatabaseDirectory) => {
      if (doc.branches?.[rootObjectId]) {
        delete doc.branches[rootObjectId][name];
        if (Object.keys(doc.branches[rootObjectId]).length === 0) {
          delete doc.branches[rootObjectId];
        }
      }
    });
    // Members currently viewing the deleted branch fall back to main.
    const orphaned = memberIds.filter((id) => this._currentBranches.get(id) === name);
    if (orphaned.length > 0) {
      void this.switchBranch(rootObjectId, 'main');
    }
    this.branchesChanged.emit();
  }

  /** BFS the object's referenced subtree (loading members as needed). */
  private async _collectSubtree(rootCore: ObjectCore): Promise<ObjectCore[]> {
    const seen = new Set<string>();
    const result: ObjectCore[] = [];
    const queue: ObjectCore[] = [rootCore];
    while (queue.length > 0) {
      const core = queue.shift()!;
      if (seen.has(core.id)) {
        continue;
      }
      seen.add(core.id);
      result.push(core);
      for (const id of referencedObjectIds(core.getObjectStructure())) {
        if (seen.has(id)) {
          continue;
        }
        const child = this._objects.get(id) ?? (await this.loadObjectCoreById(id)) ?? undefined;
        if (child) {
          queue.push(child);
        }
      }
    }
    return result;
  }

  /** Whether the object has its own linked document (not inlined in the space root). */
  private _hasOwnDocument(objectId: string): boolean {
    return this._automergeDocLoader.getSpaceRootDocHandle().doc().links?.[objectId] != null;
  }

  /** Resolve the object's main (default-branch) document handle. */
  private async _mainDocHandle(objectId: string): Promise<DocHandleProxy<DatabaseDirectory>> {
    const spaceRoot = this._automergeDocLoader.getSpaceRootDocHandle();
    const url = spaceRoot.doc().links?.[objectId]?.toString();
    if (!url) {
      return spaceRoot; // Inline object.
    }
    const handle = this._repo.find<DatabaseDirectory>(url as DocumentId);
    await handle.whenReady();
    return handle;
  }

  private async _rebindMemberToBranch(
    memberId: string,
    name: string,
    registry: Record<string, BranchRecord> | undefined,
  ): Promise<void> {
    const core = this._objects.get(memberId) ?? (await this.loadObjectCoreById(memberId)) ?? undefined;
    if (!core) {
      return;
    }
    // A branch switch is a harder navigation than a time-travel scrub; drop any active pin so reads
    // reflect the (live) target branch rather than a stale historical view of the previous doc.
    core.clearTimeTravel();
    const url = name !== 'main' ? registry?.[name]?.members[memberId]?.toString() : undefined;
    let handle: DocHandleProxy<DatabaseDirectory>;
    if (url) {
      handle = this._repo.find<DatabaseDirectory>(url as DocumentId);
      await handle.whenReady();
    } else {
      // 'main', or a member absent from this branch's set, binds to its main document.
      handle = await this._mainDocHandle(memberId);
    }
    if (handle === core.docHandle) {
      return; // Already bound to the target doc.
    }
    // Move the change listener to the newly-bound doc. `_processDocumentUpdate` rebinds an object to
    // whichever doc fires a change, so a non-current branch doc holding the same object id must NOT
    // carry the listener. The space root (shared by inline objects) keeps its listener.
    const spaceRoot = this._automergeDocLoader.getSpaceRootDocHandle();
    if (core.docHandle && core.docHandle !== spaceRoot) {
      core.docHandle.off('change', this._onDocumentUpdate);
    }
    if (handle !== spaceRoot) {
      handle.off('change', this._onDocumentUpdate);
      handle.on('change', this._onDocumentUpdate);
    }
    core.bind({ db: this, docHandle: handle, path: ['objects', memberId], assignFromLocalState: false });
    this._automergeDocLoader.onObjectBoundToDocument(handle, memberId);
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
    await this._automergeDocLoader.waitForPendingCreations();
    if (disk) {
      await this._repoProxy.flush();
      await this._dataService.flush(
        {
          documentIds: this._automergeDocLoader
            .getAllHandles()
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
    const root = this._automergeDocLoader.getSpaceRootDocHandle();
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
    const root = this._automergeDocLoader.getSpaceRootDocHandle();
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
          this._automergeDocLoader.loadObjectDocument(id, { diskOnly: true });
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
    this._automergeDocLoader.onObjectBoundToDocument(docHandle, objectId);
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

const RPC_TIMEOUT = 20_000;

const DISABLE_THROTTLING = true;
