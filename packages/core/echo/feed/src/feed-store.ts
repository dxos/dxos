//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';
import { SpaceId } from '@dxos/keys';
import { SqlTransaction } from '@dxos/sql-sqlite';

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
import { assertArgument } from '@dxos/invariant';

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

  append = (
    request: AppendRequest,
  ): Effect.Effect<AppendResponse, SqlError.SqlError, SqlClient.SqlClient | SqlTransaction.SqlTransaction> =>
    Effect.gen(this, function* () {
      if (!request.spaceId) {
        return yield* Effect.die(new Error('spaceId required for append'));
      }

      // Validate all blocks upfront.
      for (const block of request.blocks) {
        assertArgument(
          block.feedNamespace && isWellKnownNamespace(block.feedNamespace),
          'block.feedNamespace',
          'specified well-known namespace',
        );
        assertArgument(block.feedId, 'block.feedId', 'feedId is required');
      }

      // Wrap in transaction to ensure atomicity when assigning positions.
      const sqlTransaction = yield* SqlTransaction.SqlTransaction;
      const positions = yield* sqlTransaction.withTransaction(
        Effect.gen(this, function* () {
          const sql = yield* SqlClient.SqlClient;

          // 1. Collect unique (feedId, feedNamespace) pairs and batch _ensureFeed calls.
          const feedKeys = new Map<string, { feedId: string; feedNamespace: string }>();
          for (const block of request.blocks) {
            const key = `${block.feedId}|${block.feedNamespace}`;
            if (!feedKeys.has(key)) {
              feedKeys.set(key, { feedId: block.feedId!, feedNamespace: block.feedNamespace! });
            }
          }

          const feedPrivateIds = new Map<string, number>();
          yield* Effect.forEach(
            [...feedKeys.entries()],
            ([key, { feedId, feedNamespace }]) =>
              Effect.gen(this, function* () {
                const id = yield* this._ensureFeed(request.spaceId!, feedId, feedNamespace);
                feedPrivateIds.set(key, id);
              }),
            { concurrency: 'unbounded' },
          );

          // 2. Get max position per namespace ONCE (not per block).
          const maxPositions = new Map<string, number>();
          if (this._options.assignPositions) {
            const namespaces = new Set(request.blocks.map((b) => b.feedNamespace!));
            for (const namespace of namespaces) {
              const maxPosResult = yield* sql<{ maxPos: number | null }>`
                SELECT MAX(position) as maxPos 
                FROM blocks 
                JOIN feeds ON blocks.feedPrivateId = feeds.feedPrivateId
                WHERE feeds.spaceId = ${request.spaceId} AND feeds.feedNamespace = ${namespace}
              `;
              maxPositions.set(namespace, maxPosResult[0]?.maxPos ?? -1);
            }
          }

          // 3. Insert all blocks and compute positions.
          const positions: number[] = [];
          for (const block of request.blocks) {
            const key = `${block.feedId}|${block.feedNamespace}`;
            const feedPrivateId = feedPrivateIds.get(key)!;

            let positionToInsert: number | null = null;
            if (this._options.assignPositions) {
              const currentMax = maxPositions.get(block.feedNamespace!)!;
              positionToInsert = currentMax + 1;
              maxPositions.set(block.feedNamespace!, positionToInsert); // Increment for next block in same namespace.
              positions.push(positionToInsert);
            } else if (block.position != null) {
              positionToInsert = block.position;
            }

            yield* sql`
              INSERT INTO blocks (
                feedPrivateId, position, sequence, actorId, 
                predSequence, predActorId, timestamp, data
              ) VALUES (
                ${feedPrivateId}, ${positionToInsert}, ${block.sequence}, ${block.actorId},
                ${block.predSequence}, ${block.predActorId}, ${block.timestamp}, ${block.data}
              ) ON CONFLICT DO NOTHING
            `;
          }

          return positions;
        }),
      );

      this.onNewBlocks.emit();

      return { requestId: request.requestId, positions };
    }).pipe(Effect.withSpan('FeedStore.append'));

  appendLocal = Effect.fn('Feed.appendLocal')(
    (
      messages: { spaceId: string; feedId: string; feedNamespace: string; data: Uint8Array }[],
    ): Effect.Effect<Block[], SqlError.SqlError, SqlClient.SqlClient | SqlTransaction.SqlTransaction> =>
      Effect.gen(this, function* () {
        const sql = yield* SqlClient.SqlClient;

        // 1. Collect unique feeds and ensure they exist.
        type FeedKey = string; // `${spaceId}|${feedId}`
        const feedKeys = new Map<FeedKey, { spaceId: string; feedId: string; feedNamespace: string }>();
        for (const msg of messages) {
          const key = `${msg.spaceId}|${msg.feedId}`;
          if (!feedKeys.has(key)) {
            feedKeys.set(key, { spaceId: msg.spaceId, feedId: msg.feedId, feedNamespace: msg.feedNamespace });
          }
        }

        // Batch ensure feeds and get their private IDs.
        const feedPrivateIds = new Map<FeedKey, number>();
        yield* Effect.forEach(
          [...feedKeys.entries()],
          ([key, { spaceId, feedId, feedNamespace }]) =>
            Effect.gen(this, function* () {
              const id = yield* this._ensureFeed(spaceId, feedId, feedNamespace);
              feedPrivateIds.set(key, id);
            }),
          { concurrency: 'unbounded' },
        );

        // 2. Get last sequence for each unique feed (batch query).
        const lastSeqs = new Map<FeedKey, { sequence: number; actorId: string } | null>();
        for (const [key, { spaceId, feedId }] of feedKeys) {
          const feedPrivateId = feedPrivateIds.get(key)!;
          const lastBlockResult = yield* sql<{ sequence: number; actorId: string }>`
            SELECT sequence, actorId FROM blocks 
            WHERE feedPrivateId = ${feedPrivateId} 
            ORDER BY sequence DESC 
            LIMIT 1
          `;
          lastSeqs.set(key, lastBlockResult[0] ?? null);
        }

        // 3. Build all blocks with correct sequences.
        // Track in-flight sequences per feed to handle multiple messages to same feed.
        const currentSeqs = new Map<FeedKey, { sequence: number; actorId: string }>();
        const blocks: Block[] = [];
        const blocksBySpace = new Map<string, Block[]>();

        for (const msg of messages) {
          const key = `${msg.spaceId}|${msg.feedId}`;

          // Determine predecessor: either from in-flight blocks or from DB.
          let sequence: number;
          let predSequence: number | null;
          let predActorId: string | null;

          const inFlight = currentSeqs.get(key);
          if (inFlight) {
            // We've already added blocks for this feed - continue from last in-flight.
            sequence = inFlight.sequence + 1;
            predSequence = inFlight.sequence;
            predActorId = inFlight.actorId;
          } else {
            // First block for this feed - use DB state.
            const lastBlock = lastSeqs.get(key);
            sequence = (lastBlock?.sequence ?? -1) + 1;
            predSequence = lastBlock?.sequence ?? null;
            predActorId = lastBlock?.actorId ?? null;
          }

          const block: Block = {
            feedId: msg.feedId,
            feedNamespace: msg.feedNamespace,
            actorId: this._options.localActorId,
            sequence,
            predActorId,
            predSequence,
            timestamp: Date.now(),
            data: msg.data,
            position: null, // Assigned by append.
          };

          blocks.push(block);

          // Update in-flight tracking.
          currentSeqs.set(key, { sequence, actorId: this._options.localActorId });

          // Group by spaceId.
          if (!blocksBySpace.has(msg.spaceId)) {
            blocksBySpace.set(msg.spaceId, []);
          }
          blocksBySpace.get(msg.spaceId)!.push(block);
        }

        // 4. Call append once per spaceId (batched).
        for (const [spaceId, spaceBlocks] of blocksBySpace) {
          yield* this.append({
            requestId: 'local-append',
            blocks: spaceBlocks,
            spaceId,
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
