//
// Copyright 2024 DXOS.org
//

import { UpdateScheduler } from '@dxos/async';
import { next as A } from '@dxos/automerge/automerge';
import {
  type DocumentId,
  generateAutomergeUrl,
  parseAutomergeUrl,
  interpretAsDocumentId,
  type AnyDocumentId,
} from '@dxos/automerge/automerge-repo';
import { type Stream } from '@dxos/codec-protobuf';
import { Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  type DataService,
  type BatchedDocumentUpdates,
  type DocumentUpdate,
} from '@dxos/protocols/proto/dxos/echo/service';

import { DocHandleClient } from './doc-handle-client';

const MAX_UPDATE_FREQ = 10; // [updates/sec]
const RPC_TIMEOUT = 30_000;

/**
 * A client-side DocHandleClient-s manager.
 * Syncs with a Automerge Repo in shared worker.
 * Inspired by Automerge's `Repo`.
 */
export class RepoClient extends Resource {
  // TODO(mykola): Change to Map<string, DocHandleClient<unknown>>.
  private readonly _handles: Record<string, DocHandleClient<any>> = {};
  private readonly _subscriptionId = PublicKey.random().toHex();
  /**
   * Subscription id which is used inside the DataService to identify the Client.
   */
  private _subscription?: Stream<BatchedDocumentUpdates> = undefined;

  /**
   * Document ids that have pending updates.
   */
  private readonly _pendingWrites = new Set<DocumentId>();

  /**
   * Document ids pending for init mutation.
   */
  private readonly _pendingInitIds = new Set<DocumentId>();

  /**
   * Document ids that should be subscribed to.
   */
  private readonly _pendingAddIds = new Set<DocumentId>();

  /**
   * Document ids that should be unsubscribed from.
   */
  private readonly _pendingRemoveIds = new Set<DocumentId>();

  private _sendUpdatesJob?: UpdateScheduler = undefined;

  constructor(private readonly _dataService: DataService) {
    super();
  }

  get handles(): Record<string, DocHandleClient<any>> {
    return this._handles;
  }

  protected override async _open() {
    this._subscription = this._dataService.subscribe({ subscriptionId: this._subscriptionId });
    this._sendUpdatesJob = new UpdateScheduler(this._ctx, async () => this._sendUpdates(), {
      maxFrequency: MAX_UPDATE_FREQ,
    });
    this._subscription.subscribe((updates) => this._receiveUpdate(updates));
  }

  protected override async _close() {
    await this._sendUpdatesJob!.join();
    this._sendUpdatesJob = undefined;
    await this._subscription?.close();
  }

  create<T>(initialValue?: T): DocHandleClient<T> {
    // Generate a new UUID and store it in the buffer
    const { documentId } = parseAutomergeUrl(generateAutomergeUrl());
    const handle = this._getHandle<T>({
      documentId,
      isNew: true,
      initialValue,
    }) as DocHandleClient<T>;
    return handle;
  }

  find<T>(id: AnyDocumentId): DocHandleClient<T> {
    const documentId = interpretAsDocumentId(id);

    // If we have the handle cached, return it.
    if (this._handles[documentId]) {
      return this._handles[documentId] as DocHandleClient<T>;
    }

    const handle = this._getHandle<T>({
      documentId,
      isNew: false,
    }) as DocHandleClient<T>;
    return handle;
  }

  import<T>(dump: Uint8Array): DocHandleClient<T> {
    const handle = this.create<T>();
    handle.update(() => A.load(dump));

    return handle;
  }

  async flush() {
    await this._sendUpdatesJob!.blockingTrigger();
  }

  /** Returns an existing handle if we have it; creates one otherwise. */
  private _getHandle<T>({
    documentId,
    isNew,
    initialValue,
  }: {
    /** The documentId of the handle to look up or create */
    documentId: DocumentId;
    /** If we know we're creating a new document, specify this so we can have access to it immediately */
    isNew: boolean;
    initialValue?: T;
  }) {
    // If we have the handle cached, return it
    if (this._handles[documentId]) {
      return this._handles[documentId];
    }

    // If not, create a new handle, cache it, and return it
    if (!documentId) {
      throw new Error(`Invalid documentId ${documentId}`);
    }

    return this._createHandle<T>({ documentId, isNew, initialValue });
  }

  private _createHandle<T>({
    documentId,
    isNew,
    initialValue,
  }: {
    documentId: DocumentId;
    isNew: boolean;
    initialValue?: T;
  }): DocHandleClient<T> {
    const handle = new DocHandleClient<T>(
      documentId,
      { isNew, initialValue },
      {
        onDelete: () => {
          this._pendingRemoveIds.add(documentId);
          handle.off('change', onChange);
          this._sendUpdatesJob?.trigger();

          delete this._handles[documentId];
        },
      },
    );
    this._handles[documentId] = handle;

    const onChange = () => {
      this._pendingWrites.add(documentId);
      this._sendUpdatesJob!.trigger();
    };
    handle.on('change', onChange);
    this._ctx.onDispose(() => handle.off('change', onChange));

    if (!isNew) {
      this._pendingAddIds.add(documentId);
    } else {
      this._pendingInitIds.add(documentId);
    }
    this._sendUpdatesJob!.trigger();

    return handle;
  }

  private _receiveUpdate({ updates }: BatchedDocumentUpdates) {
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
      handle._incrementalUpdate(mutation);
    }
  }

  private async _sendUpdates() {
    // Update the subscription with the pending add and remove ids.
    {
      const addIds = Array.from(this._pendingAddIds);
      const removeIds = Array.from(this._pendingRemoveIds);
      this._pendingAddIds.clear();
      this._pendingRemoveIds.clear();
      await this._dataService.updateSubscription(
        { subscriptionId: this._subscriptionId, addIds, removeIds },
        { timeout: RPC_TIMEOUT },
      );
    }

    // Send the updates to the DataService.
    {
      const updates: DocumentUpdate[] = [];

      const addMutations = (documentIds: DocumentId[], isNew?: boolean) => {
        for (const documentId of documentIds) {
          const handle = this._handles[documentId];
          invariant(handle, `No handle found for documentId ${documentId}`);
          const mutation = handle._getNextMutation();
          if (mutation) {
            updates.push({ documentId, mutation, isNew });
          }
        }
      };

      const pendingInitIds = Array.from(this._pendingInitIds);
      const pendingWrites = Array.from(this._pendingWrites);
      this._pendingInitIds.clear();
      this._pendingWrites.clear();
      addMutations(pendingInitIds, true);
      addMutations(pendingWrites);

      if (updates.length > 0) {
        await this._dataService.write({ subscriptionId: this._subscriptionId, updates }, { timeout: RPC_TIMEOUT });
      }
    }
  }
}
