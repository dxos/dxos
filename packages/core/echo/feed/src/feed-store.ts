//
// Copyright 2026 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Migrator from 'effect/unstable/sql/Migrator';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import { Event } from '@dxos/async';
import { SpanAttributes } from '@dxos/effect';
import { assertArgument } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';
import { SqlTransaction } from '@dxos/sql-sqlite';

import { type Cypher, CypherError } from './cypher.ts';
import { PositionConflictError } from './errors.ts';
import { MIGRATIONS, MIGRATIONS_TABLE } from './migrations/index.ts';

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

  /**
   * Seals block payloads at rest. When absent, blocks are stored as plaintext (no encryption by
   * default); the cypher decides per feed whether to encrypt at all.
   */
  cypher?: Cypher;
}

/**
 * Effect service tag for {@link FeedStore}.
 */
export class FeedStoreService extends EffectContext.Service<FeedStoreService, FeedStore>()('@dxos/feed/FeedStore') {}

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
   * Applies any migrations this database has not recorded yet.
   *
   * A database created before migration tracking existed already holds migration 1's tables, and
   * needs no special handling: every statement in it is `IF NOT EXISTS`, so it applies as a no-op
   * and is recorded like any other.
   *
   * `SqlTransaction.clientLayer` is provided because the migrator wraps its work in the client's
   * `withTransaction`, which emits `BEGIN` / `COMMIT` — rejected in workerd, where this runs inside
   * a Durable Object.
   */
  migrate = Effect.fn('FeedStore.migrate')(() =>
    Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
      Effect.provide(SqlTransaction.clientLayer),
      // A MigrationError means the bundled manifest is malformed — a defect, not something a caller
      // can recover from — so it dies rather than widening this signature beyond SqlError.
      Effect.catchTag('MigrationError', (error) => Effect.die(error)),
      Effect.asVoid,
      Effect.withSpan('FeedStore.migrate'),
    ),
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
      Effect.gen({ self: this }, function* () {
        const sql = yield* SqlClient.SqlClient;

        const rows = yield* sql<{ feedPrivateId: number }>`
              SELECT feedPrivateId FROM feeds WHERE spaceId = ${spaceId} AND feedId = ${feedId}
          `;
        if (rows.length > 0) {
          return rows[0].feedPrivateId;
        }

        const newRows = yield* sql<{ feedPrivateId: number }>`
              INSERT INTO feeds (spaceId, feedId, feedNamespace) VALUES (${spaceId}, ${feedId}, ${namespace}) RETURNING feedPrivateId
          `;
        return newRows[0].feedPrivateId;
      }).pipe(Effect.withSpan('FeedStore.ensureFeed'), SpanAttributes.annotateSpace(spaceId)),
  );

  /**
   * Ensures cursor token exists for a space and returns it.
   */
  #ensureCursorToken = Effect.fn('Feed.ensureCursorToken')(
    (spaceId: string): Effect.Effect<string, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen({ self: this }, function* () {
        const sql = yield* SqlClient.SqlClient;
        const rows = yield* sql<{ token: string }>`SELECT token FROM cursor_tokens WHERE spaceId = ${spaceId}`;
        if (rows.length > 0) {
          return rows[0].token;
        }

        const token = crypto.randomUUID().replace(/-/g, '').slice(0, 6);
        yield* sql`INSERT INTO cursor_tokens (spaceId, token) VALUES (${spaceId}, ${token})`;
        return token;
      }).pipe(Effect.withSpan('FeedStore.ensureCursorToken'), SpanAttributes.annotateSpace(spaceId)),
  );

  /**
   * Seals block payloads for a batch, returning storage columns aligned by input index. A block
   * whose feed the cypher declines — or any block when no cypher is configured — passes through as
   * plaintext with no envelope.
   */
  #sealBlocks = (
    spaceId: string,
    feedNamespace: string,
    blocks: readonly Block[],
  ): Effect.Effect<{ data: Uint8Array; encryptionKeyId: string | null; iv: Uint8Array | null }[], CypherError> => {
    const cypher = this.#options.cypher;
    return Effect.forEach(
      blocks,
      (block) =>
        Effect.gen({ self: this }, function* () {
          const feed = { spaceId, feedId: block.feedId!, feedNamespace };
          if (!cypher || !cypher.shouldEncrypt(feed)) {
            return { data: block.data, encryptionKeyId: null, iv: null };
          }
          const blockId = blockNaturalKey(block.feedId!, block.actorId, block.sequence);
          const payload = yield* Effect.tryPromise({
            try: () => cypher.encrypt(block.data, { feed, blockId }),
            catch: (error) => new CypherError({ operation: 'encrypt', blockId, cause: error }),
          });
          return { data: payload.ciphertext, encryptionKeyId: payload.encryptionKeyId, iv: payload.iv };
        }),
      { concurrency: 'unbounded' },
    );
  };

  /**
   * Opens a stored block for callers, decrypting when it carries an envelope and a cypher is
   * configured. Returns a plaintext block with the envelope columns cleared.
   */
  #openBlock = (row: Block, spaceId: string, feedNamespace: string): Effect.Effect<Block, CypherError> =>
    Effect.gen({ self: this }, function* () {
      const data = new Uint8Array(row.data);
      const blockId = blockNaturalKey(row.feedId!, row.actorId, row.sequence);
      // Both envelope fields move together; exactly one present is a corrupt row, never plaintext —
      // fail closed rather than hand ciphertext to a caller as if it were cleartext.
      if ((row.encryptionKeyId == null) !== (row.iv == null)) {
        return yield* Effect.fail(
          new CypherError({ operation: 'decrypt', blockId, cause: new Error('Partial encryption envelope.') }),
        );
      }
      const cypher = this.#options.cypher;
      if (!cypher || row.encryptionKeyId == null || row.iv == null) {
        return {
          ...row,
          data,
          encryptionKeyId: row.encryptionKeyId ?? undefined,
          iv: row.iv != null ? new Uint8Array(row.iv) : undefined,
        };
      }
      const plaintext = yield* Effect.tryPromise({
        try: () =>
          cypher.decrypt(
            { encryptionKeyId: row.encryptionKeyId!, iv: new Uint8Array(row.iv!), ciphertext: data },
            { feed: { spaceId, feedId: row.feedId!, feedNamespace }, blockId },
          ),
        catch: (error) => new CypherError({ operation: 'decrypt', blockId, cause: error }),
      });
      return { ...row, data: plaintext, encryptionKeyId: undefined, iv: undefined };
    });

  /**
   * Queries feed blocks by feed IDs or subscription with cursor/position pagination.
   */
  query = Effect.fn('Feed.query')(
    (request: QueryRequest): Effect.Effect<QueryResponse, SqlError.SqlError | CypherError, SqlClient.SqlClient> =>
      Effect.gen({ self: this }, function* () {
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
            nextCursor: FeedCursor.make(`${validCursorToken}|-1`),
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
        // Without a cypher, take the original synchronous path — decryption adds no async turns to
        // the hot query path when encryption is off. Cloning the buffer avoids an empty Uint8Array.
        const blocks = this.#options.cypher
          ? yield* Effect.forEach(slice, (row) => this.#openBlock(row, request.spaceId, request.feedNamespace), {
              concurrency: 'unbounded',
            })
          : // Normalise the SQLite NULL envelope columns to undefined — the Block schema types them
            // `string | undefined`, not nullable, so a raw null trips schema encode on the sync path.
            slice.map((row) => ({
              ...row,
              data: new Uint8Array(row.data),
              encryptionKeyId: row.encryptionKeyId ?? undefined,
              iv: row.iv != null ? new Uint8Array(row.iv) : undefined,
            }));

        let nextCursor: FeedCursor = request.cursor ?? FeedCursor.make(`${validCursorToken}|-1`);
        if (blocks.length > 0 && request.spaceId) {
          const lastBlock = blocks[blocks.length - 1];
          if (lastBlock.insertionId !== undefined) {
            nextCursor = FeedCursor.make(`${validCursorToken}|${lastBlock.insertionId}`);
          }
        }

        return { requestId: request.requestId, blocks, nextCursor, hasMore } satisfies QueryResponse;
      }).pipe(Effect.withSpan('FeedStore.query'), SpanAttributes.annotateSpace(request.spaceId)),
  );

  /**
   * Creates a subscription and stores the resolved internal feed IDs.
   */
  subscribe = Effect.fn('Feed.subscribe')(
    (request: SubscribeRequest): Effect.Effect<SubscribeResponse, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen({ self: this }, function* () {
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
      }).pipe(Effect.withSpan('FeedStore.subscribe'), SpanAttributes.annotateSpace(request.spaceId)),
  );

  /**
   * Get the last pulled position for the given space and namespace.
   * Returns -1 if no sync state exists yet.
   */
  getSyncState = (opts: {
    spaceId: SpaceId;
    feedNamespace: string;
  }): Effect.Effect<number, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen({ self: this }, function* () {
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql<{ lastPulledPosition: number }>`
        SELECT lastPulledPosition FROM sync_state
        WHERE spaceId = ${opts.spaceId} AND feedNamespace = ${opts.feedNamespace}
      `;
      return rows[0]?.lastPulledPosition ?? -1;
    }).pipe(Effect.withSpan('FeedStore.getSyncState'), SpanAttributes.annotateSpace(opts.spaceId));

  /**
   * Update the last pulled position for the given space and namespace.
   */
  setSyncState = (opts: {
    spaceId: SpaceId;
    feedNamespace: string;
    lastPulledPosition: number;
  }): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen({ self: this }, function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`
        INSERT INTO sync_state (spaceId, feedNamespace, lastPulledPosition)
        VALUES (${opts.spaceId}, ${opts.feedNamespace}, ${opts.lastPulledPosition})
        ON CONFLICT (spaceId, feedNamespace) DO UPDATE SET lastPulledPosition = ${opts.lastPulledPosition}
      `;
    }).pipe(Effect.withSpan('FeedStore.setSyncState'), SpanAttributes.annotateSpace(opts.spaceId));

  /**
   * Returns the number of blocks pending push (no global position yet) in a space/namespace.
   */
  countUnpositionedBlocks = (opts: {
    spaceId: SpaceId;
    feedNamespace: string;
  }): Effect.Effect<number, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen({ self: this }, function* () {
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql<{ count: number }>`
        SELECT COUNT(*) AS count
        FROM blocks
        JOIN feeds ON blocks.feedPrivateId = feeds.feedPrivateId
        WHERE feeds.spaceId = ${opts.spaceId}
          AND feeds.feedNamespace = ${opts.feedNamespace}
          AND blocks.position IS NULL
      `;
      return rows[0]?.count ?? 0;
    }).pipe(Effect.withSpan('FeedStore.countUnpositionedBlocks'), SpanAttributes.annotateSpace(opts.spaceId));

  /**
   * Returns the total number of blocks stored locally for a space/namespace.
   */
  countNamespaceBlocks = (opts: {
    spaceId: SpaceId;
    feedNamespace: string;
  }): Effect.Effect<number, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen({ self: this }, function* () {
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql<{ count: number }>`
        SELECT COUNT(*) AS count
        FROM blocks
        JOIN feeds ON blocks.feedPrivateId = feeds.feedPrivateId
        WHERE feeds.spaceId = ${opts.spaceId}
          AND feeds.feedNamespace = ${opts.feedNamespace}
      `;
      return rows[0]?.count ?? 0;
    }).pipe(Effect.withSpan('FeedStore.countNamespaceBlocks'), SpanAttributes.annotateSpace(opts.spaceId));

  /**
   * Returns the number of stored blocks for a single feed in a space/namespace.
   * Intended as a low-level primitive for callers (for example Cloudflare Worker code)
   * that need to make retention decisions under constrained storage resources.
   */
  countBlocks = (opts: {
    spaceId: SpaceId;
    feedNamespace: string;
    feedId: string;
  }): Effect.Effect<number, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen({ self: this }, function* () {
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql<{ count: number }>`
        SELECT COUNT(*) AS count
        FROM blocks
        JOIN feeds ON blocks.feedPrivateId = feeds.feedPrivateId
        WHERE feeds.spaceId = ${opts.spaceId}
          AND feeds.feedNamespace = ${opts.feedNamespace}
          AND feeds.feedId = ${opts.feedId}
      `;
      return rows[0]?.count ?? 0;
    }).pipe(Effect.withSpan('FeedStore.countBlocks'), SpanAttributes.annotateSpace(opts.spaceId));

  /**
   * Deletes the oldest blocks for a single feed in a space/namespace.
   * This API intentionally does not enforce any retention policy (such as max size);
   * callers decide when and how much to prune, which is useful for constrained
   * environments like Cloudflare Workers.
   *
   * @returns Number of deleted rows.
   */
  deleteOldestBlocks = (opts: {
    spaceId: SpaceId;
    feedNamespace: string;
    feedId: string;
    count: number;
  }): Effect.Effect<number, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen({ self: this }, function* () {
      const sql = yield* SqlClient.SqlClient;
      if (opts.count <= 0) {
        return 0;
      }

      const deletedRows = yield* sql<{ insertionId: number }>`
        DELETE FROM blocks
        WHERE insertionId IN (
          SELECT blocks.insertionId
          FROM blocks
          JOIN feeds ON blocks.feedPrivateId = feeds.feedPrivateId
          WHERE feeds.spaceId = ${opts.spaceId}
            AND feeds.feedNamespace = ${opts.feedNamespace}
            AND feeds.feedId = ${opts.feedId}
          ORDER BY blocks.insertionId ASC
          LIMIT ${opts.count}
        )
        RETURNING insertionId
      `;

      return deletedRows.length;
    }).pipe(Effect.withSpan('FeedStore.deleteOldestBlocks'));

  /**
   * Appends blocks for a space/namespace and optionally assigns global positions.
   */
  append = (
    request: AppendRequest,
  ): Effect.Effect<
    AppendResponse,
    SqlError.SqlError | CypherError,
    SqlClient.SqlClient | SqlTransaction.SqlTransaction
  > =>
    Effect.gen({ self: this }, function* () {
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

      // Seal payloads before the transaction so the WebCrypto round-trips do not hold it open.
      // Without a cypher, stay fully synchronous here so append adds no async turns when encryption
      // is off (an extra turn can reorder concurrent appends racing for the same position).
      const sealed = this.#options.cypher
        ? yield* this.#sealBlocks(request.spaceId, request.feedNamespace, request.blocks)
        : request.blocks.map((block) => ({ data: block.data, encryptionKeyId: null, iv: null }));

      // Wrap in transaction to ensure atomicity when assigning positions.
      const sqlTransaction = yield* SqlTransaction.SqlTransaction;
      const positions = yield* sqlTransaction.withTransaction(
        Effect.gen({ self: this }, function* () {
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
              Effect.gen({ self: this }, function* () {
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
          //
          // Critical: when a block already exists (conflict on (feedPrivateId, sequence, actorId))
          // we must (a) return the EXISTING position to the caller and (b) NOT advance the
          // namespace position counter. Otherwise the response contains wasted slots that
          // sync clients will try to UPDATE local rows to, tripping the
          // (feedPrivateId, position) UNIQUE constraint and stalling sync indefinitely.
          const positions: number[] = [];
          for (const [blockIndex, block] of request.blocks.entries()) {
            const key = block.feedId!;
            const feedPrivateId = feedPrivateIds.get(key)!;
            const { data, encryptionKeyId, iv } = sealed[blockIndex];

            let positionToInsert: number | null = null;
            if (this.#options.assignPositions) {
              positionToInsert = maxPositions.get(request.feedNamespace)! + 1;
            } else if (block.position != null) {
              positionToInsert = block.position;
            }

            const inserted = yield* sql<{ position: number | null }>`
              INSERT INTO blocks (
                feedPrivateId, position, sequence, actorId,
                prevSequence, prevActorId, timestamp, data, encryptionKeyId, iv
              ) VALUES (
                ${feedPrivateId}, ${positionToInsert}, ${block.sequence}, ${block.actorId},
                ${block.prevSequence}, ${block.prevActorId}, ${block.timestamp}, ${data}, ${encryptionKeyId}, ${iv}
              )
              ON CONFLICT(feedPrivateId, sequence, actorId) DO NOTHING
              RETURNING position
            `;

            if (!this.#options.assignPositions) {
              continue;
            }

            if (inserted.length > 0) {
              // New row written at the freshly allocated position.
              positions.push(positionToInsert!);
              maxPositions.set(request.feedNamespace, positionToInsert!);
              continue;
            }

            // Duplicate Lamport tuple: return the stored position and leave maxPositions alone.
            const existing = yield* sql<{ position: number | null }>`
              SELECT position FROM blocks
              WHERE feedPrivateId = ${feedPrivateId}
                AND actorId = ${block.actorId}
                AND sequence = ${block.sequence}
            `;
            const existingPosition = existing[0]?.position;
            if (existingPosition != null) {
              positions.push(existingPosition);
              continue;
            }

            // Defensive: existing row carries no position (e.g. inserted via an earlier
            // assignPositions=false path). Back-fill it so the caller can mark it positioned.
            yield* sql`
              UPDATE blocks SET position = ${positionToInsert}
              WHERE feedPrivateId = ${feedPrivateId}
                AND actorId = ${block.actorId}
                AND sequence = ${block.sequence}
            `;
            positions.push(positionToInsert!);
            maxPositions.set(request.feedNamespace, positionToInsert!);
          }

          return positions;
        }),
      );

      this.onNewBlocks.emit();

      return { requestId: request.requestId, positions };
    }).pipe(Effect.withSpan('FeedStore.append'));

  /**
   * Creates local blocks with sequential predecessors and appends grouped batches.
   *
   * A block whose object id is later superseded by a newer same-id block (a live feed object's
   * `Obj.update`, persisted as a whole-object re-append) is never reclaimed — the index collapses
   * reads to the latest block by id, but old blocks stay on disk indefinitely.
   * TODO(wittjosiah): Add compaction/retention driven by `Feed.RetentionOptions`.
   */
  appendLocal = Effect.fn('Feed.appendLocal')(
    (
      messages: { spaceId: string; feedId: string; feedNamespace: string; data: Uint8Array }[],
    ): Effect.Effect<Block[], SqlError.SqlError | CypherError, SqlClient.SqlClient | SqlTransaction.SqlTransaction> =>
      Effect.gen({ self: this }, function* () {
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
            Effect.gen({ self: this }, function* () {
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

        // 4. Call append once per (spaceId, namespace) batch and assign returned positions.
        const positionByBlock = new Map<Block, number | null>();
        for (const { spaceId, feedNamespace, blocks: batchBlocks } of blocksBySpaceNamespace.values()) {
          const { positions } = yield* this.append({
            requestId: 'local-append',
            blocks: batchBlocks,
            spaceId,
            feedNamespace,
          });
          for (let i = 0; i < batchBlocks.length; i++) {
            positionByBlock.set(batchBlocks[i], positions[i] ?? null);
          }
        }

        return blocks.map((block) => ({
          ...block,
          position: positionByBlock.get(block) ?? block.position,
        }));
      }).pipe(Effect.withSpan('FeedStore.appendLocal')),
  );

  /**
   * Sets positions for existing blocks while preventing conflicting reassignments.
   */
  setPosition = (request: {
    spaceId: string;
    blocks: (Pick<Block, 'feedId' | 'actorId' | 'sequence' | 'position'> & { feedNamespace: string })[];
  }): Effect.Effect<void, SqlError.SqlError | PositionConflictError, SqlClient.SqlClient> =>
    Effect.gen({ self: this }, function* () {
      const sql = yield* SqlClient.SqlClient;
      for (const block of request.blocks) {
        // Fold the conflict check into the UPDATE itself: only write when the row is
        // unset or already at the requested position. RETURNING tells us whether the
        // write took effect, so we avoid the per-block SELECT round-trip on the
        // common path. Conflicts (rare) take the slow path below.
        const updated = yield* sql<{ position: number | null }>`
          UPDATE blocks SET position = ${block.position}
          WHERE feedPrivateId = (
            SELECT feedPrivateId FROM feeds
            WHERE spaceId = ${request.spaceId} AND feedId = ${block.feedId} AND feedNamespace = ${block.feedNamespace}
          )
          AND actorId = ${block.actorId} AND sequence = ${block.sequence}
          AND (position IS NULL OR position = ${block.position})
          RETURNING position
        `;
        if (updated.length > 0) {
          continue;
        }
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
          return yield* Effect.fail(
            new PositionConflictError({
              feedId: block.feedId,
              actorId: block.actorId,
              sequence: block.sequence,
              currentPosition: current.position,
              requestedPosition: block.position,
            }),
          );
        }
      }
    }).pipe(Effect.withSpan('FeedStore.setPosition'));

  /**
   * Gets all feeds and their blocks for a space, organized by feed ID and namespace.
   * Used for space archive export.
   */
  getAllFeedsForSpace = (opts: {
    spaceId: SpaceId;
  }): Effect.Effect<
    Array<{
      feedId: string;
      feedNamespace: string;
      blocks: Block[];
    }>,
    SqlError.SqlError,
    SqlClient.SqlClient
  > =>
    Effect.gen({ self: this }, function* () {
      const sql = yield* SqlClient.SqlClient;

      const feeds = yield* sql<{ feedId: string; feedNamespace: string }>`
        SELECT DISTINCT feedId, feedNamespace FROM feeds WHERE spaceId = ${opts.spaceId}
      `;

      const result: Array<{ feedId: string; feedNamespace: string; blocks: Block[] }> = [];

      for (const feed of feeds) {
        const blocks = yield* sql<Block>`
          SELECT blocks.*, feeds.feedId, feeds.feedNamespace
          FROM blocks
          JOIN feeds ON blocks.feedPrivateId = feeds.feedPrivateId
          WHERE feeds.spaceId = ${opts.spaceId}
            AND feeds.feedId = ${feed.feedId}
            AND feeds.feedNamespace = ${feed.feedNamespace}
          ORDER BY blocks.sequence ASC
        `;

        result.push({
          feedId: feed.feedId,
          feedNamespace: feed.feedNamespace,
          // Byte-faithful export: sealed payloads keep their ciphertext and envelope so a re-import
          // reconstitutes the exact stored rows, and no plaintext leaks into an archive.
          blocks: blocks.map((row) => ({
            ...row,
            data: new Uint8Array(row.data),
            encryptionKeyId: row.encryptionKeyId ?? undefined,
            iv: row.iv != null ? new Uint8Array(row.iv) : undefined,
          })),
        });
      }

      return result;
    }).pipe(Effect.withSpan('FeedStore.getAllFeedsForSpace'));
}

/** Immutable natural key of a block, bound as AAD so sealed bytes cannot be relocated. */
const blockNaturalKey = (feedId: string, actorId: string, sequence: number) => `${feedId}:${actorId}:${sequence}`;

const decodeCursor = (cursor: FeedCursor) => {
  const [token, insertionId] = cursor.split('|');
  return { token, insertionId: Number(insertionId) };
};
