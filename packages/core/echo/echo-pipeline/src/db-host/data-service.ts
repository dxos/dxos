//
// Copyright 2021 DXOS.org
//

import { type DocumentId } from '@dxos/automerge/automerge-repo';
import { type RequestOptions, Stream } from '@dxos/codec-protobuf';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import {
  type DataService,
  type DocHeadsList,
  type FlushRequest,
  type SubscribeRequest,
  type BatchedDocumentUpdates,
  type UpdateSubscriptionRequest,
  type GetDocumentHeadsRequest,
  type GetDocumentHeadsResponse,
  type ReIndexHeadsRequest,
  type WaitUntilHeadsReplicatedRequest,
  type UpdateRequest,
} from '@dxos/protocols/proto/dxos/echo/service';

import { DocumentsSynchronizer } from './documents-synchronizer';
import { type AutomergeHost } from '../automerge';

export type DataServiceParams = {
  automergeHost: AutomergeHost;
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
  private readonly _updateIndexes: () => Promise<void>;

  constructor(params: DataServiceParams) {
    this._automergeHost = params.automergeHost;
    this._updateIndexes = params.updateIndexes;
  }

  subscribe(request: SubscribeRequest): Stream<BatchedDocumentUpdates> {
    return new Stream<BatchedDocumentUpdates>(({ next, ready }) => {
      const synchronizer = new DocumentsSynchronizer({
        repo: this._automergeHost.repo,
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

  async updateSubscription(request: UpdateSubscriptionRequest) {
    const synchronizer = this._subscriptions.get(request.subscriptionId);
    invariant(synchronizer, 'Subscription not found');

    if (request.addIds?.length) {
      await synchronizer.addDocuments(request.addIds as DocumentId[]);
    }
    if (request.removeIds?.length) {
      await synchronizer.removeDocuments(request.removeIds as DocumentId[]);
    }
  }

  async update(request: UpdateRequest): Promise<void> {
    if (!request.updates) {
      return;
    }
    const synchronizer = this._subscriptions.get(request.subscriptionId);
    invariant(synchronizer, 'Subscription not found');

    synchronizer.update(request.updates);
  }

  async flush(request: FlushRequest): Promise<void> {
    await this._automergeHost.flush(request);
  }

  async getDocumentHeads(request: GetDocumentHeadsRequest): Promise<GetDocumentHeadsResponse> {
    const entries = await Promise.all(
      request.documentIds?.map(async (documentId): Promise<DocHeadsList.Entry> => {
        const heads = await this._automergeHost.getHeads(documentId as DocumentId);
        return {
          documentId,
          heads,
        };
      }) ?? [],
    );
    return {
      heads: {
        entries,
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

  async updateIndexes() {
    await this._updateIndexes();
  }
}
