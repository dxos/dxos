//
// Copyright 2024 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type AnyDocumentId, type DocumentId, interpretAsDocumentId } from '@automerge/automerge-repo';

import { Event, UpdateScheduler } from '@dxos/async';
import { type Stream } from '@dxos/codec-protobuf/stream';
import { LifecycleState, Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { RpcClosedError, type Echo } from '@dxos/protocols';
import { trace } from '@dxos/tracing';

import { DocHandleProxy } from './doc-handle-proxy';
import * as EchoServicePb from '@dxos/protocols/buf/dxos/echo/service_pb';
import { create } from '@dxos/protocols/buf';

const MAX_UPDATE_FREQ = 10; // [updates/sec]
const RPC_TIMEOUT = 30_000;

/**
 * A proxy (thin client) to the Automerge Repo.
 * Inspired by Automerge's `Repo`.
 */
@trace.resource()
export class RepoProxy extends Resource {
  // TODO(mykola): Change to Map<string, DocHandleProxy<unknown>>.
  private _handles: Record<string, DocHandleProxy<any>> = {};
  private readonly _subscriptionId = PublicKey.random().toHex();
  /**
   * Subscription id which is used inside the DataService to identify the Client.
   */
  private _subscription?: Stream<EchoServicePb.BatchedDocumentUpdates> = undefined;

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
    private _dataService: Echo.DataService,
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

  async flush(): Promise<void> {
    // Wait for all creations to be completed.
    await Promise.all([...this._pendingCreations.values()]);
    // Wait for all updates to be sent.
    await this._sendUpdatesJob?.runBlocking();
  }

  protected override async _open(): Promise<void> {
    // TODO(dmaretskyi): Set proper space id.
    this._subscription = this._dataService.subscribe(
      create(EchoServicePb.SubscribeRequestSchema, {
        subscriptionId: this._subscriptionId,
        spaceId: this._spaceId,
      }),
    );
    this._sendUpdatesJob = new UpdateScheduler(this._ctx, async () => this._sendUpdates(), {
      maxFrequency: MAX_UPDATE_FREQ,
    });
    this._subscription.subscribe((updates) => this._receiveUpdate(updates));
  }

  protected override async _close(): Promise<void> {
    await this._sendUpdatesJob?.join();
    this._sendUpdatesJob = undefined;
    for (const handle of Object.values(this._handles)) {
      handle.off('change');
    }

    this._handles = {};
    await this._subscription?.close();
    this._subscription = undefined;
  }

  /**
   * Update the data service reference after reconnection.
   */
  _updateDataService(dataService: Echo.DataService): void {
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
    await this._subscription?.close();

    // Create new subscription and wait for it to be ready before calling updateSubscription.
    this._subscription = this._dataService.subscribe(
      create(EchoServicePb.SubscribeRequestSchema, {
        subscriptionId: this._subscriptionId,
        spaceId: this._spaceId,
      }),
    );

    // Wait for the subscription stream to be ready (services-side registration complete).
    await this._subscription.waitUntilReady();

    this._subscription.subscribe((updates) => this._receiveUpdate(updates));

    // Re-sync all existing documents.
    const documentIds = Object.keys(this._handles);
    if (documentIds.length > 0) {
      await this._dataService.updateSubscription(
        create(EchoServicePb.UpdateSubscriptionRequestSchema, {
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
    if (this._handles[documentId]) {
      return this._handles[documentId];
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
      this._sendUpdatesJob?.trigger();
      delete this._handles[documentId];
    };

    const handle = new DocHandleProxy<T>({ documentId, onDelete: cleanup });
    handle.on('change', onChange);
    this._handles[documentId] = handle;

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
      this._sendUpdatesJob?.trigger();
      delete this._handles[handle.documentId];
    };

    const handle = new DocHandleProxy<T>({ initialValue, onDelete: cleanup });
    handle.on('change', onChange);
    this._pendingCreations.set(
      handle._internalId,
      this._dataService
        .createDocument(
          create(EchoServicePb.CreateDocumentRequestSchema, {
            spaceId: this._spaceId,
            initialValue: initialValue as any,
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

  private _receiveUpdate({ updates }: EchoServicePb.BatchedDocumentUpdates): void {
    if (!updates || updates.length === 0) {
      return;
    }

    for (const update of updates) {
      const { documentId, mutation } = update;
      const handle = this._handles[documentId];
      if (!handle) {
        log.warn('Received update for unknown document', { documentId });
        continue;
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
      await this._dataService.updateSubscription(
        create(EchoServicePb.UpdateSubscriptionRequestSchema, {
          subscriptionId: this._subscriptionId,
          addIds: addIds.map((id) => id as string),
          removeIds: removeIds.map((id) => id as string),
        }),
        { timeout: RPC_TIMEOUT },
      );

      const updates: EchoServicePb.DocumentUpdate[] = [];
      const addMutations = (documentIds: DocumentId[]) => {
        for (const documentId of documentIds) {
          const handle = this._handles[documentId];
          invariant(handle, `No handle found for documentId ${documentId}`);
          const mutation = handle._getPendingChanges();
          if (mutation) {
            updates.push(create(EchoServicePb.DocumentUpdateSchema, { documentId, mutation }));
          }
        }
      };
      addMutations(updateIds);

      if (updates.length > 0) {
        await this._dataService.update(
          create(EchoServicePb.UpdateRequestSchema, {
            subscriptionId: this._subscriptionId,
            updates: updates.map((update) =>
              create(EchoServicePb.DocumentUpdateSchema, { documentId: update.documentId, mutation: update.mutation }),
            ),
          }),
          { timeout: RPC_TIMEOUT },
        );
        if (this._lifecycleState === LifecycleState.CLOSED) {
          return;
        }
        for (const { documentId } of updates) {
          this._handles[documentId]._confirmSync();
        }
      }

      this._emitSaveStateEvent();
    } catch (err) {
      // Don't restore pending updates if generation changed - this task is abandoned.
      const isAbandoned = generation !== this._generation;
      if (!isAbandoned) {
        // Restore the state of pending updates if the RPC call failed.
        addIds.forEach((id) => this._pendingAddIds.add(id as DocumentId));
        removeIds.forEach((id) => this._pendingRemoveIds.add(id as DocumentId));
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
