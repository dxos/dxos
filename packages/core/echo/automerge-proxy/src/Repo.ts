//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Event, Trigger, UpdateScheduler, asyncTimeout, scheduleTask, sleep } from '@dxos/async';
import { Resource } from '@dxos/context';
import { log } from '@dxos/log';

import type * as Contract from './Contract.ts';
import type * as Handle from './Handle.ts';
import { randomId } from './internal/index.ts';

/** The host as a tab reaches it: the asynchronous half of the contract. */
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
  /** Resolves once the changes are checked; each is answered on the subscription's stream. */
  submit(request: { subscriptionId: string; batches: Contract.SubmitBatch[] }): Promise<Contract.SubmitResult[]>;
  /** Creates a document holding exactly the given changes, a tab's first ones, which the host checks. */
  createDocument(changes: readonly Uint8Array[]): Promise<Id>;
  /** Resolves once the documents are in the host's storage. */
  flush(documentIds: Id[]): Promise<void>;
}

export type SaveStateChangedEvent<Id extends string = string> = { unsavedDocuments: Id[] };

/** Changes of one document the host refused: gone from the tab, with every change built on them, and never saved. */
export type EditsRejectedEvent<Id extends string = string> = {
  documentId: Id;
  hashes: readonly string[];
  reason: string;
};

export type Options<Id extends string, H extends Handle.DocHandle<any, Id>> = {
  host: Host<Id>;
  /** Builds each handle, so a caller can hand out its own subclass of {@link Handle.DocHandle}. */
  // Documents of different types share one repo; `find<T>` is where a caller names the type.
  createHandle: (options: Handle.Options<any, Id>) => H;
  /** Tags this tab's subscription; random by default. */
  clientId?: string;
  /** Most send passes a second; the first change after a pause goes at once. */
  maxSendRate?: number;
  /** First delay in milliseconds before replacing a subscription that failed; doubles per failed attempt. */
  resubscribeDelay?: number;
  /** Where `pagehide` fires, which sends what is queued at once; `globalThis` where it has events. */
  pageEvents?: EventTarget;
  /** The errors the repo throws, so a caller can use its own types. */
  errors?: {
    /** Thrown by {@link TabRepo.find} and {@link TabRepo.create} while the repo is not open. */
    closed?: (documentId?: Id) => Error;
    /** Fails a flush waiting for changes the host refused. */
    refused?: (documentId: Id, changes: number) => Error;
  };
};

const SUBSCRIBE_TIMEOUT = 30_000;
const FLUSH_TIMEOUT = 30_000;

/** RepoProxy's rate, so the worker receives a tab document's changes when it would receive a replica's. */
const MAX_SEND_RATE = 10;

/** Attempts {@link TabRepo.flushCreations} makes before a creation the host refused fails it. */
const FLUSH_ATTEMPTS = 3;

/** Backoff between {@link FLUSH_ATTEMPTS}, multiplied by the attempt number. */
const FLUSH_RETRY_DELAY_MS = 50;

/** Default first delay before replacing a subscription that failed; see {@link Options.resubscribeDelay}. */
const RESUBSCRIBE_DELAY_MS = 250;

/** Cap on the resubscribe backoff, so a host that stays down is still retried. */
const RESUBSCRIBE_MAX_DELAY_MS = 10_000;

/** Events that answer a follow. */
const ANSWERS = new Set<Contract.DocumentEvent['type']>(['snapshot', 'caughtUp', 'unavailable']);

const defaultPageEvents = (): EventTarget | undefined =>
  typeof globalThis.addEventListener === 'function' ? globalThis : undefined;

/**
 * A repo of tab documents served by a {@link Host}: the tab loads no Automerge. Each write is a change
 * the tab encoded as Automerge would; the repo sends them in batches and the host acknowledges each
 * once saved. A document's changes wait while it is followed again, since the answer can bring changes
 * the tab's later ones depend on and the host lost.
 */
export class TabRepo<
  Id extends string = string,
  H extends Handle.DocHandle<any, Id> = Handle.DocHandle<any, Id>,
> extends Resource {
  readonly #clientId: string;
  /** New for each stream, so a request made for an earlier stream is never answered on a later one. */
  #subscriptionId = randomId();
  readonly #host: Host<Id>;
  readonly #createHandle: (options: Handle.Options<any, Id>) => H;
  readonly #closedError: (documentId?: Id) => Error;
  readonly #refusedError: (documentId: Id, changes: number) => Error;
  readonly #maxSendRate: number;
  readonly #resubscribeDelay: number;
  readonly #pageEvents?: EventTarget;
  readonly #handles: Record<string, H> = {};
  readonly #pendingCreations = new Map<string, Promise<void>>();
  /** Creations the host did not take; {@link flushCreations} requests them again. */
  readonly #failedCreations = new Map<string, { handle: H; error: Error; retry: () => void }>();
  readonly #pendingAdd = new Set<string>();
  readonly #pendingRemove = new Set<string>();
  /** Documents whose follow the host has not answered yet; their changes wait for the answer. */
  readonly #catchingUp = new Set<string>();
  #subscriptionReady = new Trigger();
  /** Send failures and refusals, so a flush can tell that changes it waits for may never land. */
  readonly #failed = new Event<Error>();
  /** Any handle acknowledged or answered, which is when a flush re-checks what is still pending. */
  readonly #progress = new Event<void>();
  #unsubscribe?: () => void = undefined;
  #sendJob?: UpdateScheduler = undefined;
  /** Bumped on reconnect, so a pass still waiting on the previous host changes nothing when it returns. */
  #generation = 0;
  #resubscribeAttempts = 0;

  readonly saveStateChanged = new Event<SaveStateChangedEvent<Id>>();

  /** Changes the host refused; each is also logged, and fails a flush waiting for it. */
  readonly editsRejected = new Event<EditsRejectedEvent<Id>>();

  constructor({
    host,
    createHandle,
    clientId,
    maxSendRate = MAX_SEND_RATE,
    resubscribeDelay = RESUBSCRIBE_DELAY_MS,
    pageEvents = defaultPageEvents(),
    errors,
  }: Options<Id, H>) {
    super();
    this.#host = host;
    this.#createHandle = createHandle;
    this.#clientId = clientId ?? randomId();
    this.#maxSendRate = maxSendRate;
    this.#resubscribeDelay = resubscribeDelay;
    this.#pageEvents = pageEvents;
    this.#closedError = errors?.closed ?? ((documentId) => new Error(`Repo is closed (document ${documentId})`));
    this.#refusedError =
      errors?.refused ?? ((documentId, changes) => new Error(`Host refused ${changes} changes to ${documentId}`));
  }

  get handles(): Record<string, H> {
    return this.#handles;
  }

  /** The handle of a document, created on first use; ready once the host's answer arrives. */
  find(documentId: Id): H {
    const existing = this.#handles[documentId];
    if (existing) {
      return existing;
    }
    this.#requireOpen(documentId);
    const handle = this.#newHandle({ documentId });
    this.#handles[documentId] = handle;
    this.#pendingRemove.delete(documentId);
    this.#follow(documentId);
    return handle;
  }

  /** A new document, readable and writable at once; its first change creates it on the host. */
  create(initialValue?: unknown): H {
    this.#requireOpen();
    const handle = this.#newHandle({ initialValue });
    const request = () => {
      const creation: Promise<void> = this.#host
        .createDocument(handle._creationChanges())
        .then(
          (documentId) => {
            if (handle.isDeleted) {
              this.#pendingRemove.add(documentId);
              this.#sendJob?.trigger();
              return;
            }
            handle._setDocumentId(documentId);
            this.#handles[documentId] = handle;
            this.#follow(documentId);
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

  /** Stops following a document with no unacknowledged changes. */
  release(documentId: Id): boolean {
    const handle = this.#handles[documentId];
    if (!handle || handle.hasPending) {
      return false;
    }
    handle.removeAllListeners();
    delete this.#handles[documentId];
    this.#pendingAdd.delete(documentId);
    this.#catchingUp.delete(documentId);
    this.#pendingRemove.add(documentId);
    this.#sendJob?.trigger();
    return true;
  }

  /**
   * Resolves once every change made before the call is saved by the host. With `storage`, also once
   * the host has stored every document this tab follows.
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

  /** Follows every document again with what this tab holds, so a new host sends only what it lacks. */
  async reconnect(): Promise<void> {
    this.#generation++;
    this.#unsubscribe?.();
    // A pass still waiting for the old subscription resumes and stops at its generation check.
    this.#subscriptionReady.wake();
    // The previous pass may be blocked on a call to a host that is gone; do not queue behind it.
    this.#sendJob = this.#createSendJob();
    // Answers owed on the old stream are lost with it.
    this.#catchingUp.clear();
    for (const documentId of Object.keys(this.#handles)) {
      this.#follow(documentId);
    }
    this.#subscribe();
    this.#sendJob?.trigger();
  }

  protected override async _open(): Promise<void> {
    this.#sendJob = this.#createSendJob();
    this.#subscribe();
    this.#pageEvents?.addEventListener('pagehide', this.#onPageHide);
  }

  protected override async _close(): Promise<void> {
    this.#pageEvents?.removeEventListener('pagehide', this.#onPageHide);
    for (const { handle, error } of this.#failedCreations.values()) {
      handle._failReady(error);
    }
    this.#failedCreations.clear();
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    await this.#sendJob?.join();
    this.#sendJob = undefined;
  }

  /** Asks the host to answer a document from what this tab holds, once until it answers. */
  #follow(documentId: string): void {
    if (this.#catchingUp.has(documentId)) {
      return;
    }
    this.#catchingUp.add(documentId);
    this.#pendingAdd.add(documentId);
    this.#sendJob?.trigger();
  }

  #requireOpen(documentId?: Id): void {
    if (!this.isOpen || !this.#sendJob) {
      throw this.#closedError(documentId);
    }
  }

  #newHandle(options: { documentId?: Id; initialValue?: unknown }): H {
    const handle: H = this.#createHandle({
      ...options,
      onDelete: () => {
        if (!handle.documentId) {
          this.#failedCreations.delete(handle._internalId);
        } else {
          delete this.#handles[handle.documentId];
          this.#pendingAdd.delete(handle.documentId);
          this.#catchingUp.delete(handle.documentId);
          this.#pendingRemove.add(handle.documentId);
          this.#sendJob?.trigger();
        }
      },
    });
    handle.outgoing.on(() => {
      this.#sendJob?.trigger();
      this.#emitSaveState();
    });
    handle.acknowledged.on(() => {
      this.#emitSaveState();
      this.#progress.emit();
    });
    handle.refused.on(({ hashes, reason }) => {
      const documentId = handle.documentId;
      if (!documentId) {
        return;
      }
      log.warn('tab changes refused', { documentId, changes: hashes.length, reason });
      this.editsRejected.emit({ documentId, hashes, reason });
      // Goes out before the acknowledgment that follows, which would otherwise let a waiting flush resolve.
      this.#failed.emit(this.#refusedError(documentId, hashes.length));
    });
    return handle;
  }

  #subscribe(): void {
    const generation = this.#generation;
    const ready = new Trigger();
    this.#subscriptionReady = ready;
    this.#subscriptionId = randomId();
    this.#unsubscribe = this.#host.subscribe(
      { subscriptionId: this.#subscriptionId, clientId: this.#clientId },
      {
        onEvents: (events) => {
          if (generation !== this.#generation) {
            // Late delivery from a replaced stream: its answers are for follows made again since.
            return;
          }
          this.#resubscribeAttempts = 0;
          ready.wake();
          for (const event of events) {
            const handle = this.#handles[event.documentId];
            handle?._receive(event);
            if (ANSWERS.has(event.type) && this.#catchingUp.delete(event.documentId)) {
              this.#progress.emit();
              this.#sendJob?.trigger();
            }
          }
        },
        onError: (err) => this.#onSubscriptionDropped(generation, err),
        onClose: () => this.#onSubscriptionDropped(generation),
      },
    );
  }

  /**
   * Replaces a subscription whose stream ended without this repo closing it, or whose update failed:
   * the host forgets the subscription with its stream, so every document is followed again, after a
   * backoff.
   */
  #onSubscriptionDropped(generation: number, err?: Error): void {
    if (!this.isOpen || generation !== this.#generation) {
      return;
    }
    log.warn('tab document subscription dropped, re-subscribing', { err });
    // The connection is gone now: a pass still using it stops at its generation check instead of
    // failing a flush, and its changes go again once the new subscription answers.
    const dropped = ++this.#generation;
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    this.#subscriptionReady = new Trigger();
    const delay = Math.min(this.#resubscribeDelay * 2 ** this.#resubscribeAttempts++, RESUBSCRIBE_MAX_DELAY_MS);
    scheduleTask(
      this._ctx,
      async () => {
        // A reconnect during the delay already replaced the stream.
        if (this.isOpen && dropped === this.#generation) {
          await this.reconnect();
        }
      },
      delay,
    );
  }

  #createSendJob(): UpdateScheduler {
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
          // Its work is redone against the new host: every document followed again.
          log('send pass for a replaced connection failed', { err });
        }
      },
      { maxFrequency: this.#maxSendRate },
    );
  }

  /** Sends what is queued at once, without waiting for the pass's slot, since the page may not survive. */
  readonly #onPageHide = (): void => {
    const batches = this.#takeBatches();
    if (batches.length > 0) {
      void this.#submit(batches, () => true).catch((err) => log('pagehide send failed', { err }));
    }
  };

  /**
   * Sends follows, then one batch per document with queued changes.
   * @param current False once a reconnect replaced the connection this pass uses.
   */
  async #sync(current: () => boolean): Promise<void> {
    await this.#subscriptionReady.wait({ timeout: SUBSCRIBE_TIMEOUT });
    if (!current()) {
      return;
    }
    if (this.#pendingAdd.size > 0 || this.#pendingRemove.size > 0) {
      // Read now, not when the follow was requested, so the answer is relative to what the tab holds.
      const add = [...this.#pendingAdd].map((documentId): Contract.Follow => {
        const heads = this.#handles[documentId]?._followHeads();
        return { documentId, ...(heads ? { heads } : {}) };
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
        // The host may have taken the request; a new subscription drops the old stream's answers.
        const error = err instanceof Error ? err : new Error(String(err));
        this.#failed.emit(error);
        this.#onSubscriptionDropped(this.#generation, error);
        return;
      }
      if (!current()) {
        return;
      }
    }
    const batches = this.#takeBatches();
    if (batches.length > 0) {
      await this.#submit(batches, current);
    }
  }

  /** The queued changes of every document the host has answered, which the caller now owns. */
  #takeBatches(): Contract.SubmitBatch[] {
    const batches: Contract.SubmitBatch[] = [];
    for (const handle of Object.values(this.#handles)) {
      if (!handle.documentId || this.#catchingUp.has(handle.documentId)) {
        continue;
      }
      const changes = handle._takeOutgoing();
      if (changes.length > 0) {
        batches.push({ documentId: handle.documentId, changes });
      }
    }
    return batches;
  }

  async #submit(batches: Contract.SubmitBatch[], current: () => boolean): Promise<void> {
    const giveBack = (documentId: string, changes: readonly Contract.Change[]) =>
      this.#handles[documentId]?._returnOutgoing(changes);
    let results: Contract.SubmitResult[];
    try {
      results = await this.#host.submit({ subscriptionId: this.#subscriptionId, batches });
    } catch (err) {
      for (const { documentId, changes } of batches) {
        giveBack(documentId, changes);
      }
      if (current()) {
        this.#failed.emit(err instanceof Error ? err : new Error(String(err)));
      }
      return;
    }
    for (const { documentId, status } of results) {
      if (status === 'unfollowed') {
        // Sent again once the host answers the document's follow.
        const batch = batches.find((batch) => batch.documentId === documentId);
        if (batch) {
          giveBack(documentId, batch.changes);
        }
        if (current() && this.#handles[documentId]) {
          this.#follow(documentId);
        }
      }
    }
  }

  /**
   * Waits until no handle has an unacknowledged change and every created document is named; rejects
   * if a send fails or a change is refused meanwhile. Documents the host cannot produce do not hold it up.
   */
  async #drain(signal: AbortSignal): Promise<void> {
    while (!signal.aborted) {
      const waiting = Object.values(this.#handles).filter(
        (handle) => handle.hasPending && handle.documentId && handle.state !== 'unavailable',
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
        this.#sendJob?.trigger();
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
