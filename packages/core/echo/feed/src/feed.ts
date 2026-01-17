import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';
import { SpaceId } from '@dxos/keys';
import {
  Block,
  QueryRequest,
  QueryResponse,
  SubscribeRequest,
  SubscribeResponse,
  AppendRequest,
  AppendResponse,
} from './protocol';

export interface FeedStoreOptions {
  localActorId: string;
  assignPositions: boolean;
}

export class FeedStore {
  constructor(private readonly _options: FeedStoreOptions) {}

  static migrate = Effect.fn('FeedStore.migrate')(function* () {
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
  });

  // Internal Logic

  private _ensureFeed = Effect.fn('Feed.ensureFeed')(
    (
      spaceId: string,
      feedId: string,
      namespace?: string,
    ): Effect.Effect<number, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(this, function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* FeedStore.migrate(); // Ensure schema

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

  // RPCs

  query = Effect.fn('Feed.query')(
    (request: QueryRequest): Effect.Effect<QueryResponse, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(this, function* () {
        const sql = yield* SqlClient.SqlClient;
        let feedIds: string[] = [];
        let cursor: number = request.cursor ?? -1;

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
        } else {
          feedIds = [...request.query.feedIds];
        }

        if (feedIds.length === 0) {
          return { requestId: request.requestId, blocks: [] };
        }

        // Fetch Blocks
        const rows = yield* sql`
            SELECT blocks.* 
            FROM blocks
            JOIN feeds ON blocks.feedPrivateId = feeds.feedPrivateId
            WHERE feeds.feedId IN ${sql.in(feedIds)}
              AND blocks.position > ${cursor}
              ${request.spaceId ? sql`AND feeds.spaceId = ${request.spaceId}` : sql``}
            ORDER BY blocks.position ASC
            ${request.limit ? sql`LIMIT ${request.limit}` : sql``}
        `;

        const blocks = (rows as any[]).map((row) => ({
          ...row,
          data: new Uint8Array(row.data),
          position: row.position,
          predSequence: row.predSequence,
          predActorId: row.predActorId,
        })) as Block[];

        return { requestId: request.requestId, blocks };
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

  append = Effect.fn('Feed.append')(
    (request: AppendRequest): Effect.Effect<AppendResponse, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(this, function* () {
        const sql = yield* SqlClient.SqlClient;
        const positions: number[] = [];

        if (!request.spaceId) {
          return yield* Effect.die(new Error('spaceId required for append'));
        }

        for (const block of request.blocks) {
          const feedId = request.feedId ?? block.actorId;
          const feedPrivateId = yield* this._ensureFeed(request.spaceId, feedId, request.namespace);

          let nextPos = null;
          if (this._options.assignPositions) {
            const maxPosResult = yield* sql<{ maxPos: number | null }>`
                  SELECT MAX(position) as maxPos 
                  FROM blocks 
                  JOIN feeds ON blocks.feedPrivateId = feeds.feedPrivateId
                  WHERE feeds.spaceId = ${request.spaceId}
              `;
            nextPos = (maxPosResult[0]?.maxPos ?? 0) + 1;
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
        return { requestId: request.requestId, positions };
      }),
  );

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
            namespace: msg.feedNamespace,
            blocks: [block],
            spaceId: msg.spaceId,
            feedId: msg.feedId,
          });
        }
        return blocks;
      }),
  );
}
