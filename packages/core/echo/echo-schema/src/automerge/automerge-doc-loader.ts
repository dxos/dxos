//
// Copyright 2024 DXOS.org
//

import { asyncTimeout } from '@dxos/async';
import {
  type DocHandle,
  type AutomergeUrl,
  type DocHandleChangePayload,
  type DocumentId,
  isValidAutomergeUrl,
} from '@dxos/automerge/automerge-repo';
import { cancelWithContext, type Context, ContextDisposedError } from '@dxos/context';
import { warnAfterTimeout } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import type { AutomergeContext } from './automerge-context';
import { type SpaceState } from './automerge-db';
import { type SpaceDoc } from './types';
import { getGlobalAutomergePreference } from '../automerge-preference';

type SpaceDocumentLinks = SpaceDoc['links'];

type DocumentLoadingListener = (handle: DocHandle<SpaceDoc>, objectId: string) => void;

export interface AutomergeDocumentLoader {
  loadSpaceRootDocHandle(ctx: Context, spaceState: SpaceState): Promise<void>;
  getSpaceRootDocHandle(): DocHandle<SpaceDoc>;
  createDocumentForObject(objectId: string): DocHandle<SpaceDoc>;
  loadLinkedObjects(links: SpaceDocumentLinks): void;
  onObjectCreatedInDocument(handle: DocHandle<SpaceDoc>, objectId: string): void;
  onObjectRebound(handle: DocHandle<SpaceDoc>, objectId: string): void;
  processDocumentUpdate(event: DocHandleChangePayload<SpaceDoc>): DocumentChanges;
  getDocumentHandles(): Iterable<DocHandle<SpaceDoc>>;

  setDocumentLoadingListener(listener: DocumentLoadingListener | null): void;
}

/**
 * Manages object <-> docHandle binding and automerge document loading.
 */
export class AutomergeDocumentLoaderImpl implements AutomergeDocumentLoader {
  private _spaceRootDocHandle?: DocHandle<SpaceDoc>;
  /**
   * An object id pointer to a handle of the document where the object is stored inline.
   */
  private readonly _objectDocumentHandles = new Map<string, DocHandle<SpaceDoc>>();
  /**
   * _objectDocumentHandles contain both created object ids and those for which we're still loading
   * a document handle.
   */
  private readonly _createdObjectIds = new Set<string>();
  /**
   * If set when document handle loading finishes and the object is still bound to this document.
   */
  private _documentLoadingListener: DocumentLoadingListener | null = null;

  constructor(
    private readonly _spaceKey: PublicKey,
    private readonly _automerge: AutomergeContext,
  ) {}

  public async loadSpaceRootDocHandle(ctx: Context, spaceState: SpaceState): Promise<void> {
    if (this._isDocHandleInitialized(this._spaceRootDocHandle)) {
      return;
    }
    if (!spaceState.rootUrl) {
      if (getGlobalAutomergePreference()) {
        log.error('Database opened with no rootUrl');
      }
      this._spaceRootDocHandle = this._createContextBoundDocument(ctx);
    } else {
      try {
        const existingDocHandle = await this._initDocHandle(ctx, spaceState.rootUrl);
        const doc = existingDocHandle.docSync();
        invariant(doc);
        if (doc.access == null) {
          this._initDocAccess(existingDocHandle);
        }
        this._spaceRootDocHandle = existingDocHandle;
      } catch (err) {
        if (err instanceof ContextDisposedError || getGlobalAutomergePreference()) {
          throw err;
        }
        log.warn('falling back to a temporary document on loading error', { err, space: this._spaceKey });
        this._spaceRootDocHandle = this._createContextBoundDocument(ctx);
      }
    }
  }

  public getSpaceRootDocHandle(): DocHandle<SpaceDoc> {
    invariant(this._isDocHandleInitialized(this._spaceRootDocHandle));
    return this._spaceRootDocHandle;
  }

  public createDocumentForObject(objectId: string): DocHandle<SpaceDoc> {
    invariant(this._spaceRootDocHandle);
    const spaceDocHandle = this._automerge.repo.create<SpaceDoc>();
    this._initDocAccess(spaceDocHandle);
    this._spaceRootDocHandle.change((newDoc: SpaceDoc) => {
      newDoc.links ??= {};
      newDoc.links[objectId] = spaceDocHandle.url;
    });
    return spaceDocHandle;
  }

  public onObjectCreatedInDocument(handle: DocHandle<SpaceDoc>, objectId: string) {
    this._objectDocumentHandles.set(objectId, handle);
    this._createdObjectIds.add(objectId);
  }

  public onObjectRebound(handle: DocHandle<SpaceDoc>, objectId: string) {
    this._objectDocumentHandles.set(objectId, handle);
  }

  setDocumentLoadingListener(listener: DocumentLoadingListener | null) {
    this._documentLoadingListener = listener;
  }

  public getDocumentHandles(): Iterable<DocHandle<SpaceDoc>> {
    return this._spaceRootDocHandle
      ? [this._spaceRootDocHandle, ...this._objectDocumentHandles.values()]
      : this._objectDocumentHandles.values();
  }

  public loadLinkedObjects(links: SpaceDocumentLinks) {
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

  public processDocumentUpdate(event: DocHandleChangePayload<SpaceDoc>) {
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

  private async _initDocHandle(ctx: Context, url: string) {
    const docHandle = this._automerge.repo.find(url as DocumentId);
    // TODO(mykola): Remove check for global preference or timeout?
    if (getGlobalAutomergePreference()) {
      // Loop on timeout.
      while (true) {
        try {
          await warnAfterTimeout(5_000, 'Automerge root doc load timeout (AutomergeDb)', async () => {
            await cancelWithContext(ctx, docHandle.whenReady(['ready'])); // TODO(dmaretskyi): Temporary 5s timeout for debugging.
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

  private _createContextBoundDocument(ctx: Context) {
    const handle = this._automerge.repo.create();
    ctx.onDispose(() => {
      handle.delete();
    });
    return handle;
  }

  private _initDocAccess(handle: DocHandle<SpaceDoc>) {
    handle.change((newDoc: SpaceDoc) => {
      newDoc.access = { spaceKey: this._spaceKey.toHex() };
    });
  }

  private async _createObjectOnDocumentLoad(handle: DocHandle<SpaceDoc>, objectId: string) {
    try {
      await handle.doc(['ready']);
      const logMeta = { objectId, docUrl: handle.url };
      const listener = this._documentLoadingListener;
      if (listener == null) {
        log.warn('document loaded after a listener was removed, ignoring', logMeta);
        return;
      }
      const objectDocHandle = this._objectDocumentHandles.get(objectId);
      if (objectDocHandle?.url !== handle.url) {
        log.warn('object was rebound while a document was loading, discarding handle', logMeta);
        return;
      }
      listener(handle, objectId);
    } catch (err) {
      const shouldRetryLoading = this._documentLoadingListener != null;
      log.warn('failed to load a document', {
        objectId,
        automergeUrl: handle.url,
        retryLoading: shouldRetryLoading,
        err,
      });
      if (shouldRetryLoading) {
        await this._createObjectOnDocumentLoad(handle, objectId);
      }
    }
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

  private _isDocHandleInitialized(docHandle?: DocHandle<SpaceDoc>): docHandle is DocHandle<SpaceDoc> {
    return docHandle != null && !docHandle.isDeleted();
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
