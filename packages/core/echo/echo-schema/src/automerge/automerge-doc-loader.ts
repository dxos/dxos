//
// Copyright 2024 DXOS.org
//

import {
  type DocHandle,
  type AutomergeUrl,
  type DocHandleChangePayload,
  type DocumentId,
  isValidAutomergeUrl,
} from '@dxos/automerge/automerge-repo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import type { AutomergeContext } from './automerge-context';
import { type SpaceDoc } from './types';

type SpaceDocumentLinks = SpaceDoc['links'];

export interface AutomergeDocumentLoader {
  loadLinkedObjects(links: SpaceDocumentLinks): void;
  onObjectCreatedInDocument(handle: DocHandle<SpaceDoc>, objectId: string): void;
  onObjectRebound(handle: DocHandle<SpaceDoc>, objectId: string): void;
  processDocumentUpdate(event: DocHandleChangePayload<SpaceDoc>): DocumentChanges;
  getDocumentHandles(): Iterable<DocHandle<SpaceDoc>>;

  open(): void;
  close(): void;
}

/**
 * Manages object <-> docHandle binding and automerge document loading.
 */
export class AutomergeDocumentLoaderImpl implements AutomergeDocumentLoader {
  /**
   * An object id pointer to a handle of the document where the object is stored inline.
   */
  private readonly _objectDocumentHandles = new Map<string, DocHandle<SpaceDoc>>();
  /**
   * _objectDocumentHandles contain both created object ids and those for which we're still loading
   * a document handle.
   */
  private readonly _createdObjectIds = new Set<string>();

  private _isOpen = false;

  constructor(
    private readonly _automerge: AutomergeContext,
    private readonly _onObjectDocumentLoaded: (handle: DocHandle<SpaceDoc>, objectId: string) => void,
  ) {}

  public onObjectCreatedInDocument(handle: DocHandle<SpaceDoc>, objectId: string) {
    this._objectDocumentHandles.set(objectId, handle);
    this._createdObjectIds.add(objectId);
  }

  public onObjectRebound(handle: DocHandle<SpaceDoc>, objectId: string) {
    this._objectDocumentHandles.set(objectId, handle);
  }

  public open() {
    invariant(!this._isOpen);
    this._isOpen = true;
  }

  public close() {
    invariant(this._isOpen);
    this._isOpen = false;
  }

  public getDocumentHandles(): Iterable<DocHandle<SpaceDoc>> {
    return this._objectDocumentHandles.values();
  }

  public loadLinkedObjects(links: SpaceDocumentLinks) {
    return this._loadLinkedObjects(links);
  }

  public processDocumentUpdate(event: DocHandleChangePayload<SpaceDoc>) {
    return this._processDocumentChanges(event);
  }

  private _loadLinkedObjects(links: SpaceDocumentLinks) {
    if (!links) {
      return;
    }
    for (const [objectId, automergeUrl] of Object.entries(links)) {
      const logMeta = { objectId, automergeUrl };
      const objectDocumentHandle = this._objectDocumentHandles.get(objectId);
      if (objectDocumentHandle != null && objectDocumentHandle.url !== automergeUrl) {
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
      const handle = this._automerge.repo.find<SpaceDoc>(automergeUrl as DocumentId);
      log.debug('document loading triggered', logMeta);
      this._objectDocumentHandles.set(objectId, handle);
      void this._createObjectOnDocumentLoad(handle, objectId);
    }
  }

  private async _createObjectOnDocumentLoad(handle: DocHandle<SpaceDoc>, objectId: string) {
    try {
      await handle.doc(['ready']);
      const logMeta = { objectId, docUrl: handle.url };
      if (!this._isOpen) {
        log.warn('document loaded after loader was closed, ignoring', logMeta);
        return;
      }
      const objectDocHandle = this._objectDocumentHandles.get(objectId);
      if (objectDocHandle?.url !== handle.url) {
        log.warn('object was rebound while a document was loading, discarding handle', logMeta);
        return;
      }
      this._onObjectDocumentLoaded(handle, objectId);
    } catch (err) {
      log.warn('failed to load a document', {
        objectId,
        automergeUrl: handle.url,
        retryLoading: this._isOpen,
        err,
      });
      if (this._isOpen) {
        await this._createObjectOnDocumentLoad(handle, objectId);
      }
    }
  }

  private _processDocumentChanges(event: DocHandleChangePayload<SpaceDoc>): DocumentChanges {
    const { inlineChangedObjects, linkedDocuments } = this._getInlineAndLinkChanges(event);
    const createdObjectIds: string[] = [];
    const objectsToRebind: string[] = [];
    for (const updatedObject of inlineChangedObjects) {
      const docHandle = this._objectDocumentHandles.get(updatedObject);
      if (!this._createdObjectIds.has(updatedObject)) {
        createdObjectIds.push(updatedObject);
      } else if (docHandle?.url !== event.handle.url) {
        log.warn('object bound to incorrect document, going to rebind', {
          updatedObject,
          documentUrl: docHandle?.url,
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

  private _getInlineAndLinkChanges(event: DocHandleChangePayload<SpaceDoc>) {
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
  }
}

export interface DocumentChanges {
  createdObjectIds: string[];
  updatedObjectIds: string[];
  objectsToRebind: string[];
  linkedDocuments: {
    [echoId: string]: AutomergeUrl;
  };
}
