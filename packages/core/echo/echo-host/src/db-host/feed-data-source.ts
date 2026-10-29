//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as SqlClient from 'effect/sql/SqlClient';

import { type Context } from '@dxos/context';
import { EchoFeedCodec } from '@dxos/echo-protocol';
import { type ObjectJSON } from '@dxos/echo/internal';
import * as RuntimeProvider from '@dxos/effect/RuntimeProvider';
import { type FeedOptions, type FeedStore } from '@dxos/feed';
import { type DataSourceCursor, type IndexDataSource, type IndexerObject } from '@dxos/index-core';
import { failedInvariant } from '@dxos/invariant';
import type { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { FeedProtocol } from '@dxos/protocols';

export type FeedDataSourceOptions = {
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

/** Prefix of a backfill cursor's resource id, `backfill/<namespace>/<feedId>`. */
const BACKFILL_PREFIX = 'backfill/';

/** The value a backfill cursor takes once it has read its feed to the end; the host then deletes it. */
export const BACKFILL_FINISHED = 'done';

/**
 * Resource id of the cursor that backfills one feed, read by {@link FeedDataSource} beside the
 * namespace cursors; a host seeds it (`IndexEngine.seedCursor`) when a feed's indexing is re-enabled.
 */
export const backfillResourceId = (feedNamespace: string, feedId: string): string =>
  `${BACKFILL_PREFIX}${feedNamespace}/${feedId}`;

const parseBackfillResourceId = (resourceId: string): { feedNamespace: string; feedId: string } | undefined => {
  if (!resourceId.startsWith(BACKFILL_PREFIX)) {
    return undefined;
  }
  const rest = resourceId.slice(BACKFILL_PREFIX.length);
  const separator = rest.indexOf('/');
  return separator > 0 ? { feedNamespace: rest.slice(0, separator), feedId: rest.slice(separator + 1) } : undefined;
};

const isIndexingDisabled = (options: FeedOptions | undefined): boolean => options?.indexing?.enabled === false;

/** What one pass read beyond the objects it returned, for the host to act on once the pass ends. */
export type FeedPassReport = {
  /** Spaces whose feeds returned blocks, indexed or skipped; retention may have more to trim there. */
  spaces: Set<SpaceId>;
  /** Feeds whose blocks were skipped because indexing is disabled, keyed by space; their readers still need invalidating. */
  skippedFeeds: Map<SpaceId, Set<string>>;
  /** Backfill cursors that reached {@link BACKFILL_FINISHED}, for the host to delete. */
  finishedBackfills: Map<SpaceId, Set<string>>;
};

const makeEmptyReport = (): FeedPassReport => ({
  spaces: new Set(),
  skippedFeeds: new Map(),
  finishedBackfills: new Map(),
});

const addTo = (map: Map<SpaceId, Set<string>>, spaceId: SpaceId, value: string) => {
  const values = map.get(spaceId) ?? new Set();
  values.add(value);
  map.set(spaceId, values);
};

export class FeedDataSource implements IndexDataSource {
  // TODO(queue-to-feed-migration): retains "queue" naming — persisted as a column value in the
  // local `indexCursor`/`objectMeta` SQLite tables (see index-tracker.ts, indexes/entity-meta-index.ts);
  // renaming it requires a local index-store migration.
  readonly sourceName = 'queue';

  /**
   * Feed namespaces to index.
   */
  private readonly _feedNamespaces: string[];
  private readonly _feedStore: FeedStore;
  private readonly _runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>;
  private readonly _getSpaceIds: () => SpaceId[];

  /**
   * Reads made during the current pass, keyed by their request. The snapshot and reverse-ref legs of
   * one pass usually hold the same cursors, and a trace block can be over 100 KB, so the second leg
   * reuses the first leg's read instead of fetching the same blocks again.
   */
  #passReads: Map<string, FeedProtocol.QueryResponse> | undefined;

  /** Feeds already reported as re-read: an empty feed's cursor is never rewritten, so every pass meets it again. */
  readonly #restartedFeeds = new Set<string>();

  /** Each space's stored feed options, read once per pass. */
  #passOptions: Map<SpaceId, Map<string, FeedOptions>> | undefined;

  #report: FeedPassReport = makeEmptyReport();

  constructor(options: FeedDataSourceOptions) {
    this._feedStore = options.feedStore;
    this._runtime = options.runtime;
    this._getSpaceIds = options.getSpaceIds;
    this._feedNamespaces = options.feedNamespaces ?? [
      FeedProtocol.WellKnownNamespaces.data,
      FeedProtocol.WellKnownNamespaces.trace,
    ];
  }

  beginPass(): void {
    this.#passReads = new Map();
    this.#passOptions = new Map();
  }

  endPass(): void {
    this.#passReads = undefined;
    this.#passOptions = undefined;
  }

  /** What the passes since the last call read beyond their objects; resets the report. */
  takeReport(): FeedPassReport {
    const report = this.#report;
    this.#report = makeEmptyReport();
    return report;
  }

  #feedOptions(spaceId: SpaceId): Effect.Effect<Map<string, FeedOptions>, never, SqlClient.SqlClient> {
    return Effect.gen({ self: this }, function* () {
      const cached = this.#passOptions?.get(spaceId);
      if (cached) {
        return cached;
      }
      const options = yield* this._feedStore.listFeedOptions(spaceId).pipe(
        Effect.catch((error) => {
          // Indexing a disabled feed is recoverable (the rows go when its options next apply); failing every pass is not.
          log.warn('feed options could not be read, indexing every feed', { spaceId, error });
          return Effect.succeed(new Map<string, FeedOptions>());
        }),
      );
      this.#passOptions?.set(spaceId, options);
      return options;
    });
  }

  getChangedObjects(
    _ctx: Context,
    cursors: DataSourceCursor[],
    opts?: { limit?: number; objects?: boolean },
  ): Effect.Effect<{ objects: IndexerObject[]; cursors: DataSourceCursor[]; more: boolean }> {
    // Feed blocks carry no document activity, so an activity-only read would fetch every new block
    // just to discard it; returning no cursors also spares the activity leg its cursor write.
    if (opts?.objects === false) {
      return Effect.succeed({ objects: [], cursors: [], more: false });
    }

    // For queue, the cursor is assumed to have:
    // spaceId = set
    // resourceId = null
    // cursor = feed cursor

    // We also add new cursors from all previously unindexed spaces.

    return Effect.gen({ self: this }, function* () {
      const objects: IndexerObject[] = [];
      const updatedCursors: DataSourceCursor[] = [];

      // Delete old cursors that did not have feed namespace set. Backfills go first, so a block a
      // namespace cursor reads in the same batch is written after an older one of the same object.
      const isBackfill = (cursor: DataSourceCursor) =>
        cursor.resourceId !== null && parseBackfillResourceId(cursor.resourceId) !== undefined;
      let augmentedCursors = [
        ...cursors.filter((c) => c.resourceId !== null && isBackfill(c)),
        ...cursors.filter((c) => c.resourceId !== null && !isBackfill(c)),
      ];
      // Only its backfill reads a feed being backfilled, or the backfill's older blocks would overwrite newer ones.
      const backfilling = new Set(
        augmentedCursors.flatMap((cursor) => {
          const backfill = cursor.resourceId !== null ? parseBackfillResourceId(cursor.resourceId) : undefined;
          return backfill && cursor.cursor !== BACKFILL_FINISHED ? [`${cursor.spaceId}|${backfill.feedId}`] : [];
        }),
      );
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
        const backfill = cursor.resourceId !== null ? parseBackfillResourceId(cursor.resourceId) : undefined;
        const feedNamespace = backfill?.feedNamespace ?? cursor.resourceId;
        if (backfill && cursor.cursor === BACKFILL_FINISHED) {
          addTo(this.#report.finishedBackfills, cursor.spaceId, cursor.resourceId ?? failedInvariant());
          updatedCursors.push(cursor);
          continue;
        }
        if (
          FeedProtocol.WellKnownNamespaces.data !== feedNamespace &&
          FeedProtocol.WellKnownNamespaces.trace !== feedNamespace
        ) {
          // TODO(dmaretskyi): Update/remove this check when adding new feed namespaces.
          log.warn('Ignoring cursor with invaliding feed namespace', { namespace: cursor.resourceId });
          // Ignore cursors with unknown resourceId.
          updatedCursors.push(cursor);
          continue;
        }

        const storedCursor =
          typeof cursor.cursor === 'string' && cursor.cursor !== ''
            ? FeedProtocol.FeedCursor.make(cursor.cursor)
            : undefined;
        // The store fails a read from a cursor it did not issue, which would fail every pass; the index is
        // derived, so reading the feed again from the start is safe.
        const storedIsCurrent =
          storedCursor !== undefined && (yield* this._feedStore.isCursorCurrent(cursor.spaceId, storedCursor));
        const feedKey = `${cursor.spaceId}|${cursor.resourceId}`;
        const spaceId = cursor.spaceId;
        const feedOptions = yield* this.#feedOptions(spaceId);
        if (storedCursor && !storedIsCurrent && !this.#restartedFeeds.has(feedKey)) {
          this.#restartedFeeds.add(feedKey);
          log.warn('feed index cursor was issued by another store, reading the feed again', {
            spaceId: cursor.spaceId,
            feedNamespace: cursor.resourceId,
          });
        }
        const currentCursor =
          storedCursor && storedIsCurrent
            ? storedCursor
            : FeedProtocol.encodeFeedCursor(
                yield* this._feedStore.getServerToken(cursor.spaceId),
                FeedProtocol.FEED_START,
              );

        try {
          const readKey = JSON.stringify([cursor.spaceId, cursor.resourceId, currentCursor, remainingLimit]);
          const result =
            this.#passReads?.get(readKey) ??
            (yield* this._feedStore.query({
              spaceId,
              feedNamespace: feedNamespace ?? failedInvariant(),
              ...(backfill ? { query: { feedIds: [backfill.feedId] } } : {}),
              cursor: currentCursor,
              limit: remainingLimit,
            }));
          this.#passReads?.set(readKey, result);
          if (result.blocks.length > 0) {
            this.#report.spaces.add(spaceId);
          }

          // A backfill that read nothing is done; one whose feed was disabled again stops, its rows already removed.
          if (backfill && (result.blocks.length === 0 || isIndexingDisabled(feedOptions.get(backfill.feedId)))) {
            addTo(this.#report.finishedBackfills, spaceId, cursor.resourceId ?? failedInvariant());
            updatedCursors.push({ spaceId, resourceId: cursor.resourceId, cursor: BACKFILL_FINISHED });
            continue;
          }

          // Process blocks
          for (const block of result.blocks) {
            const feedId = block.feedId ?? failedInvariant();
            if (isIndexingDisabled(feedOptions.get(feedId))) {
              addTo(this.#report.skippedFeeds, spaceId, feedId);
              continue;
            }
            if (!backfill && backfilling.has(`${spaceId}|${feedId}`)) {
              continue;
            }
            try {
              // Stamp the block's id and position (mirrors the local feed-service read path); the index
              // snapshot persists them, which is how a reader recognises a block it already applied.
              const data = EchoFeedCodec.decodeBlock(block) as ObjectJSON;

              objects.push({
                spaceId,
                queueId: feedId,
                queueNamespace: feedNamespace,
                documentId: null,
                recordId: null,
                queuePosition: block.position ?? null,
                queueInsertionId: block.insertionId ?? null,
                data,
                createdAt: null,
                updatedAt: block.timestamp,
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

      // A spent limit may have stopped mid-feed or skipped feeds; the store cannot say which, so the
      // next pass finds out, and reads empty if there was nothing left.
      return { objects, cursors: updatedCursors, more: remainingLimit <= 0 };
    }).pipe(RuntimeProvider.provide(this._runtime), Effect.withSpan('FeedDataSource.getChangedObjects'), Effect.orDie);
  }
}
