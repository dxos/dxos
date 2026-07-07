//
// Copyright 2025 DXOS.org
//

import { RuntimeServiceError } from '@dxos/errors';
import { type EdgeFunctionEnv, type FeedProtocol } from '@dxos/protocols';

export class FeedServiceImpl implements FeedProtocol.FeedService {
  constructor(
    protected _ctx: EdgeFunctionEnv.TraceContext,
    private readonly _queueService: EdgeFunctionEnv.QueueService,
  ) {}

  async queryFeed(request: FeedProtocol.QueryFeedRequest): Promise<FeedProtocol.QueryResult> {
    try {
      using result = await this._queueService.queryQueue(this._ctx, request);
      // Copy to avoid hanging RPC stub (Workers RPC lifecycle).
      return {
        objects: structuredClone(result.objects),
        nextCursor: result.nextCursor,
        prevCursor: result.prevCursor,
      };
    } catch (error) {
      const { query } = request;
      throw RuntimeServiceError.wrap({
        message: 'Feed query failed.',
        context: {
          subspaceTag: query?.feedNamespace,
          spaceId: query?.spaceId,
          feedId: query?.feedIds?.[0],
        },
        ifTypeDiffers: true,
      })(error);
    }
  }

  async insertIntoFeed(request: FeedProtocol.InsertIntoFeedRequest): Promise<void> {
    try {
      using _ = await this._queueService.insertIntoQueue(this._ctx, request);
    } catch (error) {
      const { subspaceTag, spaceId, feedId } = request;
      throw RuntimeServiceError.wrap({
        message: 'Feed append failed.',
        context: { subspaceTag, spaceId, feedId },
        ifTypeDiffers: true,
      })(error);
    }
  }

  async deleteFromFeed(request: FeedProtocol.DeleteFromFeedRequest): Promise<void> {
    try {
      using _ = await this._queueService.deleteFromQueue(this._ctx, request);
    } catch (error) {
      const { subspaceTag, spaceId, feedId } = request;
      throw RuntimeServiceError.wrap({
        message: 'Feed delete failed.',
        context: { subspaceTag, spaceId, feedId },
        ifTypeDiffers: true,
      })(error);
    }
  }

  async syncFeed(_: FeedProtocol.SyncFeedRequest): Promise<void> {
    // No-op in Cloudflare runtime.
  }

  async getSyncState(_: FeedProtocol.GetSyncStateRequest): Promise<FeedProtocol.GetSyncStateResponse> {
    return { namespaces: [] };
  }
}
