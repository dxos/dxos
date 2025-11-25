//
// Copyright 2024 DXOS.org
//

import type { RequestOptions } from '@dxos/codec-protobuf';
import { Stream } from '@dxos/codec-protobuf/stream';
import { raise } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type EdgeFunctionEnv } from '@dxos/protocols';
import type {
  BatchedDocumentUpdates,
  DataService as DataServiceProto,
  GetDocumentHeadsRequest,
  GetDocumentHeadsResponse,
  GetSpaceSyncStateRequest,
  ReIndexHeadsRequest,
  SpaceSyncState,
  UpdateRequest,
  UpdateSubscriptionRequest,
} from '@dxos/protocols/proto/dxos/echo/service';

export class DataServiceImpl implements DataServiceProto {
  private dataSubscriptions = new Map<string, { spaceId: SpaceId; next: (msg: BatchedDocumentUpdates) => void }>();

  constructor(
    private _executionContext: unknown,
    private _dataService: EdgeFunctionEnv.DataService,
  ) {}

  subscribe({ subscriptionId, spaceId }: { subscriptionId: string; spaceId: string }): Stream<BatchedDocumentUpdates> {
    return new Stream(({ next }) => {
      invariant(SpaceId.isValid(spaceId));
      this.dataSubscriptions.set(subscriptionId, { spaceId, next });

      return () => {
        this.dataSubscriptions.delete(subscriptionId);
      };
    });
  }

  async updateSubscription({ subscriptionId, addIds, removeIds }: UpdateSubscriptionRequest): Promise<void> {
    const sub = this.dataSubscriptions.get(subscriptionId) ?? raise(new Error('Subscription not found'));

    if (addIds) {
      log.info('request documents', { count: addIds.length });
      // TODO(dmaretskyi): Batch.
      for (const documentId of addIds) {
        const document = await this._dataService.getDocument(this._executionContext, sub.spaceId, documentId);
        log.info('document loaded', { documentId, spaceId: sub.spaceId, found: !!document });
        if (!document) {
          log.warn('not found', { documentId });
          continue;
        }
        sub.next({ updates: [{ documentId, mutation: document.data }] });
      }
    }
  }

  async update({ updates, subscriptionId }: UpdateRequest): Promise<void> {
    const sub = this.dataSubscriptions.get(subscriptionId) ?? raise(new Error('Subscription not found'));
    // TODO(dmaretskyi): Batch.
    for (const update of updates ?? []) {
      await this._dataService.changeDocument(this._executionContext, sub.spaceId, update.documentId, update.mutation);
    }
    throw new Error('Method not implemented.');
  }

  async flush(): Promise<void> {
    // No-op.
  }

  subscribeSpaceSyncState(request: GetSpaceSyncStateRequest, options?: RequestOptions): Stream<SpaceSyncState> {
    throw new Error('Method not implemented.');
  }

  async getDocumentHeads({ documentIds }: GetDocumentHeadsRequest): Promise<GetDocumentHeadsResponse> {
    throw new Error('Method not implemented.');
  }

  async reIndexHeads({ documentIds }: ReIndexHeadsRequest): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async updateIndexes(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async waitUntilHeadsReplicated({ heads }: { heads: any }): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
