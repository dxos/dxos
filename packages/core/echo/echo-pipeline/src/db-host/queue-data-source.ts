//
// Copyright 2026 DXOS.org
//

import type * as SqlClient from '@effect/sql/SqlClient';
import * as Effect from 'effect/Effect';

import { RuntimeProvider } from '@dxos/effect';
import { FeedCursor, type FeedStore } from '@dxos/feed';
import { type DataSourceCursor, type IndexDataSource, type IndexerObject } from '@dxos/index-core';
import { failedInvariant } from '@dxos/invariant';
import { log } from '@dxos/log';

export class QueueDataSource implements IndexDataSource {
  readonly sourceName = 'queue';

  constructor(
    private readonly _feedStore: FeedStore,
    private readonly _runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>,
  ) {}

  getChangedObjects(
    cursors: DataSourceCursor[],
    opts?: { limit?: number },
  ): Effect.Effect<{ objects: IndexerObject[]; cursors: DataSourceCursor[] }> {
    // For queue, the cursor is assumed to have:
    // spaceId = set
    // resourceId = null
    // cursor = feed cursor

    // We also add new cursors from all previously unindexed spaces.

    return Effect.gen(this, function* () {
      const objects: IndexerObject[] = [];
      const updatedCursors: DataSourceCursor[] = [];

      // TODO(dmaretskyi): Here we should augment cursors with new spaces.
      // Initially the indexer will pass us an empty array of cursors.
      // We add new cursors starting for the beginning of the queue.

      // Limit per call, but we might have multiple spaces.
      // We should distribute limit or just fill up to limit.
      let remainingLimit = opts?.limit ?? Infinity;

      for (const cursor of cursors) {
        if (remainingLimit <= 0) {
          // Remaining cursors are not processed in this call.
          updatedCursors.push(cursor);
          continue;
        }
        if (!cursor.spaceId) {
          // Ignore cursors without spaceId.
          updatedCursors.push(cursor);
          continue;
        }

        const currentCursor = typeof cursor.cursor === 'string' ? FeedCursor.make(cursor.cursor) : undefined;

        try {
          const result = yield* this._feedStore.query({
            spaceId: cursor.spaceId,
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
                spaceId: cursor.spaceId,
                queueId: block.feedId ?? failedInvariant(),
                documentId: null,
                recordId: null,
                data,
              });
            } catch (err) {
              log.warn('Failed to parse block data for indexing', { spaceId: cursor.spaceId, err });
            }
          }

          remainingLimit -= result.blocks.length;
          updatedCursors.push({
            spaceId: cursor.spaceId,
            resourceId: null,
            cursor: result.nextCursor,
          });
        } catch (error) {
          log.error('Error querying queue for indexing', { spaceId: cursor.spaceId, error });
        }
      }

      return { objects, cursors: updatedCursors };
    }).pipe(RuntimeProvider.provide(this._runtime), Effect.withSpan('QueueDataSource.getChangedObjects'), Effect.orDie);
  }
}
