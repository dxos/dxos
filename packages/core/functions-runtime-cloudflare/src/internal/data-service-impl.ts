//
// Copyright 2024 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf/stream';
import { raise } from '@dxos/debug';
import { NotImplementedError, RuntimeServiceError } from '@dxos/errors';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Echo, type EdgeFunctionEnv } from '@dxos/protocols';
import { type Empty, EMPTY, create } from '@dxos/protocols/buf';
import {
  type BatchedDocumentUpdates,
  BatchedDocumentUpdatesSchema,
  type CreateDocumentRequest,
  type CreateDocumentResponse,
  CreateDocumentResponseSchema,
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
} from '@dxos/protocols/buf/dxos/echo/service_pb';

import { copyUint8Array } from './utils';

export class DataServiceImpl implements Echo.DataService {
  private dataSubscriptions = new Map<string, { spaceId: SpaceId; next: (msg: BatchedDocumentUpdates) => void }>();

  constructor(
    private _executionContext: EdgeFunctionEnv.ExecutionContext,
    private _dataService: EdgeFunctionEnv.DataService,
  ) {}

  subscribe(request: SubscribeRequest): Stream<BatchedDocumentUpdates> {
    return new Stream(({ next }) => {
      const { subscriptionId, spaceId } = request;
      invariant(SpaceId.isValid(spaceId));
      this.dataSubscriptions.set(subscriptionId, { spaceId, next });

      return () => {
        this.dataSubscriptions.delete(subscriptionId);
      };
    });
  }

  async updateSubscription({ subscriptionId, addIds }: UpdateSubscriptionRequest): Promise<Empty> {
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
        sub.next(
          create(BatchedDocumentUpdatesSchema, {
            updates: [
              {
                documentId,
                mutation: copyUint8Array(document.data),
              },
            ],
          }),
        );
      }
    }
    return EMPTY;
  }

  async createDocument({ spaceId, initialValue }: CreateDocumentRequest): Promise<CreateDocumentResponse> {
    using response = await this._dataService.createDocument(this._executionContext, { spaceId, initialValue });
    return create(CreateDocumentResponseSchema, { documentId: response.documentId });
  }

  async update({ updates, subscriptionId }: UpdateRequest): Promise<Empty> {
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
    return EMPTY;
  }

  async flush(_request: FlushRequest): Promise<Empty> {
    return EMPTY;
  }

  subscribeSpaceSyncState(_request: GetSpaceSyncStateRequest): Stream<SpaceSyncState> {
    throw new NotImplementedError({
      message: 'subscribeSpaceSyncState is not implemented.',
    });
  }

  async getDocumentHeads(_request: GetDocumentHeadsRequest): Promise<GetDocumentHeadsResponse> {
    throw new NotImplementedError({
      message: 'getDocumentHeads is not implemented.',
    });
  }

  async reIndexHeads(_request: ReIndexHeadsRequest): Promise<Empty> {
    throw new NotImplementedError({
      message: 'reIndexHeads is not implemented.',
    });
  }

  async updateIndexes(): Promise<Empty> {
    log.error('updateIndexes is not available in EDGE env.');
    return EMPTY;
  }

  async waitUntilHeadsReplicated(_request: WaitUntilHeadsReplicatedRequest): Promise<Empty> {
    throw new NotImplementedError({
      message: 'waitUntilHeadsReplicated is not implemented.',
    });
  }
}
