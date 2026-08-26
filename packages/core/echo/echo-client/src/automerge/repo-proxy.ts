//
// Copyright 2024 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type AnyDocumentId, type DocumentId, interpretAsDocumentId } from '@automerge/automerge-repo';
import * as Context from 'effect/Context';

import { Event, Trigger, UpdateScheduler, sleep } from '@dxos/async';
import { type Struct } from '@dxos/codec-protobuf';
import { LifecycleState, Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { RpcClosedError, runServiceCall, subscribeStream } from '@dxos/protocols';
import { type DataService } from '@dxos/protocols/rpc';

import { DocHandleProxy } from './doc-handle-proxy';

const MAX_UPDATE_FREQ = 10; // [updates/sec]
const RPC_TIMEOUT = 30_000;

/**
 * Passes {@link RepoProxy.flush} makes before reporting a batch as unsendable. A failed
 * `_sendUpdates` re-queues its batch, so each pass is a fresh attempt at the same work.
 */
const FLUSH_ATTEMPTS = 3;

/** Backoff between {@link FLUSH_ATTEMPTS}, multiplied by the attempt number. */
const FLUSH_RETRY_DELAY_MS = 50;

/**
 * A proxy (thin client) to the Automerge Repo.
 * Inspired by Automerge's `Repo`.
 */
export class RepoProxy extends Resource {
  // TODO(mykola): Change to Map<string, DocHandleProxy<unknown>>.
  private _handles: Record<string, DocHandleProxy<any>> = {};
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
   * Document ids that have pending updates.
   */
  private readonly _pendingUpdateIds = new Set<DocumentId>();

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

  readonly saveStateChanged = new Event<SaveStateChangedEvent>();

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

  /**
   * Drops a cached handle nothing holds any more and unsubscribes the host from its document.
   *
   * This is the only way a proxied document leaves memory: handles are otherwise kept for the life
   * of the space, so a client's footprint tracked every document it had ever opened. A handle with
   * changes the host has not taken yet is kept — releasing it would lose the write — and the next
   * `find` for the same id simply loads it again.
   *
   * @returns Whether the handle was released.
   */
  release(documentId: DocumentId): boolean {
    const handle = this._handles[documentId];
    if (!handle) {
      return false;
    }
    if (
      this._pendingUpdateIds.has(documentId) ||
      this._pendingCreations.has(handle._internalId) ||
      // The pending-id sets are cleared at the start of a send, so they go quiet while a mutation is
      // still in flight; the handle's own acknowledgement is what actually settles it.
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

  find<T>(id: AnyDocumentId): DocHandleProxy<T> {
    if (typeof id !== 'string') {
      throw new TypeError(`Invalid documentId ${id}`);
    }

    const documentId = interpretAsDocumentId(id);
    return this._getOrLoadHandle<T>({ documentId });
  }

  import<T>(dump: Uint8Array): DocHandleProxy<T> {
    const handle = this.create<T>();
    handle.update(() => A.load(dump));
    return handle;
  }

  create<T>(initialValue?: T): DocHandleProxy<T> {
    return this._createHandle<T>({ initialValue });
  }

  /**
   * Waits until every pending document creation and update has been handed to the host.
   *
   * Throws if a batch could not be sent. `_sendUpdates` re-queues a failed batch for the next pass,
   * but a short-lived writer (a server-side ECHO client in a worker invocation) is disposed as soon
   * as `flush()` resolves — so resolving over a re-queued batch loses the write silently.
   */
  async flush(): Promise<void> {
    // Wait for all creations to be completed.
    await Promise.all([...this._pendingCreations.values()]);
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
      await sleep(FLUSH_RETRY_DELAY_MS * attempt);
    }
  }

  protected override async _open(): Promise<void> {
    this._sendUpdatesJob = new UpdateScheduler(this._ctx, async () => this._sendUpdates(), {
      maxFrequency: MAX_UPDATE_FREQ,
    });
    // TODO(dmaretskyi): Set proper space id.
    this._subscriptionReady.reset();
    this._subscriptionCleanup = subscribeStream(
      this._runtime,
      this._dataService['DataService.subscribe']({ subscriptionId: this._subscriptionId, spaceId: this._spaceId }),
      { onData: (updates) => this._receiveUpdate(updates) },
    );
  }

  protected override async _close(): Promise<void> {
    await this._sendUpdatesJob?.join();
    this._sendUpdatesJob = undefined;
    for (const handle of Object.values(this._handles)) {
      handle.off('change');
    }

    this._handles = {};
    this._subscriptionCleanup?.();
    this._subscriptionCleanup = undefined;
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
    this._generation++;

    // Abandon the old scheduler - don't wait for it since it may be blocked on dead RPC.
    // Create a fresh scheduler that will use the new data service.
    // The old scheduler's task will eventually fail/timeout but we don't care.
    this._sendUpdatesJob = new UpdateScheduler(this._ctx, async () => this._sendUpdates(), {
      maxFrequency: MAX_UPDATE_FREQ,
    });

    // Close old subscription (this should cause old RPC calls to fail faster).
    this._subscriptionCleanup?.();

    // Create new subscription.
    this._subscriptionReady.reset();
    this._subscriptionCleanup = subscribeStream(
      this._runtime,
      this._dataService['DataService.subscribe']({ subscriptionId: this._subscriptionId, spaceId: this._spaceId }),
      { onData: (updates) => this._receiveUpdate(updates) },
    );

    // Re-sync all existing documents.
    const documentIds = Object.keys(this._handles);
    if (documentIds.length > 0) {
      await this._subscriptionReady.wait({ timeout: RPC_TIMEOUT });
      await runServiceCall(
        this._runtime,
        this._dataService['DataService.updateSubscription']({
          subscriptionId: this._subscriptionId,
          addIds: documentIds,
          removeIds: [],
        }),
        { timeout: RPC_TIMEOUT },
      );
    }

    // Reconnection complete, clear the flag.
    this._isReconnecting = false;
  }

  /** Returns an existing handle if we have it; creates one otherwise. */
  private _getOrLoadHandle<T>({
    documentId,
  }: {
    /** The documentId of the handle to look up or create. */
    documentId: DocumentId;
  }): DocHandleProxy<T> {
    // If we have the handle cached, return it
    const cached = this._handles[documentId];
    if (cached) {
      // A release refused earlier must not go through now that something holds this document again.
      this._deferredReleaseIds.delete(documentId);
      return cached;
    }
    // If not, create a new handle, cache it, and return it.
    if (!documentId) {
      throw new Error(`Invalid documentId ${documentId}`);
    }

    return this._loadHandle<T>({ documentId });
  }

  private _loadHandle<T>({ documentId }: { documentId: DocumentId }): DocHandleProxy<T> {
    invariant(this._lifecycleState === LifecycleState.OPEN);

    // TODO(burdon): Called even if not mutations.
    const onChange = () => {
      log('onChange', { documentId });
      this._pendingUpdateIds.add(documentId);
      this._sendUpdatesJob?.trigger();
      this._emitSaveStateEvent();
    };

    const cleanup = () => {
      log('onDelete', { documentId });
      handle.off('change', onChange);
      this._pendingRemoveIds.add(documentId);
      // Drop any pending update for this id; the handle is gone and `_sendUpdates`
      // would otherwise see a missing handle for an id it's still trying to send.
      this._pendingUpdateIds.delete(documentId);
      this._sendUpdatesJob?.trigger();
      delete this._handles[documentId];
    };

    const handle = new DocHandleProxy<T>({ documentId, onDelete: cleanup });
    handle.on('change', onChange);
    this._handles[documentId] = handle;

    // A queued unsubscribe for this id would otherwise travel in the same batch as this subscribe,
    // leaving the host unsubscribed from a document someone is now waiting for.
    this._pendingRemoveIds.delete(documentId);
    this._deferredReleaseIds.delete(documentId);
    this._pendingAddIds.add(documentId);
    this._sendUpdatesJob!.trigger();

    return handle;
  }

  private _createHandle<T>({ initialValue }: { initialValue?: T }): DocHandleProxy<T> {
    invariant(this._lifecycleState === LifecycleState.OPEN);

    const update = () => {
      // Called only when documentId is known (after onChange check or after creation).
      this._pendingUpdateIds.add(handle.documentId!);
      this._sendUpdatesJob?.trigger();
      this._emitSaveStateEvent();
    };

    // TODO(burdon): Called even if not mutations.
    const onChange = () => {
      // If the handle is still being created, do not trigger an update, it will be triggered when the creation is complete.
      if (handle.documentId == null) {
        return;
      }

      log('onChange', { documentId: handle.documentId, internalId: handle._internalId });
      update();
    };

    const cleanup = () => {
      log('onDelete', { documentId: handle.documentId, internalId: handle._internalId });
      handle.off('change', onChange);

      if (!handle.documentId) {
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
    this._pendingCreations.set(
      handle._internalId,
      runServiceCall(
        this._runtime,
        this._dataService['DataService.createDocument']({
          spaceId: this._spaceId,
          initialValue: initialValue as Struct,
        }),
        { timeout: RPC_TIMEOUT },
      )
        .then((response) => {
          const documentId = response.documentId as DocumentId;
          handle._setDocumentId(documentId);
          this._pendingAddIds.add(documentId);
          this._handles[documentId] = handle;
          update();
          handle._wakeReady();
        })
        .catch((err) => {
          log.catch(err);
          cleanup();
        })
        .finally(() => {
          this._pendingCreations.delete(handle._internalId);
        }),
    );

    return handle;
  }

  /** Retries the releases refused while a write was in flight, now that the send has settled. */
  private _releaseDeferred(): void {
    for (const documentId of [...this._deferredReleaseIds]) {
      this._deferredReleaseIds.delete(documentId);
      this.release(documentId);
    }
  }

  private _receiveUpdate({ updates }: DataService.BatchedDocumentUpdates): void {
    // The host opens every subscription with an empty batch once it is registered; a real update
    // always carries at least one entry, so this is unambiguous.
    this._subscriptionReady.wake();
    if (!updates) {
      return;
    }

    for (const update of updates) {
      const { documentId, mutation, requesting } = update;
      const handle = this._handles[documentId];
      if (!handle) {
        log.warn('Received update for unknown document', { documentId });
        continue;
      }

      // Disk-probe-negative signal from the worker. Mutually exclusive with
      // `mutation` in practice — the worker sends a transition-only update
      // first (`requesting: true`, no bytes) and then a regular mutation
      // update once the network delivers.
      if (requesting) {
        handle._markRequesting();
      }

      if (mutation) {
        handle._integrateHostUpdate(mutation);
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

    try {
      await this._subscriptionReady.wait({ timeout: RPC_TIMEOUT });
      await runServiceCall(
        this._runtime,
        this._dataService['DataService.updateSubscription']({
          subscriptionId: this._subscriptionId,
          addIds,
          removeIds,
        }),
        { timeout: RPC_TIMEOUT },
      );

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
          this._dataService['DataService.update']({ subscriptionId: this._subscriptionId, updates }),
          { timeout: RPC_TIMEOUT },
        );
        if (this._lifecycleState === LifecycleState.CLOSED) {
          return;
        }
        for (const { documentId } of updates) {
          // Handle may have been removed between RPC start and ack — skip silently.
          this._handles[documentId]?._confirmSync();
        }
      }

      this._releaseDeferred();
      this._emitSaveStateEvent();
    } catch (err) {
      // Don't restore pending updates if generation changed - this task is abandoned.
      const isAbandoned = generation !== this._generation;
      // Recorded even when the error is not raised below: `flush` still needs to know.
      if (!isAbandoned) {
        this._lastSendError = err as Error;
        this._sendFailureCount++;
      }
      if (!isAbandoned) {
        // Restore the state of pending updates if the RPC call failed.
        addIds.forEach((id) => this._pendingAddIds.add(id));
        removeIds.forEach((id) => this._pendingRemoveIds.add(id));
        updateIds.forEach((id) => this._pendingUpdateIds.add(id));
      }

      // Don't raise errors if we're closing, reconnecting, abandoned, or if the RPC connection was closed.
      // RpcClosedError and timeouts can happen during reconnection or shutdown before _close() is called.
      if (
        this._lifecycleState !== LifecycleState.CLOSED &&
        !this._isReconnecting &&
        !isAbandoned &&
        !(err instanceof RpcClosedError)
      ) {
        this._ctx.raise(err as Error);
      }
    }
  }

  private _emitSaveStateEvent(): void {
    const unsavedDocuments = Array.from(this._pendingUpdateIds);
    this.saveStateChanged.emit({ unsavedDocuments });
  }
}

export type SaveStateChangedEvent = {
  unsavedDocuments: DocumentId[];
};
