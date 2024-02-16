//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { type DocHandle, type AutomergeUrl, type DocumentId } from '@dxos/automerge/automerge-repo';
import { cancelWithContext, type Context } from '@dxos/context';
import { warnAfterTimeout } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import type { AutomergeContext } from './automerge-context';
import { type SpaceState } from './automerge-db';
import { type SpaceDoc } from './types';

type SpaceDocumentLinks = SpaceDoc['links'];

export interface AutomergeDocumentLoader {
  onObjectDocumentLoaded: Event<ObjectDocumentLoaded>;

  loadSpaceRootDocHandle(ctx: Context, spaceState: SpaceState): Promise<void>;
  getSpaceRootDocHandle(): DocHandle<SpaceDoc>;
  createDocumentForObject(objectId: string): DocHandle<SpaceDoc>;
  loadLinkedObjects(links: SpaceDocumentLinks): void;
  onObjectCreatedInDocument(handle: DocHandle<SpaceDoc>, objectId: string): void;
  onObjectRebound(handle: DocHandle<SpaceDoc>, objectId: string): void;
}

/**
 * Manages object <-> docHandle binding and automerge document loading.
 */
export class AutomergeDocumentLoaderImpl implements AutomergeDocumentLoader {
  private _spaceRootDocHandle: DocHandle<SpaceDoc> | null = null;
  /**
   * An object id pointer to a handle of the document where the object is stored inline.
   */
  private readonly _objectDocumentHandles = new Map<string, DocHandle<SpaceDoc>>();

  public readonly onObjectDocumentLoaded = new Event<ObjectDocumentLoaded>();

  constructor(
    private readonly _spaceKey: PublicKey,
    private readonly _automerge: AutomergeContext,
  ) {}

  public async loadSpaceRootDocHandle(ctx: Context, spaceState: SpaceState): Promise<void> {
    if (this._spaceRootDocHandle != null) {
      return;
    }
    if (!spaceState.rootUrl) {
      log.error('Database opened with no rootUrl', { spaceKey: this._spaceKey });
      this._createContextBoundSpaceRootDocument(ctx);
    } else {
      const existingDocHandle = await this._initDocHandle(ctx, spaceState.rootUrl);
      const doc = existingDocHandle.docSync();
      invariant(doc);
      if (doc.access == null) {
        this._initDocAccess(existingDocHandle);
      }
      this._spaceRootDocHandle = existingDocHandle;
    }
  }

  public getSpaceRootDocHandle(): DocHandle<SpaceDoc> {
    invariant(this._spaceRootDocHandle);
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
  }

  public onObjectRebound(handle: DocHandle<SpaceDoc>, objectId: string) {
    this._objectDocumentHandles.set(objectId, handle);
  }

  public getDocumentHandles(): Iterable<DocHandle<SpaceDoc>> {
    invariant(this._spaceRootDocHandle);
    return [this._spaceRootDocHandle, ...this._objectDocumentHandles.values()];
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

  private async _initDocHandle(ctx: Context, url: string) {
    const docHandle = this._automerge.repo.find(url as DocumentId);
    // TODO(mykola): Remove check for global preference or timeout?
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

    if (docHandle.state === 'unavailable') {
      throw new Error('Automerge document is unavailable');
    }

    return docHandle;
  }

  private _createContextBoundSpaceRootDocument(ctx: Context) {
    const docHandle = this._automerge.repo.create<SpaceDoc>();
    this._spaceRootDocHandle = docHandle;
    ctx.onDispose(() => {
      docHandle.delete();
      this._spaceRootDocHandle = null;
    });
  }

  private _initDocAccess(handle: DocHandle<SpaceDoc>) {
    handle.change((newDoc: SpaceDoc) => {
      newDoc.access ??= { spaceKey: this._spaceKey.toHex() };
      newDoc.access.spaceKey = this._spaceKey.toHex();
    });
  }

  private async _createObjectOnDocumentLoad(handle: DocHandle<SpaceDoc>, objectId: string) {
    try {
      await handle.doc(['ready']);
      const logMeta = { objectId, docUrl: handle.url };
      if (this.onObjectDocumentLoaded.listenerCount() === 0) {
        log.info('document loaded after all listeners were removed', logMeta);
        return;
      }
      const objectDocHandle = this._objectDocumentHandles.get(objectId);
      if (objectDocHandle?.url !== handle.url) {
        log.warn('object was rebound while a document was loading, discarding handle', logMeta);
        return;
      }
      this.onObjectDocumentLoaded.emit({ handle, objectId });
    } catch (err) {
      const shouldRetryLoading = this.onObjectDocumentLoaded.listenerCount() > 0;
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
}

export interface ObjectDocumentLoaded {
  handle: DocHandle<SpaceDoc>;
  objectId: string;
}

export interface DocumentChanges {
  createdObjectIds: string[];
  updatedObjectIds: string[];
  objectsToRebind: string[];
  linkedDocuments: {
    [echoId: string]: AutomergeUrl;
  };
}
