//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { raise } from '@dxos/debug';
import { NotImplementedError, RuntimeServiceError } from '@dxos/errors';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type EdgeFunctionEnv } from '@dxos/protocols';
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
import { type DataService } from '@dxos/protocols/rpc';

import { copyUint8Array } from './utils';

export class DataServiceImpl implements DataService.Handlers {
  private 'dataSubscriptions' = new Map<string, { spaceId: SpaceId; next: (msg: BatchedDocumentUpdates) => void }>();

  'constructor'(
    private _executionContext: EdgeFunctionEnv.TraceContext,
    private _dataService: EdgeFunctionEnv.DataService,
  ) {}

  ['DataService.subscribe'](request: SubscribeRequest): EffectStream.Stream<BatchedDocumentUpdates, Error> {
    return EffectStream.async<BatchedDocumentUpdates, Error>((emit) => {
      try {
        invariant(SpaceId.isValid(request.spaceId));
        const next = (msg: BatchedDocumentUpdates) => {
          void emit.single(msg);
        };
        this.dataSubscriptions.set(request.subscriptionId, { spaceId: request.spaceId, next });
        return Effect.sync(() => {
          this.dataSubscriptions.delete(request.subscriptionId);
        });
      } catch (error) {
        void emit.fail(error as Error);
      }
    });
  }

  ['DataService.updateSubscription'](request: UpdateSubscriptionRequest): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        const sub =
          this.dataSubscriptions.get(request.subscriptionId) ??
          raise(
            new RuntimeServiceError({
              message: 'Subscription not found.',
              context: { subscriptionId: request.subscriptionId },
            }),
          );

        if (request.addIds) {
          log.verbose('request documents', { count: request.addIds.length });
          // TODO(dmaretskyi): Batch.
          for (const documentId of request.addIds) {
            using document = await this._dataService.getDocument(this._executionContext, sub.spaceId, documentId);
            log.verbose('document loaded', { documentId, spaceId: sub.spaceId, found: !!document });
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
      },
      catch: (error) => error as Error,
    });
  }

  ['DataService.createDocument'](request: CreateDocumentRequest): Effect.Effect<CreateDocumentResponse, Error> {
    return Effect.tryPromise({
      try: async () => {
        invariant(SpaceId.isValid(request.spaceId));
        using response = await this._dataService.createDocument(
          this._executionContext,
          request.spaceId,
          request.initialValue,
        );
        return { documentId: response.documentId };
      },
      catch: (error) => error as Error,
    });
  }

  ['DataService.update'](request: UpdateRequest): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        const sub =
          this.dataSubscriptions.get(request.subscriptionId) ??
          raise(
            new RuntimeServiceError({
              message: 'Subscription not found.',
              context: { subscriptionId: request.subscriptionId },
            }),
          );
        // TODO(dmaretskyi): Batch.
        try {
          for (const update of request.updates ?? []) {
            // Mutation-less updates (e.g. `requesting: true` transition signals from the worker) carry no
            // bytes to apply; this runtime only forwards real document writes.
            if (!update.mutation) {
              continue;
            }
            await this._dataService.changeDocument(
              this._executionContext,
              sub.spaceId,
              update.documentId,
              update.mutation,
            );
          }
        } catch (error) {
          throw RuntimeServiceError.wrap({
            message: 'Failed to apply document updates.',
            context: { subscriptionId: request.subscriptionId },
            ifTypeDiffers: true,
          })(error);
        }
      },
      catch: (error) => error as Error,
    });
  }

  ['DataService.flush'](_request: FlushRequest): Effect.Effect<void, Error> {
    return Effect.void;
  }

  ['DataService.subscribeSpaceSyncState'](
    _request: GetSpaceSyncStateRequest,
  ): EffectStream.Stream<SpaceSyncState, Error> {
    return EffectStream.fail(
      new NotImplementedError({
        message: 'subscribeSpaceSyncState is not implemented.',
      }),
    );
  }

  ['DataService.getDocumentHeads'](_request: GetDocumentHeadsRequest): Effect.Effect<GetDocumentHeadsResponse, Error> {
    return Effect.fail(
      new NotImplementedError({
        message: 'getDocumentHeads is not implemented.',
      }),
    );
  }

  ['DataService.reIndexHeads'](_request: ReIndexHeadsRequest): Effect.Effect<void, Error> {
    return Effect.fail(
      new NotImplementedError({
        message: 'reIndexHeads is not implemented.',
      }),
    );
  }

  ['DataService.updateIndexes'](): Effect.Effect<void, Error> {
    log.verbose('updateIndexes called, but it is a no-op in EDGE env.');
    return Effect.void;
  }

  ['DataService.waitUntilHeadsReplicated'](_request: WaitUntilHeadsReplicatedRequest): Effect.Effect<void, Error> {
    return Effect.fail(
      new NotImplementedError({
        message: 'waitUntilHeadsReplicated is not implemented.',
      }),
    );
  }
}
