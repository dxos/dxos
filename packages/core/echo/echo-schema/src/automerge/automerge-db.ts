//
// Copyright 2023 DXOS.org
//

import { Event, synchronized } from '@dxos/async';
import { type DocHandle, type DocHandleChangePayload } from '@dxos/automerge/automerge-repo';
import { Context, ContextDisposedError } from '@dxos/context';
import { type Reference } from '@dxos/document-model';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { type AutomergeContext } from './automerge-context';
import { type AutomergeDocumentLoader, AutomergeDocumentLoaderImpl } from './automerge-doc-loader';
import { AutomergeObject, getAutomergeObjectCore } from './automerge-object';
import { type SpaceDoc } from './types';
import { type EchoDatabase } from '../database';
import { type Hypergraph } from '../hypergraph';
import { base, type EchoObject, isActualTextObject, isActualTypedObject, isAutomergeObject } from '../object';
import { type Schema } from '../proto';

export type SpaceState = {
  // Url of the root automerge document.
  rootUrl?: string;
};

export class AutomergeDb {
  /**
   * @internal
   */
  readonly _objects = new Map<string, EchoObject>();
  readonly _objectsSystem = new Map<string, EchoObject>();

  readonly _updateEvent = new Event<{ spaceKey: PublicKey; itemsUpdated: { id: string }[] }>();

  private _ctx?: Context = undefined;

  /**
   * @internal
   */
  readonly _echoDatabase: EchoDatabase;
  private readonly _automergeDocLoader: AutomergeDocumentLoader;

  constructor(
    public readonly graph: Hypergraph,
    public readonly automerge: AutomergeContext,
    echoDatabase: EchoDatabase,
  ) {
    this._echoDatabase = echoDatabase;
    this._automergeDocLoader = new AutomergeDocumentLoaderImpl(this.spaceKey, automerge);
  }

  get spaceKey() {
    return this._echoDatabase._backend.spaceKey;
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
    this._automergeDocLoader.setDocumentLoadingListener(this._onObjectDocumentLoaded.bind(this));

    try {
      const spaceRootDocHandle = await this._automergeDocLoader.loadSpaceRootDocHandle(this._ctx, spaceState);
      const spaceRootDoc = spaceRootDocHandle.docSync();
      invariant(spaceRootDoc);
      const objectIds = Object.keys(spaceRootDoc.objects ?? {});
      this._createInlineObjects(spaceRootDocHandle, objectIds);
      this._automergeDocLoader.loadLinkedObjects(spaceRootDoc.links);
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

    this._automergeDocLoader.setDocumentLoadingListener(null);
    void this._ctx.dispose();
    this._ctx = undefined;
  }

  getObjectById(id: string): EchoObject | undefined {
    const obj = this._objects.get(id) ?? this._echoDatabase._objects.get(id);
    if (!obj) {
      return undefined;
    }

    if ((obj as any).__deleted === true) {
      return undefined;
    }

    return obj;
  }

  add<T extends EchoObject>(obj: T): T {
    if (isActualTypedObject(obj) || isActualTextObject(obj)) {
      return this._echoDatabase.add(obj);
    }

    if (obj[base]._database) {
      return obj;
    }

    invariant(isAutomergeObject(obj));
    invariant(!this._objects.has(obj.id));
    this._objects.set(obj.id, obj);

    const spaceDocHandle = this._automergeDocLoader.createDocumentForObject(obj.id);
    spaceDocHandle.on('change', this._onDocumentUpdate);

    (obj[base] as AutomergeObject)._bind({
      db: this,
      docHandle: spaceDocHandle,
      path: ['objects', obj.id],
      assignFromLocalState: true,
    });

    return obj;
  }

  remove<T extends EchoObject>(obj: T) {
    invariant(isAutomergeObject(obj));
    invariant(this._objects.has(obj.id));
    (obj[base] as AutomergeObject).__system!.deleted = true;
  }

  private _emitUpdateEvent(itemsUpdated: string[]) {
    if (itemsUpdated.length === 0) {
      return;
    }
    this._updateEvent.emit({
      spaceKey: this.spaceKey,
      itemsUpdated: itemsUpdated.map((id) => ({ id })),
    });
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
    const documentChanges = this._automergeDocLoader.processDocumentUpdate(event);
    this._rebindObjects(event.handle, documentChanges.objectsToRebind);
    this._automergeDocLoader.loadLinkedObjects(documentChanges.linkedDocuments);
    this._createInlineObjects(event.handle, documentChanges.createdObjectIds);
    this._emitUpdateEvent(documentChanges.updatedObjectIds);
  };

  private _onDispose() {
    for (const docHandle of this._automergeDocLoader.getDocumentHandles()) {
      docHandle.off('change', this._onDocumentUpdate);
    }
  }

  private _onObjectDocumentLoaded(handle: DocHandle<SpaceDoc>, objectId: string) {
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
    const obj = new AutomergeObject();
    obj[base]._core.id = objectId;
    this._objects.set(obj.id, obj);
    this._automergeDocLoader.onObjectCreatedInDocument(docHandle, objectId);
    (obj[base] as AutomergeObject)._bind({
      db: this,
      docHandle,
      path: ['objects', obj.id],
      assignFromLocalState: false,
    });
  }

  private _rebindObjects(docHandle: DocHandle<SpaceDoc>, objectIds: string[]) {
    for (const objectId of objectIds) {
      const object = this._objects.get(objectId);
      invariant(object);
      const automergeObjectCore = getAutomergeObjectCore(object);
      automergeObjectCore.bind({
        db: this,
        docHandle,
        path: automergeObjectCore.mountPath,
        assignFromLocalState: false,
      });
      this._automergeDocLoader.onObjectRebound(docHandle, objectId);
    }
  }
}
