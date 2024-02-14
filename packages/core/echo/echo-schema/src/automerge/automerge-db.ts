//
// Copyright 2023 DXOS.org
//

import { asyncTimeout, Event, synchronized } from '@dxos/async';
import { type DocHandle, type DocHandleChangePayload, type DocumentId } from '@dxos/automerge/automerge-repo';
import { cancelWithContext, Context, ContextDisposedError } from '@dxos/context';
import { warnAfterTimeout } from '@dxos/debug';
import { type Reference } from '@dxos/document-model';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { type AutomergeContext } from './automerge-context';
import { type AutomergeDocumentLoader, AutomergeDocumentLoaderImpl } from './automerge-doc-loader';
import { AutomergeObject, getAutomergeObjectCore } from './automerge-object';
import { type SpaceDoc } from './types';
import { getGlobalAutomergePreference } from '../automerge-preference';
import { type EchoDatabase } from '../database';
import { type Hypergraph } from '../hypergraph';
import { base, type EchoObject, isActualTextObject, isActualTypedObject, isAutomergeObject } from '../object';
import { type Schema } from '../proto';

export type SpaceState = {
  // Url of the root automerge document.
  rootUrl?: string;
};

export class AutomergeDb {
  private _spaceRootDocHandle!: DocHandle<SpaceDoc>;
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
    this._automergeDocLoader = new AutomergeDocumentLoaderImpl(automerge, this._onObjectDocumentLoaded.bind(this));
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
    this._automergeDocLoader.open();

    if (!spaceState.rootUrl) {
      if (getGlobalAutomergePreference()) {
        log.error('Database opened with no rootUrl');
      }
      await this._fallbackToNewDoc();
    } else {
      try {
        this._spaceRootDocHandle = await this._initDocHandle(spaceState.rootUrl);

        const doc = this._spaceRootDocHandle.docSync();
        invariant(doc);

        if (doc.access == null) {
          this._initDocAccess(this._spaceRootDocHandle);
        }

        const objectIds = Object.keys(doc.objects ?? {});
        this._createInlineObjects(this._spaceRootDocHandle, objectIds);
        this._automergeDocLoader.loadLinkedObjects(doc.links);
      } catch (err) {
        if (err instanceof ContextDisposedError) {
          return;
        }

        log.catch(err);
        if (getGlobalAutomergePreference()) {
          throw err;
        } else {
          await this._fallbackToNewDoc();
        }
      }
    }

    this._spaceRootDocHandle.on('change', this._onDocumentUpdate);

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

    this._automergeDocLoader.close();
    void this._ctx.dispose();
    this._ctx = undefined;
  }

  private async _initDocHandle(url: string) {
    const docHandle = this.automerge.repo.find(url as DocumentId);
    // TODO(mykola): Remove check for global preference or timeout?
    if (getGlobalAutomergePreference()) {
      // Loop on timeout.
      while (true) {
        try {
          await warnAfterTimeout(5_000, 'Automerge root doc load timeout (AutomergeDb)', async () => {
            await cancelWithContext(this._ctx!, docHandle.whenReady(['ready'])); // TODO(dmaretskyi): Temporary 5s timeout for debugging.
          });
          break;
        } catch (err) {
          if (`${err}`.includes('Timeout')) {
            log.info('wraparound', { id: docHandle.documentId, state: docHandle.state });
            continue;
          }

          throw err;
        }
      }
    } else {
      await asyncTimeout(docHandle.whenReady(['ready']), 1_000, 'short doc ready timeout with automerge disabled');
    }

    if (docHandle.state === 'unavailable') {
      throw new Error('Automerge document is unavailable');
    }

    return docHandle;
  }

  private async _fallbackToNewDoc() {
    this._spaceRootDocHandle = this.automerge.repo.create();
    this._ctx!.onDispose(() => {
      this._spaceRootDocHandle.delete();
    });
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

    const spaceDocHandle = this.automerge.repo.create<SpaceDoc>();
    this._initDocAccess(spaceDocHandle);

    spaceDocHandle.on('change', this._onDocumentUpdate);
    this._linkObjectDocument(obj, spaceDocHandle);

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

  private _initDocAccess(handle: DocHandle<SpaceDoc>) {
    handle.change((newDoc: SpaceDoc) => {
      newDoc.access = { spaceKey: this.spaceKey.toHex() };
    });
  }

  private _linkObjectDocument(object: AutomergeObject, handle: DocHandle<SpaceDoc>) {
    this._automergeDocLoader.onObjectCreatedInDocument(handle, object.id);
    this._spaceRootDocHandle.change((newDoc: SpaceDoc) => {
      newDoc.links ??= {};
      newDoc.links[object.id] = handle.url;
    });
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
    this._spaceRootDocHandle?.off('change', this._onDocumentUpdate);
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
