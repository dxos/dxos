//
// Copyright 2024 DXOS.org
//

import { next as A, type Heads } from '@automerge/automerge';
import { type DocumentId, isValidDocumentId } from '@automerge/automerge-repo';

import { UpdateScheduler, asyncTimeout } from '@dxos/async';
import { Context, LifecycleState, Resource } from '@dxos/context';
import { type DatabaseDirectory } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { EID, type SpaceId, type URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { type DataService } from '@dxos/protocols/rpc';

import { type AutomergeHost, type DocumentLease } from '../automerge/index.ts';
import { type DocumentSidecar, collectDocumentReferences } from './document-sidecar.ts';

const MAX_UPDATE_FREQ = 10; // [updates/sec]

/**
 * Ceilings on one batch. A first sync can make thousands of documents pending inside one tick, and
 * the client decodes and integrates a batch as one message, so the remainder waits for the next tick.
 * The byte ceiling is soft: a batch closes after the document that crosses it.
 */
const MAX_BATCH_BYTES = 1024 * 1024;
const MAX_BATCH_DOCUMENTS = 500;

/**
 * Bound on loading a document to read or write it. A document a client subscribes to is on disk or
 * was just created, so a load that takes longer than this is a document that is gone.
 */
const RELOAD_TIMEOUT = 10_000;

export type DocumentsSynchronizerProps = {
  automergeHost: AutomergeHost;
  /** Space the subscription serves; space-less references in its documents resolve against it. */
  spaceId?: SpaceId;
  /** Source of the device annotations and reference hints sent with each document; none are sent without one. */
  sidecar?: DocumentSidecar;
  sendUpdates: (updates: DataService.BatchedDocumentUpdates) => void;
  /** Override of {@link MAX_BATCH_BYTES}. */
  maxBatchBytes?: number;
  /** Override of {@link MAX_BATCH_DOCUMENTS}. */
  maxBatchDocuments?: number;
};

interface DocSyncState {
  /** Heads the client holds as of the last send; unset until the initial send. */
  lastSentHead?: Heads;
  /**
   * Held only until the document is loaded for its initial send. Nothing pins the document after
   * that: the host's residency policy decides, and each send re-leases it for the duration of a read.
   */
  initialLease?: DocumentLease<DatabaseDirectory>;
  /** Reference targets the document held as of the last send, for re-sending their hints. */
  references?: ReadonlySet<URI.URI>;
  /** Entity ids of {@link references}, to match an index pass against without re-parsing them. */
  referencedIds?: ReadonlySet<string>;
}

/**
 * Manages a connection and replication between worker's Automerge Repo and the client's Repo.
 */
export class DocumentsSynchronizer extends Resource {
  private readonly _syncStates = new Map<DocumentId, DocSyncState>();
  /**
   * Documents that have pending updates.
   * Used to batch updates.
   */
  private readonly _pendingUpdates = new Set<DocumentId>();

  /**
   * Documents whose on-disk probe completed negative and that need a
   * mutation-less `requesting: true` transition update sent to the client.
   * Cleared per-flush in `_checkAndSendUpdates`.
   */
  private readonly _pendingRequesting = new Set<DocumentId>();

  /** Documents whose device annotations changed since their last send. */
  private readonly _pendingDeviceAnnotations = new Set<DocumentId>();

  /** Documents whose reference targets may have changed availability since their last send. */
  private readonly _pendingRefHints = new Set<DocumentId>();

  /**
   * Job that schedules if there are pending updates.
   */
  private _sendUpdatesJob?: UpdateScheduler = undefined;

  /**
   * Test affordance: when true, `_checkAndSendUpdates` is a no-op so no
   * document state is flushed to the client. `addDocuments` still loads
   * documents on the worker side and accumulates `_pendingUpdates`, which
   * flush automatically on resume. From the client's perspective every
   * `RepoProxy.find()` made while paused returns a handle that stays
   * `pending` until resume — used to deterministically reproduce
   * worker-side hangs in query-pipeline tests.
   */
  #sendUpdatesPaused = false;

  constructor(private readonly _params: DocumentsSynchronizerProps) {
    super();
  }

  /**
   * Test affordance: pause/resume flushing of document updates to the client.
   * See `#sendUpdatesPaused` for details. Idempotent.
   */
  setSendUpdatesPaused(paused: boolean): void {
    if (this.#sendUpdatesPaused === paused) {
      return;
    }
    this.#sendUpdatesPaused = paused;
    if (!paused) {
      this._sendUpdatesJob?.trigger();
    }
  }

  async addDocuments(documentIds: DocumentId[]): Promise<void> {
    for (const documentId of documentIds) {
      if (this._syncStates.has(documentId) || this._lifecycleState === LifecycleState.CLOSED) {
        continue;
      }
      log('loading document', { documentId });
      const lease = this._params.automergeHost.acquireDoc<DatabaseDirectory>(documentId);
      const syncState: DocSyncState = { initialLease: lease };
      this._syncStates.set(documentId, syncState);
      // Background disk probe so the client can distinguish
      // "not on disk, waiting for network" from "still loading".
      // Fire-and-forget; the result feeds `_pendingRequesting`.
      this._scheduleDiskProbe(documentId);
      void this._sendWhenLoaded(documentId, syncState);
    }
  }

  /** Queues the initial send once the document is loaded, then lets go of it. */
  private async _sendWhenLoaded(documentId: DocumentId, syncState: DocSyncState): Promise<void> {
    const lease = syncState.initialLease;
    invariant(lease);
    try {
      if (!lease.loaded) {
        await lease.waitUntilReady();
      }
    } catch (err) {
      log.warn('failed to load document', { documentId, err });
    } finally {
      // Unsubscribed while loading: the state is gone and `removeDocuments` released the lease.
      if (this._syncStates.get(documentId) === syncState && syncState.initialLease === lease) {
        syncState.initialLease = undefined;
        lease[Symbol.dispose]();
        // Queued whether or not the load succeeded: a failed one is retried by the send loop, which
        // gives up on a document this host does not store rather than retrying it forever.
        this._pendingUpdates.add(documentId);
        this._sendUpdatesJob?.trigger();
      }
    }
  }

  /**
   * Probe local storage for the document; if not present, enqueue a
   * `requesting: true` transition update so the client moves the handle
   * from `'pending'` to `'requesting'` and disk-only callers can give up
   * without waiting on the network. If the doc became `ready` before the
   * probe completes (e.g. delivered concurrently by network/peer), no
   * transition update is sent.
   */
  private _scheduleDiskProbe(documentId: DocumentId): void {
    void Promise.resolve().then(async () => {
      try {
        const onDisk = await this._params.automergeHost.hasDocOnDisk(documentId);
        if (onDisk) {
          // Doc is on disk; the initial send follows once the load completes.
          return;
        }
        // Skip the transition signal if the doc has since become `ready`
        // via the network/peer race.
        const syncState = this._syncStates.get(documentId);
        if (!syncState || !syncState.initialLease || syncState.initialLease.loaded) {
          return;
        }
        this._pendingRequesting.add(documentId);
        this._sendUpdatesJob?.trigger();
      } catch (err) {
        log.warn('disk probe failed', { documentId, err });
      }
    });
  }

  /** Drops the documents the client no longer subscribes to. */
  removeDocuments(documentIds: DocumentId[]): void {
    for (const documentId of documentIds) {
      const syncState = this._syncStates.get(documentId);
      syncState?.initialLease?.[Symbol.dispose]();
      this._syncStates.delete(documentId);
      this._pendingUpdates.delete(documentId);
      this._pendingRequesting.delete(documentId);
      this._pendingDeviceAnnotations.delete(documentId);
      this._pendingRefHints.delete(documentId);
    }
  }

  protected override async _open(): Promise<void> {
    this._sendUpdatesJob = new UpdateScheduler(this._ctx, this._checkAndSendUpdates.bind(this), {
      maxFrequency: MAX_UPDATE_FREQ,
    });
    // Every save the host makes, whatever wrote it: this client's own mutation, another client's,
    // or a peer's replicated change.
    this._params.automergeHost.documentHeadsChanged.on(this._ctx, ({ documentId }) => {
      if (!this._syncStates.has(documentId)) {
        return;
      }
      this._pendingUpdates.add(documentId);
      this._sendUpdatesJob?.trigger();
    });
    // Another client on this device (or this one) wrote device annotations to a document it holds.
    this._params.sidecar?.deviceAnnotationsChanged.on(this._ctx, ({ documentIds }) => {
      for (const documentId of documentIds) {
        if (this._syncStates.get(documentId)?.lastSentHead) {
          this._pendingDeviceAnnotations.add(documentId);
        }
      }
      this._sendUpdatesJob?.trigger();
    });
    // An index pass may have created, deleted or first recorded a target this client holds a reference to.
    this._params.sidecar?.availabilityChanged.on(this._ctx, (objectIds) => {
      for (const [documentId, { referencedIds }] of this._syncStates) {
        if (referencedIds && intersects(referencedIds, objectIds)) {
          this._pendingRefHints.add(documentId);
        }
      }
      if (this._pendingRefHints.size > 0) {
        this._sendUpdatesJob?.trigger();
      }
    });
  }

  protected override async _close(): Promise<void> {
    await this._sendUpdatesJob!.join();
    for (const syncState of this._syncStates.values()) {
      syncState.initialLease?.[Symbol.dispose]();
    }
    this._syncStates.clear();
  }

  async update(ctx: Context, updates: DataService.DocumentUpdate[]): Promise<void> {
    for (const { documentId, mutation, deviceAnnotations } of updates) {
      invariant(isValidDocumentId(documentId), `Invalid document id: ${documentId}`);
      // Before the annotations: a write may annotate an object this same mutation creates.
      if (mutation) {
        await this._writeMutation(ctx, documentId, mutation);
      }
      if (deviceAnnotations?.length) {
        await this._writeDeviceAnnotations(documentId, deviceAnnotations);
      }
    }
    // TODO(mykola): This should not be required.
    await this._params.automergeHost.flush(ctx, {
      documentIds: updates.map(({ documentId }) => documentId as DocumentId),
    });
  }

  private async _checkAndSendUpdates(): Promise<void> {
    if (this.#sendUpdatesPaused) {
      return;
    }
    const updates: DataService.DocumentUpdate[] = [];
    const maxBytes = this._params.maxBatchBytes ?? MAX_BATCH_BYTES;
    const maxDocuments = this._params.maxBatchDocuments ?? MAX_BATCH_DOCUMENTS;
    let bytes = 0;

    // Documents this batch delivers for the first time, which carry their whole sidecar.
    const initial = new Set<DocumentId>();

    // Consumed one at a time so whatever does not fit stays pending for the next tick.
    for (const documentId of this._pendingUpdates) {
      if (updates.length >= maxDocuments || bytes >= maxBytes) {
        break;
      }
      this._pendingUpdates.delete(documentId);
      const isInitial = this._syncStates.get(documentId)?.lastSentHead === undefined;
      const update = await this._getPendingChanges(documentId);
      if (update) {
        updates.push({
          documentId,
          mutation: update,
        });
        bytes += update.byteLength;
        if (isInitial) {
          initial.add(documentId);
        }
        // The reference set may have changed with the document.
        this._pendingRefHints.add(documentId);
      }
    }

    await this._attachSidecar(updates, initial);
    if (this._pendingUpdates.size > 0) {
      this._sendUpdatesJob!.trigger();
    }

    // Mutation-less transition updates: tell the client `requesting: true`
    // for any documents whose disk probe completed negative. Skip docs that
    // are already being delivered as a real mutation in this same batch
    // (those go directly to `ready` on the client and a subsequent
    // `requesting` would be ignored anyway).
    const docsRequesting = Array.from(this._pendingRequesting);
    this._pendingRequesting.clear();
    if (docsRequesting.length > 0) {
      const docsBeingFlushed = new Set(updates.map((update) => update.documentId));
      for (const documentId of docsRequesting) {
        if (docsBeingFlushed.has(documentId)) {
          continue;
        }
        updates.push({ documentId, requesting: true });
      }
    }

    if (updates.length > 0) {
      this._params.sendUpdates({ updates });
    }
  }

  /**
   * Adds device annotations and reference hints to the batch: for documents it delivers for the first
   * time, and for documents whose sidecar changed since their last send.
   */
  private async _attachSidecar(updates: DataService.DocumentUpdate[], initial: ReadonlySet<DocumentId>): Promise<void> {
    const sidecar = this._params.sidecar;
    if (!sidecar) {
      this._pendingDeviceAnnotations.clear();
      this._pendingRefHints.clear();
      return;
    }
    // Only documents the client already holds: a snapshot for one not yet delivered would be dropped.
    const delivered = (documentId: DocumentId) => this._syncStates.get(documentId)?.lastSentHead !== undefined;

    // Values are scoped by space, so a subscription that names none has none to send.
    const annotated = this._params.spaceId
      ? [...new Set([...initial, ...this._pendingDeviceAnnotations])].filter(delivered)
      : [];
    this._pendingDeviceAnnotations.clear();
    const hinted = [...this._pendingRefHints].filter(
      (documentId) => delivered(documentId) && this._syncStates.get(documentId)?.references !== undefined,
    );
    this._pendingRefHints.clear();

    const sidecars = new Map<string, Pick<DataService.DocumentUpdate, 'deviceAnnotations' | 'refHints'>>();
    try {
      if (annotated.length > 0 && this._params.spaceId) {
        const values = await sidecar.readDeviceAnnotations(this._params.spaceId, annotated);
        for (const documentId of annotated) {
          const annotations = values.get(documentId) ?? [];
          // An empty snapshot on first delivery says nothing the client does not already assume.
          if (annotations.length > 0 || !initial.has(documentId)) {
            sidecars.set(documentId, { deviceAnnotations: annotations });
          }
        }
      }
      // Space-less references resolve against the subscription's space; without one there is nothing to resolve.
      const spaceId = this._params.spaceId;
      if (hinted.length > 0 && spaceId) {
        const referencesByDocument = hinted.map(
          (documentId) => [documentId, this._syncStates.get(documentId)?.references ?? new Set<URI.URI>()] as const,
        );
        // One lookup for the whole batch: a first sync hints hundreds of documents at once.
        const hints = new Map(
          (
            await sidecar.readRefHints(
              spaceId,
              new Set(referencesByDocument.flatMap(([, references]) => [...references])),
            )
          ).map((hint) => [hint.uri, hint]),
        );
        for (const [documentId, references] of referencesByDocument) {
          const refHints = [...references].flatMap((uri) => hints.get(uri) ?? []);
          sidecars.set(documentId, { ...sidecars.get(documentId), refHints });
        }
      }
    } catch (err) {
      // The document bytes still go out; its sidecar is retried on the next pass.
      log.warn('failed to read document sidecar', { err });
      annotated.forEach((documentId) => this._pendingDeviceAnnotations.add(documentId));
      hinted.forEach((documentId) => this._pendingRefHints.add(documentId));
      this._sendUpdatesJob?.trigger();
      return;
    }

    updates.forEach((update, index) => {
      const extra = sidecars.get(update.documentId);
      if (extra) {
        updates[index] = { ...update, ...extra };
        sidecars.delete(update.documentId);
      }
    });
    for (const [documentId, extra] of sidecars) {
      updates.push({ documentId, ...extra });
    }
  }

  private async _writeDeviceAnnotations(
    documentId: DocumentId,
    entries: readonly DataService.DeviceAnnotation[],
  ): Promise<void> {
    const spaceId = this._params.spaceId;
    if (!this._params.sidecar || !spaceId) {
      log.warn('dropping device annotations: subscription has no sidecar', { documentId });
      return;
    }
    await this._params.sidecar.writeDeviceAnnotations(spaceId, documentId, entries);
  }

  private async _getPendingChanges(documentId: DocumentId): Promise<Uint8Array | undefined> {
    const syncState = this._syncStates.get(documentId);
    // Still loading for its initial send, which queues the document again once it is ready.
    if (!syncState || syncState.initialLease) {
      return;
    }
    using lease = this._params.automergeHost.acquireDoc<DatabaseDirectory>(documentId);
    if (!lease.loaded) {
      // Gone from this host (e.g. wiped by garbage collection); its next save, if any, queues it again.
      const [storedHeads] = await this._params.automergeHost.getHeads([documentId]);
      if (storedHeads === undefined) {
        return;
      }
      try {
        await asyncTimeout(lease.waitUntilReady(), RELOAD_TIMEOUT);
      } catch (err) {
        log.warn('document could not be reloaded for an update, retrying', { documentId, err });
        this._pendingUpdates.add(documentId);
        this._sendUpdatesJob?.trigger();
        return;
      }
    }
    // Unsubscribed or closed while reloading.
    if (this._syncStates.get(documentId) !== syncState) {
      return;
    }
    const doc = lease.doc();
    const mutation = syncState.lastSentHead ? A.saveSince(doc, syncState.lastSentHead) : A.save(doc);
    if (mutation.length === 0) {
      return;
    }
    syncState.lastSentHead = A.getHeads(doc);
    if (this._params.sidecar) {
      const references = collectDocumentReferences(doc);
      syncState.references = references;
      syncState.referencedIds = new Set(
        [...references].flatMap((uri) => {
          const eid = EID.tryParse(uri);
          const entityId = eid && EID.getEntityId(eid);
          return entityId ? [entityId] : [];
        }),
      );
    }
    return mutation;
  }

  private async _writeMutation(ctx: Context, documentId: DocumentId, mutation: Uint8Array): Promise<void> {
    if (this._lifecycleState === LifecycleState.CLOSED) {
      return;
    }
    log('write mutation', { documentId });

    const syncState = this._syncStates.get(documentId);
    invariant(syncState, 'Sync state for document not found');
    // Resident before the import, so the mutation merges into the document's stored history rather
    // than into an empty document that would leave it parked as a change without its dependencies.
    // A load that fails rejects the whole update, and the client re-sends the batch.
    using lease = await this._params.automergeHost.loadDoc<DatabaseDirectory>(ctx, documentId, {
      timeout: RELOAD_TIMEOUT,
    });
    invariant(lease, 'Document not found');
    const headsBefore = A.getHeads(lease.doc());
    using _imported = await this._params.automergeHost.createDoc(mutation, { documentId, preserveHistory: true });

    if (A.equals(headsBefore, syncState.lastSentHead)) {
      // No new mutations were discovered on network, so we do not need to send updates from worker to client.
      syncState.lastSentHead = A.getHeads(lease.doc());
    }
  }
}

const intersects = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean => {
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
  for (const item of smaller) {
    if (larger.has(item)) {
      return true;
    }
  }
  return false;
};
