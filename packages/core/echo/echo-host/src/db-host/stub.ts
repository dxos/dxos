//
// Copyright 2025 DXOS.org
//

import type {
  DeleteFromFeedRequest,
  FeedQueryResult,
  FeedService,
  GetSyncStateRequest,
  GetSyncStateResponse,
  InsertIntoFeedRequest,
  QueryFeedRequest,
  SyncFeedRequest,
} from '@dxos/protocols/proto/dxos/client/services';

/**
 * Stub implementation for when Edge is not available.
 */
export class FeedServiceStub implements FeedService {
  queryFeed(request: QueryFeedRequest): Promise<FeedQueryResult> {
    throw new Error('Not available.');
  }

  insertIntoFeed(request: InsertIntoFeedRequest): Promise<void> {
    throw new Error('Not available.');
  }

  deleteFromFeed(request: DeleteFromFeedRequest): Promise<void> {
    throw new Error('Not available.');
  }

  syncFeed(request: SyncFeedRequest): Promise<void> {
    throw new Error('Not available.');
  }

  getSyncState(request: GetSyncStateRequest): Promise<GetSyncStateResponse> {
    throw new Error('Not available.');
  }
}
