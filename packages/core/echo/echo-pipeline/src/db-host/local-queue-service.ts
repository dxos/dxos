//
// Copyright 2025 DXOS.org
//

import type * as SqlClient from '@effect/sql/SqlClient';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';

import { type ObjectJSON } from '@dxos/echo/internal';
import { RuntimeProvider } from '@dxos/effect';
import { type FeedStore } from '@dxos/feed';
import { assertArgument, invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';
import {
  type DeleteFromQueueRequest,
  type InsertIntoQueueRequest,
  type QueryQueueRequest,
  type QueueQueryResult,
  type QueueService,
} from '@dxos/protocols/proto/dxos/client/services';
import type { SqlTransaction } from '@dxos/sql-sqlite';

import { EchoFeedCodec } from './queue-feed-codec';

/**
 * Writes queue data to a local FeedStore.
 */
export class LocalQueueServiceImpl implements QueueService {
  #runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransaction.SqlTransaction>;
  #feedStore: FeedStore;

  constructor(
    runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransaction.SqlTransaction>,
    feedStore: FeedStore,
  ) {
    this.#runtime = runtime;
    this.#feedStore = feedStore;
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

        const objects = result.blocks.map(
          (block: FeedProtocol.Block) => EchoFeedCodec.decode(block.data, block.position ?? undefined) as ObjectJSON,
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
        const messages = objects!.map((obj) => ({
          spaceId: spaceId,
          feedId: queueId!,
          feedNamespace,
          data: EchoFeedCodec.encode(obj as ObjectJSON),
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
}
