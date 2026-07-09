//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { RuntimeServiceError } from '@dxos/errors';
import { type EdgeFunctionEnv, type FeedProtocol } from '@dxos/protocols';
import { type FeedService } from '@dxos/protocols/rpc';

export class FeedServiceImpl implements FeedService.Handlers {
  constructor(
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
}
