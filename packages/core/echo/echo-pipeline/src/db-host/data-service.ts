//
// Copyright 2021 DXOS.org
//

import { type DocumentId } from '@automerge/automerge-repo';

import { UpdateScheduler } from '@dxos/async';
import { type RequestOptions } from '@dxos/codec-protobuf';
import { Stream } from '@dxos/codec-protobuf/stream';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  type BatchedDocumentUpdates,
  type CreateDocumentRequest,
  type CreateDocumentResponse,
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
export class DataServiceImpl {
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
    const ctx = Context.default();
    const synchronizer = this._subscriptions.get(request.subscriptionId);
    invariant(synchronizer, 'Subscription not found');

    if (request.addIds?.length) {
      await synchronizer.addDocuments(ctx, request.addIds as DocumentId[]);
    }
    if (request.removeIds?.length) {
      synchronizer.removeDocuments(request.removeIds as DocumentId[]);
    }
  }

  async createDocument(request: CreateDocumentRequest): Promise<CreateDocumentResponse> {
    const ctx = Context.default();
    const handle = await this._automergeHost.createDoc(ctx, request.initialValue);
    return { documentId: handle.documentId };
  }

  async update(request: UpdateRequest): Promise<void> {
    const ctx = Context.default();
    if (!request.updates) {
      return;
    }
    const synchronizer = this._subscriptions.get(request.subscriptionId);
    invariant(synchronizer, 'Subscription not found');

    await synchronizer.update(ctx, request.updates);
  }

  async flush(request: FlushRequest): Promise<void> {
    const ctx = Context.default();
    await this._automergeHost.flush(ctx, request);
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
    options?: RequestOptions | undefined,
  ): Promise<void> {
    const ctx = Context.default();
    await this._automergeHost.waitUntilHeadsReplicated(ctx, request.heads);
  }

  async reIndexHeads(request: ReIndexHeadsRequest, options?: RequestOptions): Promise<void> {
    await this._automergeHost.reIndexHeads((request.documentIds ?? []) as DocumentId[]);
  }

  async updateIndexes(): Promise<void> {
    await this._updateIndexes();
  }

  subscribeSpaceSyncState(request: GetSpaceSyncStateRequest): Stream<SpaceSyncState> {
    return new Stream<SpaceSyncState>(({ ctx: streamCtx, next, ready }) => {
      const spaceId = request.spaceId;
      invariant(SpaceId.isValid(spaceId));

      const rootDocumentId = this._spaceStateManager.getSpaceRootDocumentId(spaceId);
      let collectionId = rootDocumentId && deriveCollectionIdFromSpaceId(spaceId, rootDocumentId);
      this._spaceStateManager.spaceDocumentListUpdated.on(streamCtx, (event) => {
        const newId = deriveCollectionIdFromSpaceId(spaceId, event.spaceRootId);
        if (newId !== collectionId) {
          collectionId = newId;
          scheduler.trigger();
        }
      });

      const scheduler = new UpdateScheduler(streamCtx, async () => {
        const state = collectionId
          ? await this._automergeHost.getCollectionSyncState(streamCtx, collectionId)
          : { peers: [] };

        next({ peers: state.peers });
      });

      this._automergeHost.collectionStateUpdated.on(streamCtx, (e) => {
        if (e.collectionId === collectionId) {
          scheduler.trigger();
        }
      });
      scheduler.trigger();
    });
  }
}
