//
// Copyright 2023 DXOS.org
//

import { Event, synchronized } from '@dxos/async';
import { isValidAutomergeUrl, type DocHandle, type DocHandleChangePayload } from '@dxos/automerge/automerge-repo';
import { Context, ContextDisposedError } from '@dxos/context';
import { type Reference } from '@dxos/document-model';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { type AutomergeContext } from './automerge-context';
import {
  AutomergeDocumentLoaderImpl,
  type AutomergeDocumentLoader,
  type DocumentChanges,
  type ObjectDocumentLoaded,
} from './automerge-doc-loader';
import { getAutomergeObjectCore } from './automerge-object';
import { AutomergeObjectCore } from './automerge-object-core';
import { type SpaceDoc } from './types';
import { type EchoDatabase } from '../database';
import { isReactiveProxy } from '../effect/proxy';
import { type Hypergraph } from '../hypergraph';
import { LEGACY_TEXT_TYPE, isAutomergeObject, type EchoObject, type OpaqueEchoObject } from '../object';
import { type Schema } from '../proto';

export type SpaceState = {
  // Url of the root automerge document.
  rootUrl?: string;
};

export class AutomergeDb {
  /**
   * @internal
   */
  readonly _objects = new Map<string, AutomergeObjectCore>();

  readonly _updateEvent = new Event<ItemsUpdatedEvent>();

  private _ctx?: Context = undefined;

  private readonly _automergeDocLoader: AutomergeDocumentLoader;

  /**
   * @deprecated Remove
   */
  _dbApi: EchoDatabase;

  constructor(
    public readonly graph: Hypergraph,
    public readonly automerge: AutomergeContext,
    public readonly spaceKey: PublicKey,
    private readonly _constructObj: () => OpaqueEchoObject,
    dbApi: EchoDatabase, // TODO(dmaretskyi): Remove.
  ) {
    this._automergeDocLoader = new AutomergeDocumentLoaderImpl(this.spaceKey, automerge);
    this._dbApi = dbApi;
  }

  allObjects(): EchoObject[] {
    return Array.from(this._objects.values()).map((core) => core.rootProxy as EchoObject);
  }

  @synchronized
  async open(spaceState: SpaceState) {
    const start = performance.now();
    if (this._ctx) {
      log.info('Already open');
      return;
    }
    this._ctx = new Context();
    this._ctx.onDispose(this._onDispose.bind(this));
    this._automergeDocLoader.onObjectDocumentLoaded.on(this._ctx, this._onObjectDocumentLoaded.bind(this));

    try {
      await this._automergeDocLoader.loadSpaceRootDocHandle(this._ctx, spaceState);
      const spaceRootDocHandle = this._automergeDocLoader.getSpaceRootDocHandle();
      const spaceRootDoc = spaceRootDocHandle.docSync();
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
  }

  // TODO(dmaretskyi): Cant close while opening.
  @synchronized
  async close() {
    if (!this._ctx) {
      return;
    }

    void this._ctx.dispose();
    this._ctx = undefined;
  }

  getObjectById(id: string): EchoObject | undefined {
    const objCore = this._objects.get(id);
    if (!objCore) {
      this._automergeDocLoader.loadObjectDocument(id);
      return undefined;
    }

    if (objCore.isDeleted()) {
      return undefined;
    }

    invariant(objCore instanceof AutomergeObjectCore);
    const root = objCore.rootProxy;
    invariant(isAutomergeObject(root) || isReactiveProxy(root));
    return root as any;
  }

  add(obj: OpaqueEchoObject) {
    const core = getAutomergeObjectCore(obj);

    if (core.database) {
      return; // Already in the database.
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
    return obj;
  }

  remove<T extends EchoObject>(obj: T) {
    invariant(isAutomergeObject(obj));
    const core = getAutomergeObjectCore(obj);

    invariant(this._objects.has(core.id));
    core.setDeleted(true);
  }

  private _emitUpdateEvent(itemsUpdated: string[]) {
    if (itemsUpdated.length === 0) {
      return;
    }
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
  }

  /**
   * @internal
   */
  _resolveSchema(type: Reference): Schema | undefined {
    if (type.protocol === 'protobuf') {
      return this.graph.types.getSchema(type.itemId);
    } else {
      // TODO(dmaretskyi): Cross-space references.
      return this.getObjectById(type.itemId) as Schema | undefined;
    }
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

  private _onDispose() {
    for (const docHandle of Object.values(this.automerge.repo.handles)) {
      docHandle.off('change', this._onDocumentUpdate);
    }
  }

  private _onObjectDocumentLoaded({ handle, objectId }: ObjectDocumentLoaded) {
    handle.on('change', this._onDocumentUpdate);
    this._createObjectInDocument(handle, objectId);
    this._emitUpdateEvent([objectId]);
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

    const obj = this._constructObj();
    const core = getAutomergeObjectCore(obj);
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
}

const getInlineAndLinkChanges = (event: DocHandleChangePayload<SpaceDoc>) => {
  const inlineChangedObjectIds = new Set<string>();
  const linkedDocuments: DocumentChanges['linkedDocuments'] = {};
  for (const { path, value } of event.patches) {
    if (path.length < 2) {
      continue;
    }
    switch (path[0]) {
      case 'objects':
        if (path.length >= 2) {
          inlineChangedObjectIds.add(path[1]);
        }
        break;
      case 'links':
        if (path.length >= 2 && typeof value === 'string' && isValidAutomergeUrl(value)) {
          linkedDocuments[path[1]] = value;
        }
        break;
    }
  }
  return {
    inlineChangedObjects: [...inlineChangedObjectIds],
    linkedDocuments,
  };
};

export interface ItemsUpdatedEvent {
  spaceKey: PublicKey;
  itemsUpdated: Array<{ id: string }>;
}

const shouldObjectGoIntoFragmentedSpace = (core: AutomergeObjectCore) => {
  if (isAutomergeObject(core.rootProxy)) {
    return core.rootProxy.__typename === LEGACY_TEXT_TYPE;
  } else {
    return false;
  }
};
