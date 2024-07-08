//
// Copyright 2021 DXOS.org
//

import { type DocumentId } from '@dxos/automerge/automerge-repo';
import { type RequestOptions, Stream } from '@dxos/codec-protobuf';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import {
  type DataService,
  type FlushRequest,
  type GetDocumentHeadsRequest,
  type GetDocumentHeadsResponse,
  type WriteRequest,
  type BatchedDocumentUpdates,
  type ReIndexHeadsRequest,
  type SubscribeRequest,
  type UpdateSubscriptionRequest,
} from '@dxos/protocols/proto/dxos/echo/service';

import { DocsSynchronizer } from './docs-synchronizer';
import { type AutomergeHost } from '../automerge';

/**
 * Data sync between client and services.
 */
// TODO(burdon): Move to client-services.
export class DataServiceImpl implements DataService {
  /**
   * Map of subscriptions.
   * subscriptionId -> DocsSynchronizer
   */
  private readonly _subscriptions = new Map<string, DocsSynchronizer>();

  constructor(private readonly _automergeHost: AutomergeHost) {}

  subscribe(request: SubscribeRequest): Stream<BatchedDocumentUpdates> {
    return new Stream<BatchedDocumentUpdates>(({ next, ready }) => {
      const synchronizer = new DocsSynchronizer({
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

    await synchronizer.addDocuments((request.addIds as DocumentId[]) ?? []);
    synchronizer.removeDocuments((request.removeIds as DocumentId[]) ?? []);
  }

  async write(request: WriteRequest): Promise<void> {
    if (!request.updates) {
      return;
    }
    const synchronizer = this._subscriptions.get(request.subscriptionId);
    invariant(synchronizer, 'Subscription not found');

    synchronizer.write(request.updates);
  }

  async flush(request: FlushRequest): Promise<void> {
    await this._automergeHost.flush(request);
  }

  async getDocumentHeads(request: GetDocumentHeadsRequest): Promise<GetDocumentHeadsResponse> {
    const states = await Promise.all(
      request.documentIds?.map(async (documentId): Promise<GetDocumentHeadsResponse.DocState> => {
        const heads = await this._automergeHost.getHeads(documentId as DocumentId);
        return {
          documentId,
          heads,
        };
      }) ?? [],
    );
    return { states };
  }

  async reIndexHeads(request: ReIndexHeadsRequest, options?: RequestOptions): Promise<void> {
    await this._automergeHost.reIndexHeads((request.documentIds ?? []) as DocumentId[]);
  }
}
