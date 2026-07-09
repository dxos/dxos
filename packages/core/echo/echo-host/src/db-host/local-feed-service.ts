//
// Copyright 2025 DXOS.org
//

import type * as SqlClient from '@effect/sql/SqlClient';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';

import { type RequestOptions } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { EchoFeedCodec } from '@dxos/echo-protocol';
import { type ObjectJSON } from '@dxos/echo/internal';
import { RuntimeProvider } from '@dxos/effect';
import { type FeedStore } from '@dxos/feed';
import { assertArgument, invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';
import {
  type DeleteFromFeedRequest,
  type FeedQueryResult,
  type FeedService,
  type GetSyncStateRequest,
  type GetSyncStateResponse,
  type InsertIntoFeedRequest,
  type QueryFeedRequest,
  type SyncFeedRequest,
} from '@dxos/protocols/proto/dxos/client/services';
import type { SqlTransaction } from '@dxos/sql-sqlite';

/**
 * Writes feed data to a local FeedStore.
 */
export class LocalFeedServiceImpl implements FeedService {
  #runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransaction.SqlTransaction>;
  #feedStore: FeedStore;
  #syncFeed?: (ctx: Context, request: SyncFeedRequest) => Promise<void>;
  #getSyncState?: (ctx: Context, request: GetSyncStateRequest) => Promise<GetSyncStateResponse>;

  constructor(
    runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransaction.SqlTransaction>,
    feedStore: FeedStore,
    options?: {
      syncFeed?: (ctx: Context, request: SyncFeedRequest) => Promise<void>;
      getSyncState?: (ctx: Context, request: GetSyncStateRequest) => Promise<GetSyncStateResponse>;
    },
  ) {
    this.#runtime = runtime;
    this.#feedStore = feedStore;
    this.#syncFeed = options?.syncFeed;
    this.#getSyncState = options?.getSyncState;
  }

  queryFeed(request: QueryFeedRequest): Promise<FeedQueryResult> {
    const { query } = request;
    invariant(query, 'query is required');
    const { spaceId, feedIds } = query;
    return RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(this, function* () {
        const result = yield* this.#feedStore.query({
          requestId: crypto.randomUUID(),
          feedNamespace: request.query.feedNamespace || FeedProtocol.WellKnownNamespaces.data,
          spaceId: spaceId! as SpaceId,
          query: { feedIds: feedIds ?? [] },
          cursor: query.after ? FeedProtocol.FeedCursor.make(query.after) : undefined,
          limit: query.limit,
        });

        const objects = result.blocks.map((block: FeedProtocol.Block) =>
          JSON.stringify(EchoFeedCodec.decode(block.data, block.position ?? undefined) as ObjectJSON),
        );

        return Function.identity<FeedQueryResult>({
          objects,
          nextCursor: result.nextCursor,
          prevCursor: '',
        });
      }),
    );
  }

  insertIntoFeed(request: InsertIntoFeedRequest): Promise<void> {
    const { subspaceTag, spaceId, feedId, objects } = request;
    const feedNamespace = subspaceTag ?? FeedProtocol.WellKnownNamespaces.data;
    assertArgument(
      FeedProtocol.isWellKnownNamespace(feedNamespace),
      'request.subspaceTag',
      'expected a well-known feed namespace',
    );
    return RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(this, function* () {
        const messages = (objects ?? []).map((encoded) => ({
          spaceId: spaceId,
          feedId: feedId!,
          feedNamespace,
          data: EchoFeedCodec.encode(JSON.parse(encoded) as ObjectJSON),
        }));

        yield* this.#feedStore.appendLocal(messages);
      }),
    );
  }

  deleteFromFeed(request: DeleteFromFeedRequest): Promise<void> {
    const { subspaceTag, spaceId, feedId, objectIds } = request;
    const feedNamespace = subspaceTag ?? FeedProtocol.WellKnownNamespaces.data;
    assertArgument(
      FeedProtocol.isWellKnownNamespace(feedNamespace),
      'request.subspaceTag',
      'expected a well-known feed namespace',
    );
    return RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(this, function* () {
        const messages = objectIds!.map((id) => ({
          spaceId: spaceId,
          feedId: feedId!,
          feedNamespace,
          data: EchoFeedCodec.encode({ id, '@deleted': true }),
        }));

        yield* this.#feedStore.appendLocal(messages);
      }),
    );
  }

  async syncFeed(request: SyncFeedRequest, options?: RequestOptions): Promise<void> {
    await this.#syncFeed?.(options?.ctx ?? Context.default(), request);
  }

  getSyncState(request: GetSyncStateRequest, options?: RequestOptions): Promise<GetSyncStateResponse> {
    const ctx = options?.ctx ?? Context.default();
    if (this.#getSyncState) {
      return this.#getSyncState(ctx, request);
    }

    const spaceId = request.spaceId as SpaceId;
    const namespaces =
      request.namespaces != null && request.namespaces.length > 0
        ? request.namespaces
        : Object.values(FeedProtocol.WellKnownNamespaces);

    return RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(this, function* () {
        const namespaceStates = yield* Effect.forEach(
          namespaces,
          (feedNamespace) =>
            Effect.gen(this, function* () {
              const blocksToPush = yield* this.#feedStore.countUnpositionedBlocks({
                spaceId,
                feedNamespace,
              });
              const totalBlocks = yield* this.#feedStore.countNamespaceBlocks({
                spaceId,
                feedNamespace,
              });
              return {
                namespace: feedNamespace,
                blocksToPull: '0',
                blocksToPush: String(blocksToPush),
                totalBlocks: String(totalBlocks),
              };
            }),
          { concurrency: 'unbounded' },
        );
        return { namespaces: namespaceStates };
      }),
    );
  }
}
