import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';

import { type FeedSyncMessage, Block } from './protocol';
import { FeedStore } from './feed-store';

// Helper class for database schema management
export class FeedSqlAdapter {
  static migrate = Effect.fn('FeedSqlAdapter.migrate')(function* () {
    const sql = yield* SqlClient.SqlClient;

    // Feeds Table
    yield* sql`CREATE TABLE IF NOT EXISTS feeds (
      feedPrivateId INTEGER PRIMARY KEY AUTOINCREMENT,
      spaceId TEXT NOT NULL,
      feedId TEXT NOT NULL
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
  });
}

export class SqlFeedStore implements FeedStore {
  private _feedPrivateId: number | null = null;

  constructor(
    private readonly _spaceId: string,
    private readonly _feedId: string,
  ) {}

  // NOTE: This must be called (or we lazily call it).
  // Since FeedStore interface methods return Effect, we can do it lazily.
  private _ensureOpen = Effect.gen(this, function* () {
    if (this._feedPrivateId !== null) return this._feedPrivateId;

    const sql = yield* SqlClient.SqlClient;

    // Ensure schema exists (naive calls every time? Ideally migrated once via Layer)
    // For now, let's assume migration is done elsewhere or we check lazily.
    // But creating feed row requires table.
    yield* FeedSqlAdapter.migrate();

    const rows = yield* sql<{ feedPrivateId: number }>`
          SELECT feedPrivateId FROM feeds WHERE spaceId = ${this._spaceId} AND feedId = ${this._feedId}
        `;

    if (rows.length > 0) {
      this._feedPrivateId = rows[0].feedPrivateId;
    } else {
      const newRows = yield* sql<{ feedPrivateId: number }>`
              INSERT INTO feeds (spaceId, feedId) VALUES (${this._spaceId}, ${this._feedId}) RETURNING feedPrivateId
            `;
      this._feedPrivateId = newRows[0].feedPrivateId;
    }
    return this._feedPrivateId;
  });

  append = Effect.fn('SqlFeedStore.append')(
    (blocks: Block[]): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(this, function* () {
        const feedPrivateId = yield* this._ensureOpen;
        const sql = yield* SqlClient.SqlClient;
        yield* Effect.forEach(
          blocks,
          (block) =>
            sql`
                INSERT INTO blocks (
                    feedPrivateId, position, sequence, actorId, 
                    predSequence, predActorId, timestamp, data
                ) VALUES (
                    ${feedPrivateId}, ${block.position}, ${block.sequence}, ${block.actorId},
                    ${block.predSequence}, ${block.predActorId}, ${block.timestamp}, ${block.data}
                ) ON CONFLICT DO NOTHING
                `,
          { discard: true },
        );
      }),
  );

  getBlocks = Effect.fn('SqlFeedStore.getBlocks')(
    (range: FeedSyncMessage['requestRange']): Effect.Effect<Block[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(this, function* () {
        const feedPrivateId = yield* this._ensureOpen;
        const sql = yield* SqlClient.SqlClient;

        let query = sql`SELECT * FROM blocks WHERE feedPrivateId = ${feedPrivateId}`;

        if (range.after !== null) {
          query = sql`${query} AND position > ${range.after}`;
        }
        if (range.to !== null) {
          query = sql`${query} AND position <= ${range.to}`;
        }

        query = sql`${query} AND position IS NOT NULL ORDER BY position ASC`;

        const rows = yield* query;
        return (rows as any[]).map((row) => ({
          ...row,
          data: new Uint8Array(row.data),
          position: row.position,
          predSequence: row.predSequence,
          predActorId: row.predActorId,
        })) as Block[];
      }),
  );

  getUnpositionedBlocks = Effect.fn('SqlFeedStore.getUnpositionedBlocks')(
    (limit: number = 50): Effect.Effect<Block[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(this, function* () {
        const feedPrivateId = yield* this._ensureOpen;
        const sql = yield* SqlClient.SqlClient;
        const rows = yield* sql`
                SELECT * FROM blocks 
                WHERE feedPrivateId = ${feedPrivateId} AND position IS NULL
                ORDER BY sequence ASC, actorId ASC
                LIMIT ${limit}
              `;
        return (rows as any[]).map((row) => ({
          ...row,
          data: new Uint8Array(row.data),
          position: null,
          predSequence: row.predSequence,
          predActorId: row.predActorId,
        })) as Block[];
      }),
  );

  getLastPosition = Effect.fn('SqlFeedStore.getLastPosition')(
    (): Effect.Effect<number | null, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(this, function* () {
        const feedPrivateId = yield* this._ensureOpen;
        const sql = yield* SqlClient.SqlClient;
        const rows = yield* sql<{ maxPos: number | null }>`
                SELECT MAX(position) as maxPos FROM blocks WHERE feedPrivateId = ${feedPrivateId}
            `;
        return rows[0]?.maxPos ?? null;
      }),
  );
}
