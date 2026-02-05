//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';
import { SpaceId } from '@dxos/keys';

import { Event } from '@dxos/async';

import {
  type AppendRequest,
  type AppendResponse,
  type Block,
  FeedCursor,
  isWellKnownNamespace,
  type QueryRequest,
  type QueryResponse,
  type SubscribeRequest,
  type SubscribeResponse,
} from './protocol';
import { spaced } from 'effect/Schedule';
import { string } from 'effect/FastCheck';
import { assertArgument } from '@dxos/invariant';
import type { Statement } from '@effect/sql/Statement';

export interface FeedStoreOptions {
  /**
   * The actor ID of the local user.
   */
  localActorId: string;

  /**
   * Whether to assign positions to appended blocks.
   * Only a single peer (usually the server) can assign positions.
   */
  assignPositions: boolean;
}

/*
Perf:
Recommended Priority Fixes

Batch the append loop - biggest immediate win
Add explicit transactions - correctness issue
Cache max position - if append throughput is critical
Fix appendLocal batching - obvious inefficiency
Verify prepared statement caching - foundational performance

FeedPosition is per feed namespace, not per space -- update spec, important!

*/

// TODO(dmaretskyi): JSdoc
// TODO(dmaretskyi): Use #private.
// TODO(dmaretskyi): JSDoc for each method.
// TODO(dmaretskyi): Effect span for each method.
export class FeedStore {
  constructor(private readonly _options: FeedStoreOptions) {}

  readonly onNewBlocks = new Event<void>();

  migrate = Effect.fn('FeedStore.migrate')(function* () {
    const sql = yield* SqlClient.SqlClient;

    // Feeds Table
    yield* sql`CREATE TABLE IF NOT EXISTS feeds (
        feedPrivateId INTEGER PRIMARY KEY AUTOINCREMENT,
        spaceId TEXT NOT NULL,
        feedId TEXT NOT NULL,
        feedNamespace TEXT
      )`;
    yield* sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_feeds_spaceId_feedId ON feeds(spaceId, feedId)`;

    // Blocks Table
    yield* sql`CREATE TABLE IF NOT EXISTS blocks (
        insertionId INTEGER PRIMARY KEY AUTOINCREMENT,
        feedPrivateId INTEGER NOT NULL,
        position INTEGER,
        sequence INTEGER NOT NULL,
        actorId TEXT NOT NULL,
        predSequence INTEGER,
        predActorId TEXT,
        timestamp INTEGER NOT NULL,
        data BLOB NOT NULL,
        FOREIGN KEY(feedPrivateId) REFERENCES feeds(feedPrivateId)
      )`;
    yield* sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_blocks_feedPrivateId_position ON blocks(feedPrivateId, position)`;
    yield* sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_blocks_feedPrivateId_sequence_actorId ON blocks(feedPrivateId, sequence, actorId)`;

    // Subscriptions Table
    yield* sql`CREATE TABLE IF NOT EXISTS subscriptions (
          subscriptionId TEXT PRIMARY KEY,
          expiresAt INTEGER NOT NULL,
          feedPrivateIds TEXT NOT NULL -- JSON array
      )`;

    // Cursor Tokens Table
    yield* sql`CREATE TABLE IF NOT EXISTS cursor_tokens (
          spaceId TEXT PRIMARY KEY,
          token TEXT NOT NULL
      )`;
  });

  private _ensureFeed = Effect.fn('Feed.ensureFeed')(
    (
      spaceId: string,
      feedId: string,
      namespace?: string,
    ): Effect.Effect<number, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(this, function* () {
        const sql = yield* SqlClient.SqlClient;

        const rows = yield* sql<{ feedPrivateId: number }>`
              SELECT feedPrivateId FROM feeds WHERE spaceId = ${spaceId} AND feedId = ${feedId}
          `;
        if (rows.length > 0) return rows[0].feedPrivateId;

        const newRows = yield* sql<{ feedPrivateId: number }>`
              INSERT INTO feeds (spaceId, feedId, feedNamespace) VALUES (${spaceId}, ${feedId}, ${namespace}) RETURNING feedPrivateId
          `;
        return newRows[0].feedPrivateId;
      }),
  );

  private _ensureCursorToken = Effect.fn('Feed.ensureCursorToken')(
    (spaceId: string): Effect.Effect<string, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(this, function* () {
        const sql = yield* SqlClient.SqlClient;
        const rows = yield* sql<{ token: string }>`SELECT token FROM cursor_tokens WHERE spaceId = ${spaceId}`;
        if (rows.length > 0) return rows[0].token;

        const token = crypto.randomUUID().replace(/-/g, '').slice(0, 6);
        yield* sql`INSERT INTO cursor_tokens (spaceId, token) VALUES (${spaceId}, ${token})`;
        return token;
      }),
  );

  query = Effect.fn('Feed.query')(
    (request: QueryRequest): Effect.Effect<QueryResponse, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(this, function* () {
        const sql = yield* SqlClient.SqlClient;
        let feedIds: string[] | undefined = [];
        let cursorInsertionId = -1;
        let cursorToken: string | undefined;

        if (!request.spaceId) {
          return yield* Effect.die(new Error('spaceId is required'));
        }

        if (
          (request.position !== undefined ? 1 : 0) +
            (request.cursor !== undefined ? 1 : 0) +
            (request.unpositionedOnly !== undefined ? 1 : 0) >
          1
        ) {
          return yield* Effect.die(new Error('Only one of position, cursor, or unpositionedOnly can be used'));
        }

        if (request.cursor) {
          const { token, insertionId } = decodeCursor(request.cursor as FeedCursor);
          if (!token || insertionId === undefined || isNaN(insertionId)) {
            return yield* Effect.die(new Error(`Invalid cursor format`));
          }
          cursorToken = token;
          cursorInsertionId = insertionId;
        }

        // Validate Token if cursor used
        const validCursorToken = yield* this._ensureCursorToken(request.spaceId);
        if (request.cursor && cursorToken !== validCursorToken) {
          return yield* Effect.die(new Error(`Cursor token mismatch`));
        }

        // If cursor is provided, we must validate it against the space token.
        // If spaceId is not provided in request (e.g. feedIds query), we can't easily validate token unless we look up spaceId for feedIds.
        // Ideally spaceId should be required for token validation.

        /* 
           Logic:
           1. If `cursor` is present, it's `token|insertionId`.
           2. If `position` is present, it's `position` (legacy/manual).
           
           We prioritize `cursor`.
        */

        const position = request.position ?? -1;

        // Resolve Subscriptions or FeedIds
        if ('subscriptionId' in request.query) {
          const rows = yield* sql<{ feedPrivateIds: string; expiresAt: number }>`
                SELECT feedPrivateIds, expiresAt FROM subscriptions WHERE subscriptionId = ${request.query.subscriptionId}
            `;
          if (rows.length > 0) {
            const { feedPrivateIds, expiresAt } = rows[0];
            if (Date.now() <= expiresAt) {
              const privateIds = JSON.parse(feedPrivateIds) as number[];
              if (privateIds.length > 0) {
                const feedRows = yield* sql<{ feedId: string }>`
                             SELECT feedId FROM feeds WHERE feedPrivateId IN ${sql.in(privateIds)}
                         `;
                feedIds = feedRows.map((r) => r.feedId);
              }
            }
          }
        } else if ('feedIds' in request.query) {
          feedIds = [...(request.query as any).feedIds];
        } else {
          feedIds = undefined;
        }

        if (feedIds !== undefined && feedIds.length === 0) {
          return { requestId: request.requestId, blocks: [], nextCursor: encodeCursor(validCursorToken, -1), hasMore: false };
        }

        // Fetch Blocks
        const query = sql<Block>`
            SELECT blocks.*, feeds.feedId, feeds.feedNamespace
            FROM blocks
            JOIN feeds ON blocks.feedPrivateId = feeds.feedPrivateId
            WHERE 1=1
            ${feedIds !== undefined ? sql`AND feeds.feedId IN ${sql.in(feedIds)}` : sql``}
            ${request.spaceId ? sql`AND feeds.spaceId = ${request.spaceId}` : sql``}
            ${
              'feedNamespace' in request.query && request.query.feedNamespace
                ? sql`AND feeds.feedNamespace = ${request.query.feedNamespace}`
                : sql``
            }
        `;

        // Add filter based on cursor or position
        const filter = request.cursor
          ? sql`AND blocks.insertionId > ${cursorInsertionId}`
          : request.unpositionedOnly
            ? sql`AND blocks.position IS NULL`
            : sql`AND (blocks.position > ${position} OR blocks.position IS NULL)`;

        const orderBy = request.cursor
          ? sql`ORDER BY blocks.insertionId ASC`
          : sql`ORDER BY blocks.position ASC NULLS LAST`;

        const requestLimit = request.limit;
        const queryLimit = requestLimit != null ? requestLimit + 1 : undefined;
        const rows = yield* sql<Block>`
            ${query}
            ${filter}
            ${orderBy}
            ${queryLimit != null ? sql`LIMIT ${queryLimit}` : sql``}
        `;

        const hasMore = requestLimit != null && rows.length > requestLimit;
        const slice = hasMore ? rows.slice(0, requestLimit) : rows;
        const blocks = slice.map((row) => ({
          ...row,
          // Have to clone buffer otherwise we get empty Uint8Array.
          data: new Uint8Array(row.data),
        }));

        let nextCursor: FeedCursor = request.cursor ?? encodeCursor(validCursorToken, -1);
        if (blocks.length > 0 && request.spaceId) {
          const lastBlock = blocks[blocks.length - 1];
          if (lastBlock.insertionId !== undefined) {
            nextCursor = encodeCursor(validCursorToken, lastBlock.insertionId);
          }
        }

        return { requestId: request.requestId, blocks, nextCursor, hasMore } satisfies QueryResponse;
      }),
  );

  subscribe = Effect.fn('Feed.subscribe')(
    (request: SubscribeRequest): Effect.Effect<SubscribeResponse, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(this, function* () {
        const sql = yield* SqlClient.SqlClient;
        const ttl = 60 * 60 * 1000;
        const subscriptionId = crypto.randomUUID();
        const expiresAt = Date.now() + ttl;

        if (!request.spaceId) {
          // TODO(dmaretskyi): Define error type.
          return yield* Effect.die(new Error('spaceId required for subscribe'));
        }

        const feedPrivateIds = yield* Effect.forEach(
          request.feedIds,
          (feedId) => this._ensureFeed(request.spaceId!, feedId),
          { concurrency: 'unbounded' },
        );

        yield* sql`
            INSERT INTO subscriptions (subscriptionId, expiresAt, feedPrivateIds)
            VALUES (${subscriptionId}, ${expiresAt}, ${JSON.stringify(feedPrivateIds)})
        `;

        return {
          requestId: request.requestId,
          subscriptionId,
          expiresAt,
        };
      }),
  );

  /**
   * Max position for all feeds in the given space and namespace.
   * Note that if some feeds had gaps, this will skip them.
   * Normally this situation is not possible if replication is done for the entire namespace linearly and the set of namespaces synced does not change.
   */
  getMaxPosition = (opts: {
    spaceId: SpaceId;
    feedNamespace: string;
  }): Effect.Effect<number, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen(this, function* () {
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql<{ maxPos: number | null }>`
        SELECT MAX(position) as maxPos 
        FROM blocks 
        JOIN feeds ON blocks.feedPrivateId = feeds.feedPrivateId
        WHERE feeds.spaceId = ${opts.spaceId} AND feeds.feedNamespace = ${opts.feedNamespace}
      `;
      return rows[0]?.maxPos ?? -1;
    });

  append = (request: AppendRequest): Effect.Effect<AppendResponse, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen(this, function* () {
      const sql = yield* SqlClient.SqlClient;
      const positions: number[] = [];

      if (!request.spaceId) {
        return yield* Effect.die(new Error('spaceId required for append'));
      }

      for (const block of request.blocks) {
        assertArgument(
          block.feedNamespace && isWellKnownNamespace(block.feedNamespace),
          'block.feedNamespace',
          'specified well-known namespace',
        );
        assertArgument(block.feedId, 'block.feedId', 'feedId is required');

        const feedPrivateId = yield* this._ensureFeed(request.spaceId, block.feedId, block.feedNamespace);

        let nextPos = null;
        if (this._options.assignPositions) {
          const maxPosResult = yield* sql<{ maxPos: number | null }>`
                  SELECT MAX(position) as maxPos 
                  FROM blocks 
                  JOIN feeds ON blocks.feedPrivateId = feeds.feedPrivateId
                  WHERE feeds.spaceId = ${request.spaceId}
              `;
          nextPos = (maxPosResult[0]?.maxPos ?? -1) + 1;
          positions.push(nextPos);
        }

        yield* sql`
                INSERT INTO blocks (
                    feedPrivateId, position, sequence, actorId, 
                    predSequence, predActorId, timestamp, data
                ) VALUES (
                    ${feedPrivateId}, ${nextPos}, ${block.sequence}, ${block.actorId},
                    ${block.predSequence}, ${block.predActorId}, ${block.timestamp}, ${block.data}
                ) ON CONFLICT DO NOTHING
            `;
      }

      this.onNewBlocks.emit();

      return { requestId: request.requestId, positions };
    }).pipe(Effect.withSpan('FeedStore.append'));

  appendLocal = Effect.fn('Feed.appendLocal')(
    (
      messages: { spaceId: string; feedId: string; feedNamespace: string; data: Uint8Array }[],
    ): Effect.Effect<Block[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(this, function* () {
        const sql = yield* SqlClient.SqlClient;
        const blocks: Block[] = [];

        // Group by spaceId for efficient processing? Or just iterate.
        // Assuming small batch.

        for (const msg of messages) {
          // Get last block for this feed to determine sequence and predecessor.
          // Assumes we are the writer (localActorId).
          // If we are not localActorId, we shouldn't be creating blocks this way?
          // The user said: "uses local actorId". So feedId in message might be ignored?
          // Or message provides feedId?
          // User said: "client provides (only data + spaceId, feedId, feedNamespace)".
          // If client provides feedId, does it match localActorId?
          // If localActorId is fixed for the device, and we are appending to "my" feed, feedId should be localActorId.
          // If the client explicitly passes feedId, maybe they want to write to a specific feed (e.g. if they have multiple identities?).
          // But spec says "uses local actorId". I will use `this._options.localActorId`.
          // But `messages` arg has `feedId`.
          // I'll assume `msg.feedId` must match `localActorId` or we just use `localActorId` and ignore `msg.feedId`?
          // User: "client provides ... feedId".
          // I will use passed feedId but it should probably match localActorId if we are signing? (No signing here yet).
          // I'll use passed `feedId`.

          const feedPrivateId = yield* this._ensureFeed(msg.spaceId, msg.feedId, msg.feedNamespace);

          // Get last block to determine sequence.
          const lastBlockResult = yield* sql<{ sequence: number; actorId: string }>`
              SELECT sequence, actorId FROM blocks 
              WHERE feedPrivateId = ${feedPrivateId} 
              ORDER BY sequence DESC 
              LIMIT 1
           `; // This gets checks only THIS feed.

          const lastBlock = lastBlockResult[0];
          const sequence = (lastBlock?.sequence ?? -1) + 1;
          const predSequence = lastBlock?.sequence ?? null;
          const predActorId = lastBlock?.actorId ?? null;

          const block: Block = {
            feedId: msg.feedId,
            feedNamespace: msg.feedNamespace,
            actorId: this._options.localActorId,
            sequence,
            predActorId,
            predSequence,
            timestamp: Date.now(),
            data: msg.data,
            position: null, // assigned by append
          };
          blocks.push(block);

          // Call append to persist (and assign position if allowed).
          yield* this.append({
            requestId: 'local-append',
            blocks: [block],
            spaceId: msg.spaceId,
          });
        }
        return blocks;
      }).pipe(Effect.withSpan('FeedStore.appendLocal')),
  );

  setPosition = (request: {
    spaceId: string;
    blocks: Pick<Block, 'feedId' | 'feedNamespace' | 'actorId' | 'sequence' | 'position'>[];
  }): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen(this, function* () {
      const sql = yield* SqlClient.SqlClient;
      for (const block of request.blocks) {
        const existing = yield* sql<{ position: number | null }>`
          SELECT position FROM blocks
          WHERE feedPrivateId = (
            SELECT feedPrivateId FROM feeds
            WHERE spaceId = ${request.spaceId} AND feedId = ${block.feedId} AND feedNamespace = ${block.feedNamespace}
          )
          AND actorId = ${block.actorId} AND sequence = ${block.sequence}
        `;
        const current = existing[0];
        if (current?.position != null && current.position !== block.position) {
          yield* Effect.die(
            new Error(
              `Block already has position ${current.position}, cannot set to ${block.position} (feedId=${block.feedId} actorId=${block.actorId} sequence=${block.sequence})`,
            ),
          );
        }
        yield* sql`
          UPDATE blocks SET position = ${block.position}
          WHERE feedPrivateId = (
            SELECT feedPrivateId FROM feeds
            WHERE spaceId = ${request.spaceId} AND feedId = ${block.feedId} AND feedNamespace = ${block.feedNamespace}
          )
          AND actorId = ${block.actorId} AND sequence = ${block.sequence}
        `;
      }
    }).pipe(Effect.withSpan('FeedStore.setPosition'));
}

const encodeCursor = (token: string, insertionId: number) => FeedCursor.make(`${token}|${insertionId}`);
const decodeCursor = (cursor: FeedCursor) => {
  const [token, insertionId] = cursor.split('|');
  return { token, insertionId: Number(insertionId) };
};
