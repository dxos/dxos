//
// Copyright 2024 DXOS.org
//

import { next as A, type Heads } from '@automerge/automerge';
import { type DocumentId } from '@automerge/automerge-repo';

import { UpdateScheduler, asyncTimeout } from '@dxos/async';
import { Context, LifecycleState, Resource } from '@dxos/context';
import { BACKED_DIRECTORY_LIMIT, type DatabaseDirectory, backingJson, directoryJson } from '@dxos/echo-protocol';
import { objectStructureToJson } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { type EntityId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type DataService } from '@dxos/protocols/rpc';
import { countWork } from '@dxos/util';

import { type AutomergeHost, type DocumentLease } from '../automerge/index.ts';
import { sameHeads } from '../query/object-state.ts';

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
  sendUpdates: (updates: DataService.BatchedDocumentUpdates) => void;
  /** Override of {@link MAX_BATCH_BYTES}. */
  maxBatchBytes?: number;
  /** Override of {@link MAX_BATCH_DOCUMENTS}. */
  maxBatchDocuments?: number;
  /**
   * A space directory's JSON at the heads its document is stored at, for answering a passive subscription that
   * holds nothing with the stored changes and that JSON, without loading the document.
   */
  readDirectorySnapshot?: (documentId: DocumentId) => Promise<{ heads: Heads; json: string } | undefined>;
};

/** A document a client subscribes to, with the heads it already holds and whether it holds it unloaded. */
export type SubscribedDocument = { documentId: DocumentId; heads?: Heads; passive?: boolean };

interface DocSyncState {
  passive: boolean;
  lastSentHead?: Heads;
  confirm?: boolean;
  /**
   * Held only until the document is loaded for its initial send. Nothing pins the document after
   * that: the host's residency policy decides, and each send re-leases it for the duration of a read.
   */
  initialLease?: DocumentLease<DatabaseDirectory>;
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

  /** First sends read from storage rather than from a loaded document; see `readDirectorySnapshot`. */
  readonly #storedSends = new Map<DocumentId, DataService.DocumentUpdate>();

  /**
   * Documents whose on-disk probe completed negative and that need a
   * mutation-less `requesting: true` transition update sent to the client.
   * Cleared per-flush in `_checkAndSendUpdates`.
   */
  private readonly _pendingRequesting = new Set<DocumentId>();

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

  /**
   * Subscribes the client to each document, from the heads it names so the first send is only what came
   * after. A document already subscribed switches to the given mode, and is sent from the heads it names,
   * or whole when it names none. A passive document is not loaded until storage moves past its heads.
   */
  async addDocuments(documents: readonly SubscribedDocument[]): Promise<void> {
    const waiting: { documentId: DocumentId; heads: Heads; syncState: DocSyncState }[] = [];
    for (const { documentId, heads, passive = false } of documents) {
      if (this._lifecycleState === LifecycleState.CLOSED) {
        continue;
      }
      const existing = this._syncStates.get(documentId);
      if (existing) {
        existing.passive = passive;
        existing.lastSentHead = heads;
        existing.confirm = heads !== undefined && !passive;
        if (passive && heads !== undefined) {
          waiting.push({ documentId, heads, syncState: existing });
        } else {
          this._pendingUpdates.add(documentId);
          this._sendUpdatesJob?.trigger();
        }
        continue;
      }
      if (passive && heads !== undefined) {
        const syncState: DocSyncState = { passive, lastSentHead: heads };
        this._syncStates.set(documentId, syncState);
        waiting.push({ documentId, heads, syncState });
        continue;
      }
      if (passive && (await this.#sendFromStorage(documentId))) {
        continue;
      }
      log('loading document', { documentId });
      const lease = this._params.automergeHost.acquireDoc<DatabaseDirectory>(documentId);
      const syncState: DocSyncState = {
        passive,
        initialLease: lease,
        lastSentHead: heads,
        confirm: heads !== undefined,
      };
      this._syncStates.set(documentId, syncState);
      // Background disk probe so the client can distinguish
      // "not on disk, waiting for network" from "still loading".
      // Fire-and-forget; the result feeds `_pendingRequesting`.
      this._scheduleDiskProbe(documentId);
      void this._sendWhenLoaded(documentId, syncState);
    }

    if (waiting.length > 0) {
      const stored = await this._params.automergeHost.getStoredHeads(waiting.map(({ documentId }) => documentId));
      waiting.forEach(({ documentId, heads, syncState }, index) => {
        const storedHeads = stored[index];
        if (this._syncStates.get(documentId) === syncState && (!storedHeads || !sameHeads(storedHeads, heads))) {
          this._pendingUpdates.add(documentId);
          this._sendUpdatesJob?.trigger();
        }
      });
    }
  }

  /**
   * Queues the first send of a passive directory from its stored changes and snapshot, which the client shows it
   * from; nothing loads the document until it changes. Later sends take the usual path.
   */
  async #sendFromStorage(documentId: DocumentId): Promise<boolean> {
    const snapshot = await this._params.readDirectorySnapshot?.(documentId);
    if (!snapshot) {
      return false;
    }
    const bytes = await this._params.automergeHost.readStoredChanges(documentId, { limit: BACKED_DIRECTORY_LIMIT });
    if (!bytes || this._lifecycleState === LifecycleState.CLOSED || this._syncStates.has(documentId)) {
      return false;
    }
    // The stored changes may be ahead of the snapshot's heads, never behind; the next change sends what follows them.
    this._syncStates.set(documentId, { passive: true, lastSentHead: snapshot.heads });
    this.#storedSends.set(documentId, {
      documentId,
      mutation: bytes,
      passive: { heads: [...snapshot.heads], json: snapshot.json },
    });
    this._sendUpdatesJob?.trigger();
    return true;
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

  holds(documentId: DocumentId): boolean {
    return this._syncStates.has(documentId);
  }

  /** Drops the documents the client no longer subscribes to. */
  removeDocuments(documentIds: DocumentId[]): void {
    for (const documentId of documentIds) {
      const syncState = this._syncStates.get(documentId);
      syncState?.initialLease?.[Symbol.dispose]();
      this._syncStates.delete(documentId);
      this._pendingUpdates.delete(documentId);
      this.#storedSends.delete(documentId);
      this._pendingRequesting.delete(documentId);
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
  }

  protected override async _close(): Promise<void> {
    await this._sendUpdatesJob!.join();
    for (const syncState of this._syncStates.values()) {
      syncState.initialLease?.[Symbol.dispose]();
    }
    this._syncStates.clear();
  }

  async update(ctx: Context, updates: DataService.DocumentUpdate[]): Promise<void> {
    for (const { documentId, mutation } of updates) {
      // Inbound (client -> worker) updates are always mutation-bearing; the
      // `mutation`-less variant is only used for worker -> client transition
      // signals (e.g. `requesting`). Defensive skip here to satisfy the
      // optional proto field.
      if (!mutation) {
        continue;
      }
      await this._writeMutation(ctx, documentId as DocumentId, mutation);
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
    for (const [documentId, update] of this.#storedSends) {
      updates.push(update);
      bytes += (update.mutation?.byteLength ?? 0) + (update.passive?.json?.length ?? 0);
      this.#storedSends.delete(documentId);
      // Superseded: what is pending now follows the stored changes this send carries.
      this._pendingUpdates.delete(documentId);
    }

    // Consumed one at a time so whatever does not fit stays pending for the next tick.
    for (const documentId of this._pendingUpdates) {
      if (updates.length >= maxDocuments || bytes >= maxBytes) {
        break;
      }
      this._pendingUpdates.delete(documentId);
      const update = await this._getPendingChanges(documentId);
      if (update) {
        updates.push(update);
        bytes += (update.mutation?.byteLength ?? 0) + (update.passive?.json?.length ?? 0);
      }
    }
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

  private async _getPendingChanges(documentId: DocumentId): Promise<DataService.DocumentUpdate | undefined> {
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
    const since =
      syncState.lastSentHead && A.hasHeads(doc, syncState.lastSentHead) ? syncState.lastSentHead : undefined;
    const mutation = since ? A.saveSince(doc, since) : A.save(doc);
    if (mutation.length === 0 && !syncState.confirm) {
      return;
    }
    syncState.confirm = false;
    syncState.lastSentHead = A.getHeads(doc);
    countWork('automerge.mutationsSent');
    countWork('automerge.mutationSentBytes', mutation.length);
    return { documentId, mutation, passive: syncState.passive ? passiveObject(doc, since) : undefined };
  }

  private async _writeMutation(ctx: Context, documentId: DocumentId, mutation: Uint8Array): Promise<void> {
    if (this._lifecycleState === LifecycleState.CLOSED) {
      return;
    }
    log('write mutation', { documentId });
    countWork('automerge.mutationsApplied');
    countWork('automerge.mutationAppliedBytes', mutation.length);

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
    const imported = this._params.automergeHost.createDoc(mutation, { documentId, preserveHistory: true });
    // Read before awaiting: another client's write imported meanwhile is not something this client holds.
    const headsAfter = A.getHeads(lease.doc());
    using _imported = await imported;

    if (A.equals(headsBefore, syncState.lastSentHead)) {
      // No new mutations were discovered on network, so we do not need to send updates from worker to client.
      syncState.lastSentHead = headsAfter;
    }
  }
}

/**
 * What a passive client shows the document from: its one object, or, on the first send only, the directory it reads
 * as. A later change to a directory is the client's cue to load it, so only the bytes follow.
 */
const passiveObject = (
  doc: A.Doc<DatabaseDirectory>,
  since: Heads | undefined,
): DataService.DocumentUpdate['passive'] => {
  const heads = A.getHeads(doc);
  const [entry] = Object.entries(doc.objects ?? {});
  return {
    heads,
    json: entry
      ? backingJson(doc, entry[1], objectStructureToJson(entry[0] as EntityId, entry[1]))
      : since === undefined
        ? directoryJson(doc)
        : undefined,
    updatedAt: lastChangeTime(doc, heads),
  };
};

const lastChangeTime = (doc: A.Doc<unknown>, heads: A.Heads): number | undefined => {
  const backend = A.getBackend(doc);
  const time = Math.max(0, ...heads.map((hash) => backend.getChangeMetaByHash(hash)?.time ?? 0));
  return time > 0 ? time * 1000 : undefined;
};
