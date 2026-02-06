//
// Copyright 2021 DXOS.org
//

import { type DocumentId } from '@automerge/automerge-repo';

import { UpdateScheduler } from '@dxos/async';
import { type RequestOptions } from '@dxos/codec-protobuf';
import { Stream } from '@dxos/codec-protobuf/stream';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Empty, EmptySchema, create } from '@dxos/protocols/buf';
import {
  BatchedDocumentUpdatesSchema,
  type BatchedDocumentUpdates as BufBatchedDocumentUpdates,
  type CreateDocumentRequest as BufCreateDocumentRequest,
  type CreateDocumentResponse as BufCreateDocumentResponse,
  type DataService as BufDataService,
  type FlushRequest as BufFlushRequest,
  type GetDocumentHeadsRequest as BufGetDocumentHeadsRequest,
  type GetDocumentHeadsResponse as BufGetDocumentHeadsResponse,
  type GetSpaceSyncStateRequest as BufGetSpaceSyncStateRequest,
  type ReIndexHeadsRequest as BufReIndexHeadsRequest,
  type SpaceSyncState as BufSpaceSyncState,
  type SubscribeRequest as BufSubscribeRequest,
  type UpdateRequest as BufUpdateRequest,
  type UpdateSubscriptionRequest as BufUpdateSubscriptionRequest,
  type WaitUntilHeadsReplicatedRequest as BufWaitUntilHeadsReplicatedRequest,
  CreateDocumentResponseSchema,
  DocHeadsListSchema,
  GetDocumentHeadsResponseSchema,
  SpaceSyncStateSchema,
} from '@dxos/protocols/buf/dxos/echo/service_pb';
import {
  type BatchedDocumentUpdates,
  type CreateDocumentRequest,
  type CreateDocumentResponse,
  type DataService,
  type FlushRequest,
  type GetDocumentHeadsRequest,
  type GetDocumentHeadsResponse,
  type GetSpaceSyncStateRequest,
  type ReIndexHeadsRequest,
  type SpaceSyncState,
  type SubscribeRequest,
  type UpdateRequest,
  type UpdateSubscriptionRequest,
  type WaitUntilHeadsReplicatedRequest,
} from '@dxos/protocols/proto/dxos/echo/service';
import { type BufRpcHandlers } from '@dxos/rpc';

import { type AutomergeHost, deriveCollectionIdFromSpaceId } from '../automerge';

import { DocumentsSynchronizer } from './documents-synchronizer';
import { type SpaceStateManager } from './space-state-manager';

// Re-export buf service type for consumers.
export { DataService as BufDataService } from '@dxos/protocols/buf/dxos/echo/service_pb';

export type DataServiceProps = {
  automergeHost: AutomergeHost;
  spaceStateManager: SpaceStateManager;
  updateIndexes: () => Promise<void>;
};

/**
 * Data sync between client and services.
 */
// TODO(burdon): Move to client-services.
export class DataServiceImpl implements DataService {
  /**
   * Map of subscriptions.
   * subscriptionId -> DocumentsSynchronizer
   */
  private readonly _subscriptions = new Map<string, DocumentsSynchronizer>();

  private readonly _automergeHost: AutomergeHost;
  private readonly _spaceStateManager: SpaceStateManager;
  private readonly _updateIndexes: () => Promise<void>;

  constructor(params: DataServiceProps) {
    this._automergeHost = params.automergeHost;
    this._spaceStateManager = params.spaceStateManager;
    this._updateIndexes = params.updateIndexes;
  }

  subscribe(request: SubscribeRequest): Stream<BatchedDocumentUpdates> {
    return new Stream<BatchedDocumentUpdates>(({ next, ready }) => {
      const synchronizer = new DocumentsSynchronizer({
        automergeHost: this._automergeHost,
        sendUpdates: (updates) => next(updates),
      });
      synchronizer
        .open()
        .then(() => {
          this._subscriptions.set(request.subscriptionId, synchronizer);
          ready();
        })
        .catch((err) => log.catch(err));
      return () => synchronizer.close();
    });
  }

  async updateSubscription(request: UpdateSubscriptionRequest): Promise<void> {
    const synchronizer = this._subscriptions.get(request.subscriptionId);
    invariant(synchronizer, 'Subscription not found');

    if (request.addIds?.length) {
      await synchronizer.addDocuments(request.addIds as DocumentId[]);
    }
    if (request.removeIds?.length) {
      await synchronizer.removeDocuments(request.removeIds as DocumentId[]);
    }
  }

  async createDocument(request: CreateDocumentRequest): Promise<CreateDocumentResponse> {
    const handle = await this._automergeHost.createDoc(request.initialValue);
    return { documentId: handle.documentId };
  }

  async update(request: UpdateRequest): Promise<void> {
    if (!request.updates) {
      return;
    }
    const synchronizer = this._subscriptions.get(request.subscriptionId);
    invariant(synchronizer, 'Subscription not found');

    await synchronizer.update(request.updates);
  }

  async flush(request: FlushRequest): Promise<void> {
    await this._automergeHost.flush(request);
  }

  async getDocumentHeads(request: GetDocumentHeadsRequest): Promise<GetDocumentHeadsResponse> {
    const documentIds = request.documentIds;
    if (!documentIds) {
      return { heads: { entries: [] } };
    }
    const heads = await this._automergeHost.getHeads(documentIds as DocumentId[]);
    return {
      heads: {
        entries: heads.map((heads, idx) => ({ documentId: documentIds[idx], heads })),
      },
    };
  }

  async waitUntilHeadsReplicated(
    request: WaitUntilHeadsReplicatedRequest,
    _options?: RequestOptions | undefined,
  ): Promise<void> {
    await this._automergeHost.waitUntilHeadsReplicated(request.heads);
  }

  async reIndexHeads(request: ReIndexHeadsRequest, _options?: RequestOptions): Promise<void> {
    await this._automergeHost.reIndexHeads((request.documentIds ?? []) as DocumentId[]);
  }

  async updateIndexes(): Promise<void> {
    await this._updateIndexes();
  }

  subscribeSpaceSyncState(request: GetSpaceSyncStateRequest): Stream<SpaceSyncState> {
    return new Stream<SpaceSyncState>(({ ctx, next, ready: _ready }) => {
      const spaceId = request.spaceId;
      invariant(SpaceId.isValid(spaceId));

      const rootDocumentId = this._spaceStateManager.getSpaceRootDocumentId(spaceId);
      let collectionId = rootDocumentId && deriveCollectionIdFromSpaceId(spaceId, rootDocumentId);
      this._spaceStateManager.spaceDocumentListUpdated.on(ctx, (event) => {
        const newId = deriveCollectionIdFromSpaceId(spaceId, event.spaceRootId);
        if (newId !== collectionId) {
          collectionId = newId;
          scheduler.trigger();
        }
      });

      const scheduler = new UpdateScheduler(ctx, async () => {
        const state = collectionId ? await this._automergeHost.getCollectionSyncState(collectionId) : { peers: [] };

        next({ peers: state.peers });
      });

      this._automergeHost.collectionStateUpdated.on(ctx, (e) => {
        if (e.collectionId === collectionId) {
          scheduler.trigger();
        }
      });
      scheduler.trigger();
    });
  }
}

//
// Buf-based DataService implementation.
//

export type BufDataServiceProps = DataServiceProps;

/**
 * Data sync between client and services using buf types.
 */
export class BufDataServiceImpl implements BufRpcHandlers<typeof BufDataService> {
  /**
   * Map of subscriptions.
   * subscriptionId -> DocumentsSynchronizer
   */
  private readonly _subscriptions = new Map<string, DocumentsSynchronizer>();

  private readonly _automergeHost: AutomergeHost;
  private readonly _spaceStateManager: SpaceStateManager;
  private readonly _updateIndexes: () => Promise<void>;

  constructor(params: BufDataServiceProps) {
    this._automergeHost = params.automergeHost;
    this._spaceStateManager = params.spaceStateManager;
    this._updateIndexes = params.updateIndexes;
  }

  subscribe(request: BufSubscribeRequest): Stream<BufBatchedDocumentUpdates> {
    return new Stream<BufBatchedDocumentUpdates>(({ next, ready }) => {
      const synchronizer = new DocumentsSynchronizer({
        automergeHost: this._automergeHost,
        sendUpdates: (updates) => {
          // Convert to buf message format.
          next(
            create(BatchedDocumentUpdatesSchema, {
              updates: updates.updates?.map((u) => ({
                documentId: u.documentId,
                mutation: u.mutation,
              })),
            }),
          );
        },
      });
      synchronizer
        .open()
        .then(() => {
          this._subscriptions.set(request.subscriptionId, synchronizer);
          ready();
        })
        .catch((err) => log.catch(err));
      return () => synchronizer.close();
    });
  }

  async updateSubscription(request: BufUpdateSubscriptionRequest): Promise<Empty> {
    const synchronizer = this._subscriptions.get(request.subscriptionId);
    invariant(synchronizer, 'Subscription not found');

    if (request.addIds?.length) {
      await synchronizer.addDocuments(request.addIds as DocumentId[]);
    }
    if (request.removeIds?.length) {
      await synchronizer.removeDocuments(request.removeIds as DocumentId[]);
    }
    return create(EmptySchema);
  }

  async createDocument(request: BufCreateDocumentRequest): Promise<BufCreateDocumentResponse> {
    const handle = await this._automergeHost.createDoc(request.initialValue);
    return create(CreateDocumentResponseSchema, { documentId: handle.documentId });
  }

  async update(request: BufUpdateRequest): Promise<Empty> {
    if (!request.updates) {
      return create(EmptySchema);
    }
    const synchronizer = this._subscriptions.get(request.subscriptionId);
    invariant(synchronizer, 'Subscription not found');

    await synchronizer.update(
      request.updates.map((u) => ({
        documentId: u.documentId,
        mutation: u.mutation,
      })),
    );
    return create(EmptySchema);
  }

  async flush(request: BufFlushRequest): Promise<Empty> {
    await this._automergeHost.flush({ documentIds: request.documentIds });
    return create(EmptySchema);
  }

  async getDocumentHeads(request: BufGetDocumentHeadsRequest): Promise<BufGetDocumentHeadsResponse> {
    const documentIds = request.documentIds;
    if (!documentIds) {
      return create(GetDocumentHeadsResponseSchema, { heads: create(DocHeadsListSchema, { entries: [] }) });
    }
    const heads = await this._automergeHost.getHeads(documentIds as DocumentId[]);
    return create(GetDocumentHeadsResponseSchema, {
      heads: create(DocHeadsListSchema, {
        entries: heads.map((h, idx) => ({ documentId: documentIds[idx], heads: h })),
      }),
    });
  }

  async waitUntilHeadsReplicated(request: BufWaitUntilHeadsReplicatedRequest): Promise<Empty> {
    if (request.heads) {
      await this._automergeHost.waitUntilHeadsReplicated({
        entries: request.heads.entries?.map((e) => ({
          documentId: e.documentId,
          heads: e.heads,
        })),
      });
    }
    return create(EmptySchema);
  }

  async reIndexHeads(request: BufReIndexHeadsRequest): Promise<Empty> {
    await this._automergeHost.reIndexHeads((request.documentIds ?? []) as DocumentId[]);
    return create(EmptySchema);
  }

  async updateIndexes(): Promise<Empty> {
    await this._updateIndexes();
    return create(EmptySchema);
  }

  subscribeSpaceSyncState(request: BufGetSpaceSyncStateRequest): Stream<BufSpaceSyncState> {
    return new Stream<BufSpaceSyncState>(({ ctx, next, ready: _ready }) => {
      const spaceId = request.spaceId;
      invariant(SpaceId.isValid(spaceId));

      const rootDocumentId = this._spaceStateManager.getSpaceRootDocumentId(spaceId);
      let collectionId = rootDocumentId && deriveCollectionIdFromSpaceId(spaceId, rootDocumentId);
      this._spaceStateManager.spaceDocumentListUpdated.on(ctx, (event) => {
        const newId = deriveCollectionIdFromSpaceId(spaceId, event.spaceRootId);
        if (newId !== collectionId) {
          collectionId = newId;
          scheduler.trigger();
        }
      });

      const scheduler = new UpdateScheduler(ctx, async () => {
        const state = collectionId ? await this._automergeHost.getCollectionSyncState(collectionId) : { peers: [] };
        const peers = state.peers ?? [];

        next(
          create(SpaceSyncStateSchema, {
            peers: peers.map((p) => ({
              peerId: p.peerId,
              missingOnRemote: p.missingOnRemote,
              missingOnLocal: p.missingOnLocal,
              differentDocuments: p.differentDocuments,
              localDocumentCount: p.localDocumentCount,
              remoteDocumentCount: p.remoteDocumentCount,
              totalDocumentCount: p.totalDocumentCount,
              unsyncedDocumentCount: p.unsyncedDocumentCount,
            })),
          }),
        );
      });

      this._automergeHost.collectionStateUpdated.on(ctx, (e) => {
        if (e.collectionId === collectionId) {
          scheduler.trigger();
        }
      });
      scheduler.trigger();
    });
  }
}
