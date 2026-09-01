//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { raise } from '@dxos/debug';
import { EffectEx } from '@dxos/effect';
import { NotImplementedError, RuntimeServiceError } from '@dxos/errors';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type EdgeFunctionEnv } from '@dxos/protocols';
import { type DataService } from '@dxos/protocols/rpc';

import { copyUint8Array } from './utils.ts';

export class DataServiceImpl implements DataService.Handlers {
  private 'dataSubscriptions' = new Map<
    string,
    { spaceId: SpaceId; next: (msg: DataService.BatchedDocumentUpdates) => void }
  >();

  'constructor'(
    private _executionContext: EdgeFunctionEnv.TraceContext,
    private _dataService: EdgeFunctionEnv.DataService,
  ) {}

  ['DataService.subscribe'](
    request: DataService.SubscribeRequest,
  ): EffectStream.Stream<DataService.BatchedDocumentUpdates, Error> {
    return EffectEx.streamFromEmitter<DataService.BatchedDocumentUpdates, Error>((emit) => {
      try {
        invariant(SpaceId.isValid(request.spaceId));
        const next = (msg: DataService.BatchedDocumentUpdates) => {
          void emit.single(msg);
        };
        this.dataSubscriptions.set(request.subscriptionId, { spaceId: request.spaceId, next });
        // Ready beacon: `RepoProxy` gates every `updateSubscription` on the subscription's first
        // batch, so without it document loads wait forever (mirrors the echo-host `DataService`).
        next({ updates: [] });
        return Effect.sync(() => {
          this.dataSubscriptions.delete(request.subscriptionId);
        });
      } catch (error) {
        void emit.fail(error as Error);
      }
    });
  }

  ['DataService.updateSubscription'](request: DataService.UpdateSubscriptionRequest): Effect.Effect<void, Error> {
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

  ['DataService.createDocument'](
    request: DataService.CreateDocumentRequest,
  ): Effect.Effect<DataService.CreateDocumentResponse, Error> {
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

  ['DataService.update'](request: DataService.UpdateRequest): Effect.Effect<void, Error> {
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

  ['DataService.flush'](_request: DataService.FlushRequest): Effect.Effect<void, Error> {
    return Effect.void;
  }

  ['DataService.subscribeSpaceSyncState'](
    _request: DataService.GetSpaceSyncStateRequest,
  ): EffectStream.Stream<DataService.SpaceSyncState, Error> {
    return EffectStream.fail(
      new NotImplementedError({
        message: 'subscribeSpaceSyncState is not implemented.',
      }),
    );
  }

  ['DataService.getDocumentHeads'](
    _request: DataService.GetDocumentHeadsRequest,
  ): Effect.Effect<DataService.GetDocumentHeadsResponse, Error> {
    return Effect.fail(
      new NotImplementedError({
        message: 'getDocumentHeads is not implemented.',
      }),
    );
  }

  ['DataService.reIndexHeads'](_request: DataService.ReIndexHeadsRequest): Effect.Effect<void, Error> {
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

  ['DataService.waitUntilHeadsReplicated'](
    _request: DataService.WaitUntilHeadsReplicatedRequest,
  ): Effect.Effect<void, Error> {
    return Effect.fail(
      new NotImplementedError({
        message: 'waitUntilHeadsReplicated is not implemented.',
      }),
    );
  }

  ['DataService.stats'](_request: DataService.DatabaseStatsRequest): Effect.Effect<DataService.DatabaseStats, Error> {
    // TODO(dmaretskyi): Implement per the EDGE section of `echo-host/docs/GARBAGE_COLLECTION.md`.
    return Effect.fail(
      new NotImplementedError({
        message: 'stats is not implemented in the EDGE runtime.',
      }),
    );
  }

  ['DataService.runGarbageCollection'](
    _request: DataService.RunGarbageCollectionRequest,
  ): Effect.Effect<DataService.GarbageCollectionReport, Error> {
    // TODO(dmaretskyi): Implement per the EDGE section of `echo-host/docs/GARBAGE_COLLECTION.md`.
    return Effect.fail(
      new NotImplementedError({
        message: 'runGarbageCollection is not implemented in the EDGE runtime.',
      }),
    );
  }
}
