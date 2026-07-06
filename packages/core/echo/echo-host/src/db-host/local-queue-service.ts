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
  type DeleteFromQueueRequest,
  type GetSyncStateRequest,
  type GetSyncStateResponse,
  type InsertIntoQueueRequest,
  type QueryQueueRequest,
  type QueueQueryResult,
  type QueueService,
  type SyncQueueRequest,
} from '@dxos/protocols/proto/dxos/client/services';
import type { SqlTransaction } from '@dxos/sql-sqlite';

/**
 * Writes queue data to a local FeedStore.
 */
// TODO(queue-to-feed-migration): retains "Queue" naming — implements `FeedProtocol.QueueService`,
// the wire RPC interface; renaming this class would decouple it from the interface it implements.
// Deferred to Phase 6 (QueueFactory removal), which renames the RPC contract and this impl together.
export class LocalQueueServiceImpl implements QueueService {
  #runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransaction.SqlTransaction>;
  #feedStore: FeedStore;
  #syncQueue?: (ctx: Context, request: SyncQueueRequest) => Promise<void>;
  #getSyncState?: (ctx: Context, request: GetSyncStateRequest) => Promise<GetSyncStateResponse>;

  constructor(
    runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransaction.SqlTransaction>,
    feedStore: FeedStore,
    options?: {
      syncQueue?: (ctx: Context, request: SyncQueueRequest) => Promise<void>;
      getSyncState?: (ctx: Context, request: GetSyncStateRequest) => Promise<GetSyncStateResponse>;
    },
  ) {
    this.#runtime = runtime;
    this.#feedStore = feedStore;
    this.#syncQueue = options?.syncQueue;
    this.#getSyncState = options?.getSyncState;
  }

  queryQueue(request: QueryQueueRequest): Promise<QueueQueryResult> {
    const { query } = request;
    invariant(query, 'query is required');
    const { spaceId, queueIds } = query;
    return RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(this, function* () {
        const cursor = query.after ? parseInt(query.after) : -1;
        const result = yield* this.#feedStore.query({
          requestId: crypto.randomUUID(),
          feedNamespace: request.query.queuesNamespace || FeedProtocol.WellKnownNamespaces.data,
          spaceId: spaceId! as SpaceId,
          query: { feedIds: queueIds ?? [] },
          position: cursor,
          limit: query.limit,
        });

        const objects = result.blocks.map((block: FeedProtocol.Block) =>
          JSON.stringify(EchoFeedCodec.decode(block.data, block.position ?? undefined) as ObjectJSON),
        );

        const lastBlock = result.blocks[result.blocks.length - 1];
        const nextCursor = lastBlock && lastBlock.position != null ? String(lastBlock.position) : null;

        return Function.identity<QueueQueryResult>({
          objects,

          // TODO(dmaretskyi): This is wrong, fix later - cursors should come directly from the feed.
          nextCursor: nextCursor?.toString() ?? '',
          prevCursor: '',
        });
      }),
    );
  }

  insertIntoQueue(request: InsertIntoQueueRequest): Promise<void> {
    const { subspaceTag, spaceId, queueId, objects } = request;
    const feedNamespace = subspaceTag ?? FeedProtocol.WellKnownNamespaces.data;
    assertArgument(
      FeedProtocol.isWellKnownNamespace(feedNamespace),
      'request.subspaceTag',
      'expected a well-known queue namespace',
    );
    return RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(this, function* () {
        const messages = (objects ?? []).map((encoded) => ({
          spaceId: spaceId,
          feedId: queueId!,
          feedNamespace,
          data: EchoFeedCodec.encode(JSON.parse(encoded) as ObjectJSON),
        }));

        yield* this.#feedStore.appendLocal(messages);
      }),
    );
  }

  deleteFromQueue(request: DeleteFromQueueRequest): Promise<void> {
    const { subspaceTag, spaceId, queueId, objectIds } = request;
    const feedNamespace = subspaceTag ?? FeedProtocol.WellKnownNamespaces.data;
    assertArgument(
      FeedProtocol.isWellKnownNamespace(feedNamespace),
      'request.subspaceTag',
      'expected a well-known queue namespace',
    );
    return RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(this, function* () {
        const messages = objectIds!.map((id) => ({
          spaceId: spaceId,
          feedId: queueId!,
          feedNamespace,
          data: EchoFeedCodec.encode({ id, '@deleted': true }),
        }));

        yield* this.#feedStore.appendLocal(messages);
      }),
    );
  }

  async syncQueue(request: SyncQueueRequest, options?: RequestOptions): Promise<void> {
    await this.#syncQueue?.(options?.ctx ?? Context.default(), request);
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
