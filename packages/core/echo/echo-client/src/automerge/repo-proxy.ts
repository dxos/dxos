//
// Copyright 2024 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type AnyDocumentId, type DocumentId } from '@automerge/automerge-repo';
import * as Context from 'effect/Context';
import * as Schema from 'effect/Schema';

import { Event, Trigger, UpdateScheduler, scheduleTask, sleep, yieldOrContinue } from '@dxos/async';
import { type Context as DxosContext, LifecycleState, Resource } from '@dxos/context';
import { PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { RpcClosedError, runServiceCall, subscribeStream } from '@dxos/protocols';
import { type DataService } from '@dxos/protocols/rpc';

import { CLOSE_REASON_ATTRIBUTE, RepoClosedError } from '../errors.ts';
import { type ChangeEvent, DocHandleProxy, type PassiveDirectory, type PassiveDocument } from './doc-handle-proxy.ts';
import { toDocumentId } from './document-id.ts';
import { sameHeads } from './heads.ts';

const MAX_UPDATE_FREQ = 10; // [updates/sec]
const RPC_TIMEOUT = 30_000;

/**
 * Batch size from which its documents are integrated as a bulk delivery, whose downstream fan-out
 * (query re-evaluation, index hydration) is coalesced rather than run per slice. Smaller batches are
 * the steady state — a peer's edit, the echo of a local write — and stay immediate.
 */
const BULK_BATCH_DOCUMENTS = 32;

/**
 * Passes {@link RepoProxy.flush} makes before reporting a batch as unsendable. A failed
 * `_sendUpdates` re-queues its batch, so each pass is a fresh attempt at the same work.
 */
const FLUSH_ATTEMPTS = 3;

/** Backoff between {@link FLUSH_ATTEMPTS}, multiplied by the attempt number. */
const FLUSH_RETRY_DELAY_MS = 50;

/** Delay before replacing a subscription the host dropped; doubled on each consecutive attempt. */
const RESUBSCRIBE_DELAY_MS = 250;

/** Cap on the {@link RESUBSCRIBE_DELAY_MS} backoff, so a host that stays down is still retried. */
const RESUBSCRIBE_MAX_DELAY_MS = 10_000;

/**
 * A proxy (thin client) to the Automerge Repo.
 * Inspired by Automerge's `Repo`.
 */
export class RepoProxy extends Resource {
  // TODO(mykola): Change to Map<string, DocHandleProxy<unknown>>.
  private _handles: Record<string, DocHandleProxy<any>> = {};
  private readonly _passiveHandles = new Map<DocumentId, DocHandleProxy<any>>();
  private readonly _subscriptionId = PublicKey.random().toHex();
  /**
   * Cleanup for the active document-updates subscription (identified inside the DataService by
   * {@link _subscriptionId}).
   */
  private _subscriptionCleanup?: () => void = undefined;

  /**
   * Woken by the first batch the host sends on `DataService.subscribe`, which it emits once the
   * subscription is registered. `updateSubscription` before that point fails with
   * "Subscription not found", since the host registers asynchronously.
   */
  private _subscriptionReady = new Trigger();

  private readonly _pendingCreations = new Map<string, Promise<void>>();

  /**
   * Creations the host did not take; the handle stays unready until {@link flushCreations} lands one.
   * An entry without `retry` was refused permanently: it is never requested again, and the next flush reports it.
   */
  private readonly _failedCreations = new Map<
    string,
    { handle: DocHandleProxy<any>; error: Error; attempts: number; retry?: () => void }
  >();

  /**
   * Document ids that have pending updates.
   */
  private readonly _pendingUpdateIds = new Set<DocumentId>();

  /**
   * Documents in this generation's batch that the host has not acknowledged yet. With
   * `_pendingUpdateIds`, every document whose changes exist only in this client.
   */
  private readonly _inFlightUpdateIds = new Set<DocumentId>();

  /**
   * Documents the host has taken a write for since a disk flush last took them: the only ones a disk
   * flush can find unsaved on this client's behalf.
   */
  private readonly _unflushedIds = new Set<DocumentId>();

  /** Disk flushes under way; a concurrent one waits for them, since one may carry its writes. */
  private readonly _diskFlushes = new Set<Promise<void>>();

  /**
   * Document ids that should be subscribed to.
   */
  private readonly _pendingAddIds = new Set<DocumentId>();

  /**
   * Document ids that should be unsubscribed from.
   */
  private readonly _pendingRemoveIds = new Set<DocumentId>();

  private _sendUpdatesJob?: UpdateScheduler = undefined;

  /**
   * Documents whose {@link release} was refused because a write was still in flight. Retried once
   * the send settles: nothing holds these handles any more, so a refusal that was never revisited
   * would keep the document resident for the life of the space.
   */
  private readonly _deferredReleaseIds = new Set<DocumentId>();

  /**
   * How a failed batch becomes visible to {@link flush} — `_sendUpdates` cannot throw. Each flush
   * attempt compares the counter before and after, so concurrent flushes cannot mask each other's
   * failure (a single cleared field would).
   */
  private _sendFailureCount = 0;
  private _lastSendError: Error | undefined = undefined;

  /**
   * Flag to indicate reconnection is in progress.
   * When true, in-flight _sendUpdates operations should abort early.
   */
  private _isReconnecting = false;

  /**
   * Generation counter that increments on each reconnection.
   * Used to identify and suppress errors from abandoned tasks.
   */
  private _generation = 0;

  /**
   * Consecutive attempts to replace a dropped subscription, backing off so a host that is gone for
   * good is not retried in a tight loop. Reset by the first batch the replacement delivers.
   */
  private _resubscribeAttempts = 0;

  /** Delay of the pending resubscribe, so {@link flush} waits out the actual backoff step. */
  private _resubscribeDelay = 0;

  /** Consecutive failed update batches, backing off the retry so a host that stays down is not hammered. */
  private _sendRetryAttempts = 0;

  /** Set while a retry is pending, so a burst of failed passes schedules one retry rather than many. */
  private _sendRetryScheduled = false;

  #inbox: { update: DataService.DocumentUpdate; bulk: boolean }[] = [];
  #inboxHead = 0;
  #draining = false;

  /**
   * What stopped the proxy taking work, recorded once when it does: a close, whose error's stack is the call site,
   * or the error that put it in the ERROR state. Carried by every later {@link RepoClosedError}.
   */
  #stoppedBy: { reason: string; error: Error } | undefined = undefined;

  readonly saveStateChanged = new Event<SaveStateChangedEvent>();
  private _lastSaveStateKey = '';

  constructor(
    private _dataService: DataService.Client,
    private readonly _runtime: Context.Context<never>,
    private readonly _spaceId: SpaceId,
  ) {
    super();
  }

  /**
   * Returns handles that are currently loaded excluding the ones that are being created right now.
   */
  get handles(): Record<string, DocHandleProxy<any>> {
    return this._handles;
  }

  get subscriptionId(): string {
    return this._subscriptionId;
  }

  /**
   * Drops a cached handle nothing holds any more and unsubscribes the host from its document. A passive
   * handle (stored changes nothing has loaded) never has an unsent change, so it always goes.
   *
   * This is the only way a proxied document leaves memory: handles are otherwise kept for the life
   * of the space, so a client's footprint tracked every document it had ever opened. A handle with
   * changes the host has not taken yet is kept — releasing it would lose the write — and the next
   * `find` for the same id simply loads it again.
   *
   * @returns Whether the handle was released.
   */
  release(documentId: DocumentId): boolean {
    if (this._passiveHandles.delete(documentId)) {
      this.#unsubscribe(documentId);
      return true;
    }
    const handle = this._handles[documentId];
    if (!handle) {
      return false;
    }
    if (
      this._pendingUpdateIds.has(documentId) ||
      this._pendingCreations.has(handle._internalId) ||
      // What the host has confirmed is what the handle's heads say; a handle still loading has confirmed nothing.
      !handle._isAcknowledged()
    ) {
      this._deferredReleaseIds.add(documentId);
      return false;
    }
    this._deferredReleaseIds.delete(documentId);

    // Every listener, not just this class's: the entity manager subscribes to each handle too, and a
    // released handle must not keep either alive.
    handle.off('change');
    delete this._handles[documentId];
    this._pendingAddIds.delete(documentId);
    this._pendingRemoveIds.add(documentId);
    this._sendUpdatesJob?.trigger();
    return true;
  }

  /**
   * With `passive`, bytes the client already holds: the subscribed handle if there is one, else a
   * passive one, which loads the bytes and subscribes from their heads when first used.
   *
   * With `directory`, a space directory: the held handle as it is, else a passive one, from `passive` or, without
   * it, empty until the host's first send (see {@link DocHandleProxy.whenPassiveShown}). Nothing is loaded.
   *
   * @throws {RepoClosedError} If the proxy is closing or closed — the document can never arrive, so
   * a caller whose work is abandonable should treat this as the client going away.
   */
  find<T>(
    id: AnyDocumentId,
    { passive, directory = false }: { passive?: PassiveDirectory; directory?: boolean } = {},
  ): DocHandleProxy<T> {
    if (typeof id !== 'string') {
      throw new TypeError(`Invalid documentId ${id}`);
    }

    const documentId = toDocumentId(id);
    if (directory && !passive) {
      this.#requireOpen(documentId);
      return (
        this._handles[documentId] ??
        this._passiveHandles.get(documentId) ??
        this._loadHandle<T>({ documentId, directory })
      );
    }
    if (passive) {
      this.#requireOpen(documentId);
      const held = this._handles[documentId] ?? this._passiveHandles.get(documentId);
      const heldHeads = held?.passiveHeads;
      if (held && heldHeads && !sameHeads(heldHeads, passive.heads)) {
        held._setPassive(passive);
        this.#subscribePassive(documentId);
      }
      return held ?? this._loadHandle<T>({ documentId, passive, directory });
    }
    return this._getOrLoadHandle<T>({ documentId });
  }

  /**
   * Moves a loaded handle back to stored changes, subscribed passive, leaving its document for collection.
   * Refused while the host has not taken the handle's last change, since the stored changes would not hold it.
   * @returns Whether the handle went passive.
   */
  deactivate(documentId: DocumentId, passive: PassiveDocument): boolean {
    const handle = this._handles[documentId];
    if (
      !handle ||
      this._pendingUpdateIds.has(documentId) ||
      this._pendingCreations.has(handle._internalId) ||
      !handle._isAcknowledged()
    ) {
      return false;
    }
    // Every listener, as in `release`: the entity manager attaches its own again when the document loads.
    handle.off('change');
    handle._setPassive(passive);
    delete this._handles[documentId];
    this._passiveHandles.set(documentId, handle);
    this._deferredReleaseIds.delete(documentId);
    this.#watchActivation(handle, documentId);
    this.#subscribePassive(documentId);
    return true;
  }

  import<T>(dump: Uint8Array): DocHandleProxy<T> {
    const handle = this.create<T>();
    handle.update(() => A.load(dump));
    return handle;
  }

  create<T>(initialValue?: T): DocHandleProxy<T> {
    return this._createHandle<T>({ initialValue });
  }

  /** Whether a change or a new document exists only in this client, so losing the page would lose it. */
  hasUnsavedChanges(): boolean {
    // A closed proxy has dropped its handles: whatever it never sent is already gone, and no save can bring it back.
    if (this._lifecycleState === LifecycleState.CLOSED) {
      return false;
    }
    return (
      this._pendingUpdateIds.size > 0 ||
      this._inFlightUpdateIds.size > 0 ||
      this._pendingCreations.size > 0 ||
      this._failedCreations.size > 0
    );
  }

  /**
   * Waits until every pending document creation and update has been handed to the host, and with
   * `disk`, until the host has saved the documents this client wrote.
   *
   * Throws if a batch could not be sent. `_sendUpdates` re-queues a failed batch for the next pass,
   * but a short-lived writer (a server-side ECHO client in a worker invocation) is disposed as soon
   * as `flush()` resolves — so resolving over a re-queued batch loses the write silently.
   */
  async flush({ disk = false }: { disk?: boolean } = {}): Promise<void> {
    await this._sendPending();
    if (disk) {
      await this._saveWritten();
    }
  }

  private async _sendPending(): Promise<void> {
    await this.flushCreations();
    // Wait for all updates to be sent, retrying a failed batch before giving up on it.
    for (let attempt = 1; ; attempt++) {
      const failuresBefore = this._sendFailureCount;
      await this._sendUpdatesJob?.runBlocking();
      if (this._sendFailureCount === failuresBefore) {
        return;
      }
      // Closing makes the remaining work moot.
      if (this._lifecycleState === LifecycleState.CLOSED) {
        return;
      }
      if (attempt >= FLUSH_ATTEMPTS) {
        throw this._lastSendError ?? new Error('Failed to send document updates.');
      }
      // A dropped subscription is replaced only after the scheduled backoff, so a shorter sleep
      // burns every attempt against a subscription known to be gone.
      await sleep(FLUSH_RETRY_DELAY_MS * attempt + (this._isReconnecting ? this._resubscribeDelay : 0));
    }
  }

  /**
   * Has the host save the documents this client wrote since the last disk flush. The host checks every
   * document it is given, so the set is kept to what changed.
   */
  private async _saveWritten(): Promise<void> {
    for (;;) {
      const inFlight = [...this._diskFlushes];
      const documentIds = [...this._unflushedIds];
      this._unflushedIds.clear();
      if (documentIds.length > 0) {
        const saved = runServiceCall(
          this._runtime,
          this._dataService,
          'DataService.flush',
          { documentIds },
          { timeout: RPC_TIMEOUT },
        ).catch((err) => {
          documentIds.forEach((documentId) => this._unflushedIds.add(documentId));
          throw err;
        });
        this._diskFlushes.add(saved);
        void saved.finally(() => this._diskFlushes.delete(saved)).catch(() => {});
        await saved;
      }
      // A failed flush returned its documents, which may include this caller's writes: take them again.
      const settled = await Promise.allSettled(inFlight);
      if (settled.every((result) => result.status === 'fulfilled')) {
        return;
      }
    }
  }

  /**
   * Waits until every pending document creation has reached the host, requesting again the ones it did not take.
   * Throws if one still cannot be created.
   */
  async flushCreations(): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      this._retryFailedCreations();
      await Promise.all([...this._pendingCreations.values()]);
      const failed = this._failedCreations.values().next().value;
      if (!failed || this._lifecycleState === LifecycleState.CLOSED) {
        return;
      }
      // Reported to one flush only, since a document that can never be created would fail every later one.
      const rejected = [...this._failedCreations].find(([, { retry }]) => retry === undefined);
      if (rejected) {
        this._failedCreations.delete(rejected[0]);
        this._emitSaveStateEvent();
        throw rejected[1].error;
      }
      if (attempt >= FLUSH_ATTEMPTS) {
        throw failed.error;
      }
      await sleep(FLUSH_RETRY_DELAY_MS * attempt);
    }
  }

  private _retryFailedCreations(): void {
    for (const [id, { retry }] of this._failedCreations) {
      if (retry === undefined) {
        continue;
      }
      this._failedCreations.delete(id);
      retry();
    }
  }

  /** @param ctx A {@link CLOSE_REASON_ATTRIBUTE} on it names why the proxy is closing. */
  override async close(ctx?: DxosContext): Promise<this> {
    if (this.isOpen && !this.#stoppedBy) {
      const given: string | undefined = ctx?.getAttribute(CLOSE_REASON_ATTRIBUTE);
      const reason = given ?? 'closed';
      this.#stoppedBy = { reason, error: new Error(`Repo proxy closed: ${reason}`) };
      // A close with no reason is routine teardown, too frequent to log above debug.
      if (given) {
        log.info('repo proxy closing', { spaceId: this._spaceId, reason });
      } else {
        log('repo proxy closing', { spaceId: this._spaceId, reason });
      }
    }
    return super.close(ctx);
  }

  protected override async _catch(err: Error): Promise<void> {
    if (!this.#stoppedBy) {
      this.#stoppedBy = { reason: 'error', error: err };
      log.warn('repo proxy stopped by an error', { spaceId: this._spaceId, error: err });
    }
    return super._catch(err);
  }

  #closedError(documentId?: DocumentId): RepoClosedError {
    return new RepoClosedError(
      { spaceId: this._spaceId, documentId, closeReason: this.#stoppedBy?.reason },
      { cause: this.#stoppedBy?.error },
    );
  }

  protected override async _open(): Promise<void> {
    this.#stoppedBy = undefined;
    // A close during the resubscribe or retry delay cancels the task that clears these flags.
    this._isReconnecting = false;
    this._sendRetryScheduled = false;
    this._sendRetryAttempts = 0;
    this._sendUpdatesJob = this._createSendUpdatesJob();
    // TODO(dmaretskyi): Set proper space id.
    this._subscribe();
    this._pageEvents('addEventListener');
  }

  protected override async _close(): Promise<void> {
    this._pageEvents('removeEventListener');
    await this._sendUpdatesJob?.join();
    this._sendUpdatesJob = undefined;
    for (const handle of Object.values(this._handles)) {
      handle.off('change');
      // A load in flight can never complete now; `Trigger` already marks its own promise handled, since a close
      // may fail a load nobody is awaiting.
      handle._failReady(this.#closedError(handle.documentId));
    }

    this._handles = {};
    this._passiveHandles.clear();
    for (const { handle, error } of this._failedCreations.values()) {
      handle.off('change');
      handle._failReady(error);
    }
    this._failedCreations.clear();
    this._pendingUpdateIds.clear();
    this._inFlightUpdateIds.clear();
    this._pendingCreations.clear();
    this._emitSaveStateEvent();
    this._subscriptionCleanup?.();
    this._subscriptionCleanup = undefined;
  }

  /**
   * A batch throttled to {@link MAX_UPDATE_FREQ} would not survive the page going away; sending it
   * as the page hides reaches the worker, which outlives the tab, within the handler's microtasks.
   */
  private readonly _onPageHide = () => {
    this._sendUpdatesJob?.forceTrigger();
  };

  /**
   * workerd's global scope is an EventTarget too, and there the listener would hold this proxy, and its
   * whole client, until close.
   */
  private _pageEvents(method: 'addEventListener' | 'removeEventListener'): void {
    if (typeof globalThis.document === 'undefined') {
      return;
    }
    globalThis[method]('pagehide', this._onPageHide);
  }

  /**
   * Update the data service reference after reconnection.
   */
  _updateDataService(dataService: DataService.Client): void {
    this._dataService = dataService;
  }

  /**
   * Handle reconnection to re-establish the data subscription.
   * Document handles are preserved since they hold local Automerge state.
   */
  async _onReconnect(): Promise<void> {
    log('re-establishing data subscription');

    // Signal reconnection to abort any in-flight _sendUpdates operations.
    // The old task will eventually timeout, but the catch block will suppress the error.
    this._isReconnecting = true;

    // Increment generation so old tasks know they're abandoned.
    this._abandonGeneration();

    // Abandon the old scheduler - don't wait for it since it may be blocked on dead RPC.
    // Create a fresh scheduler that will use the new data service.
    // The old scheduler's task will eventually fail/timeout but we don't care.
    this._sendUpdatesJob = this._createSendUpdatesJob();

    this._replaceSubscription();

    // Hands the documents `_subscribe` re-queued to the fresh subscription, raising if they cannot
    // be registered — the caller resumes replication on the strength of this call returning.
    await this.flush();
  }

  /**
   * Starts a new generation, handing back the documents the old one had in flight: they went to a
   * subscription or host being replaced, which may never answer, and the replacement applies a
   * duplicate idempotently.
   */
  private _abandonGeneration(): void {
    this._generation++;
    for (const documentId of this._inFlightUpdateIds) {
      this._pendingUpdateIds.add(documentId);
    }
    this._inFlightUpdateIds.clear();
  }

  private _createSendUpdatesJob(): UpdateScheduler {
    return new UpdateScheduler(this._ctx, async () => this._sendUpdates(), { maxFrequency: MAX_UPDATE_FREQ });
  }

  /** Left set by a throwing `_subscribe`, `_sendUpdates` would early-out for the life of the space. */
  private _replaceSubscription(): void {
    try {
      this._subscribe();
    } finally {
      this._isReconnecting = false;
    }
  }

  /**
   * Opens the document-updates subscription and queues every held document for registration with it.
   * The host forgets a subscription as soon as its stream ends, so a replacement starts from an
   * empty document set.
   */
  private _subscribe(): void {
    // Closing the previous stream first makes its outstanding RPC calls fail fast.
    this._subscriptionCleanup?.();
    // Wake before re-arming: `reset` abandons parked waiters, and a `_sendUpdates` stranded on the
    // old trigger holds the scheduler until its RPC timeout.
    this._subscriptionReady.wake();
    this._subscriptionReady.reset();
    this._subscriptionCleanup = subscribeStream(
      this._runtime,
      this._dataService['DataService.subscribe']({ subscriptionId: this._subscriptionId, spaceId: this._spaceId }),
      {
        onData: (updates) => this._receiveUpdate(updates),
        onError: (error) => this._onSubscriptionDropped(error),
        onClose: () => this._onSubscriptionDropped(),
      },
    );

    // Queued rather than sent directly so a failed pass is retried by the scheduler with the rest of
    // the batch.
    for (const handle of Object.values(this._handles)) {
      const documentId = handle.documentId;
      if (documentId) {
        this._pendingRemoveIds.delete(documentId);
        this._pendingAddIds.add(documentId);
      }
    }
    for (const documentId of this._passiveHandles.keys()) {
      this._pendingRemoveIds.delete(documentId);
      this._pendingAddIds.add(documentId);
    }
  }

  /**
   * Replaces a subscription whose stream ended without this proxy closing it (a host restart, a
   * dropped transport): the host forgets the subscription with the stream, so every later call on
   * the id would fail with "Subscription not found". Not reached for a stream this proxy tore down
   * itself — {@link subscribeStream}'s cleanup marks the subscription done before interrupting it.
   */
  private _onSubscriptionDropped(error?: Error): void {
    if (this._ctx.disposed || this._isReconnecting) {
      return;
    }

    log.warn('document subscription dropped, re-subscribing', { spaceId: this._spaceId, error });
    // Keeps the scheduler idle until the replacement is in place.
    this._isReconnecting = true;
    // Abandons the batch racing the dead subscription, so it re-queues quietly instead of raising.
    this._abandonGeneration();
    const generation = this._generation;
    this._resubscribeDelay = Math.min(
      RESUBSCRIBE_DELAY_MS * 2 ** this._resubscribeAttempts++,
      RESUBSCRIBE_MAX_DELAY_MS,
    );
    scheduleTask(
      this._ctx,
      () => {
        // A reconnect that ran during the delay already replaced the subscription.
        if (this._generation !== generation) {
          return;
        }
        this._replaceSubscription();
        this._sendUpdatesJob?.trigger();
      },
      this._resubscribeDelay,
    );
  }

  /** Returns an existing handle if we have it; creates one otherwise. */
  private _getOrLoadHandle<T>({
    documentId,
  }: {
    /** The documentId of the handle to look up or create. */
    documentId: DocumentId;
  }): DocHandleProxy<T> {
    // Before the cache, so a cached hit cannot escape the contract `find` documents: once closing
    // has begun the handle can never reach the host, whether or not it was loaded earlier.
    this.#requireOpen(documentId);

    // If we have the handle cached, return it
    const cached = this._handles[documentId];
    if (cached) {
      // A release refused earlier must not go through now that something holds this document again.
      this._deferredReleaseIds.delete(documentId);
      return cached;
    }
    const passive = this._passiveHandles.get(documentId);
    if (passive) {
      passive._activate();
      return passive;
    }
    // If not, create a new handle, cache it, and return it.
    if (!documentId) {
      throw new Error(`Invalid documentId ${documentId}`);
    }

    return this._loadHandle<T>({ documentId });
  }

  /**
   * `isOpen` rather than the lifecycle state alone: `Resource` holds that at OPEN for the whole of
   * `close()`, and only `isOpen` also accounts for the close already being under way. The update job
   * is checked too, since it is the only route a handle has to the host and `_close` drops it.
   *
   * @throws {RepoClosedError}
   */
  #requireOpen(documentId?: DocumentId): UpdateScheduler {
    if (!this.isOpen || !this._sendUpdatesJob) {
      throw this.#closedError(documentId);
    }
    return this._sendUpdatesJob;
  }

  /** @throws {RepoClosedError} */
  private _loadHandle<T>({
    documentId,
    passive,
    directory = false,
  }: {
    documentId: DocumentId;
    passive?: PassiveDirectory;
    directory?: boolean;
  }): DocHandleProxy<T> {
    this.#requireOpen(documentId);
    const handle: DocHandleProxy<T> = new DocHandleProxy<T>({
      documentId,
      passive,
      directory: directory && { json: passive?.json },
      onDelete: () => {
        log('onDelete', { documentId });
        handle.off('change', this.#onHandleChange);
        this._pendingRemoveIds.add(documentId);
        // Drop any pending update for this id; the handle is gone and `_sendUpdates`
        // would otherwise see a missing handle for an id it's still trying to send.
        this._pendingUpdateIds.delete(documentId);
        this._pendingAddIds.delete(documentId);
        this._sendUpdatesJob?.trigger();
        delete this._handles[documentId];
        this._passiveHandles.delete(documentId);
      },
    });
    if (passive || directory) {
      this._passiveHandles.set(documentId, handle);
      this.#watchActivation(handle, documentId);
      this.#subscribePassive(documentId);
    } else {
      this.#subscribeHandle(handle, documentId);
    }
    return handle;
  }

  /** Subscribes a passive handle as loaded once it loads, unless it was released meanwhile. */
  #watchActivation(handle: DocHandleProxy<any>, documentId: DocumentId): void {
    handle.once('activated', () => {
      if (this._passiveHandles.get(documentId) === handle) {
        this.#subscribeHandle(handle, documentId);
      }
    });
  }

  #subscribePassive(documentId: DocumentId): void {
    this._pendingRemoveIds.delete(documentId);
    this._pendingAddIds.add(documentId);
    this._sendUpdatesJob?.trigger();
  }

  #unsubscribe(documentId: DocumentId): void {
    this._pendingAddIds.delete(documentId);
    this._pendingRemoveIds.add(documentId);
    this._sendUpdatesJob?.trigger();
  }

  #subscribeHandle(handle: DocHandleProxy<any>, documentId: DocumentId): void {
    handle.on('change', this.#onHandleChange);
    this._handles[documentId] = handle;
    this._passiveHandles.delete(documentId);
    // A queued unsubscribe for this id would otherwise travel in the same batch as this subscribe,
    // leaving the host unsubscribed from a document someone is now waiting for.
    this._pendingRemoveIds.delete(documentId);
    this._deferredReleaseIds.delete(documentId);
    this._pendingAddIds.add(documentId);
    this._sendUpdatesJob?.trigger();
  }

  readonly #onHandleChange = ({ handle, patchInfo }: ChangeEvent<any>) => {
    const documentId = handle.documentId;
    if (patchInfo.source !== 'change' || !documentId) {
      return;
    }
    log('onChange', { documentId });
    this._pendingUpdateIds.add(documentId);
    this._sendUpdatesJob?.trigger();
    this._emitSaveStateEvent();
  };

  /** @throws {RepoClosedError} */
  private _createHandle<T>({ initialValue }: { initialValue?: T }): DocHandleProxy<T> {
    this.#requireOpen();

    const update = () => {
      // Called only when documentId is known (after onChange check or after creation).
      this._pendingUpdateIds.add(handle.documentId!);
      this._sendUpdatesJob?.trigger();
      this._emitSaveStateEvent();
    };

    const onChange = ({ patchInfo }: ChangeEvent<T>) => {
      if (handle.documentId == null || patchInfo.source !== 'change') {
        return;
      }

      log('onChange', { documentId: handle.documentId, internalId: handle._internalId });
      update();
    };

    let deleted = false;
    const cleanup = () => {
      log('onDelete', { documentId: handle.documentId, internalId: handle._internalId });
      deleted = true;
      handle.off('change', onChange);

      if (!handle.documentId) {
        this._failedCreations.delete(handle._internalId);
        return;
      }

      this._pendingRemoveIds.add(handle.documentId);
      // Drop any pending update for this id; see `_loadHandle` for rationale.
      this._pendingUpdateIds.delete(handle.documentId);
      this._sendUpdatesJob?.trigger();
      delete this._handles[handle.documentId];
    };

    const handle = new DocHandleProxy<T>({ initialValue, onDelete: cleanup });
    handle.on('change', onChange);
    const request = (attempt: number) => {
      const creation: Promise<void> = runServiceCall(
        this._runtime,
        this._dataService,
        'DataService.createDocument',
        {
          spaceId: this._spaceId,
          // Bytes of the handle's own doc, so the host takes its history rather than building a second copy
          // of the initial state, and Automerge values (`RawString`, bytes) need no JSON encoding.
          ...(initialValue === undefined ? {} : { initialDocument: A.save(handle.doc()) }),
        },
        { timeout: RPC_TIMEOUT },
      )
        .then(
          (response) => {
            const documentId = response.documentId as DocumentId;
            if (deleted) {
              this._pendingRemoveIds.add(documentId);
              this._sendUpdatesJob?.trigger();
              return;
            }
            handle._setDocumentId(documentId);
            this._unflushedIds.add(documentId);
            this._pendingAddIds.add(documentId);
            this._handles[documentId] = handle;
            update();
            handle._wakeReady();
          },
          // A failed call leaves the handle unbound; an error after the host returned a document must not discard it.
          (err) => {
            if (this._lifecycleState === LifecycleState.CLOSED) {
              handle._failReady(err);
              cleanup();
              return;
            }
            if (deleted) {
              return;
            }
            // A payload the transport cannot encode is refused identically on every attempt.
            const permanent = Schema.isSchemaError(err);
            if (attempt === 1 && !(err instanceof RpcClosedError)) {
              log.catch(err);
            } else {
              log('document creation failed again', { attempt, err });
            }
            this._failedCreations.set(handle._internalId, {
              handle,
              error: err,
              attempts: attempt,
              retry: permanent ? undefined : () => request(attempt + 1),
            });
            if (permanent) {
              handle._failReady(err);
            } else {
              this._scheduleSendRetry();
            }
            this._emitSaveStateEvent();
          },
        )
        .catch((err) => log.catch(err))
        .finally(() => {
          if (this._pendingCreations.get(handle._internalId) === creation) {
            this._pendingCreations.delete(handle._internalId);
            this._emitSaveStateEvent();
          }
        });
      this._pendingCreations.set(handle._internalId, creation);
      this._emitSaveStateEvent();
    };
    request(1);

    return handle;
  }

  /** Retries the releases refused while a write was in flight, now that the send has settled. */
  private _releaseDeferred(): void {
    for (const documentId of [...this._deferredReleaseIds]) {
      this._deferredReleaseIds.delete(documentId);
      this.release(documentId);
    }
  }

  /** @internal */
  _receiveUpdate({ updates }: DataService.BatchedDocumentUpdates): void {
    // The host opens every subscription with an empty batch once it is registered; a real update
    // always carries at least one entry, so this is unambiguous.
    this._subscriptionReady.wake();
    // A batch proves the subscription is live, so the next drop starts from the shortest backoff.
    this._resubscribeAttempts = 0;
    if (!updates) {
      return;
    }

    const bulk = updates.length >= BULK_BATCH_DOCUMENTS;
    for (const update of updates) {
      this.#inbox.push({ update, bulk });
    }
    void this.#drainInbox();
  }

  /**
   * Integrates queued updates in arrival order, yielding between slices so the batch's size sets how
   * long the work takes, not how long the thread is blocked. The first slice runs synchronously.
   */
  async #drainInbox(): Promise<void> {
    if (this.#draining) {
      return;
    }
    this.#draining = true;
    try {
      while (this.#inboxHead < this.#inbox.length && !this._ctx.disposed) {
        const { update, bulk } = this.#inbox[this.#inboxHead++];
        this.#integrate(update, bulk);
        if (this.#inboxHead < this.#inbox.length) {
          await yieldOrContinue('smooth');
        }
      }
    } finally {
      this.#inbox = [];
      this.#inboxHead = 0;
      this.#draining = false;
    }
  }

  #integrate(
    { documentId, mutation, requesting, unavailable, passive }: DataService.DocumentUpdate,
    bulk: boolean,
  ): void {
    const passiveHandle = this._passiveHandles.get(documentId as DocumentId);
    if (passiveHandle) {
      // A passive directory waiting on the host's first send fails its waiter rather than waiting forever.
      if (unavailable && !mutation) {
        passiveHandle._failPassiveWait(documentId);
        return;
      }
      try {
        passiveHandle._integratePassiveUpdate(mutation, passive);
      } catch (err) {
        log.catch(err, { documentId });
      }
      return;
    }
    const handle = this._handles[documentId];
    if (!handle) {
      log.warn('Received update for unknown document', { documentId });
      return;
    }

    // Disk-probe-negative signal from the worker. Mutually exclusive with
    // `mutation` in practice — the worker sends a transition-only update
    // first (`requesting: true`, no bytes) and then a regular mutation
    // update once the network delivers.
    if (requesting) {
      handle._markRequesting();
    }

    // The host has no bytes and nothing to fetch them from, so the handle is failed rather than
    // left waiting; bytes that turn up later (replication catching up) still take it to `'ready'`.
    if (unavailable) {
      log.warn('host cannot produce document', { documentId, spaceId: this._spaceId });
      handle._markUnavailable(documentId);
    }

    if (mutation) {
      try {
        handle._integrateHostUpdate(mutation, { bulk });
      } catch (err) {
        // One bad document must not strand every update queued behind it.
        log.catch(err, { documentId });
      }
    }
  }

  /**
   * Batching updates and sending them to the DataService.
   * Managing subscription state.
   */
  private async _sendUpdates(): Promise<void> {
    // Abort early if reconnection is in progress to avoid blocking on dead RPC.
    if (this._isReconnecting) {
      // Counted as a failed pass: `flush` must keep retrying rather than resolve over work the
      // replacement subscription has not taken yet.
      if (this._pendingUpdateIds.size || this._pendingAddIds.size || this._pendingRemoveIds.size) {
        this._lastSendError = new Error('Subscription is being re-established.');
        this._sendFailureCount++;
      }
      return;
    }

    // Capture current generation to detect if reconnection happens during this task.
    const generation = this._generation;

    // Save current state of pending updates to avoid race conditions.
    const updateIds = Array.from(this._pendingUpdateIds);
    const addIds = Array.from(this._pendingAddIds);
    const removeIds = Array.from(this._pendingRemoveIds);

    this._pendingAddIds.clear();
    this._pendingRemoveIds.clear();
    this._pendingUpdateIds.clear();
    for (const documentId of updateIds) {
      this._inFlightUpdateIds.add(documentId);
    }

    try {
      await this._subscriptionReady.wait({ timeout: RPC_TIMEOUT });
      // Read from the handles now, so an add re-queued meanwhile carries what the handle holds.
      const add = addIds.flatMap((id) => {
        const handle = this._handles[id] ?? this._passiveHandles.get(id);
        return handle ? [{ id, ...handle._subscription() }] : [];
      });
      // A round trip a batch of plain mutations does not need, and one a hiding page cannot afford.
      if (add.length > 0 || removeIds.length > 0) {
        await runServiceCall(
          this._runtime,
          this._dataService,
          'DataService.updateSubscription',
          {
            subscriptionId: this._subscriptionId,
            add,
            removeIds,
          },
          { timeout: RPC_TIMEOUT },
        );
      }

      const updates: DataService.DocumentUpdate[] = [];
      const addMutations = (documentIds: DocumentId[]) => {
        for (const documentId of documentIds) {
          const handle = this._handles[documentId];
          // The handle may be gone if it was removed concurrently (e.g. test teardown
          // racing with an in-flight scheduler tick). Skip — the corresponding
          // `_pendingRemoveIds` entry will tell the host to drop the subscription.
          if (!handle) {
            log('skipping update for removed handle', { documentId });
            continue;
          }
          const mutation = handle._getPendingChanges();
          if (mutation) {
            updates.push({ documentId, mutation });
          }
        }
      };
      addMutations(updateIds);

      if (updates.length > 0) {
        await runServiceCall(
          this._runtime,
          this._dataService,
          'DataService.update',
          { subscriptionId: this._subscriptionId, updates },
          { timeout: RPC_TIMEOUT },
        );
        updates.forEach(({ documentId }) => this._unflushedIds.add(documentId as DocumentId));
        if (this._lifecycleState === LifecycleState.CLOSED) {
          return;
        }
        // A pass a reconnect abandoned must not `_confirmSync`: a newer pass may have advanced the
        // handles' in-flight heads, and confirming those would suppress that pass's retry. Its ids
        // are re-queued instead — the host applies the duplicate delivery idempotently.
        if (generation !== this._generation) {
          updateIds.forEach((id) => this._pendingUpdateIds.add(id));
          this._sendUpdatesJob?.trigger();
          return;
        }
        for (const { documentId } of updates) {
          // Handle may have been removed between RPC start and ack — skip silently.
          this._handles[documentId]?._confirmSync();
        }
      }

      this._sendRetryAttempts = 0;
      this._releaseDeferred();
    } catch (err) {
      // A reconnect replaced the subscription under this task, so its failure is not raised below.
      const isAbandoned = generation !== this._generation;
      // Recorded even for an abandoned task: `flush` must see the counter move for the re-queued ids.
      this._lastSendError = err as Error;
      this._sendFailureCount++;
      // Re-queued even for an abandoned task: nothing else re-sends a pending mutation. Adds are
      // restored only for handles still held — a released document's add would re-subscribe the
      // host to a document nothing owns.
      addIds
        .filter((id) => this._handles[id] || this._passiveHandles.has(id))
        .forEach((id) => this._pendingAddIds.add(id));
      removeIds
        .filter((id) => !this._handles[id] && !this._passiveHandles.has(id))
        .forEach((id) => this._pendingRemoveIds.add(id));
      updateIds.forEach((id) => this._pendingUpdateIds.add(id));

      // Closing, reconnecting, an abandoned pass and a closed RPC connection each have their own path
      // that re-sends the batch; RpcClosedError and timeouts can happen before _close() is called.
      if (
        this._lifecycleState !== LifecycleState.CLOSED &&
        !this._isReconnecting &&
        !isAbandoned &&
        !(err instanceof RpcClosedError)
      ) {
        // Raised into the context instead, the failure would leave the proxy in its ERROR state, where
        // every later create and find is refused as closed until the page reloads.
        log.warn('failed to send document updates, retrying', {
          spaceId: this._spaceId,
          documents: updateIds.length,
          attempt: this._sendRetryAttempts + 1,
          error: err,
        });
        this._scheduleSendRetry();
      }
    } finally {
      // Settled either way: acknowledged, or re-queued into `_pendingUpdateIds` by the catch above.
      // An abandoned pass's ids were handed back when its generation was.
      if (generation === this._generation) {
        for (const documentId of updateIds) {
          this._inFlightUpdateIds.delete(documentId);
        }
      }
      this._emitSaveStateEvent();
    }
  }

  /** Re-runs the re-queued batch after a backoff, since nothing else triggers it if no further write comes. */
  private _scheduleSendRetry(): void {
    if (this._sendRetryScheduled) {
      return;
    }
    this._sendRetryScheduled = true;
    // A successful update pass resets `_sendRetryAttempts`, so a creation the host keeps refusing backs off on its own count.
    const creationAttempts = Math.max(0, ...Array.from(this._failedCreations.values(), ({ attempts }) => attempts));
    const delay = Math.min(
      RESUBSCRIBE_DELAY_MS * 2 ** Math.max(this._sendRetryAttempts++, creationAttempts - 1),
      RESUBSCRIBE_MAX_DELAY_MS,
    );
    scheduleTask(
      this._ctx,
      () => {
        this._sendRetryScheduled = false;
        this._retryFailedCreations();
        this._sendUpdatesJob?.trigger();
      },
      delay,
    );
  }

  private _emitSaveStateEvent(): void {
    if (this._lifecycleState === LifecycleState.CLOSED) {
      return;
    }
    const unsavedDocuments = Array.from(new Set([...this._pendingUpdateIds, ...this._inFlightUpdateIds])).sort();
    const pendingCreations = this._pendingCreations.size + this._failedCreations.size;
    // Retries back off only after a send failed outright; a failed pass with no changes in it loses nothing.
    const failing = (this._sendRetryAttempts > 0 && unsavedDocuments.length > 0) || this._failedCreations.size > 0;
    const key = `${unsavedDocuments.join(',')}|${pendingCreations}|${failing}`;
    if (key === this._lastSaveStateKey) {
      return;
    }
    this._lastSaveStateKey = key;
    this.saveStateChanged.emit({ unsavedDocuments, pendingCreations, failing });
  }
}

export type SaveStateChangedEvent = {
  /** Documents with changes the host has not acknowledged. */
  unsavedDocuments: DocumentId[];
  /** New documents the host has not created yet. */
  pendingCreations: number;
  /** Whether the last attempt to hand changes to the host failed. */
  failing: boolean;
};
