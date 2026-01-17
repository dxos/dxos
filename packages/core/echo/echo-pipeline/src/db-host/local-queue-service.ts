//
// Copyright 2025 DXOS.org
//

import { RuntimeProvider } from '@dxos/effect';
import { FeedStore, type Block } from '@dxos/feed';
import type { ObjectId, SpaceId } from '@dxos/keys';
import { type QueryResult, type QueueQuery, type QueueService } from '@dxos/protocols';
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

  queryQueue(subspaceTag: string, spaceId: SpaceId, query: QueueQuery): Promise<QueryResult> {
    return RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(this, function* () {
        const cursor = query.after ? parseInt(query.after) : -1;
        const result = yield* this.#feedStore.query({
          requestId: crypto.randomUUID(),
          spaceId: spaceId,
          query: { feedIds: [query.queueId.toString()] },
          cursor,
          limit: query.limit,
        });

        const objects = result.blocks.map((block: Block) => {
          const data = JSON.parse(new TextDecoder().decode(block.data));
          return data;
        });

        const lastBlock = result.blocks[result.blocks.length - 1];
        const nextCursor = lastBlock && lastBlock.position != null ? String(lastBlock.position) : null;

        return Function.identity<QueryResult>({
          objects,
          nextCursor: nextCursor as any, // Cast to QueueCursor
          prevCursor: null,
        });
      }),
    );
  }

  insertIntoQueue(subspaceTag: string, spaceId: SpaceId, queueId: ObjectId, objects: unknown[]): Promise<void> {
    return RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(this, function* () {
        const messages = objects.map((obj) => ({
          spaceId: spaceId,
          feedId: queueId,
          feedNamespace: subspaceTag,
          data: new TextEncoder().encode(JSON.stringify(obj)),
        }));

        yield* this.#feedStore.appendLocal(messages);
      }),
    );
  }

  deleteFromQueue(subspaceTag: string, spaceId: SpaceId, queueId: ObjectId, objectIds: ObjectId[]): Promise<void> {
    return RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(this, function* () {
        const messages = objectIds.map((id) => ({
          spaceId: spaceId,
          feedId: queueId,
          feedNamespace: subspaceTag,
          data: new TextEncoder().encode(JSON.stringify({ id, '@deleted': true })),
        }));

        yield* this.#feedStore.appendLocal(messages);
      }),
    );
  }
}
