//
// Copyright 2023 DXOS.org
//

import { asyncTimeout, Event, synchronized } from '@dxos/async';
import {
  isValidAutomergeUrl,
  type DocHandle,
  type DocHandleChangePayload,
  type DocumentId,
} from '@dxos/automerge/automerge-repo';
import { cancelWithContext, Context, ContextDisposedError } from '@dxos/context';
import { warnAfterTimeout } from '@dxos/debug';
import { type Reference } from '@dxos/document-model';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { type AutomergeContext } from './automerge-context';
import { AutomergeObject } from './automerge-object';
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
  private spaceRootDocHandle!: DocHandle<SpaceDoc>;
  private objectDocumentHandles = new Map<string, DocHandle<SpaceDoc>>();

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

  constructor(
    public readonly graph: Hypergraph,
    public readonly automerge: AutomergeContext,
    echoDatabase: EchoDatabase,
  ) {
    this._echoDatabase = echoDatabase;
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

    if (!spaceState.rootUrl) {
      if (getGlobalAutomergePreference()) {
        log.error('Database opened with no rootUrl');
      }
      await this._fallbackToNewDoc();
    } else {
      try {
        this.spaceRootDocHandle = await this._initDocHandle(spaceState.rootUrl);

        const doc = this.spaceRootDocHandle.docSync();
        invariant(doc);

        if (doc.access == null) {
          this._initDocAccess(this.spaceRootDocHandle);
        }

        const objectIds = Object.keys(doc.objects ?? {});
        this._createInlineObjects(this.spaceRootDocHandle, objectIds);
        this._loadLinkedObjects(doc.links);
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

    this.spaceRootDocHandle.on('change', this._onDocumentUpdate.bind(this));

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
    this.spaceRootDocHandle = this.automerge.repo.create();
    this._ctx!.onDispose(() => {
      this.spaceRootDocHandle.delete();
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
    this._linkObjectDocument(obj, spaceDocHandle);
    spaceDocHandle.on('change', this._onDocumentUpdate.bind(this));

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
    this.objectDocumentHandles.set(object.id, handle);
    this.spaceRootDocHandle.change((newDoc: SpaceDoc) => {
      if (newDoc.links) {
        newDoc.links[object.id] = handle.url;
      } else {
        newDoc.links = { [object.id]: handle.url };
      }
    });
  }

  private _loadLinkedObjects(links: SpaceDoc['links']) {
    if (!links) {
      return;
    }
    for (const [objectId, automergeUrl] of Object.entries(links)) {
      if (this.objectDocumentHandles.has(objectId)) {
        return;
      }
      const handle = this.automerge.repo.find<SpaceDoc>(automergeUrl as DocumentId);
      log.debug('document loading triggered', { objectId, automergeUrl });
      this.objectDocumentHandles.set(objectId, handle);
      this._createObjectOnDocumentLoad(objectId, handle);
      handle.on('change', this._onDocumentUpdate.bind(this));
    }
  }

  private _onDocumentUpdate(event: DocHandleChangePayload<SpaceDoc>) {
    const { updatedObjects, linkedDocuments } = processDocumentUpdate(event);
    this._loadLinkedObjects(linkedDocuments);
    this._createInlineObjects(
      event.handle,
      updatedObjects.filter((id) => !this._objects.has(id)),
    );
    this._emitUpdateEvent(updatedObjects);
  }

  private _onDispose() {
    this.spaceRootDocHandle?.off('change');
    for (const docHandle of Object.values(this.objectDocumentHandles)) {
      docHandle.off('change');
    }
  }

  /**
   * Loads all objects on open and handles objects that are being created not by this client.
   */
  private _createInlineObjects(docHandle: DocHandle<SpaceDoc>, objectIds: string[]) {
    for (const id of objectIds) {
      invariant(!this._objects.has(id));
      this._createObjectInDocument(id, docHandle);
    }
  }

  private _createObjectOnDocumentLoad(objectId: string, handle: DocHandle<SpaceDoc>) {
    handle
      .doc(['ready'])
      .then(() => {
        if (this._ctx?.disposed ?? true) {
          log.warn('document loaded after database was closed');
          return;
        }
        this._createObjectInDocument(objectId, handle);
        this._emitUpdateEvent([objectId]);
      })
      .catch((err) => {
        log.warn('failed to load a document', {
          objectId,
          automergeUrl: handle.url,
          contextDisposed: this._ctx?.disposed ?? true,
          err,
        });
        if (!this._ctx?.disposed) {
          this._createObjectOnDocumentLoad(objectId, handle);
        }
      });
  }

  private _createObjectInDocument(objectId: string, docHandle: DocHandle<SpaceDoc>) {
    const obj = new AutomergeObject();
    obj[base]._core.id = objectId;
    this._objects.set(obj.id, obj);
    (obj[base] as AutomergeObject)._bind({
      db: this,
      docHandle,
      path: ['objects', obj.id],
      assignFromLocalState: false,
    });
  }
}

const processDocumentUpdate = (event: DocHandleChangePayload<SpaceDoc>) => {
  const updatedObjectIds = new Set<string>();
  const linkedDocuments: SpaceDoc['links'] = {};
  for (const { path, value } of event.patches) {
    if (path.length < 2) {
      continue;
    }
    switch (path[0]) {
      case 'objects':
        if (path.length >= 2) {
          updatedObjectIds.add(path[1]);
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
    updatedObjects: [...updatedObjectIds],
    linkedDocuments,
  };
};
