//
// Copyright 2021 DXOS.org
//

import { type DocumentId } from '@automerge/automerge-repo';

import { UpdateScheduler } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf/stream';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import type { Echo } from '@dxos/protocols';
import { type Empty, EmptySchema, create } from '@dxos/protocols/buf';
import {
  type BatchedDocumentUpdates,
  BatchedDocumentUpdatesSchema,
  type CreateDocumentRequest,
  type CreateDocumentResponse,
  CreateDocumentResponseSchema,
  DataService,
  DocHeadsListSchema,
  type FlushRequest,
  type GetDocumentHeadsRequest,
  type GetDocumentHeadsResponse,
  GetDocumentHeadsResponseSchema,
  type GetSpaceSyncStateRequest,
  type ReIndexHeadsRequest,
  type SpaceSyncState,
  SpaceSyncStateSchema,
  type SubscribeRequest,
  type UpdateRequest,
  type UpdateSubscriptionRequest,
  type WaitUntilHeadsReplicatedRequest,
} from '@dxos/protocols/buf/dxos/echo/service_pb';

import { type AutomergeHost, deriveCollectionIdFromSpaceId } from '../automerge';

import { DocumentsSynchronizer } from './documents-synchronizer';
import { type SpaceStateManager } from './space-state-manager';

export type DataServiceProps = {
  automergeHost: AutomergeHost;
  spaceStateManager: SpaceStateManager;
  updateIndexes: () => Promise<void>;
};

/**
 * Data sync between client and services.
 */
// TODO(burdon): Move to client-services.
export class DataServiceImpl implements Echo.DataService {
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

  async updateSubscription(request: UpdateSubscriptionRequest): Promise<Empty> {
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

  async createDocument(request: CreateDocumentRequest): Promise<CreateDocumentResponse> {
    const handle = await this._automergeHost.createDoc(request.initialValue);
    return create(CreateDocumentResponseSchema, { documentId: handle.documentId });
  }

  async update(request: UpdateRequest): Promise<Empty> {
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

  async flush(request: FlushRequest): Promise<Empty> {
    await this._automergeHost.flush({ documentIds: request.documentIds });
    return create(EmptySchema);
  }

  async getDocumentHeads(request: GetDocumentHeadsRequest): Promise<GetDocumentHeadsResponse> {
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

  async waitUntilHeadsReplicated(request: WaitUntilHeadsReplicatedRequest): Promise<Empty> {
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

  async reIndexHeads(request: ReIndexHeadsRequest): Promise<Empty> {
    await this._automergeHost.reIndexHeads((request.documentIds ?? []) as DocumentId[]);
    return create(EmptySchema);
  }

  async updateIndexes(): Promise<Empty> {
    await this._updateIndexes();
    return create(EmptySchema);
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
