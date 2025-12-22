//
// Copyright 2024 DXOS.org
//

import type { RequestOptions } from '@dxos/codec-protobuf';
import { Stream } from '@dxos/codec-protobuf/stream';
import { raise } from '@dxos/debug';
import { NotImplementedError, RuntimeServiceError } from '@dxos/errors';
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

import { copyUint8Array } from './utils';

export class DataServiceImpl implements DataServiceProto {
  private dataSubscriptions = new Map<string, { spaceId: SpaceId; next: (msg: BatchedDocumentUpdates) => void }>();

  constructor(
    private _executionContext: EdgeFunctionEnv.ExecutionContext,
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
    const sub =
      this.dataSubscriptions.get(subscriptionId) ??
      raise(
        new RuntimeServiceError({
          message: 'Subscription not found.',
          context: { subscriptionId },
        }),
      );

    if (addIds) {
      log.info('request documents', { count: addIds.length });
      // TODO(dmaretskyi): Batch.
      for (const documentId of addIds) {
        using document = await this._dataService.getDocument(this._executionContext, sub.spaceId, documentId);
        log.info('document loaded', { documentId, spaceId: sub.spaceId, found: !!document });
        if (!document) {
          log.warn('not found', { documentId });
          continue;
        }
        sub.next({
          updates: [
            {
              documentId,
              // Copy returned object to avoid hanging RPC stub
              // See https://developers.cloudflare.com/workers/runtime-apis/rpc/lifecycle/
              mutation: copyUint8Array(document.data),
            },
          ],
        });
      }
    }
  }

  async update({ updates, subscriptionId }: UpdateRequest): Promise<void> {
    const sub =
      this.dataSubscriptions.get(subscriptionId) ??
      raise(
        new RuntimeServiceError({
          message: 'Subscription not found.',
          context: { subscriptionId },
        }),
      );
    // TODO(dmaretskyi): Batch.
    try {
      for (const update of updates ?? []) {
        await this._dataService.changeDocument(this._executionContext, sub.spaceId, update.documentId, update.mutation);
      }
    } catch (error) {
      throw RuntimeServiceError.wrap({
        message: 'Failed to apply document updates.',
        context: { subscriptionId },
        ifTypeDiffers: true,
      })(error);
    }
  }

  async flush(): Promise<void> {
    // No-op.
  }

  subscribeSpaceSyncState(_request: GetSpaceSyncStateRequest, _options?: RequestOptions): Stream<SpaceSyncState> {
    throw new NotImplementedError({
      message: 'subscribeSpaceSyncState is not implemented.',
    });
  }

  async getDocumentHeads({ documentIds: _documentIds }: GetDocumentHeadsRequest): Promise<GetDocumentHeadsResponse> {
    throw new NotImplementedError({
      message: 'getDocumentHeads is not implemented.',
    });
  }

  async reIndexHeads({ documentIds: _documentIds }: ReIndexHeadsRequest): Promise<void> {
    throw new NotImplementedError({
      message: 'reIndexHeads is not implemented.',
    });
  }

  async updateIndexes(): Promise<void> {
    log.error('updateIndexes is not available in EDGE env.');
    // No-op.
  }

  async waitUntilHeadsReplicated({ heads: _heads }: { heads: any }): Promise<void> {
    throw new NotImplementedError({
      message: 'waitUntilHeadsReplicated is not implemented.',
    });
  }
}
