//
// Copyright 2021 DXOS.org
//

import { type DocHandle, type DocumentId } from '@dxos/automerge/automerge-repo';
import { Stream } from '@dxos/codec-protobuf';
import { type SpaceDoc } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import {
  type DataService,
  type FlushRequest,
  type WriteRequest,
  type BatchedDocumentUpdates,
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
      const synchronizer = new DocsSynchronizer({ onDocumentsMutations: (updates) => next(updates) });
      this._subscriptions.set(request.subscriptionId, synchronizer);
      ready();
      return () => synchronizer.close();
    });
  }

  async updateSubscription(request: UpdateSubscriptionRequest) {
    const synchronizer = this._subscriptions.get(request.subscriptionId);
    invariant(synchronizer, 'Subscription not found');

    const documentsToAdd: DocHandle<SpaceDoc>[] = [];
    for (const requiredId of request.addIds ?? []) {
      const doc = this._automergeHost.repo.find(requiredId as DocumentId);
      await doc.whenReady();
      documentsToAdd.push(doc);
    }
    synchronizer.addDocuments(documentsToAdd);
    synchronizer.removeDocuments((request.removeIds as DocumentId[]) ?? []);

    invariant(synchronizer, 'Subscription not found');
  }

  write(request: WriteRequest): Promise<void> {
    return this._automergeHost.write(request);
  }

  async flush(request: FlushRequest): Promise<void> {
    await this._automergeHost.flush(request);
  }
}
