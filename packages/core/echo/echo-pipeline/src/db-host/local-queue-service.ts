//
// Copyright 2025 DXOS.org
//

import { RuntimeProvider } from '@dxos/effect';
import { FeedStore, type Block } from '@dxos/feed';
import type { ObjectId, SpaceId } from '@dxos/keys';
import {
  type QueryQueueRequest,
  type InsertIntoQueueRequest,
  type DeleteFromQueueRequest,
  type QueueQueryResult,
  type QueueQuery,
  type QueueService,
} from '@dxos/protocols/proto/dxos/client/services';
import { invariant } from '@dxos/invariant';
import type * as SqlClient from '@effect/sql/SqlClient';
import { Effect, Function } from 'effect';

/**
 * Writes queue data to a local FeedStore.
 */
export class LocalQueueServiceImpl implements QueueService {
  #runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>;
  #feedStore: FeedStore;

  constructor(runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>, feedStore: FeedStore) {
    this.#runtime = runtime;
    this.#feedStore = feedStore;
  }

  queryQueue(request: QueryQueueRequest): Promise<QueueQueryResult> {
    const { subspaceTag, spaceId, query } = request;
    return RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(this, function* () {
        invariant(query, 'query is required');
        const cursor = query.after ? parseInt(query.after) : -1;
        const result = yield* this.#feedStore.query({
          requestId: crypto.randomUUID(),
          spaceId: spaceId,
          query: { feedIds: [query.queueId!.toString()] },
          cursor,
          limit: query.limit,
        });

        const objects = result.blocks.map((block: Block) => {
          const data = JSON.parse(new TextDecoder().decode(block.data));
          return data;
        });

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
    return RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(this, function* () {
        const messages = objects!.map((obj) => ({
          spaceId: spaceId,
          feedId: queueId!,
          feedNamespace: subspaceTag,
          data: new TextEncoder().encode(JSON.stringify(obj)),
        }));

        yield* this.#feedStore.appendLocal(messages);
      }),
    );
  }

  deleteFromQueue(request: DeleteFromQueueRequest): Promise<void> {
    const { subspaceTag, spaceId, queueId, objectIds } = request;
    return RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(this, function* () {
        const messages = objectIds!.map((id) => ({
          spaceId: spaceId,
          feedId: queueId!,
          feedNamespace: subspaceTag,
          data: new TextEncoder().encode(JSON.stringify({ id, '@deleted': true })),
        }));

        yield* this.#feedStore.appendLocal(messages);
      }),
    );
  }
}
