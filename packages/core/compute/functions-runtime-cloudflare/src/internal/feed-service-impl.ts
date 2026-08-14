//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { RuntimeServiceError } from '@dxos/errors';
import { type EdgeFunctionEnv, type FeedProtocol } from '@dxos/protocols';
import { type FeedService } from '@dxos/protocols/rpc';

export class FeedServiceImpl implements FeedService.Handlers {
  'constructor'(
    protected _ctx: EdgeFunctionEnv.TraceContext,
    private readonly _queueService: EdgeFunctionEnv.QueueService,
  ) {}

  ['FeedService.queryFeed'](request: FeedProtocol.QueryFeedRequest): Effect.Effect<FeedProtocol.QueryResult, Error> {
    return Effect.tryPromise({
      try: async () => {
        using result = await this._queueService.queryQueue(this._ctx, request);
        // Copy to avoid hanging RPC stub (Workers RPC lifecycle).
        return {
          objects: structuredClone(result.objects),
          nextCursor: result.nextCursor,
          prevCursor: result.prevCursor,
        };
      },
      catch: (error) => {
        const { query } = request;
        return RuntimeServiceError.wrap({
          message: 'Feed query failed.',
          context: {
            subspaceTag: query?.feedNamespace,
            spaceId: query?.spaceId,
            feedId: query?.feedIds?.[0],
          },
          ifTypeDiffers: true,
        })(error);
      },
    });
  }

  /**
   * The queue-backed store has no change-notification mechanism in this runtime, so this pushes a
   * single snapshot (the same one `queryFeed` would return) rather than live updates.
   */
  ['FeedService.subscribeFeed'](
    request: FeedProtocol.QueryFeedRequest,
  ): EffectStream.Stream<FeedProtocol.QueryResult, Error> {
    return EffectStream.fromEffect(this['FeedService.queryFeed'](request));
  }

  ['FeedService.insertIntoFeed'](request: FeedProtocol.InsertIntoFeedRequest): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        using _ = await this._queueService.insertIntoQueue(this._ctx, request);
      },
      catch: (error) => {
        const { subspaceTag, spaceId, feedId } = request;
        return RuntimeServiceError.wrap({
          message: 'Feed append failed.',
          context: { subspaceTag, spaceId, feedId },
          ifTypeDiffers: true,
        })(error);
      },
    });
  }

  ['FeedService.deleteFromFeed'](request: FeedProtocol.DeleteFromFeedRequest): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        using _ = await this._queueService.deleteFromQueue(this._ctx, request);
      },
      catch: (error) => {
        const { subspaceTag, spaceId, feedId } = request;
        return RuntimeServiceError.wrap({
          message: 'Feed delete failed.',
          context: { subspaceTag, spaceId, feedId },
          ifTypeDiffers: true,
        })(error);
      },
    });
  }

  ['FeedService.syncFeed'](_request: FeedProtocol.SyncFeedRequest): Effect.Effect<void, Error> {
    // No-op in Cloudflare runtime.
    return Effect.void;
  }

  ['FeedService.getSyncState'](
    _request: FeedProtocol.GetSyncStateRequest,
  ): Effect.Effect<FeedProtocol.GetSyncStateResponse, Error> {
    return Effect.succeed({ namespaces: [] });
  }

  /**
   * The Cloudflare queue-backed runtime has no sync backlog to report (no-op, matching
   * {@link FeedServiceImpl."FeedService.getSyncState"}); emits the same empty snapshot once.
   */
  ['FeedService.subscribeSyncState'](
    _request: FeedProtocol.GetSyncStateRequest,
  ): EffectStream.Stream<FeedProtocol.GetSyncStateResponse, Error> {
    return EffectStream.succeed<FeedProtocol.GetSyncStateResponse>({ namespaces: [] });
  }
}
