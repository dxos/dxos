//
// Copyright 2024 DXOS.org
//

import { DeferredTask, sleep } from '@dxos/async';
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
import {
  type DataService,
  type BatchedDocumentUpdates,
  type DocumentUpdate,
} from '@dxos/protocols/proto/dxos/echo/service';

import { DocHandleClient } from './doc-handle-client';

const UPDATE_BATCH_INTERVAL = 100;

export class RepoClient extends Resource {
  // TODO(mykola): Change to Map<string, DocHandleClient<unknown>>.
  private readonly _handles: Record<string, DocHandleClient<any>> = {};
  private readonly _subscriptionId = PublicKey.random().toHex();
  private _subscription?: Stream<BatchedDocumentUpdates> = undefined;

  private readonly _docsWithPendingUpdates = new Set<DocumentId>();
  private _checkAndSendUpdatesJob?: DeferredTask = undefined;

  constructor(private readonly _dataService: DataService) {
    super();
  }

  get handles(): Record<string, DocHandleClient<any>> {
    return this._handles;
  }

  protected override async _open() {
    this._subscription = this._dataService.subscribe({ subscriptionId: this._subscriptionId });
    this._checkAndSendUpdatesJob = new DeferredTask(this._ctx, async () => this._checkAndSendUpdates());
    this._subscription.subscribe((updates) => this._receiveUpdate(updates));
  }

  protected override async _close() {
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
          this._dataService
            .updateSubscription({
              subscriptionId: this._subscriptionId,
              removeIds: [documentId],
            })
            .catch((err) => this._ctx.raise(err));
          handle.off('change', onChange);

          delete this._handles[documentId];
        },
      },
    );
    this._handles[documentId] = handle;

    const onChange = () => {
      this._docsWithPendingUpdates.add(documentId);
      this._checkAndSendUpdatesJob!.schedule();
    };
    handle.on('change', onChange);
    this._ctx.onDispose(() => handle.off('change', onChange));

    if (!isNew) {
      this._dataService
        .updateSubscription({ subscriptionId: this._subscriptionId, addIds: [documentId] })
        .catch((err) => this._ctx.raise(err));
    } else {
      // Write the initial value to the server if document is new.
      this._dataService
        .write({
          subscriptionId: this._subscriptionId,
          updates: [{ documentId, mutation: handle._getNextMutation() ?? new Uint8Array(), isNew: true }],
        })
        .catch((err) => this._ctx.raise(err));
    }

    return handle;
  }

  private _receiveUpdate({ updates }: BatchedDocumentUpdates) {
    if (!updates) {
      return;
    }
    for (const update of updates) {
      const { documentId, mutation } = update;

      const handle = this._handles[documentId];
      invariant(handle, `No handle found for documentId ${documentId}`);
      handle._incrementalUpdate(mutation);
    }
  }

  private async _checkAndSendUpdates() {
    const updates: DocumentUpdate[] = [];

    const docsWithPendingUpdates = Array.from(this._docsWithPendingUpdates);
    this._docsWithPendingUpdates.clear();

    for (const documentId of docsWithPendingUpdates) {
      const handle = this._handles[documentId];
      invariant(handle, `No handle found for documentId ${documentId}`);
      const update = handle._getNextMutation();
      if (update) {
        updates.push({
          documentId,
          mutation: update,
        });
      }
    }

    if (updates.length > 0) {
      await this._dataService.write({ subscriptionId: this._subscriptionId, updates });
      await sleep(UPDATE_BATCH_INTERVAL);
    }
  }
}
