//
// Copyright 2024 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type AutomergeUrl, type DocumentId, interpretAsDocumentId } from '@automerge/automerge-repo';

import { Event, asyncTimeout } from '@dxos/async';
import { type Context, cancelWithContext } from '@dxos/context';
import { warnAfterTimeout } from '@dxos/debug';
import { DatabaseDirectory, SpaceDocVersion, type SpaceState } from '@dxos/echo-protocol';
import { assertState, invariant } from '@dxos/invariant';
import { type EntityId, type PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { trace } from '@dxos/tracing';
import { ComplexSet } from '@dxos/util';

import { type DocHandleProxy, type RepoProxy } from '../automerge';

type SpaceDocumentLinks = DatabaseDirectory['links'];

/** Max wait for a client handle to leave `pending` during a disk-only probe. */
const DISK_PROBE_TIMEOUT = 5_000;

/**
 * Options for {@link AutomergeDocumentLoader.loadObjectDocument}.
 */
export interface LoadObjectDocumentOptions {
  /**
   * If `true`, do not block on the network for the linked document; wait
   * only for the worker-side disk probe to settle. If the doc is on disk,
   * loading proceeds normally and `onObjectDocumentLoaded` fires once the
   * handle is ready. If the doc is not on disk, `onObjectUnavailable`
   * fires immediately and `onObjectDocumentLoaded` is not emitted (until
   * and unless the doc is later delivered from the network and a separate,
   * non-disk-only load is issued).
   *
   * Use this for query-driven dependency loads where waiting on network
   * latency would stall the query pipeline.
   */
  diskOnly?: boolean;
}

export interface AutomergeDocumentLoader {
  onObjectDocumentLoaded: Event<ObjectDocumentLoaded>;
  onObjectUnavailable: Event<ObjectUnavailable>;

  get hasRootHandle(): boolean;

  getAllHandles(): DocHandleProxy<DatabaseDirectory>[];
  /**
   * @returns Handles linked from the space root handle.
   */
  getLinkedDocHandles(): DocHandleProxy<DatabaseDirectory>[];

  objectPresent(id: EntityId): boolean;
  loadSpaceRootDocHandle(ctx: Context, spaceState: SpaceState): Promise<void>;
  loadObjectDocument(objectId: string | string[], opts?: LoadObjectDocumentOptions): void;
  getObjectDocumentId(objectId: string): string | undefined;
  getSpaceRootDocHandle(): DocHandleProxy<DatabaseDirectory>;
  createDocumentForObject(objectId: string): DocHandleProxy<DatabaseDirectory>;
  onObjectLinksUpdated(links: SpaceDocumentLinks): void;
  onObjectBoundToDocument(handle: DocHandleProxy<DatabaseDirectory>, objectId: string): void;

  /**
   * Wait for all pending document creations to complete.
   */
  waitForPendingCreations(): Promise<void>;

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
  private _spaceRootDocHandle: DocHandleProxy<DatabaseDirectory> | null = null;
  /**
   * An object id pointer to a handle of the document where the object is stored inline.
   */
  private readonly _objectDocumentHandles = new Map<string, DocHandleProxy<DatabaseDirectory>>();
  /**
   * If object was requested via loadObjectDocument but root document links weren't updated yet
   * loading will be triggered in onObjectLinksUpdated callback. Value is the load preference
   * (e.g. `diskOnly`) carried over from the originating `loadObjectDocument` call.
   */
  private readonly _objectsPendingDocumentLoad = new Map<string, LoadObjectDocumentOptions>();

  /**
   * Keeps track of objects that are currently being loaded.
   * Prevents multiple concurrent loads of the same document.
   * This can happen on SpaceRootHandle switch because we don't cancel the previous load.
   */
  private readonly _currentlyLoadingObjects = new ComplexSet<{ url: AutomergeUrl; objectId: string }>(
    ({ url, objectId }) => `${url}:${objectId}`,
  );

  /**
   * Tracks pending document creation promises.
   * Used by flush() to wait for all documents to be created.
   */
  private readonly _pendingDocumentCreations = new Map<string, Promise<void>>();

  public readonly onObjectDocumentLoaded = new Event<ObjectDocumentLoaded>();
  /**
   * Emitted when a `diskOnly` load attempt determines that the linked
   * document is not on local storage (handle is now `'requesting'`). The
   * handle may still eventually become `'ready'` if the network delivers,
   * but query-driven callers should treat the object as unavailable for
   * the current attempt and react accordingly (e.g. resolve `loadObjectCoreById`
   * with `undefined`).
   */
  public readonly onObjectUnavailable = new Event<ObjectUnavailable>();

  constructor(
    private readonly _repo: RepoProxy,
    private readonly _spaceId: SpaceId,
    /** Legacy Id */
    private readonly _spaceKey: PublicKey,
  ) {}

  get hasRootHandle(): boolean {
    return this._spaceRootDocHandle != null;
  }

  getAllHandles(): DocHandleProxy<DatabaseDirectory>[] {
    return this._spaceRootDocHandle != null
      ? [this._spaceRootDocHandle, ...new Set(this._objectDocumentHandles.values())]
      : [];
  }

  getLinkedDocHandles(): DocHandleProxy<DatabaseDirectory>[] {
    return [...new Set(this._objectDocumentHandles.values())];
  }

  @trace.span({ showInBrowserTimeline: true, op: 'lifecycle' })
  public async loadSpaceRootDocHandle(ctx: Context, spaceState: SpaceState): Promise<void> {
    if (this._spaceRootDocHandle != null) {
      return;
    }
    if (!spaceState.rootUrl) {
      throw new Error('Database opened with no rootUrl');
    }

    const existingDocHandle = await this._initDocHandle(ctx, spaceState.rootUrl);
    const doc = existingDocHandle.doc();
    invariant(doc);
    invariant(doc.version === SpaceDocVersion.CURRENT);
    if (doc.access == null) {
      this._initDocAccess(existingDocHandle);
    }
    this._spaceRootDocHandle = existingDocHandle;
  }

  objectPresent(id: EntityId): boolean {
    assertState(this._spaceRootDocHandle, 'Database was not initialized with root object.');
    return (
      DatabaseDirectory.getInlineObject(this._spaceRootDocHandle.doc(), id) != null ||
      DatabaseDirectory.getLink(this._spaceRootDocHandle.doc(), id) != null
    );
  }

  public loadObjectDocument(objectIdOrMany: string | string[], opts: LoadObjectDocumentOptions = {}): void {
    const objectIds = Array.isArray(objectIdOrMany) ? objectIdOrMany : [objectIdOrMany];
    let hasUrlsToLoad = false;
    const urlsToLoad: DatabaseDirectory['links'] = {};
    for (const objectId of objectIds) {
      invariant(this._spaceRootDocHandle, 'Database was not initialized with root object.');
      if (this._objectDocumentHandles.has(objectId) || this._objectsPendingDocumentLoad.has(objectId)) {
        continue;
      }
      const documentUrl = this._getLinkedDocumentUrl(objectId);
      if (documentUrl == null) {
        // The id has no entry in the space directory (neither inline nor
        // link) — a dangling reference as far as the current state is
        // concerned. Surface "unavailable" right away so dependents (e.g.
        // query hydration waiting on strong deps) resolve instead of
        // hanging. Keep the pending entry: if a link arrives later via
        // root-doc sync, `onObjectLinksUpdated` loads it and
        // `onObjectDocumentLoaded` clears the unavailable mark.
        this._objectsPendingDocumentLoad.set(objectId, opts);
        const isInline = DatabaseDirectory.getInlineObject(this._spaceRootDocHandle.doc(), objectId) != null;
        if (!isInline && this.onObjectUnavailable.listenerCount() > 0) {
          log('object absent from space directory, marking unavailable', { objectId });
          this.onObjectUnavailable.emit({ objectId });
        } else {
          log('loading delayed until object links are initialized', { objectId });
        }
      } else {
        urlsToLoad[objectId] = documentUrl;
        hasUrlsToLoad = true;
      }
    }
    if (hasUrlsToLoad) {
      this._loadLinkedObjects(urlsToLoad, opts);
    }
  }

  public getObjectDocumentId(objectId: string): string | undefined {
    invariant(this._spaceRootDocHandle, 'Database was not initialized with root object.');
    const spaceRootDoc = this._spaceRootDocHandle.doc();
    invariant(spaceRootDoc);
    if (spaceRootDoc.objects?.[objectId]) {
      return this._spaceRootDocHandle.documentId;
    }
    const documentUrl = this._getLinkedDocumentUrl(objectId);
    return documentUrl && interpretAsDocumentId(documentUrl.toString() as AutomergeUrl);
  }

  public onObjectLinksUpdated(links: SpaceDocumentLinks): void {
    if (!links) {
      return;
    }
    // Load links that were previously requested and are waiting. Group by
    // the load preference (e.g. `diskOnly`) carried over from the original
    // `loadObjectDocument` call so each batch passes through with its own
    // options.
    const linksAwaitingLoad = Object.entries(links).filter(([objectId]) =>
      this._objectsPendingDocumentLoad.has(objectId),
    );
    if (linksAwaitingLoad.length > 0) {
      const groups = new Map<boolean, typeof linksAwaitingLoad>();
      for (const entry of linksAwaitingLoad) {
        const opts = this._objectsPendingDocumentLoad.get(entry[0]) ?? {};
        const key = !!opts.diskOnly;
        const bucket = groups.get(key) ?? [];
        bucket.push(entry);
        groups.set(key, bucket);
      }
      for (const [diskOnly, entries] of groups) {
        this._loadLinkedObjects(Object.fromEntries(entries), { diskOnly });
      }
    }
    linksAwaitingLoad.forEach(([objectId]) => this._objectsPendingDocumentLoad.delete(objectId));

    // Load newly discovered links that we are not already tracking.
    // System-driven background prefetch: always `diskOnly: true` so the
    // disk-probe / `onObjectUnavailable` path can fire. If the doc later
    // arrives over the network, `onObjectDocumentLoaded` is emitted in
    // the normal way and any prior "unavailable" mark is cleared by
    // `CoreDatabase._onObjectDocumentLoaded`.
    const newLinks = Object.entries(links).filter(
      ([objectId]) => !this._objectDocumentHandles.has(objectId) && !this._objectsPendingDocumentLoad.has(objectId),
    );
    if (newLinks.length > 0) {
      this._loadLinkedObjects(Object.fromEntries(newLinks), { diskOnly: true });
    }
  }

  public getSpaceRootDocHandle(): DocHandleProxy<DatabaseDirectory> {
    invariant(this._spaceRootDocHandle, 'Database was not initialized with root object.');
    return this._spaceRootDocHandle;
  }

  public createDocumentForObject(objectId: string): DocHandleProxy<DatabaseDirectory> {
    invariant(this._spaceRootDocHandle, 'Database was not initialized with root object.');
    const spaceDocHandle = this._repo.create<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceKey: this._spaceKey.toHex() },
    });
    const creationPromise = spaceDocHandle
      .whenReady()
      .then(() => {
        if (this._spaceRootDocHandle == null) {
          log.warn('space root document handle is not available, skipping object binding', { objectId });
          return;
        }
        const url = spaceDocHandle.url;
        if (url == null) {
          log.warn('document has no url after whenReady, skipping object binding', { objectId });
          return;
        }
        this._spaceRootDocHandle.change((newDoc: DatabaseDirectory) => {
          newDoc.links ??= {};
          newDoc.links[objectId] = new A.RawString(url);
        });
      })
      .finally(() => {
        this._pendingDocumentCreations.delete(objectId);
      });
    this._pendingDocumentCreations.set(objectId, creationPromise);
    this.onObjectBoundToDocument(spaceDocHandle, objectId);

    return spaceDocHandle;
  }

  public async waitForPendingCreations(): Promise<void> {
    await Promise.all([...this._pendingDocumentCreations.values()]);
  }

  public onObjectBoundToDocument(handle: DocHandleProxy<DatabaseDirectory>, objectId: string): void {
    this._objectDocumentHandles.set(objectId, handle);
  }

  public clearHandleReferences(): string[] {
    const objectsWithHandles = [...this._objectDocumentHandles.keys()];
    this._objectDocumentHandles.clear();
    this._spaceRootDocHandle = null;
    return objectsWithHandles;
  }

  private _getLinkedDocumentUrl(objectId: string): AutomergeUrl | undefined {
    const spaceRootDoc = this._spaceRootDocHandle?.doc();
    invariant(spaceRootDoc);
    return (spaceRootDoc.links ?? {})[objectId]?.toString() as AutomergeUrl;
  }

  private _loadLinkedObjects(links: SpaceDocumentLinks, opts: LoadObjectDocumentOptions = {}): void {
    if (!links) {
      return;
    }
    for (const [objectId, automergeUrlData] of Object.entries(links)) {
      const automergeUrl = automergeUrlData.toString();
      const logMeta = { objectId, automergeUrl };
      const objectDocumentHandle = this._objectDocumentHandles.get(objectId);
      // Skip if object is already bound to a different document.
      if (objectDocumentHandle?.url != null && objectDocumentHandle.url !== automergeUrl) {
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
      const handle = this._repo.find<DatabaseDirectory>(automergeUrl as DocumentId);
      log.debug('document loading triggered', logMeta);
      this._objectDocumentHandles.set(objectId, handle);
      void this._loadHandleForObject(handle, objectId, opts);
    }
  }

  private async _initDocHandle(ctx: Context, url: string): Promise<DocHandleProxy<DatabaseDirectory>> {
    const docHandle = this._repo.find<DatabaseDirectory>(url as DocumentId);
    await warnAfterTimeout(5_000, 'Automerge root doc load timeout (CoreDatabase)', async () => {
      await cancelWithContext(ctx, docHandle.whenReady()); // TODO(dmaretskyi): Temporary 5s timeout for debugging.
    });

    return docHandle;
  }

  private _initDocAccess(handle: DocHandleProxy<DatabaseDirectory>): void {
    handle.change((newDoc: DatabaseDirectory) => {
      newDoc.access ??= { spaceKey: this._spaceKey.toHex() };
      newDoc.access.spaceKey = this._spaceKey.toHex();
    });
  }

  private async _loadHandleForObject(
    handle: DocHandleProxy<DatabaseDirectory>,
    objectId: string,
    opts: LoadObjectDocumentOptions = {},
  ): Promise<void> {
    invariant(handle.url, 'Document URL is not available');
    try {
      if (this._currentlyLoadingObjects.has({ url: handle.url, objectId })) {
        log.verbose('document is already loading', { objectId });
        return;
      }
      this._currentlyLoadingObjects.add({ url: handle.url, objectId });

      // Disk-only path: wait for the worker to settle the disk probe; if
      // the doc is not on disk, surface "unavailable" without ever
      // blocking on the network.
      if (opts.diskOnly) {
        const onDisk = await asyncTimeout(handle.whenSettledOnDisk(), DISK_PROBE_TIMEOUT).catch(() => false);
        if (!onDisk) {
          this._currentlyLoadingObjects.delete({ url: handle.url, objectId });
          log('object document unavailable on disk', { objectId, docUrl: handle.url });
          if (this.onObjectUnavailable.listenerCount() > 0) {
            this.onObjectUnavailable.emit({ handle, objectId });
          }
          // The handle stays attached to the repo: the worker continues
          // to fetch over the network. Background-wait for that so we can
          // surface a normal `onObjectDocumentLoaded` event if/when the
          // bytes do arrive — that path clears `_unavailableObjects` in
          // CoreDatabase and unblocks any subsequent loads.
          handle
            .whenReady()
            .then(() => {
              if (this._objectDocumentHandles.get(objectId) !== handle) {
                return;
              }
              if (this.onObjectDocumentLoaded.listenerCount() === 0) {
                return;
              }
              this.onObjectDocumentLoaded.emit({ handle, objectId });
            })
            .catch((err) => log.verbose('background network wait failed', { objectId, err }));
          return;
        }
        // Doc is on disk and the worker is loading the bytes; fall through
        // to the standard `whenReady` wait, which now resolves quickly.
      }

      await handle.whenReady();
      this._currentlyLoadingObjects.delete({ url: handle.url, objectId });

      const logMeta = { objectId, docUrl: handle.url };
      if (this.onObjectDocumentLoaded.listenerCount() === 0) {
        log('document loaded after all listeners were removed', logMeta);
        return;
      }
      const objectDocHandle = this._objectDocumentHandles.get(objectId);
      if (objectDocHandle?.url != null && objectDocHandle.url !== handle.url) {
        log.warn('object was rebound while a document was loading, discarding handle', logMeta);
        return;
      }
      this.onObjectDocumentLoaded.emit({ handle, objectId });
    } catch (err) {
      this._currentlyLoadingObjects.delete({ url: handle.url, objectId });
      const shouldRetryLoading = this.onObjectDocumentLoaded.listenerCount() > 0;
      log.warn('failed to load a document', {
        objectId,
        automergeUrl: handle.url,
        retryLoading: shouldRetryLoading,
        err,
      });
      if (shouldRetryLoading) {
        await this._loadHandleForObject(handle, objectId, opts);
      }
    }
  }
}

export interface ObjectDocumentLoaded {
  handle: DocHandleProxy<DatabaseDirectory>;
  objectId: string;
}

export interface ObjectUnavailable {
  /** Absent when the object id has no entry in the space directory (dangling reference) — there is no document to attach a handle to. */
  handle?: DocHandleProxy<DatabaseDirectory>;
  objectId: string;
}

export interface DocumentChanges {
  createdObjectIds: string[];
  updatedObjectIds: string[];
  objectsToRebind: string[];
  linkedDocuments: {
    [echoUri: string]: AutomergeUrl;
  };
}
