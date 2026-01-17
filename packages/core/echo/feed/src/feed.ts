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

export class FeedStore {
  constructor(private readonly _spaceId: string) {}

  get spaceId() {
    return this._spaceId;
  }

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
    (feedId: string, namespace?: string): Effect.Effect<number, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(this, function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* FeedStore.migrate(); // Ensure schema

        const rows = yield* sql<{ feedPrivateId: number }>`
              SELECT feedPrivateId FROM feeds WHERE spaceId = ${this._spaceId} AND feedId = ${feedId}
          `;
        if (rows.length > 0) return rows[0].feedPrivateId;

        const newRows = yield* sql<{ feedPrivateId: number }>`
              INSERT INTO feeds (spaceId, feedId, feedNamespace) VALUES (${this._spaceId}, ${feedId}, ${namespace}) RETURNING feedPrivateId
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
        let cursor: number = (request as any).cursor; // Common property

        // Resolve Subscriptions
        if ('subscriptionId' in request && request.subscriptionId) {
          const rows = yield* sql<{ feedPrivateIds: string; expiresAt: number }>`
                SELECT feedPrivateIds, expiresAt FROM subscriptions WHERE subscriptionId = ${request.subscriptionId}
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
        } else if ('feedIds' in request) {
          feedIds = request.feedIds;
        }

        if (feedIds.length === 0) {
          return { requestId: (request as any).requestId, blocks: [] };
        }

        // Fetch Blocks
        const rows = yield* sql`
            SELECT blocks.* 
            FROM blocks
            JOIN feeds ON blocks.feedPrivateId = feeds.feedPrivateId
            WHERE feeds.spaceId = ${this._spaceId}
              AND feeds.feedId IN ${sql.in(feedIds)}
              AND blocks.position > ${cursor}
            ORDER BY blocks.position ASC
        `;

        const blocks = (rows as any[]).map((row) => ({
          ...row,
          data: new Uint8Array(row.data),
          position: row.position,
          predSequence: row.predSequence,
          predActorId: row.predActorId,
        })) as Block[];

        return { requestId: (request as any).requestId, blocks };
      }),
  );

  subscribe = Effect.fn('Feed.subscribe')(
    (request: SubscribeRequest): Effect.Effect<SubscribeResponse, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(this, function* () {
        const sql = yield* SqlClient.SqlClient;
        const ttl = 60 * 60 * 1000;
        const subscriptionId = crypto.randomUUID();
        const expiresAt = Date.now() + ttl;

        const feedPrivateIds: number[] = [];
        for (const fid of request.feedIds) {
          feedPrivateIds.push(yield* this._ensureFeed(fid));
        }

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

        for (const block of request.blocks) {
          const feedPrivateId = yield* this._ensureFeed(block.actorId, request.namespace);

          const maxPosResult = yield* sql<{ maxPos: number | null }>`
                SELECT MAX(position) as maxPos 
                FROM blocks 
                JOIN feeds ON blocks.feedPrivateId = feeds.feedPrivateId
                WHERE feeds.spaceId = ${this._spaceId}
            `;
          const nextPos = (maxPosResult[0]?.maxPos ?? 0) + 1;

          yield* sql`
                INSERT INTO blocks (
                    feedPrivateId, position, sequence, actorId, 
                    predSequence, predActorId, timestamp, data
                ) VALUES (
                    ${feedPrivateId}, ${nextPos}, ${block.sequence}, ${block.actorId},
                    ${block.predSequence}, ${block.predActorId}, ${block.timestamp}, ${block.data}
                ) ON CONFLICT DO NOTHING
            `;
          positions.push(nextPos);
        }
        return { requestId: request.requestId, positions };
      }),
  );
}
