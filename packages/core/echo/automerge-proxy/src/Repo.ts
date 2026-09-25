//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Event, Trigger, UpdateScheduler, asyncTimeout, scheduleTask, sleep } from '@dxos/async';
import { Resource } from '@dxos/context';
import { log } from '@dxos/log';

import type * as Contract from './Contract.ts';
import * as Cursors from './Cursors.ts';
import type * as Handle from './Handle.ts';
import { randomId } from './internal/index.ts';
import type * as Op from './Op.ts';

/**
 * The host as a client reaches it: the asynchronous half of the contract. Values in events and
 * batches are plain; a transport that cannot carry some of them encodes them with `Wire`.
 */
export interface Host<Id extends string = string> {
  /** Opens the event stream of a subscription; the returned function closes it. */
  subscribe(
    request: { subscriptionId: string; clientId: string },
    handlers: {
      onEvents: (events: readonly Contract.DocumentEvent[]) => void;
      onError: (error: Error) => void;
      onClose: () => void;
    },
  ): () => void;
  updateSubscription(request: { subscriptionId: string; add?: Contract.Follow[]; remove?: string[] }): Promise<void>;
  /** Resolves once the batches are saved and their entries are on the subscription's stream. */
  submit(request: { subscriptionId: string; batches: Contract.SubmitBatch[] }): Promise<Contract.SubmitResult[]>;
  createDocument(initialValue: unknown): Promise<Id>;
  /** Resolves once the documents are in the host's storage. */
  flush(documentIds: Id[]): Promise<void>;
  resolveCursors(request: Contract.ResolveCursors): Promise<(number | null)[]>;
  createCursors(request: Contract.CreateCursors): Promise<(string | null)[]>;
}

export type SaveStateChangedEvent<Id extends string = string> = { unsavedDocuments: Id[] };

/** Edits of one document the host refused: no longer visible, and never saved. */
export type EditsRejectedEvent<Id extends string = string> = {
  documentId: Id;
  /** The ops of each refused `change()` call, kept for diagnostics. */
  changes: readonly Op.Change[];
};

export type Options<Id extends string, H extends Handle.DocHandle<any, Id>> = {
  host: Host<Id>;
  /** Builds each handle, so a caller can hand out its own subclass of {@link Handle.DocHandle}. */
  // Documents of different types share one repo; `find<T>` is where a caller names the type.
  createHandle: (options: Handle.Options<any, Id>) => H;
  /** Tags this client's batches; random by default. */
  clientId?: string;
  /** The errors the repo throws, so a caller can use its own types. */
  errors?: {
    /** Thrown by {@link ProxyRepo.find} and {@link ProxyRepo.create} while the repo is not open. */
    closed?: (documentId?: Id) => Error;
    /** Fails a flush waiting for edits the host refused. */
    refused?: (documentId: Id, changes: number) => Error;
  };
};

const SUBSCRIBE_TIMEOUT = 30_000;
const FLUSH_TIMEOUT = 30_000;
const MAX_SUBMIT_FREQ = 20; // [batches/sec]

/** Attempts {@link ProxyRepo.flushCreations} makes before a creation the host refused fails it. */
const FLUSH_ATTEMPTS = 3;

/** Backoff between {@link FLUSH_ATTEMPTS}, multiplied by the attempt number. */
const FLUSH_RETRY_DELAY_MS = 50;

/** First delay before replacing a subscription whose stream ended; doubles per failed attempt. */
const RESUBSCRIBE_DELAY_MS = 250;

/** Cap on the {@link RESUBSCRIBE_DELAY_MS} backoff, so a host that stays down is still retried. */
const RESUBSCRIBE_MAX_DELAY_MS = 10_000;

/** Events that answer a (re)subscription to a document. */
const ANSWERS = new Set<Contract.DocumentEvent['type']>(['snapshot', 'recovered', 'caughtUp', 'copy', 'unavailable']);

/**
 * A repo of proxy documents served by a {@link Host}: the client loads no Automerge. Local edits
 * become op batches, one in flight per document; the host's entries bring other writers' changes and
 * acknowledge this client's.
 */
export class ProxyRepo<
  Id extends string = string,
  H extends Handle.DocHandle<any, Id> = Handle.DocHandle<any, Id>,
> extends Resource {
  readonly #clientId: string;
  readonly #subscriptionId = randomId();
  readonly #host: Host<Id>;
  readonly #createHandle: (options: Handle.Options<any, Id>) => H;
  readonly #closedError: (documentId?: Id) => Error;
  readonly #refusedError: (documentId: Id, changes: number) => Error;
  readonly #handles: Record<string, H> = {};
  readonly #pendingCreations = new Map<string, Promise<void>>();
  /** Creations the host did not take; {@link flushCreations} requests them again. */
  readonly #failedCreations = new Map<string, { handle: H; error: Error; retry: () => void }>();
  /** Answers to (re)subscriptions, for callers waiting to be caught up with the host. */
  readonly #answered = new Event<string>();
  readonly #pendingAdd = new Set<string>();
  readonly #pendingRemove = new Set<string>();
  /**
   * Documents whose (re)subscription the host has not answered yet. Their batches wait: the answer
   * settles whether the batch in flight was applied, and a batch sent meanwhile could be applied after
   * the answer said it was not, and then sent again.
   */
  readonly #catchingUp = new Set<string>();
  #subscriptionReady = new Trigger();
  /** Batches whose submit failed, resent as they were: the host ignores one it already applied. */
  readonly #retry = new Map<string, Contract.SubmitBatch>();
  /** Submit failures, so a flush can tell that writes it waits for may never land. */
  readonly #failed = new Event<Error>();
  /** Any handle confirming something, which is when a flush re-checks what is still pending. */
  readonly #progress = new Event<void>();
  #unsubscribe?: () => void = undefined;
  #submitJob?: UpdateScheduler = undefined;
  /** Bumped on reconnect, so a sync pass still waiting on the previous host changes nothing when it returns. */
  #generation = 0;
  #resubscribeAttempts = 0;

  readonly saveStateChanged = new Event<SaveStateChangedEvent<Id>>();

  /** Edits the host refused; each one is also logged, and fails a flush waiting for it. */
  readonly editsRejected = new Event<EditsRejectedEvent<Id>>();

  constructor({ host, createHandle, clientId, errors }: Options<Id, H>) {
    super();
    this.#host = host;
    this.#createHandle = createHandle;
    this.#clientId = clientId ?? randomId();
    this.#closedError = errors?.closed ?? ((documentId) => new Error(`Repo is closed (document ${documentId})`));
    this.#refusedError =
      errors?.refused ?? ((documentId, changes) => new Error(`Host refused ${changes} changes to ${documentId}`));
  }

  get handles(): Record<string, H> {
    return this.#handles;
  }

  /**
   * The handle of a document, created on first use. With `followCopy` the handle shows the host's
   * copy of the document until the first write, so the host need not load it to serve a reader.
   */
  find(documentId: Id, { followCopy = false }: { followCopy?: boolean } = {}): H {
    const existing = this.#handles[documentId];
    if (existing) {
      return existing;
    }
    this.#requireOpen(documentId);
    const handle = this.#newHandle({ documentId, followCopy });
    this.#handles[documentId] = handle;
    this.#pendingRemove.delete(documentId);
    this.#catchUp(documentId);
    return handle;
  }

  /** A new document; readable and writable at once, named once the host has created it. */
  create(initialValue?: unknown): H {
    this.#requireOpen();
    const handle = this.#newHandle({ initialValue });
    const request = () => {
      const creation: Promise<void> = this.#host
        .createDocument(initialValue)
        .then(
          (documentId) => {
            if (handle.isDeleted) {
              this.#pendingRemove.add(documentId);
              this.#submitJob?.trigger();
              return;
            }
            handle._setDocumentId(documentId);
            this.#handles[documentId] = handle;
            this.#catchUp(documentId);
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
  cursors(documentId: Id, path: readonly (string | number)[]): Cursors.Tracker {
    const handle = this.#handles[documentId];
    if (!handle) {
      throw new Error(`Document ${documentId} is not loaded`);
    }
    return new Cursors.Tracker(handle, [...path], {
      resolve: (path, heads, cursors) => this.#host.resolveCursors({ documentId, path: [...path], heads, cursors }),
      create: (path, heads, positions) => this.#host.createCursors({ documentId, path: [...path], heads, positions }),
    });
  }

  /** Stops following a document with no unconfirmed edits. */
  release(documentId: Id): boolean {
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
   * Resolves once every edit made before the call is confirmed and its heads are in this client, so
   * heads read afterwards include the caller's writes. With `storage`, also once the host has stored
   * every document.
   */
  async flush({ storage = false }: { storage?: boolean } = {}): Promise<void> {
    await this.flushCreations();
    const drain = new AbortController();
    try {
      await asyncTimeout(this.#drain(drain.signal), FLUSH_TIMEOUT);
    } finally {
      drain.abort();
    }
    if (storage) {
      const documentIds = Object.values(this.#handles)
        .map((handle) => handle.documentId)
        .filter((documentId): documentId is Id => documentId !== undefined);
      await this.#host.flush(documentIds);
    }
  }

  /**
   * Waits until every pending creation has reached the host, requesting again the ones it did not
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
   * Resolves once this client holds every change the host's copy of the document has now. The host
   * absorbs and saves before it answers a resubscription, so the answer is the barrier.
   */
  async catchUp(documentId: Id): Promise<void> {
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

  /** Resubscribes every document with what this client holds, so a new host sends only what it missed. */
  async reconnect(): Promise<void> {
    this.#generation++;
    this.#unsubscribe?.();
    // A pass still waiting for the old subscription resumes and stops at its generation check.
    this.#subscriptionReady.wake();
    // The previous pass may be blocked on a call to a host that is gone; do not queue behind it.
    this.#submitJob = this.#createSubmitJob();
    // Answers owed on the old stream are lost with it.
    this.#catchingUp.clear();
    for (const documentId of Object.keys(this.#handles)) {
      this.#catchUp(documentId);
    }
    this.#subscribe();
    this.#submitJob?.trigger();
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
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    await this.#submitJob?.join();
    this.#submitJob = undefined;
  }

  /** Asks the host to (re)send a document from what this client holds, once until it answers. */
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

  #requireOpen(documentId?: Id): void {
    if (!this.isOpen || !this.#submitJob) {
      throw this.#closedError(documentId);
    }
  }

  #newHandle(options: { documentId?: Id; initialValue?: unknown; followCopy?: boolean }): H {
    const handle: H = this.#createHandle({
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
    handle.upgrade.on(() => {
      // The host loads its live document and answers from the heads the copy was read at.
      if (handle.documentId) {
        this.#catchUp(handle.documentId);
      }
    });
    handle.refused.on((changes) => {
      const documentId = handle.documentId;
      if (!documentId) {
        return;
      }
      log.warn('proxy edits refused', { documentId, changes: changes.length });
      this.editsRejected.emit({ documentId, changes });
      // Goes out before the confirmation that follows, which would otherwise let a waiting flush resolve.
      this.#failed.emit(this.#refusedError(documentId, changes.length));
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
    this.#unsubscribe = this.#host.subscribe(
      { subscriptionId: this.#subscriptionId, clientId: this.#clientId },
      {
        onEvents: (events) => {
          if (generation !== this.#generation) {
            // Late delivery from a replaced stream: its answers are for requests made again since.
            return;
          }
          this.#resubscribeAttempts = 0;
          ready.wake();
          for (const event of events) {
            const handle = this.#handles[event.documentId];
            handle?._receive(event);
            if (ANSWERS.has(event.type) && this.#catchingUp.delete(event.documentId)) {
              // The client wrote after asking for the copy, so its write needs the live document.
              if (event.type === 'copy' && handle && !handle.followsCopy) {
                this.#catchUp(event.documentId);
              }
              this.#answered.emit(event.documentId);
              this.#submitJob?.trigger();
            }
          }
        },
        onError: (err) => this.#onSubscriptionDropped(generation, err),
        onClose: () => this.#onSubscriptionDropped(generation),
      },
    );
  }

  /**
   * Replaces a stream that ended without this repo closing it: the host forgets the subscription
   * with its stream, so every document is followed again and caught up, after a backoff.
   */
  #onSubscriptionDropped(generation: number, err?: Error): void {
    if (!this.isOpen || generation !== this.#generation) {
      return;
    }
    log.warn('proxy subscription dropped, re-subscribing', { err });
    const delay = Math.min(RESUBSCRIBE_DELAY_MS * 2 ** this.#resubscribeAttempts++, RESUBSCRIBE_MAX_DELAY_MS);
    scheduleTask(
      this._ctx,
      async () => {
        // A reconnect during the delay already replaced the stream.
        if (this.isOpen && generation === this.#generation) {
          await this.reconnect();
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
          // Its work is redone against the new host: every document caught up again.
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
    await this.#subscriptionReady.wait({ timeout: SUBSCRIBE_TIMEOUT });
    if (!current()) {
      return;
    }
    if (this.#pendingAdd.size > 0 || this.#pendingRemove.size > 0) {
      // Read now, not when the catch-up was requested, so the answer is relative to what the client holds.
      const add = [...this.#pendingAdd].map((documentId) => {
        const handle = this.#handles[documentId];
        const known = handle?._known();
        return {
          documentId,
          ...(known ? { known } : {}),
          ...(handle?.followsCopy ? { mode: 'copy' as const } : {}),
        };
      });
      const remove = [...this.#pendingRemove];
      this.#pendingAdd.clear();
      this.#pendingRemove.clear();
      try {
        await this.#host.updateSubscription({ subscriptionId: this.#subscriptionId, add, remove });
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

    const batches: Contract.SubmitBatch[] = [...this.#retry.values()].filter(
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
    let results: Contract.SubmitResult[];
    try {
      results = await this.#host.submit({ subscriptionId: this.#subscriptionId, batches });
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
        // Not applied by this host; its answer to a resubscription settles the batch.
        this.#catchUp(documentId);
      }
    }
  }

  /**
   * Waits until no handle has an unconfirmed edit and every created document is back from the host;
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
      .filter((documentId): documentId is Id => documentId !== undefined);
    this.saveStateChanged.emit({ unsavedDocuments });
  }
}
