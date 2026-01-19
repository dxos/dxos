//
// Copyright 2025 DXOS.org
//

import type * as SqlClient from '@effect/sql/SqlClient';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';

import { ATTR_META, type ObjectJSON } from '@dxos/echo/internal';
import type { ForeignKey } from '@dxos/echo-protocol';
import { RuntimeProvider } from '@dxos/effect';
import { type Block, type FeedStore } from '@dxos/feed';
import { invariant } from '@dxos/invariant';
import { KEY_QUEUE_POSITION } from '@dxos/protocols';
import {
  type DeleteFromQueueRequest,
  type InsertIntoQueueRequest,
  type QueryQueueRequest,
  type QueueQueryResult,
  type QueueService,
} from '@dxos/protocols/proto/dxos/client/services';

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
          if (block.position !== null) {
            setQueuePosition(data, block.position);
          }
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
        const messages = objects!.map((obj) => {
          const data = structuredClone(obj);
          if (data[ATTR_META].keys?.find((key: ForeignKey) => key.source === KEY_QUEUE_POSITION)) {
            data[ATTR_META].keys = data[ATTR_META].keys.filter((key: ForeignKey) => key.source !== KEY_QUEUE_POSITION);
          }

          return {
            spaceId: spaceId,
            feedId: queueId!,
            feedNamespace: subspaceTag,
            data: new TextEncoder().encode(JSON.stringify(obj)),
          };
        });

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

// TODO(dmaretskyi): Duplicated code.
const setQueuePosition = (obj: ObjectJSON, position: number) => {
  obj[ATTR_META] ??= { keys: [] };
  obj[ATTR_META].keys ??= [];
  for (let i = 0; i < obj[ATTR_META].keys.length; i++) {
    const key = obj[ATTR_META].keys[i];
    if (key.source === KEY_QUEUE_POSITION) {
      obj[ATTR_META].keys.splice(i, 1);
      i--;
    }
  }
  obj[ATTR_META].keys.push({
    source: KEY_QUEUE_POSITION,
    id: position.toString(),
  });
};
