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

  /**
   * Passes on the block ids and predecessors the queue service reports, which a writer needs to confirm a fork; a
   * service that reports none leaves readers to identify the blocks by their positions.
   */
  ['FeedService.insertIntoFeed'](
    request: FeedProtocol.InsertIntoFeedRequest,
  ): Effect.Effect<FeedProtocol.InsertIntoFeedResponse, Error> {
    return Effect.tryPromise({
      try: async () => {
        using result = await this._queueService.insertIntoQueue(this._ctx, request);
        // Copied out of the RPC result, which is released when this scope ends.
        const blocks = 'blocks' in result ? result.blocks : undefined;
        const predecessors = 'predecessors' in result ? result.predecessors : undefined;
        return {
          ...(Array.isArray(blocks) ? { blocks: blocks.filter((block) => typeof block === 'string') } : {}),
          ...(Array.isArray(predecessors)
            ? {
                predecessors: predecessors.filter(
                  (predecessor) => predecessor === null || typeof predecessor === 'string',
                ),
              }
            : {}),
        };
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
