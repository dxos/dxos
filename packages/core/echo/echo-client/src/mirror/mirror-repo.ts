//
// Copyright 2026 DXOS.org
//

import { type AnyDocumentId, type DocumentId } from '@automerge/automerge-repo';
import type * as Context from 'effect/Context';

import { Event, Trigger, UpdateScheduler, asyncTimeout, scheduleTask, sleep } from '@dxos/async';
import { Resource } from '@dxos/context';
import { PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { runServiceCall, subscribeStream } from '@dxos/protocols';
import { type DataService, type MirrorService } from '@dxos/protocols/rpc';

import {
  type ClientDocHandle,
  type ClientRepo,
  type EditsRejectedEvent,
  type SaveStateChangedEvent,
} from '../automerge/client-handle.ts';
import { type DocHandleProxy } from '../automerge/doc-handle-proxy.ts';
import { toDocumentId } from '../automerge/document-id.ts';
import { RepoProxy } from '../automerge/repo-proxy.ts';
import { EditsRejectedError, RepoClosedError } from '../errors.ts';
import { MirrorCursors } from './mirror-cursors.ts';
import { MirrorDocHandle } from './mirror-doc-handle.ts';

const RPC_TIMEOUT = 30_000;
const FLUSH_TIMEOUT = 30_000;
const MAX_SUBMIT_FREQ = 20; // [batches/sec]

/** Attempts {@link MirrorRepo.flushCreations} makes before a creation the worker refused fails it. */
const FLUSH_ATTEMPTS = 3;

/** Backoff between {@link FLUSH_ATTEMPTS}, multiplied by the attempt number. */
const FLUSH_RETRY_DELAY_MS = 50;

/** First delay before replacing a subscription whose stream ended; doubles per failed attempt. */
const RESUBSCRIBE_DELAY_MS = 250;

/** Cap on the {@link RESUBSCRIBE_DELAY_MS} backoff, so a worker that stays down is still retried. */
const RESUBSCRIBE_MAX_DELAY_MS = 10_000;

/** Events that answer a (re)subscription to a document. */
const ANSWERS = new Set<MirrorService.DocumentEvent['type']>(['snapshot', 'recovered', 'caughtUp', 'unavailable']);

/**
 * A repo whose documents are JSON mirrors served by the worker's `MirrorService`: the tab loads no
 * Automerge. Local edits become op batches, one in flight per document; the worker's entries bring
 * other writers' changes and acknowledge this tab's.
 */
export class MirrorRepo extends Resource implements ClientRepo {
  /** Random per tab session; tags this tab's batches in the worker's log and in change messages. */
  readonly #clientId = PublicKey.random().toHex();
  readonly #subscriptionId = PublicKey.random().toHex();
  // Documents of different types share the map; `find<T>` is where a caller names the type.
  readonly #handles: Record<string, MirrorDocHandle<any>> = {};
  readonly #pendingCreations = new Map<string, Promise<void>>();
  /** Creations the worker did not take; {@link flushCreations} requests them again. */
  readonly #failedCreations = new Map<string, { handle: MirrorDocHandle<any>; error: Error; retry: () => void }>();
  /** Answers to (re)subscriptions, for callers waiting to be caught up with the worker. */
  readonly #answered = new Event<string>();
  readonly #pendingAdd = new Set<string>();
  readonly #pendingRemove = new Set<string>();
  /**
   * Documents whose (re)subscription the worker has not answered yet. Their batches wait: the answer
   * settles whether the batch in flight was applied, and a batch sent meanwhile could be applied after
   * the answer said it was not, and then sent again.
   */
  readonly #catchingUp = new Set<string>();
  #subscriptionReady = new Trigger();
  /** Real Automerge replicas of documents handed to Automerge libraries, created on first use. */
  #replicas?: RepoProxy = undefined;
  /** Batches whose submit failed, resent as they were: the worker ignores one it already applied. */
  readonly #retry = new Map<string, MirrorService.SubmitRequest['batches'][number]>();
  /** Submit failures, so a flush can tell that writes it waits for may never land. */
  readonly #failed = new Event<Error>();
  /** Any handle confirming something, which is when a flush re-checks what is still pending. */
  readonly #progress = new Event<void>();
  #unsubscribe?: () => void = undefined;
  #submitJob?: UpdateScheduler = undefined;
  /** Bumped on reconnect, so a sync pass still waiting on the previous worker changes nothing when it returns. */
  #generation = 0;
  #resubscribeAttempts = 0;

  readonly saveStateChanged = new Event<SaveStateChangedEvent>();

  /** Edits the worker refused; each one is also logged, and fails a flush waiting for it. */
  readonly editsRejected = new Event<EditsRejectedEvent>();

  constructor(
    private _mirrorService: MirrorService.Client,
    private _dataService: DataService.Client,
    private readonly _runtime: Context.Context<never>,
    private readonly _spaceId: SpaceId,
  ) {
    super();
  }

  get handles(): Record<string, ClientDocHandle<unknown>> {
    return this.#handles;
  }

  find<T>(id: AnyDocumentId): ClientDocHandle<T> {
    if (typeof id !== 'string') {
      throw new TypeError(`Invalid documentId ${id}`);
    }
    const documentId = toDocumentId(id);
    const existing = this.#handles[documentId];
    if (existing) {
      return existing;
    }
    this.#requireOpen(documentId);
    const handle = this.#createHandle<T>({ documentId });
    this.#handles[documentId] = handle;
    this.#pendingRemove.delete(documentId);
    this.#catchUp(documentId);
    return handle;
  }

  create<T>(initialValue?: T): ClientDocHandle<T> {
    this.#requireOpen();
    const handle = this.#createHandle<T>({ initialValue });
    const request = () => {
      const creation: Promise<void> = runServiceCall(
        this._runtime,
        this._dataService['DataService.createDocument']({
          spaceId: this._spaceId,
          // A doc's declared type is an interface without an index signature; the value is a plain JSON object.
          initialValue: initialValue as Record<string, unknown>,
        }),
        { timeout: RPC_TIMEOUT },
      )
        .then(
          ({ documentId }) => {
            // The wire carries the id the worker minted as a plain string.
            const id = documentId as DocumentId;
            if (handle.isDeleted) {
              this.#pendingRemove.add(id);
              this.#submitJob?.trigger();
              return;
            }
            handle._setDocumentId(id);
            this.#handles[id] = handle;
            this.#catchUp(id);
          },
          (err) => {
            if (!this.isOpen) {
              handle._failReady(err);
              return;
            }
            log.catch(err);
            if (!handle.isDeleted) {
              this.#failedCreations.set(handle._internalId, { handle, error: err, retry: request });
            }
          },
        )
        .finally(() => {
          if (this.#pendingCreations.get(handle._internalId) === creation) {
            this.#pendingCreations.delete(handle._internalId);
          }
        });
      this.#pendingCreations.set(handle._internalId, creation);
    };
    request();
    return handle;
  }

  /** Cursors over the text at `path` in a document this repo follows. */
  cursors(documentId: DocumentId, path: readonly (string | number)[]): MirrorCursors {
    const handle = this.#handles[documentId];
    if (!handle) {
      throw new Error(`Document ${documentId} is not loaded`);
    }
    return new MirrorCursors(handle, [...path], {
      resolve: async (path, heads, cursors) =>
        (
          await runServiceCall(
            this._runtime,
            this._mirrorService['MirrorService.resolveCursors']({ documentId, path: [...path], heads, cursors }),
            { timeout: RPC_TIMEOUT },
          )
        ).positions,
      create: async (path, heads, positions) =>
        (
          await runServiceCall(
            this._runtime,
            this._mirrorService['MirrorService.createCursors']({ documentId, path: [...path], heads, positions }),
            { timeout: RPC_TIMEOUT },
          )
        ).cursors,
    });
  }

  /**
   * A genuine Automerge replica of one document, for code written against the Automerge API:
   * ecosystem libraries and tooling that need history, op-id cursors or rich text. It syncs
   * through the worker's byte protocol like any replica client, so the mirror of the same document
   * converges with it one round trip later. A tab without such code loads no Automerge at all; in a
   * browser the first call would load the wasm.
   */
  async replica<T>(documentId: DocumentId): Promise<DocHandleProxy<T>> {
    if (!this.#replicas) {
      this.#replicas = new RepoProxy(this._dataService, this._runtime, this._spaceId);
      await this.#replicas.open();
    }
    const handle = this.#replicas.find<T>(documentId);
    await handle.whenReady();
    return handle;
  }

  /** Drops a replica once nothing uses it; the document stays mirrored. */
  releaseReplica(documentId: DocumentId): boolean {
    return this.#replicas?.release(documentId) ?? false;
  }

  import<T>(): ClientDocHandle<T> {
    throw new Error('Importing a binary document needs a worker RPC; not implemented in the mirror spike');
  }

  release(documentId: DocumentId): boolean {
    const handle = this.#handles[documentId];
    if (!handle || handle.hasPending) {
      return false;
    }
    handle.removeAllListeners();
    delete this.#handles[documentId];
    this.#pendingAdd.delete(documentId);
    this.#catchingUp.delete(documentId);
    this.#retry.delete(documentId);
    this.#pendingRemove.add(documentId);
    this.#submitJob?.trigger();
    return true;
  }

  /**
   * Resolves once every edit made before the call is confirmed and its heads are in this tab, so heads
   * read afterwards include the caller's writes.
   */
  async flush({ disk = false }: { disk?: boolean } = {}): Promise<void> {
    await this.flushCreations();
    await this.#replicas?.flush();
    const drain = new AbortController();
    try {
      await asyncTimeout(this.#drain(drain.signal), FLUSH_TIMEOUT);
    } finally {
      drain.abort();
    }
    if (disk) {
      const documentIds = Object.values(this.#handles)
        .map((handle) => handle.documentId)
        .filter((documentId): documentId is DocumentId => documentId !== undefined);
      await runServiceCall(this._runtime, this._dataService['DataService.flush']({ documentIds }), {
        timeout: RPC_TIMEOUT,
      });
    }
  }

  /**
   * Waits until every pending creation has reached the worker, requesting again the ones it did not
   * take. Throws if one still cannot be created.
   */
  async flushCreations(): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      for (const [id, { retry }] of this.#failedCreations) {
        this.#failedCreations.delete(id);
        retry();
      }
      await Promise.all(this.#pendingCreations.values());
      const failed = this.#failedCreations.values().next().value;
      if (!failed || !this.isOpen) {
        return;
      }
      if (attempt >= FLUSH_ATTEMPTS) {
        throw failed.error;
      }
      await sleep(FLUSH_RETRY_DELAY_MS * attempt);
    }
  }

  /**
   * Resolves once this tab holds every change the worker's copy of the document has now. The worker
   * absorbs and saves before it answers a resubscription, so the answer is the barrier.
   */
  async catchUp(documentId: DocumentId): Promise<void> {
    if (!this.#handles[documentId]) {
      throw new Error(`Document ${documentId} is not followed`);
    }
    if (this.#catchingUp.has(documentId)) {
      // That request may predate what the caller needs; wait for it, then ask again.
      await this.#answered.waitFor((answered) => answered === documentId);
    }
    const answered = this.#answered.waitFor((answered) => answered === documentId);
    this.#catchUp(documentId);
    await answered;
  }

  protected override async _open(): Promise<void> {
    this.#submitJob = this.#createSubmitJob();
    this.#subscribe();
  }

  protected override async _close(): Promise<void> {
    for (const { handle, error } of this.#failedCreations.values()) {
      handle._failReady(error);
    }
    this.#failedCreations.clear();
    await this.#replicas?.close();
    this.#replicas = undefined;
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    await this.#submitJob?.join();
    this.#submitJob = undefined;
  }

  _updateServices({
    dataService,
    mirrorService,
  }: {
    dataService: DataService.Client;
    mirrorService?: MirrorService.Client;
  }): void {
    this._dataService = dataService;
    if (mirrorService) {
      this._mirrorService = mirrorService;
    }
    this.#replicas?._updateServices({ dataService });
  }

  /** Resubscribes every document with what this tab holds, so a new worker sends only what it missed. */
  async _onReconnect(): Promise<void> {
    this.#generation++;
    this.#unsubscribe?.();
    // A pass still waiting for the old subscription resumes and stops at its generation check.
    this.#subscriptionReady.wake();
    // The previous pass may be blocked on a call to a worker that is gone; do not queue behind it.
    this.#submitJob = this.#createSubmitJob();
    // Answers owed on the old stream are lost with it.
    this.#catchingUp.clear();
    for (const documentId of Object.keys(this.#handles)) {
      this.#catchUp(documentId);
    }
    this.#subscribe();
    this.#submitJob?.trigger();
    await this.#replicas?._onReconnect();
  }

  /** Asks the worker to (re)send a document from what this tab holds, once until it answers. */
  #catchUp(documentId: string): void {
    if (this.#catchingUp.has(documentId)) {
      return;
    }
    this.#catchingUp.add(documentId);
    // The answer settles the batch this retry would resend.
    this.#retry.delete(documentId);
    this.#pendingAdd.add(documentId);
    this.#submitJob?.trigger();
  }

  #requireOpen(documentId?: DocumentId): void {
    if (!this.isOpen || !this.#submitJob) {
      throw new RepoClosedError({ spaceId: this._spaceId, documentId });
    }
  }

  #createHandle<T>(options: { documentId?: DocumentId; initialValue?: T }): MirrorDocHandle<T> {
    const handle: MirrorDocHandle<T> = new MirrorDocHandle<T>({
      ...options,
      clientId: this.#clientId,
      onDelete: () => {
        if (!handle.documentId) {
          this.#failedCreations.delete(handle._internalId);
        } else {
          delete this.#handles[handle.documentId];
          this.#pendingAdd.delete(handle.documentId);
          this.#catchingUp.delete(handle.documentId);
          this.#retry.delete(handle.documentId);
          this.#pendingRemove.add(handle.documentId);
          this.#submitJob?.trigger();
        }
      },
    });
    handle.on('change', ({ patchInfo }) => {
      if (patchInfo.source === 'change') {
        this.#submitJob?.trigger();
        this.#emitSaveState();
      }
    });
    handle.gap.on(() => {
      if (handle.documentId) {
        this.#catchUp(handle.documentId);
      }
    });
    handle.refused.on((changes) => {
      const documentId = handle.documentId;
      if (!documentId) {
        return;
      }
      log.warn('mirror edits refused', { documentId, changes: changes.length });
      this.editsRejected.emit({ documentId, changes });
      // Goes out before the confirmation that follows, which would otherwise let a waiting flush resolve.
      this.#failed.emit(new EditsRejectedError({ documentId, changes: changes.length }));
    });
    handle.confirmed.on(() => {
      // One batch per document is in flight; the next can go once this one is confirmed.
      this.#submitJob?.trigger();
      this.#emitSaveState();
      this.#progress.emit();
    });
    return handle;
  }

  #subscribe(): void {
    const generation = this.#generation;
    const ready = new Trigger();
    this.#subscriptionReady = ready;
    const stream = this._mirrorService['MirrorService.subscribe']({
      subscriptionId: this.#subscriptionId,
      clientId: this.#clientId,
      spaceId: this._spaceId,
    });
    this.#unsubscribe = subscribeStream(this._runtime, stream, {
      onData: ({ events }) => {
        if (generation !== this.#generation) {
          // Late delivery from a replaced stream: its answers are for requests made again since.
          return;
        }
        this.#resubscribeAttempts = 0;
        ready.wake();
        for (const event of events) {
          this.#handles[event.documentId]?._receive(event);
          if (ANSWERS.has(event.type) && this.#catchingUp.delete(event.documentId)) {
            this.#answered.emit(event.documentId);
            this.#submitJob?.trigger();
          }
        }
      },
      onError: (err) => this.#onSubscriptionDropped(generation, err),
      onClose: () => this.#onSubscriptionDropped(generation),
    });
  }

  /**
   * Replaces a stream that ended without this repo closing it: the worker forgets the subscription
   * with its stream, so every document is followed again and caught up, after a backoff.
   */
  #onSubscriptionDropped(generation: number, err?: Error): void {
    if (!this.isOpen || generation !== this.#generation) {
      return;
    }
    log.warn('mirror subscription dropped, re-subscribing', { spaceId: this._spaceId, err });
    const delay = Math.min(RESUBSCRIBE_DELAY_MS * 2 ** this.#resubscribeAttempts++, RESUBSCRIBE_MAX_DELAY_MS);
    scheduleTask(
      this._ctx,
      async () => {
        // A reconnect during the delay already replaced the stream.
        if (this.isOpen && generation === this.#generation) {
          await this._onReconnect();
        }
      },
      delay,
    );
  }

  #createSubmitJob(): UpdateScheduler {
    return new UpdateScheduler(
      this._ctx,
      async () => {
        const generation = this.#generation;
        try {
          await this.#sync(() => generation === this.#generation);
        } catch (err) {
          if (generation === this.#generation) {
            throw err;
          }
          // Its work is redone against the new worker: every document caught up again.
          log('sync pass for a replaced connection failed', { err });
        }
      },
      { maxFrequency: MAX_SUBMIT_FREQ },
    );
  }

  /**
   * Sends subscription changes and one batch per document with buffered edits.
   * @param current False once a reconnect replaced the connection this pass uses.
   */
  async #sync(current: () => boolean): Promise<void> {
    await this.#subscriptionReady.wait({ timeout: RPC_TIMEOUT });
    if (!current()) {
      return;
    }
    if (this.#pendingAdd.size > 0 || this.#pendingRemove.size > 0) {
      // Read now, not when the catch-up was requested, so the answer is relative to what the tab holds.
      const add = [...this.#pendingAdd].map((documentId) => {
        const known = this.#handles[documentId]?._known();
        return { documentId, ...(known ? { known } : {}) };
      });
      const remove = [...this.#pendingRemove];
      this.#pendingAdd.clear();
      this.#pendingRemove.clear();
      try {
        await runServiceCall(
          this._runtime,
          this._mirrorService['MirrorService.updateSubscription']({
            subscriptionId: this.#subscriptionId,
            add,
            remove,
          }),
          { timeout: RPC_TIMEOUT },
        );
      } catch (err) {
        if (!current()) {
          return;
        }
        // Asked again on the next pass; until answered, those documents send nothing.
        for (const { documentId } of add) {
          if (this.#catchingUp.has(documentId)) {
            this.#pendingAdd.add(documentId);
          }
        }
        for (const documentId of remove) {
          if (!this.#handles[documentId]) {
            this.#pendingRemove.add(documentId);
          }
        }
        this.#failed.emit(err instanceof Error ? err : new Error(String(err)));
        return;
      }
      if (!current()) {
        return;
      }
    }

    const batches: MirrorService.SubmitRequest['batches'] = [...this.#retry.values()].filter(
      (batch) => !this.#catchingUp.has(batch.documentId),
    );
    this.#retry.clear();
    for (const handle of Object.values(this.#handles)) {
      if (!handle.documentId || this.#catchingUp.has(handle.documentId)) {
        continue;
      }
      const next = handle._takeBatch();
      if (next) {
        batches.push({
          documentId: handle.documentId,
          epoch: next.epoch,
          batchId: next.batch.batchId,
          baseVersion: next.batch.baseVersion,
          changes: next.batch.changes.map((change) => [...change]),
        });
      }
    }
    if (batches.length === 0) {
      return;
    }
    let results: MirrorService.SubmitResponse['results'];
    try {
      ({ results } = await runServiceCall(
        this._runtime,
        this._mirrorService['MirrorService.submit']({ subscriptionId: this.#subscriptionId, batches }),
        { timeout: RPC_TIMEOUT },
      ));
    } catch (err) {
      if (!current()) {
        return;
      }
      for (const batch of batches) {
        this.#retry.set(batch.documentId, batch);
      }
      this.#failed.emit(err instanceof Error ? err : new Error(String(err)));
      return;
    }
    if (!current()) {
      return;
    }
    for (const { documentId, status } of results) {
      if (status !== 'applied') {
        // Not applied by this worker; its answer to a resubscription settles the batch.
        this.#catchUp(documentId);
      }
    }
  }

  /**
   * Waits until no handle has an unconfirmed edit and every created document is back from the worker;
   * rejects if a submit fails meanwhile. Documents still being fetched do not hold it up.
   */
  async #drain(signal: AbortSignal): Promise<void> {
    while (!signal.aborted) {
      const waiting = Object.values(this.#handles).filter(
        (handle) =>
          (handle.hasPending || handle.awaitingCreation) && handle.documentId && handle.state !== 'unavailable',
      );
      if (waiting.length === 0) {
        return;
      }
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          offProgress();
          offFailure();
          signal.removeEventListener('abort', onAbort);
        };
        const onAbort = () => {
          cleanup();
          resolve();
        };
        signal.addEventListener('abort', onAbort);
        const offProgress = this.#progress.on(() => {
          cleanup();
          resolve();
        });
        const offFailure = this.#failed.on((err) => {
          cleanup();
          reject(err);
        });
        this.#submitJob?.trigger();
      });
    }
  }

  #emitSaveState(): void {
    const unsavedDocuments = Object.values(this.#handles)
      .filter((handle) => handle.hasPending && handle.documentId)
      .map((handle) => handle.documentId)
      .filter((documentId): documentId is DocumentId => documentId !== undefined);
    this.saveStateChanged.emit({ unsavedDocuments });
  }
}
