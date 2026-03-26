//
// Copyright 2026 DXOS.org
//

import type * as SqlClient from '@effect/sql/SqlClient';
import * as Effect from 'effect/Effect';

import { type ObjectJSON } from '@dxos/echo/internal';
import { EchoFeedCodec } from '@dxos/echo-protocol';
import { RuntimeProvider } from '@dxos/effect';
import { type FeedStore } from '@dxos/feed';
import { type DataSourceCursor, type IndexDataSource, type IndexerObject } from '@dxos/index-core';
import { failedInvariant } from '@dxos/invariant';
import type { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { FeedProtocol } from '@dxos/protocols';

export type QueueDataSourceOptions = {
  feedStore: FeedStore;
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>;
  /**
   * Callback to get the list of space IDs that should be indexed.
   */
  getSpaceIds: () => SpaceId[];

  /**
   * Feed namespaces to index.
   * @default [WellKnownNamespaces.data, WellKnownNamespaces.trace]
   */
  feedNamespaces?: string[];
};

export class QueueDataSource implements IndexDataSource {
  readonly sourceName = 'queue';

  /**
   * Feed namespaces to index.
   */
  private readonly _feedNamespaces: string[];
  private readonly _feedStore: FeedStore;
  private readonly _runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>;
  private readonly _getSpaceIds: () => SpaceId[];

  constructor(options: QueueDataSourceOptions) {
    this._feedStore = options.feedStore;
    this._runtime = options.runtime;
    this._getSpaceIds = options.getSpaceIds;
    this._feedNamespaces = options.feedNamespaces ?? [
      FeedProtocol.WellKnownNamespaces.data,
      FeedProtocol.WellKnownNamespaces.trace,
    ];
  }

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

      // Delete old cursors that did not have feed namespace set.
      let augmentedCursors = [...cursors].filter((c) => c.resourceId !== null);
      for (const spaceId of this._getSpaceIds()) {
        for (const feedNamespace of this._feedNamespaces) {
          if (!augmentedCursors.some((c) => c.spaceId === spaceId && c.resourceId === feedNamespace)) {
            // Add a new cursor for this space starting from the beginning.
            // Empty string cursor means "start from beginning".
            augmentedCursors.push({
              spaceId,
              resourceId: feedNamespace,
              cursor: '',
            });
          }
        }
      }

      // Limit per call, but we might have multiple spaces.
      // We should distribute limit or just fill up to limit.
      let remainingLimit = opts?.limit ?? Infinity;

      for (const cursor of augmentedCursors) {
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
        if (
          FeedProtocol.WellKnownNamespaces.data !== cursor.resourceId &&
          FeedProtocol.WellKnownNamespaces.trace !== cursor.resourceId
        ) {
          // TODO(dmaretskyi): Update/remove this check when adding new feed namespaces.
          log.warn('Ignoring cursor with invaliding feed namespace', { namespace: cursor.resourceId });
          // Ignore cursors with unknown resourceId.
          updatedCursors.push(cursor);
          continue;
        }

        // Empty string cursor means "start from beginning".
        const currentCursor =
          typeof cursor.cursor === 'string' && cursor.cursor !== ''
            ? FeedProtocol.FeedCursor.make(cursor.cursor)
            : undefined;

        try {
          const result = yield* this._feedStore.query({
            spaceId: cursor.spaceId,
            feedNamespace: cursor.resourceId,
            cursor: currentCursor,
            limit: remainingLimit,
          });

          // Process blocks
          for (const block of result.blocks) {
            try {
              const data = EchoFeedCodec.decode(block.data) as ObjectJSON;

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
            resourceId: cursor.resourceId,
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
