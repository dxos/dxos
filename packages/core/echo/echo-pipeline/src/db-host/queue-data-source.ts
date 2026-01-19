//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import type * as SqlClient from '@effect/sql/SqlClient';
import { RuntimeProvider } from '@dxos/effect';
import { type FeedStore, FeedCursor } from '@dxos/feed';
import { type DataSourceCursor, type IndexDataSource, type IndexCursor, type IndexerObject } from '@dxos/index-core';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

export class QueueDataSource implements IndexDataSource {
  readonly sourceName = 'queue';

  constructor(
    private readonly _feedStore: FeedStore,
    private readonly _runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>,
  ) {}

  getChangedObjects(
    cursors: IndexCursor[],
    opts?: { limit?: number },
  ): Effect.Effect<{ objects: IndexerObject[]; cursors: DataSourceCursor[] }> {
    return Effect.promise(() =>
      RuntimeProvider.runPromise(this._runtime)(
        Effect.gen(this, function* () {
          const objects: IndexerObject[] = [];
          const updatedCursors: DataSourceCursor[] = [];

          // Limit per call, but we might have multiple spaces.
          // We should distribute limit or just fill up to limit.
          let remainingLimit = opts?.limit ?? Infinity;

          for (const cursor of cursors) {
            if (remainingLimit <= 0) {
              // Remaining cursors are not processed in this call.
              updatedCursors.push(cursor);
              continue;
            }

            const spaceId = cursor.spaceId as SpaceId;
            if (!spaceId) continue;

            const currentCursor = typeof cursor.cursor === 'string' ? FeedCursor.make(cursor.cursor) : undefined;

            try {
              const result = yield* this._feedStore.query({
                spaceId,
                cursor: currentCursor,
                query: {
                  // Query all feeds in data namespace
                  feedNamespace: 'data',
                },
                limit: remainingLimit,
              });

              // Process blocks
              for (const block of result.blocks) {
                try {
                  const dataString = new TextDecoder().decode(block.data);
                  // TODO: Handle non-JSON data?
                  const data = JSON.parse(dataString);

                  objects.push({
                    spaceId,
                    queueId: block.feedId, // TODO(dmaretskyi): Need to update feedStore to expose feedId when querying all blocks in the feed.
                    documentId: null, // Queues don't map to documents in the same way.
                    recordId: null,
                    data,
                  });
                } catch (err) {
                  log.warn('Failed to parse block data for indexing', { spaceId, err });
                }
              }

              if (result.blocks.length > 0) {
                remainingLimit -= result.blocks.length;
                updatedCursors.push({
                  spaceId,
                  resourceId: null,
                  cursor: result.nextCursor,
                });
              } else {
                updatedCursors.push({
                  spaceId,
                  resourceId: null,
                  cursor: result.nextCursor,
                });
              }
            } catch (error) {
              log.error('Error querying queue for indexing', { spaceId, error });
            }
          }

          return { objects, cursors: updatedCursors };
        }),
      ),
    );
  }
}
