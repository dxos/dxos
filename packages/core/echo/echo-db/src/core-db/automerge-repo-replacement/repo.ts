//
// Copyright 2024 DXOS.org
//

import { DeferredTask, sleep } from '@dxos/async';
import {
  type DocumentId,
  generateAutomergeUrl,
  parseAutomergeUrl,
  interpretAsDocumentId,
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

import { DocHandleReplacement } from './doc-handle';

const UPDATE_BATCH_INTERVAL = 100;

export class RepoReplacement extends Resource {
  // TODO(mykola): Change to Map<string, DocHandleReplacement<unknown>>.
  private readonly _handles: Record<string, DocHandleReplacement<any>> = {};
  private readonly _subscriptionId = PublicKey.random().toHex();
  private _subscription?: Stream<BatchedDocumentUpdates> = undefined;

  private readonly _docsWithPendingUpdates = new Set<DocumentId>();
  private readonly _writeJob = new DeferredTask(this._ctx, async () => {
    const updates: DocumentUpdate[] = [];

    const docsWithPendingUpdates = Array.from(this._docsWithPendingUpdates);
    this._docsWithPendingUpdates.clear();

    for (const documentId of docsWithPendingUpdates) {
      const handle = this._handles[documentId];
      invariant(handle, `No handle found for documentId ${documentId}`);
      const update = handle._getLastWriteMutation();
      if (update) {
        updates.push({
          documentId,
          mutation: update,
        });
      }
    }

    if (updates.length > 0) {
      await this._dataService.write({ updates });
      await sleep(UPDATE_BATCH_INTERVAL);
    }
  });

  constructor(private readonly _dataService: DataService) {
    super();
  }

  get handles(): Record<string, DocHandleReplacement<any>> {
    return this._handles;
  }

  protected override async _open() {
    this._subscription = this._dataService.subscribe({ subscriptionId: this._subscriptionId });
    await this._subscription.waitUntilReady();
    this._subscription.subscribe((updates) => this._receiveUpdate(updates));
  }

  protected override async _close() {
    await this._subscription?.close();
  }

  create<T>(initialValue?: T): DocHandleReplacement<T> {
    // Generate a new UUID and store it in the buffer
    const { documentId } = parseAutomergeUrl(generateAutomergeUrl());
    const handle = this._getHandle<T>({
      documentId,
      isNew: true,
      initialValue,
    }) as DocHandleReplacement<T>;
    return handle;
  }

  find<T>(id: DocumentId): DocHandleReplacement<T> {
    const documentId = interpretAsDocumentId(id);

    // If we hdocumentIdave the handle cached, return it
    if (this._handles[documentId]) {
      return this._handles[documentId] as DocHandleReplacement<T>;
    }

    const handle = this._getHandle<T>({
      documentId,
      isNew: false,
    }) as DocHandleReplacement<T>;
    return handle;
  }

  import<T>(dump: Uint8Array): DocHandleReplacement<T> {
    const handle = this.create<T>();

    handle._incrementalUpdate(dump);

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
  }): DocHandleReplacement<T> {
    const handle = new DocHandleReplacement<T>(
      documentId,
      { isNew, initialValue },
      {
        onDelete: () => {
          this._dataService
            .updateSubscription({
              subscriptionId: this._subscriptionId,
              removeIds: [documentId],
            })
            .catch((err) => log.catch(err));
          handle.off('change', handler);

          delete this._handles[documentId];
        },
      },
    );
    this._handles[documentId] = handle;

    this._dataService
      .updateSubscription({
        subscriptionId: this._subscriptionId,
        addIds: [documentId],
      })
      .catch((err) => log.catch(err));

    const handler = () => {
      this._docsWithPendingUpdates.add(documentId);
      this._writeJob.schedule();
    };
    handle.on('change', handler);
    this._ctx.onDispose(() => handle.off('change', handler));

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
}
