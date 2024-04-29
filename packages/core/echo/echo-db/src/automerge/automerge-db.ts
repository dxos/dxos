//
// Copyright 2023 DXOS.org
//

import { Event, Trigger, UpdateScheduler, asyncTimeout, synchronized } from '@dxos/async';
import { getHeads } from '@dxos/automerge/automerge';
import { type DocHandle, type DocHandleChangePayload, type DocumentId } from '@dxos/automerge/automerge-repo';
import { Context, ContextDisposedError } from '@dxos/context';
import {
  AutomergeDocumentLoaderImpl,
  type AutomergeDocumentLoader,
  type DocumentChanges,
  type ObjectDocumentLoaded,
  type SpaceDoc,
  type SpaceState,
} from '@dxos/echo-pipeline';
import { TYPE_PROPERTIES, isReactiveObject, type EchoReactiveObject } from '@dxos/echo-schema';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { type EchoDatabase } from '../database';
import { isEchoObject } from '../echo-handler';
import { type Hypergraph } from '../hypergraph';
import { type AutomergeContext } from './automerge-context';
import { getAutomergeObjectCore } from './automerge-object';
import { AutomergeObjectCore } from './automerge-object-core';
import { getInlineAndLinkChanges } from './utils';

export type InitRootProxyFn = (core: AutomergeObjectCore) => void;

/**
 * Maximum number of remote update notifications per second.
 */
const THROTTLED_UPDATE_FREQUENCY = 10;

export class AutomergeDb {
  /**
   * @internal
   */
  readonly _objects = new Map<string, AutomergeObjectCore>();

  readonly _updateEvent = new Event<ItemsUpdatedEvent>();

  private _isOpen = false;

  private _ctx = new Context();

  // TODO(dmaretskyi): Refactor this.
  public readonly openTrigger = new Trigger();

  /**
   * @internal
   */
  readonly _automergeDocLoader: AutomergeDocumentLoader;

  readonly rootChanged = new Event<void>();

  /**
   * @deprecated Remove
   */
  _dbApi: EchoDatabase;

  constructor(
    public readonly graph: Hypergraph,
    public readonly automerge: AutomergeContext,
    public readonly spaceKey: PublicKey,
    private readonly _initRootProxyFn: InitRootProxyFn,
    dbApi: EchoDatabase, // TODO(dmaretskyi): Remove.
  ) {
    this._automergeDocLoader = new AutomergeDocumentLoaderImpl(this.spaceKey, automerge.repo);
    this._dbApi = dbApi;
  }

  @synchronized
  async open(spaceState: SpaceState) {
    const start = performance.now();
    if (this._isOpen) {
      log.info('Already open');
      return;
    }
    this._isOpen = true;
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

    this.openTrigger.wake();
  }

  // TODO(dmaretskyi): Cant close while opening.
  @synchronized
  async close() {
    if (!this._isOpen) {
      return;
    }
    this._isOpen = false;

    this.openTrigger.throw(new ContextDisposedError());
    this.openTrigger.reset();

    void this._ctx.dispose();
    this._ctx = new Context();
  }

  /**
   * @deprecated
   * Return only loaded objects.
   */
  allObjectCores() {
    return Array.from(this._objects.values());
  }

  /**
   * @deprecated
   * Return only loaded objects.
   */
  allObjects(): EchoReactiveObject<any>[] {
    return this.allObjectCores().map((core) => core.rootProxy as EchoReactiveObject<any>);
  }

  /**
   * Returns ids for loaded and not loaded objects.
   */
  getAllObjectIds(): string[] {
    if (!this._isOpen) {
      return [];
    }
    const rootDoc = this._automergeDocLoader.getSpaceRootDocHandle().docSync();
    if (!rootDoc) {
      return [];
    }

    return [...new Set([...Object.keys(rootDoc.objects ?? {}), ...Object.keys(rootDoc.links ?? {})])];
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

  getObjectCoreById(id: string): AutomergeObjectCore | undefined {
    const objCore = this._objects.get(id);
    if (!objCore) {
      this._automergeDocLoader.loadObjectDocument(id);
      return undefined;
    }

    if (objCore.isDeleted()) {
      return undefined;
    }

    invariant(objCore instanceof AutomergeObjectCore);
    return objCore;
  }

  getObjectById(id: string): EchoReactiveObject<any> | undefined {
    const objCore = this.getObjectCoreById(id);
    if (!objCore) {
      return undefined;
    }

    const root = objCore.rootProxy;
    invariant(isReactiveObject(root));
    return root as any;
  }

  // TODO(Mykola): Reconcile with `getObjectById`.
  async loadObjectById<T = any>(
    objectId: string,
    { timeout = 5000 }: { timeout?: number } = {},
  ): Promise<EchoReactiveObject<T> | undefined> {
    // Check if deleted.
    if (this._objects.get(objectId)?.isDeleted()) {
      return Promise.resolve(undefined);
    }

    const obj = this.getObjectById(objectId);
    if (obj) {
      return Promise.resolve(obj);
    }
    this._automergeDocLoader.loadObjectDocument(objectId);

    return asyncTimeout(
      this._updateEvent
        .waitFor((event) => event.itemsUpdated.some(({ id }) => id === objectId))
        .then(() => this.getObjectById(objectId)),
      timeout,
    );
  }

  addCore(core: AutomergeObjectCore) {
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
    let spaceDocHandle: DocHandle<SpaceDoc>;
    if (shouldObjectGoIntoFragmentedSpace(core) && this.automerge.spaceFragmentationEnabled) {
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

    // TODO(dmaretskyi): This should be handled in the API layer.
    if (!core.rootProxy) {
      this._initRootProxyFn(core);
    }
  }

  add(obj: EchoReactiveObject<any>) {
    const core = getAutomergeObjectCore(obj);
    this.addCore(core);
    return obj;
  }

  remove(obj: EchoReactiveObject<any>) {
    const core = getAutomergeObjectCore(obj);
    invariant(this._objects.has(core.id));
    core.setDeleted(true);
  }

  async flush(): Promise<void> {
    // TODO(mykola): send out only changed documents.
    await this.automerge.flush({
      states: this._automergeDocLoader.getAllHandles().map((handle) => ({
        heads: getHeads(handle.docSync()),
        documentId: handle.documentId,
      })),
    });
  }

  private async _handleSpaceRootDocumentChange(spaceRootDocHandle: DocHandle<SpaceDoc>, objectsToLoad: string[]) {
    const spaceRootDoc: SpaceDoc = spaceRootDocHandle.docSync();
    const inlinedObjectIds = new Set(Object.keys(spaceRootDoc.objects ?? {}));
    const linkedObjectIds = new Map(Object.entries(spaceRootDoc.links ?? {}));

    const objectsToRebind = new Map<string, { handle: DocHandle<SpaceDoc>; objectIds: string[] }>();
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
        const newDocHandle = this.automerge.repo.find(newObjectDocUrl as DocumentId);
        await newDocHandle.doc(['ready']);
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

  private _emitUpdateEvent(itemsUpdated: string[]) {
    if (itemsUpdated.length === 0) {
      return;
    }

    compositeRuntime.batch(() => {
      this._updateEvent.emit({
        spaceKey: this.spaceKey,
        itemsUpdated: itemsUpdated.map((id) => ({ id })),
      });
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
  private readonly _onDocumentUpdate = (event: DocHandleChangePayload<SpaceDoc>) => {
    const documentChanges = this._processDocumentUpdate(event);
    this._rebindObjects(event.handle, documentChanges.objectsToRebind);
    this._automergeDocLoader.onObjectLinksUpdated(documentChanges.linkedDocuments);
    this._createInlineObjects(event.handle, documentChanges.createdObjectIds);
    this._emitUpdateEvent(documentChanges.updatedObjectIds);
  };

  private _processDocumentUpdate(event: DocHandleChangePayload<SpaceDoc>): DocumentChanges {
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
    for (const docHandle of Object.values(this.automerge.repo.handles)) {
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
  private _createInlineObjects(docHandle: DocHandle<SpaceDoc>, objectIds: string[]) {
    for (const id of objectIds) {
      invariant(!this._objects.has(id));
      this._createObjectInDocument(docHandle, id);
    }
  }

  private _createObjectInDocument(docHandle: DocHandle<SpaceDoc>, objectId: string) {
    invariant(!this._objects.get(objectId));
    const core = new AutomergeObjectCore();
    core.id = objectId;
    this._objects.set(core.id, core);
    this._automergeDocLoader.onObjectBoundToDocument(docHandle, objectId);
    core.bind({
      db: this,
      docHandle,
      path: ['objects', core.id],
      assignFromLocalState: false,
    });
    this._initRootProxyFn(core);
  }

  private _rebindObjects(docHandle: DocHandle<SpaceDoc>, objectIds: string[]) {
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

  private _objectsForNextUpdate = new Set<string>();
  private readonly _updateScheduler = new UpdateScheduler(
    this._ctx,
    async () => {
      const ids = [...this._objectsForNextUpdate];
      this._objectsForNextUpdate.clear();
      this._emitUpdateEvent(ids);
    },
    {
      maxFrequency: THROTTLED_UPDATE_FREQUENCY,
    },
  );

  // TODO(dmaretskyi): Pass all remote updates through this.
  private _scheduleThrottledUpdate(itemIds: string[]) {
    for (const id of itemIds) {
      this._objectsForNextUpdate.add(id);
    }
    this._updateScheduler.trigger();
  }
}

export interface ItemsUpdatedEvent {
  spaceKey: PublicKey;
  itemsUpdated: Array<{ id: string }>;
}

export const shouldObjectGoIntoFragmentedSpace = (core: AutomergeObjectCore) => {
  if (isEchoObject(core.rootProxy)) {
    // NOTE: We need to store properties in the root document since space-list initialization
    //  expects it to be loaded as space become available.
    if (core.getType()?.itemId === TYPE_PROPERTIES) {
      return false;
    }
    return true;
  } else {
    return false;
  }
};

/**
 * EXPERIMENTAL - the API is subject to change.
 * @param objOrArray - an echo object or collection of objects with references to other echo objects.
 * @param valueAccessor - selector for a reference that needs to be loaded.
 *                        if return type is an array the method exits when all entries are non-null.
 *                        otherwise the method exits when valueAccessor is not null.
 * @param timeout - loading timeout, defaults to 5s.
 */
export const loadObjectReferences = async <
  T extends EchoReactiveObject<any>,
  RefType,
  DerefType = RefType extends Array<infer U> ? Array<NonNullable<U>> : NonNullable<RefType>,
>(
  objOrArray: T | T[],
  valueAccessor: (obj: T) => RefType,
  { timeout }: { timeout: number } = { timeout: 5000 },
): Promise<T extends T[] ? Array<DerefType> : DerefType> => {
  const objectArray = Array.isArray(objOrArray) ? objOrArray : [objOrArray];
  const tasks = objectArray.map((obj) => {
    const core = getAutomergeObjectCore(obj);
    const value = valueAccessor(obj);
    if (core.database == null) {
      return value;
    }
    const isLoadedPredicate = Array.isArray(value)
      ? () => (valueAccessor(obj) as any[]).every((v) => v != null)
      : () => valueAccessor(obj) != null;
    if (isLoadedPredicate()) {
      return value;
    }
    return asyncTimeout(
      core.database._updateEvent.waitFor(() => isLoadedPredicate()).then(() => valueAccessor(obj)),
      timeout,
    );
  });
  const result = await Promise.all(tasks);
  return (Array.isArray(objOrArray) ? result : result[0]) as any;
};
