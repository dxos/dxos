//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';

import { Event } from '@dxos/async';
import { assertArgument } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';
import { SqlTransaction } from '@dxos/sql-sqlite';

import { PositionConflictError } from './errors';

type AppendRequest = FeedProtocol.AppendRequest;
type AppendResponse = FeedProtocol.AppendResponse;
type Block = FeedProtocol.Block;
const FeedCursor = FeedProtocol.FeedCursor;
type FeedCursor = FeedProtocol.FeedCursor;
const isWellKnownNamespace = FeedProtocol.isWellKnownNamespace;
type QueryRequest = FeedProtocol.QueryRequest;
type QueryResponse = FeedProtocol.QueryResponse;
type SubscribeRequest = FeedProtocol.SubscribeRequest;
type SubscribeResponse = FeedProtocol.SubscribeResponse;

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

/**
 * Persistent storage for feed metadata, blocks, subscriptions, and sync state.
 *
 */
export class FeedStore {
  readonly #options: FeedStoreOptions;

  constructor(options: FeedStoreOptions) {
    this.#options = options;
  }

  /**
   * Emits after successful block append operations.
   */
  readonly onNewBlocks = new Event<void>();

  /**
   * Creates required feed store tables and indexes if they do not exist.
   */
  migrate = Effect.fn('FeedStore.migrate')(() =>
    Effect.gen(function* () {
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
        prevSequence INTEGER,
        prevActorId TEXT,
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

      // Sync State Table.
      yield* sql`CREATE TABLE IF NOT EXISTS sync_state (
          spaceId TEXT NOT NULL,
          feedNamespace TEXT NOT NULL,
          lastPulledPosition INTEGER NOT NULL DEFAULT -1,
          PRIMARY KEY (spaceId, feedNamespace)
      )`;
    }).pipe(Effect.withSpan('FeedStore.migrate')),
  );

  /**
   * Ensures a feed row exists and returns its internal feed ID.
   */
  #ensureFeed = Effect.fn('Feed.ensureFeed')(
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
      }).pipe(Effect.withSpan('FeedStore.ensureFeed')),
  );

  /**
   * Ensures cursor token exists for a space and returns it.
   */
  #ensureCursorToken = Effect.fn('Feed.ensureCursorToken')(
    (spaceId: string): Effect.Effect<string, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(this, function* () {
        const sql = yield* SqlClient.SqlClient;
        const rows = yield* sql<{ token: string }>`SELECT token FROM cursor_tokens WHERE spaceId = ${spaceId}`;
        if (rows.length > 0) return rows[0].token;

        const token = crypto.randomUUID().replace(/-/g, '').slice(0, 6);
        yield* sql`INSERT INTO cursor_tokens (spaceId, token) VALUES (${spaceId}, ${token})`;
        return token;
      }).pipe(Effect.withSpan('FeedStore.ensureCursorToken')),
  );

  /**
   * Queries feed blocks by feed IDs or subscription with cursor/position pagination.
   */
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
            (request.unpositionedOnly === true ? 1 : 0) >
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

        // Validate Token if cursor used.
        const validCursorToken = yield* this.#ensureCursorToken(request.spaceId);
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

        // Resolve subscriptions or feed IDs.
        if (request.query && 'subscriptionId' in request.query) {
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
        } else if (request.query && 'feedIds' in request.query) {
          feedIds = [...request.query.feedIds];
        } else {
          feedIds = undefined;
        }

        if (feedIds !== undefined && feedIds.length === 0) {
          return {
            requestId: request.requestId,
            blocks: [],
            nextCursor: encodeCursor(validCursorToken, -1),
            hasMore: false,
          };
        }

        // Fetch blocks.
        const query = sql<Block>`
            SELECT blocks.*, feeds.feedId, feeds.feedNamespace
            FROM blocks
            JOIN feeds ON blocks.feedPrivateId = feeds.feedPrivateId
            WHERE 1=1
            ${feedIds !== undefined ? sql`AND feeds.feedId IN ${sql.in(feedIds)}` : sql``}
            ${request.spaceId ? sql`AND feeds.spaceId = ${request.spaceId}` : sql``}
            ${sql`AND feeds.feedNamespace = ${request.feedNamespace}`}
        `;

        // Add filter based on cursor or position.
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
      }).pipe(Effect.withSpan('FeedStore.query')),
  );

  /**
   * Creates a subscription and stores the resolved internal feed IDs.
   */
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
          (feedId) => this.#ensureFeed(request.spaceId!, feedId),
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
      }).pipe(Effect.withSpan('FeedStore.subscribe')),
  );

  /**
   * Get the last pulled position for the given space and namespace.
   * Returns -1 if no sync state exists yet.
   */
  getSyncState = (opts: {
    spaceId: SpaceId;
    feedNamespace: string;
  }): Effect.Effect<number, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen(this, function* () {
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql<{ lastPulledPosition: number }>`
        SELECT lastPulledPosition FROM sync_state
        WHERE spaceId = ${opts.spaceId} AND feedNamespace = ${opts.feedNamespace}
      `;
      return rows[0]?.lastPulledPosition ?? -1;
    }).pipe(Effect.withSpan('FeedStore.getSyncState'));

  /**
   * Update the last pulled position for the given space and namespace.
   */
  setSyncState = (opts: {
    spaceId: SpaceId;
    feedNamespace: string;
    lastPulledPosition: number;
  }): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen(this, function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`
        INSERT INTO sync_state (spaceId, feedNamespace, lastPulledPosition)
        VALUES (${opts.spaceId}, ${opts.feedNamespace}, ${opts.lastPulledPosition})
        ON CONFLICT (spaceId, feedNamespace) DO UPDATE SET lastPulledPosition = ${opts.lastPulledPosition}
      `;
    }).pipe(Effect.withSpan('FeedStore.setSyncState'));

  /**
   * Appends blocks for a space/namespace and optionally assigns global positions.
   */
  append = (
    request: AppendRequest,
  ): Effect.Effect<AppendResponse, SqlError.SqlError, SqlClient.SqlClient | SqlTransaction.SqlTransaction> =>
    Effect.gen(this, function* () {
      if (!request.spaceId) {
        return yield* Effect.die(new Error('spaceId required for append'));
      }

      assertArgument(
        isWellKnownNamespace(request.feedNamespace),
        'request.feedNamespace',
        'specified well-known namespace',
      );

      // Validate all blocks upfront.
      for (const block of request.blocks) {
        assertArgument(block.feedId, 'block.feedId', 'feedId is required');
      }

      // Wrap in transaction to ensure atomicity when assigning positions.
      const sqlTransaction = yield* SqlTransaction.SqlTransaction;
      const positions = yield* sqlTransaction.withTransaction(
        Effect.gen(this, function* () {
          const sql = yield* SqlClient.SqlClient;

          // 1. Collect unique feed IDs and batch #ensureFeed calls.
          const feedKeys = new Map<string, { feedId: string }>();
          for (const block of request.blocks) {
            const key = block.feedId!;
            if (!feedKeys.has(key)) {
              feedKeys.set(key, { feedId: block.feedId! });
            }
          }

          const feedPrivateIds = new Map<string, number>();
          yield* Effect.forEach(
            [...feedKeys.entries()],
            ([key, { feedId }]) =>
              Effect.gen(this, function* () {
                const id = yield* this.#ensureFeed(request.spaceId!, feedId, request.feedNamespace);
                feedPrivateIds.set(key, id);
              }),
            { concurrency: 'unbounded' },
          );

          // 2. Get max position per namespace ONCE (not per block).
          const maxPositions = new Map<string, number>();
          if (this.#options.assignPositions) {
            const maxPosResult = yield* sql<{ maxPos: number | null }>`
              SELECT MAX(position) as maxPos 
              FROM blocks 
              JOIN feeds ON blocks.feedPrivateId = feeds.feedPrivateId
              WHERE feeds.spaceId = ${request.spaceId} AND feeds.feedNamespace = ${request.feedNamespace}
            `;
            maxPositions.set(request.feedNamespace, maxPosResult[0]?.maxPos ?? -1);
          }

          // 3. Insert all blocks and compute positions.
          const positions: number[] = [];
          for (const block of request.blocks) {
            const key = block.feedId!;
            const feedPrivateId = feedPrivateIds.get(key)!;

            let positionToInsert: number | null = null;
            if (this.#options.assignPositions) {
              const currentMax = maxPositions.get(request.feedNamespace)!;
              positionToInsert = currentMax + 1;
              maxPositions.set(request.feedNamespace, positionToInsert); // Increment for next block in same namespace.
              positions.push(positionToInsert);
            } else if (block.position != null) {
              positionToInsert = block.position;
            }

            // TODO(mykola): Conflict means failure, we need to handle it.
            yield* sql`
              INSERT INTO blocks (
                feedPrivateId, position, sequence, actorId, 
                prevSequence, prevActorId, timestamp, data
              ) VALUES (
                ${feedPrivateId}, ${positionToInsert}, ${block.sequence}, ${block.actorId},
                ${block.prevSequence}, ${block.prevActorId}, ${block.timestamp}, ${block.data}
              ) ON CONFLICT DO NOTHING
            `;
          }

          return positions;
        }),
      );

      this.onNewBlocks.emit();

      return { requestId: request.requestId, positions };
    }).pipe(Effect.withSpan('FeedStore.append'));

  /**
   * Creates local blocks with sequential predecessors and appends grouped batches.
   */
  appendLocal = Effect.fn('Feed.appendLocal')(
    (
      messages: { spaceId: string; feedId: string; feedNamespace: string; data: Uint8Array }[],
    ): Effect.Effect<Block[], SqlError.SqlError, SqlClient.SqlClient | SqlTransaction.SqlTransaction> =>
      Effect.gen(this, function* () {
        const sql = yield* SqlClient.SqlClient;

        // 1. Collect unique feeds and ensure they exist.
        type FeedKey = string; // `${spaceId}|${feedNamespace}|${feedId}`
        const feedKeys = new Map<FeedKey, { spaceId: string; feedId: string; feedNamespace: string }>();
        for (const msg of messages) {
          const key = `${msg.spaceId}|${msg.feedNamespace}|${msg.feedId}`;
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
              const id = yield* this.#ensureFeed(spaceId, feedId, feedNamespace);
              feedPrivateIds.set(key, id);
            }),
          { concurrency: 'unbounded' },
        );

        // 2. Get last sequence for each unique feed (batch query).
        const lastSeqs = new Map<FeedKey, { sequence: number; actorId: string } | null>();
        for (const [key] of feedKeys) {
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
        const blocksBySpaceNamespace = new Map<string, { spaceId: string; feedNamespace: string; blocks: Block[] }>();

        for (const msg of messages) {
          const key = `${msg.spaceId}|${msg.feedNamespace}|${msg.feedId}`;

          // Determine predecessor: either from in-flight blocks or from DB.
          let sequence: number;
          let prevSequence: number | null;
          let prevActorId: string | null;

          const inFlight = currentSeqs.get(key);
          if (inFlight) {
            // We've already added blocks for this feed - continue from last in-flight.
            sequence = inFlight.sequence + 1;
            prevSequence = inFlight.sequence;
            prevActorId = inFlight.actorId;
          } else {
            // First block for this feed - use DB state.
            const lastBlock = lastSeqs.get(key);
            sequence = (lastBlock?.sequence ?? -1) + 1;
            prevSequence = lastBlock?.sequence ?? null;
            prevActorId = lastBlock?.actorId ?? null;
          }

          const block: Block = {
            feedId: msg.feedId,
            actorId: this.#options.localActorId,
            sequence,
            prevActorId,
            prevSequence,
            timestamp: Date.now(),
            data: msg.data,
            position: null, // Assigned by append.
          };

          blocks.push(block);

          // Update in-flight tracking.
          currentSeqs.set(key, { sequence, actorId: this.#options.localActorId });

          // Group by (spaceId, feedNamespace).
          const spaceNamespaceKey = `${msg.spaceId}|${msg.feedNamespace}`;
          if (!blocksBySpaceNamespace.has(spaceNamespaceKey)) {
            blocksBySpaceNamespace.set(spaceNamespaceKey, {
              spaceId: msg.spaceId,
              feedNamespace: msg.feedNamespace,
              blocks: [],
            });
          }
          blocksBySpaceNamespace.get(spaceNamespaceKey)!.blocks.push(block);
        }

        // 4. Call append once per (spaceId, namespace) batch.
        for (const { spaceId, feedNamespace, blocks } of blocksBySpaceNamespace.values()) {
          yield* this.append({
            requestId: 'local-append',
            blocks,
            spaceId,
            feedNamespace,
          });
        }

        return blocks;
      }).pipe(Effect.withSpan('FeedStore.appendLocal')),
  );

  /**
   * Sets positions for existing blocks while preventing conflicting reassignments.
   */
  setPosition = (request: {
    spaceId: string;
    blocks: (Pick<Block, 'feedId' | 'actorId' | 'sequence' | 'position'> & { feedNamespace: string })[];
  }): Effect.Effect<void, SqlError.SqlError | PositionConflictError, SqlClient.SqlClient> =>
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
          yield* Effect.fail(
            new PositionConflictError({
              feedId: block.feedId,
              actorId: block.actorId,
              sequence: block.sequence,
              currentPosition: current.position,
              requestedPosition: block.position,
            }),
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
