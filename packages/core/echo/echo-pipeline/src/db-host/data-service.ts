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
    options?: RequestOptions | undefined,
  ): Promise<void> {
    await this._automergeHost.waitUntilHeadsReplicated(request.heads);
  }

  async reIndexHeads(request: ReIndexHeadsRequest, options?: RequestOptions): Promise<void> {
    await this._automergeHost.reIndexHeads((request.documentIds ?? []) as DocumentId[]);
  }

  async updateIndexes(): Promise<void> {
    await this._updateIndexes();
  }

  subscribeSpaceSyncState(request: GetSpaceSyncStateRequest): Stream<SpaceSyncState> {
    return new Stream<SpaceSyncState>(({ ctx, next, ready }) => {
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
