//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { type DocHandle, type AutomergeUrl, type DocumentId, type Repo } from '@dxos/automerge/automerge-repo';
import { cancelWithContext, type Context } from '@dxos/context';
import { warnAfterTimeout } from '@dxos/debug';
import { type SpaceState, type SpaceDoc, SpaceDocVersion } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { type PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { trace } from '@dxos/tracing';

type SpaceDocumentLinks = SpaceDoc['links'];

export interface AutomergeDocumentLoader {
  onObjectDocumentLoaded: Event<ObjectDocumentLoaded>;

  getAllHandles(): DocHandle<SpaceDoc>[];

  loadSpaceRootDocHandle(ctx: Context, spaceState: SpaceState): Promise<void>;
  loadObjectDocument(objectId: string | string[]): void;
  getSpaceRootDocHandle(): DocHandle<SpaceDoc>;
  createDocumentForObject(objectId: string): DocHandle<SpaceDoc>;
  onObjectLinksUpdated(links: SpaceDocumentLinks): void;
  onObjectBoundToDocument(handle: DocHandle<SpaceDoc>, objectId: string): void;

  /**
   * @returns objectIds for which we had document handles or were loading one.
   */
  clearHandleReferences(): string[];
}

/**
 * Manages object <-> docHandle binding and automerge document loading.
 */
@trace.resource()
export class AutomergeDocumentLoaderImpl implements AutomergeDocumentLoader {
  private _spaceRootDocHandle: DocHandle<SpaceDoc> | null = null;
  /**
   * An object id pointer to a handle of the document where the object is stored inline.
   */
  private readonly _objectDocumentHandles = new Map<string, DocHandle<SpaceDoc>>();
  /**
   * If object was requested via loadObjectDocument but root document links weren't updated yet
   * loading will be triggered in onObjectLinksUpdated callback.
   */
  private readonly _objectsPendingDocumentLoad = new Set<string>();

  public readonly onObjectDocumentLoaded = new Event<ObjectDocumentLoaded>();

  constructor(
    private readonly _spaceId: SpaceId,
    private readonly _repo: Repo,
    /** Legacy Id */
    private readonly _spaceKey: PublicKey,
  ) {}

  getAllHandles(): DocHandle<SpaceDoc>[] {
    return this._spaceRootDocHandle != null
      ? [this._spaceRootDocHandle, ...new Set(this._objectDocumentHandles.values())]
      : [];
  }

  @trace.span({ showInBrowserTimeline: true })
  public async loadSpaceRootDocHandle(ctx: Context, spaceState: SpaceState): Promise<void> {
    if (this._spaceRootDocHandle != null) {
      return;
    }
    if (!spaceState.rootUrl) {
      log.error('Database opened with no rootUrl', { spaceId: this._spaceId });
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

  public loadObjectDocument(objectIdOrMany: string | string[]) {
    const objectIds = Array.isArray(objectIdOrMany) ? objectIdOrMany : [objectIdOrMany];
    let hasUrlsToLoad = false;
    const urlsToLoad: SpaceDoc['links'] = {};
    for (const objectId of objectIds) {
      invariant(this._spaceRootDocHandle);
      if (this._objectDocumentHandles.has(objectId) || this._objectsPendingDocumentLoad.has(objectId)) {
        continue;
      }
      const spaceRootDoc = this._spaceRootDocHandle.docSync();
      invariant(spaceRootDoc);
      const documentUrl = (spaceRootDoc.links ?? {})[objectId];
      if (documentUrl == null) {
        this._objectsPendingDocumentLoad.add(objectId);
        log.info('loading delayed until object links are initialized', { objectId });
      } else {
        urlsToLoad[objectId] = documentUrl;
        hasUrlsToLoad = true;
      }
    }
    if (hasUrlsToLoad) {
      this._loadLinkedObjects(urlsToLoad);
    }
  }

  public onObjectLinksUpdated(links: SpaceDocumentLinks) {
    if (!links) {
      return;
    }
    const linksAwaitingLoad = Object.entries(links).filter(([objectId]) =>
      this._objectsPendingDocumentLoad.has(objectId),
    );
    this._loadLinkedObjects(Object.fromEntries(linksAwaitingLoad));
    linksAwaitingLoad.forEach(([objectId]) => this._objectsPendingDocumentLoad.delete(objectId));
  }

  public getSpaceRootDocHandle(): DocHandle<SpaceDoc> {
    invariant(this._spaceRootDocHandle);
    return this._spaceRootDocHandle;
  }

  public createDocumentForObject(objectId: string): DocHandle<SpaceDoc> {
    invariant(this._spaceRootDocHandle);
    const spaceDocHandle = this._repo.create<SpaceDoc>({
      version: SpaceDocVersion.CURRENT,
    });
    this._initDocAccess(spaceDocHandle);
    this.onObjectBoundToDocument(spaceDocHandle, objectId);
    this._spaceRootDocHandle.change((newDoc: SpaceDoc) => {
      newDoc.links ??= {};
      newDoc.links[objectId] = spaceDocHandle.url;
    });
    return spaceDocHandle;
  }

  public onObjectBoundToDocument(handle: DocHandle<SpaceDoc>, objectId: string) {
    this._objectDocumentHandles.set(objectId, handle);
  }

  public clearHandleReferences(): string[] {
    const objectsWithHandles = [...this._objectDocumentHandles.keys()];
    this._objectDocumentHandles.clear();
    this._spaceRootDocHandle = null;
    return objectsWithHandles;
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
      const handle = this._repo.find<SpaceDoc>(automergeUrl as DocumentId);
      log.debug('document loading triggered', logMeta);
      this._objectDocumentHandles.set(objectId, handle);
      void this._createObjectOnDocumentLoad(handle, objectId);
    }
  }

  private async _initDocHandle(ctx: Context, url: string) {
    const docHandle = this._repo.find<SpaceDoc>(url as DocumentId);
    while (true) {
      try {
        await warnAfterTimeout(5_000, 'Automerge root doc load timeout (CoreDatabase)', async () => {
          await cancelWithContext(ctx, docHandle.whenReady()); // TODO(dmaretskyi): Temporary 5s timeout for debugging.
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
    const docHandle = this._repo.create<SpaceDoc>();
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
