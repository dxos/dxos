//
// Copyright 2024 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type AnyDocumentId, type DocumentId, interpretAsDocumentId } from '@automerge/automerge-repo';

import { Event, UpdateScheduler } from '@dxos/async';
import { type Struct } from '@dxos/codec-protobuf';
import { type Stream } from '@dxos/codec-protobuf/stream';
import { LifecycleState, Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  type BatchedDocumentUpdates,
  type DataService,
  type DocumentUpdate,
} from '@dxos/protocols/proto/dxos/echo/service';
import { trace } from '@dxos/tracing';

import { DocHandleProxy } from './doc-handle-proxy';

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
  private _subscription?: Stream<BatchedDocumentUpdates> = undefined;

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

  readonly saveStateChanged = new Event<SaveStateChangedEvent>();

  constructor(
    private readonly _dataService: DataService,
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
    this._subscription = this._dataService.subscribe({
      subscriptionId: this._subscriptionId,
      spaceId: this._spaceId,
    });
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
      this._pendingUpdateIds.add(handle.documentId);
      this._sendUpdatesJob?.trigger();
      this._emitSaveStateEvent();
    };

    // TODO(burdon): Called even if not mutations.
    const onChange = () => {
      log('onChange', { documentId: handle.documentId, internalId: handle._internalId });

      // If the handle is still being created, do not trigger an update, it will be triggered when the creation is complete.
      if (!handle.documentId) {
        return;
      }

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
    this._pendingCreations.set(
      handle._internalId,
      this._dataService
        .createDocument(
          {
            spaceId: this._spaceId,
            initialValue: initialValue as Struct,
          },
          { timeout: RPC_TIMEOUT },
        )
        .then((response) => {
          handle._setDocumentId(response.documentId as DocumentId);
          this._pendingAddIds.add(handle.documentId);
          this._handles[handle.documentId] = handle;
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

  private _receiveUpdate({ updates }: BatchedDocumentUpdates): void {
    if (!updates) {
      return;
    }

    for (const update of updates) {
      const { documentId, mutation } = update;
      const handle = this._handles[documentId];
      if (!handle) {
        log.warn('Received update for unknown document', { documentId });
        continue;
      }

      handle._integrateHostUpdate(mutation);
    }
  }

  /**
   * Batching updates and sending them to the DataService.
   * Managing subscription state.
   */
  private async _sendUpdates(): Promise<void> {
    // Save current state of pending updates to avoid race conditions.
    const updateIds = Array.from(this._pendingUpdateIds);
    const addIds = Array.from(this._pendingAddIds);
    const removeIds = Array.from(this._pendingRemoveIds);

    this._pendingAddIds.clear();
    this._pendingRemoveIds.clear();
    this._pendingUpdateIds.clear();

    try {
      await this._dataService.updateSubscription(
        { subscriptionId: this._subscriptionId, addIds, removeIds },
        { timeout: RPC_TIMEOUT },
      );

      const updates: DocumentUpdate[] = [];
      const addMutations = (documentIds: DocumentId[]) => {
        for (const documentId of documentIds) {
          const handle = this._handles[documentId];
          invariant(handle, `No handle found for documentId ${documentId}`);
          const mutation = handle._getPendingChanges();
          if (mutation) {
            updates.push({ documentId, mutation });
          }
        }
      };
      addMutations(updateIds);

      if (updates.length > 0) {
        await this._dataService.update({ subscriptionId: this._subscriptionId, updates }, { timeout: RPC_TIMEOUT });
        if (this._lifecycleState === LifecycleState.CLOSED) {
          return;
        }
        for (const { documentId } of updates) {
          this._handles[documentId]._confirmSync();
        }
      }

      this._emitSaveStateEvent();
    } catch (err) {
      // Restore the state of pending updates if the RPC call failed.
      addIds.forEach((id) => this._pendingAddIds.add(id));
      removeIds.forEach((id) => this._pendingRemoveIds.add(id));
      updateIds.forEach((id) => this._pendingUpdateIds.add(id));

      this._ctx.raise(err as Error);
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
