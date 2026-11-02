//
// Copyright 2026 DXOS.org
//

import * as Clock from 'effect/Clock';
import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Migrator from 'effect/sql/Migrator';
import * as SqlClient from 'effect/sql/SqlClient';
import type * as SqlError from 'effect/sql/SqlError';
import type * as Statement from 'effect/sql/Statement';

import { Event } from '@dxos/async';
import { Feed } from '@dxos/echo';
import * as SpanAttributes from '@dxos/effect/SpanAttributes';
import { assertArgument, invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';

import { type Cypher, CypherError } from './cypher.ts';
import { MIGRATIONS, MIGRATIONS_TABLE } from './migrations/index.ts';

type AppendRequest = FeedProtocol.AppendRequest;
type AppendResponse = FeedProtocol.AppendResponse;
type Block = FeedProtocol.Block;
type BlockKey = FeedProtocol.BlockKey;
type FeedCursor = FeedProtocol.FeedCursor;
const isWellKnownNamespace = FeedProtocol.isWellKnownNamespace;
type QueryRequest = FeedProtocol.QueryRequest;
type QueryResponse = FeedProtocol.QueryResponse;
type SubscribeRequest = FeedProtocol.SubscribeRequest;
type SubscribeResponse = FeedProtocol.SubscribeResponse;

/** A stored block's identity, order and position, without its payload. */
export type BlockHead = {
  insertionId: number;
  feedId: string;
  actorId: string;
  sequence: number;
  position: number | null;
};

/** A feed's indexing and retention options, as stored in `feeds.options`. */
export type FeedOptions = Feed.FeedOptions;

/** Identifies one feed of a space in one namespace. */
export type FeedKey = { spaceId: string; feedId: string; feedNamespace: string };

/**
 * Most blocks one {@link FeedStore.trim} or {@link FeedStore.trimAll} call deletes, so a first trim
 * after enabling retention on a large feed stays inside one Durable Object request's limits.
 */
export const TRIM_LIMIT = 10_000;

/** Outcome of a trim: blocks deleted, and whether blocks past a limit remain for another call. */
export type TrimResult = { deleted: number; more: boolean };

/** A block retention deleted, as logged in `trimmed_blocks` until {@link FeedStore.clearTrimmed}. */
export type TrimmedBlock = {
  spaceId: string;
  feedId: string;
  feedNamespace: string;
  insertionId: number;
  position: number | null;
};

/** Canonical JSON for `feeds.options`: the schema fixes key order, so equal options store equal text. */
const FeedOptionsJson = Schema.fromJsonString(Feed.FeedOptions);

const decodeFeedOptions = (json: string | null): FeedOptions | undefined =>
  json == null ? undefined : Option.getOrUndefined(Schema.decodeUnknownOption(FeedOptionsJson)(json));

/** A feed row as retention needs it. */
type FeedRow = {
  spaceId: string;
  feedPrivateId: number;
  feedNamespace: string | null;
  options: FeedOptions | undefined;
};

/** A block payload ready for insertion, encrypted when the cypher asked for it. */
type SealedBlock = { data: Uint8Array; encryptionKeyId: string | null; iv: Uint8Array | null };

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

  /**
   * Host-imposed maximum length per namespace (EDGE's trace-queue cap). It applies to every feed of
   * the namespace, with or without stored options; a feed's own `maxLength` can lower it, not raise it.
   */
  maxLengthCap?: (feedNamespace: string) => number | undefined;
}

/**
 * Client-side pull progress for one space/namespace.
 */
export type SyncState = {
  /** Highest global position pulled from the server, or -1 when nothing has been pulled. */
  lastPulledPosition: number;
  /**
   * Token of the server that assigned {@link lastPulledPosition}. Undefined before the first
   * response carrying one, which is also the case for state written by earlier releases.
   */
  serverToken: string | undefined;
  /**
   * Blocks the server still held past {@link lastPulledPosition} when it was written. An estimate:
   * the server reports only whether more remains, so a batch's size stands in for the next one.
   */
  blocksToPull: number;
};

/**
 * Outcome of {@link FeedStore.append}: the protocol response plus what adopting the appended
 * positions did to the rows already held.
 */
export type AppendResult = AppendResponse & {
  /**
   * Blocks whose position was cleared because an appended block carries it. Only a replica adopting
   * a position authority's positions ever displaces anything; an authority assigns fresh ones.
   */
  displaced: number;
  /**
   * What retention deleted from the appended feeds in the same transaction; a caller loops
   * {@link FeedStore.trim} while `more`.
   */
  trim: TrimResult;
  /**
   * Appended blocks the store already held at a different position. Like a displacement it means
   * the authority's ordering has diverged from this store's, and it is the only trace a re-issued
   * position leaves when the slot it lands in was empty here.
   */
  moved: number;
};

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
   * Emits after successful block append operations, with the space the blocks were written to and,
   * when the change was confined to one namespace, that namespace.
   */
  readonly onNewBlocks = new Event<{ spaceId: string; feedNamespace?: string }>();

  /**
   * Emits when a space's sync backlog may have changed: blocks appended, positions assigned or
   * reset, or a new remote backlog recorded.
   */
  readonly onSyncStateChanged = new Event<{ spaceId: string }>();

  /**
   * Applies any migrations this database has not recorded yet.
   *
   * A database created before migration tracking existed already holds migration 1's tables, and
   * needs no special handling: every statement in it is `IF NOT EXISTS`, so it applies as a no-op
   * and is recorded like any other.
   */
  migrate = Effect.fn('FeedStore.migrate')(() =>
    Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
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

        const rows = yield* sql<{ feedPrivateId: number; feedNamespace: string | null; options: string | null }>`
              SELECT feedPrivateId, feedNamespace, options FROM feeds WHERE spaceId = ${spaceId} AND feedId = ${feedId}
          `;
        if (rows.length > 0) {
          this.#feedNamespaces.set(rows[0].feedPrivateId, rows[0].feedNamespace);
          this.#feedOptions.set(rows[0].feedPrivateId, decodeFeedOptions(rows[0].options));
          return rows[0].feedPrivateId;
        }

        const newRows = yield* sql<{ feedPrivateId: number }>`
              INSERT INTO feeds (spaceId, feedId, feedNamespace) VALUES (${spaceId}, ${feedId}, ${namespace}) RETURNING feedPrivateId
          `;
        this.#feedNamespaces.set(newRows[0].feedPrivateId, namespace ?? null);
        this.#feedOptions.set(newRows[0].feedPrivateId, undefined);
        return newRows[0].feedPrivateId;
      }).pipe(Effect.withSpan('FeedStore.ensureFeed'), SpanAttributes.annotateSpace(spaceId)),
  );

  /**
   * The namespace each feed row was created with, which a block inherits whatever namespace its append
   * named; safe to hold unbounded because a feed row's namespace is never rewritten.
   */
  readonly #feedNamespaces = new Map<number, string | null>();

  /**
   * The options last read for each feed row; {@link #ensureFeed} re-reads them on every append, so the
   * append-path trim never acts on options older than its own transaction.
   */
  readonly #feedOptions = new Map<number, FeedOptions | undefined>();

  /** Keyed by space; a space's token is written once, so only {@link resetCaches} invalidates it. */
  readonly #cursorTokens = new Map<string, string>();

  /**
   * Forgets every cached row. A caller that deletes the store's rows while it stays in use calls this,
   * or a cursor would be issued under a token no longer stored and fail every read after a restart.
   */
  resetCaches(): void {
    this.#feedNamespaces.clear();
    this.#feedOptions.clear();
    this.#cursorTokens.clear();
    this.#heads.clear();
  }

  #ensureCursorToken = Effect.fn('Feed.ensureCursorToken')(
    (spaceId: string): Effect.Effect<string, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen({ self: this }, function* () {
        const cached = this.#cursorTokens.get(spaceId);
        if (cached !== undefined) {
          return cached;
        }
        const sql = yield* SqlClient.SqlClient;
        const rows = yield* sql<{ token: string }>`SELECT token FROM cursor_tokens WHERE spaceId = ${spaceId}`;
        if (rows.length > 0) {
          this.#cursorTokens.set(spaceId, rows[0].token);
          return rows[0].token;
        }

        const token = crypto.randomUUID().replace(/-/g, '').slice(0, 6);
        yield* sql`INSERT INTO cursor_tokens (spaceId, token) VALUES (${spaceId}, ${token})`;
        this.#cursorTokens.set(spaceId, token);
        return token;
      }).pipe(Effect.withSpan('FeedStore.ensureCursorToken'), SpanAttributes.annotateSpace(spaceId)),
  );

  /**
   * Identity of this store's storage, as reported to sync clients so they can detect that the
   * server they had been syncing with was swapped or wiped. Created on first use and stable
   * thereafter, so it only changes when the underlying storage is recreated.
   */
  getServerToken = (spaceId: string): Effect.Effect<string, SqlError.SqlError, SqlClient.SqlClient> =>
    this.#ensureCursorToken(spaceId);

  /**
   * Whether this store issued `cursor` for the space. {@link query} rejects any other cursor, since its
   * insertion id numbers another store's blocks.
   */
  isCursorCurrent = (
    spaceId: string,
    cursor: FeedCursor,
  ): Effect.Effect<boolean, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.map(this.#ensureCursorToken(spaceId), (token) => FeedProtocol.decodeFeedCursor(cursor).token === token);

  /**
   * Highest insertion id per `spaceId|feedNamespace`, so a reader polling a caught-up cursor is
   * answered without touching the database. It may only ever run ahead of the table (a rolled-back
   * append, a deleted block), which costs a query that finds nothing; it can never fall behind,
   * because every block is inserted by {@link #insertSealed}, which raises it.
   */
  readonly #heads = new Map<string, number>();

  #noteHead(spaceId: string, feedNamespace: string, insertionId: number): void {
    const key = `${spaceId}|${feedNamespace}`;
    this.#heads.set(key, Math.max(this.#heads.get(key) ?? -1, insertionId));
  }

  /**
   * Highest insertion id held in a space/namespace, or -1 when it holds no blocks.
   */
  #head = (spaceId: string, feedNamespace: string): Effect.Effect<number, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen({ self: this }, function* () {
      const cached = this.#heads.get(`${spaceId}|${feedNamespace}`);
      if (cached !== undefined) {
        return cached;
      }
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql<{ head: number | null }>`
        SELECT MAX(blocks.insertionId) as head
        FROM blocks
        JOIN feeds ON blocks.feedPrivateId = feeds.feedPrivateId
        WHERE feeds.spaceId = ${spaceId} AND feeds.feedNamespace = ${feedNamespace}
      `;
      // Merged rather than set: an append landing while this read was in flight has already raised it.
      this.#noteHead(spaceId, feedNamespace, rows[0]?.head ?? -1);
      return this.#heads.get(`${spaceId}|${feedNamespace}`) ?? -1;
    });

  /**
   * Highest position held in a space/namespace, or -1 when none of its blocks is positioned.
   */
  #maxPosition = (
    spaceId: string,
    feedNamespace: string,
  ): Effect.Effect<number, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql<{ maxPos: number | null }>`
        SELECT MAX(position) as maxPos
        FROM blocks
        JOIN feeds ON blocks.feedPrivateId = feeds.feedPrivateId
        WHERE feeds.spaceId = ${spaceId} AND feeds.feedNamespace = ${feedNamespace}
      `;
      return rows[0]?.maxPos ?? -1;
    });

  /**
   * Makes room for `holder` at `position`: clears the position of every other block in the
   * space/namespace holding that slot (`displaced`) and of the holder itself when it sits at a
   * different one (`moved`), so the caller can write the position without tripping the unique
   * index. It runs once per pulled block, so each half has to be a single index search: written as
   * one `UPDATE … WHERE (displaced OR moved)`, SQLite planned a multi-index OR whose `displaced`
   * branch scanned every block in the store — 220 ms per pulled block on a 12k-block OPFS profile,
   * which kept the storage worker saturated for the whole initial feed sync. The halves cannot
   * match the same row (one excludes the holder, the other requires it), and every caller runs
   * inside a transaction, so splitting them changes nothing else.
   *
   * A position only ever reaches a replica from its authority, so either finding means the replica
   * cached an ordering the authority has since abandoned (its storage was rolled back and it
   * re-issued the slot). The evicted block is unpositioned again, which is what gets it pushed once
   * more and told where it really is. Namespace-wide, not per feed: the authority's counter is one
   * per namespace, and a block left holding a position that another feed's block now owns would
   * count as synced and never be pushed again.
   */
  #evictSlot = (
    spaceId: string,
    feedNamespace: string,
    position: number,
    holder: Pick<Block, 'actorId' | 'sequence'> & { feedPrivateId: number },
  ): Effect.Effect<{ displaced: number; moved: number }, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      // Feeds first so the (feedPrivateId, position) index answers this, rather than a scan on position.
      const displaced = yield* sql<{ feedPrivateId: number }>`
        UPDATE blocks SET position = NULL
        WHERE feedPrivateId IN (
            SELECT feedPrivateId FROM feeds WHERE spaceId = ${spaceId} AND feedNamespace = ${feedNamespace}
          )
          AND position = ${position}
          AND NOT (
            feedPrivateId = ${holder.feedPrivateId} AND actorId = ${holder.actorId} AND sequence = ${holder.sequence}
          )
        RETURNING feedPrivateId
      `;
      // The (feedPrivateId, sequence, actorId) index.
      const moved = yield* sql<{ feedPrivateId: number }>`
        UPDATE blocks SET position = NULL
        WHERE feedPrivateId = ${holder.feedPrivateId} AND actorId = ${holder.actorId} AND sequence = ${holder.sequence}
          AND position IS NOT NULL AND position != ${position}
        RETURNING feedPrivateId
      `;
      return { displaced: displaced.length, moved: moved.length };
    });

  /**
   * Seals block payloads for a batch, returning storage columns aligned by input index. A block
   * whose feed the cypher declines — or any block when no cypher is configured — passes through as
   * plaintext with no envelope.
   */
  #sealBlocks = (
    spaceId: string,
    feedNamespace: string,
    blocks: readonly Block[],
  ): Effect.Effect<SealedBlock[], CypherError> => {
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
          ...branchFieldsOf(row),
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
      return { ...row, ...branchFieldsOf(row), data: plaintext, encryptionKeyId: undefined, iv: undefined };
    });

  /**
   * Opens stored rows for callers. Without a cypher it takes the synchronous path, so decryption adds
   * no async turns to the hot query path when encryption is off.
   */
  #openRows = (rows: readonly Block[], spaceId: string, feedNamespace: string): Effect.Effect<Block[], CypherError> =>
    this.#options.cypher
      ? Effect.forEach(rows, (row) => this.#openBlock(row, spaceId, feedNamespace), { concurrency: 'unbounded' })
      : // Normalise the SQLite NULL envelope columns to undefined — the Block schema types them
        // `string | undefined`, not nullable, so a raw null trips schema encode on the sync path.
        // Cloning the buffer avoids an empty Uint8Array.
        Effect.succeed(
          rows.map((row) => ({
            ...row,
            ...branchFieldsOf(row),
            data: new Uint8Array(row.data),
            encryptionKeyId: row.encryptionKeyId ?? undefined,
            iv: row.iv != null ? new Uint8Array(row.iv) : undefined,
          })),
        );

  /**
   * Every block of a namespace's feeds as a {@link BlockHead}, in insertion order, plus the opened
   * blocks inserted after `dataAfter`. A subscriber diffs the heads to see positions assigned or
   * cleared, and reads payloads only for blocks it has not been sent.
   */
  queryHeads = Effect.fn('Feed.queryHeads')(
    (request: {
      spaceId: string;
      feedNamespace: string;
      /** All feeds of the namespace when absent. */
      feedIds?: readonly string[];
      /** Insertion id of the newest block already read; -1 reads every payload. */
      dataAfter: number;
    }): Effect.Effect<
      { heads: readonly BlockHead[]; blocks: Block[] },
      SqlError.SqlError | CypherError,
      SqlClient.SqlClient
    > =>
      Effect.gen({ self: this }, function* () {
        const sql = yield* SqlClient.SqlClient;
        if (request.feedIds !== undefined && request.feedIds.length === 0) {
          return { heads: [], blocks: [] };
        }
        // Hidden heads read as removed to a subscriber diffing them, which is what expiry means to it.
        const notExpired = yield* this.#notExpired(request.spaceId, request.feedNamespace);
        const scope = sql`
          FROM blocks
          JOIN feeds ON blocks.feedPrivateId = feeds.feedPrivateId
          WHERE feeds.spaceId = ${request.spaceId} AND feeds.feedNamespace = ${request.feedNamespace}
          ${request.feedIds !== undefined ? sql`AND feeds.feedId IN ${sql.in([...request.feedIds])}` : sql``}
          ${notExpired}
        `;
        const heads = yield* sql<BlockHead>`
          SELECT blocks.insertionId, feeds.feedId, blocks.actorId, blocks.sequence, blocks.position
          ${scope}
          ORDER BY blocks.insertionId ASC
        `;
        const rows = heads.some((head) => head.insertionId > request.dataAfter)
          ? yield* sql<Block>`
              SELECT blocks.*, feeds.feedId, feeds.feedNamespace
              ${scope}
              AND blocks.insertionId > ${request.dataAfter}
              ORDER BY blocks.insertionId ASC
            `
          : [];
        const blocks = yield* this.#openRows(rows, request.spaceId, request.feedNamespace);
        return { heads, blocks };
      }).pipe(Effect.withSpan('FeedStore.queryHeads'), SpanAttributes.annotateSpace(request.spaceId)),
  );

  /**
   * Queries feed blocks by feed IDs or subscription with cursor/position pagination.
   * Blocks past their feed's `maxAge` are hidden from the moment they expire, before any trim.
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
          const { token, insertionId } = FeedProtocol.decodeFeedCursor(request.cursor as FeedCursor);
          if (!token || insertionId === undefined || isNaN(insertionId)) {
            return yield* Effect.die(new Error(`Invalid cursor format`));
          }
          cursorToken = token;
          cursorInsertionId = insertionId;
        }

        // Validate Token if cursor used.
        const validCursorToken = yield* this.#ensureCursorToken(request.spaceId);
        // Only a position authority's token is meaningful to a sync client -- it names the store
        // whose positions the client is caching. Likewise its high-water mark: a client compares it
        // against its cursor to notice the store no longer holds what the client pulled.
        const serverToken = this.#options.assignPositions ? validCursorToken : undefined;
        const maxPosition = this.#options.assignPositions
          ? yield* this.#maxPosition(request.spaceId, request.feedNamespace)
          : undefined;
        if (request.cursor && cursorToken !== validCursorToken) {
          return yield* Effect.die(new Error(`Cursor token mismatch`));
        }

        // The indexer polls every space/namespace on each pass, and almost all of them are caught up;
        // answering those from the in-memory head keeps an idle pass off the database entirely.
        if (!request.query && request.position === undefined) {
          const head = yield* this.#head(request.spaceId, request.feedNamespace);
          if (head <= cursorInsertionId) {
            return {
              requestId: request.requestId,
              blocks: [],
              nextCursor: request.cursor ?? FeedProtocol.encodeFeedCursor(validCursorToken, FeedProtocol.FEED_START),
              hasMore: false,
              serverToken,
              maxPosition,
              cursorBlock: undefined,
            } satisfies QueryResponse;
          }
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

        // A client whose remembered positions were assigned by a different store names slots that
        // no longer exist, so serve the namespace from the start rather than from a meaningless
        // offset — recovering in the same round-trip the client already paid for.
        const serverChanged = request.expectedServerToken != null && request.expectedServerToken !== validCursorToken;
        const position = serverChanged ? -1 : (request.position ?? -1);
        // The block at the cursor is how a client checks its ordering once this store has been
        // written past the cursor again, where the high-water mark no longer tells it anything.
        const cursorBlock =
          this.#options.assignPositions && position >= 0
            ? ((yield* this.getPositionHolders({
                spaceId: request.spaceId,
                feedNamespace: request.feedNamespace,
                position,
              }))[0] ?? null)
            : undefined;

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
            nextCursor: FeedProtocol.encodeFeedCursor(validCursorToken, FeedProtocol.FEED_START),
            hasMore: false,
            serverToken,
            maxPosition,
            cursorBlock,
          };
        }

        // Fetch blocks.
        const notExpired = yield* this.#notExpired(request.spaceId, request.feedNamespace);
        const query = sql<Block>`
            SELECT blocks.*, feeds.feedId, feeds.feedNamespace
            FROM blocks
            JOIN feeds ON blocks.feedPrivateId = feeds.feedPrivateId
            WHERE 1=1
            ${feedIds !== undefined ? sql`AND feeds.feedId IN ${sql.in(feedIds)}` : sql``}
            ${request.spaceId ? sql`AND feeds.spaceId = ${request.spaceId}` : sql``}
            ${sql`AND feeds.feedNamespace = ${request.feedNamespace}`}
            ${notExpired}
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
        const blocks = yield* this.#openRows(slice, request.spaceId, request.feedNamespace);

        let nextCursor: FeedCursor =
          request.cursor ?? FeedProtocol.encodeFeedCursor(validCursorToken, FeedProtocol.FEED_START);
        if (blocks.length > 0 && request.spaceId) {
          const lastBlock = blocks[blocks.length - 1];
          if (lastBlock.insertionId !== undefined) {
            nextCursor = FeedProtocol.encodeFeedCursor(validCursorToken, lastBlock.insertionId);
          }
        }

        return {
          requestId: request.requestId,
          blocks,
          nextCursor,
          hasMore,
          serverToken,
          maxPosition,
          cursorBlock,
        } satisfies QueryResponse;
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
   * Get the pull progress for the given space and namespace.
   * `lastPulledPosition` is -1 and `serverToken` undefined when no sync state exists yet.
   */
  getSyncState = (opts: {
    spaceId: SpaceId;
    feedNamespace: string;
  }): Effect.Effect<SyncState, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen({ self: this }, function* () {
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql<{ lastPulledPosition: number; serverToken: string | null; blocksToPull: number }>`
        SELECT lastPulledPosition, serverToken, blocksToPull FROM sync_state
        WHERE spaceId = ${opts.spaceId} AND feedNamespace = ${opts.feedNamespace}
      `;
      return {
        lastPulledPosition: rows[0]?.lastPulledPosition ?? -1,
        serverToken: rows[0]?.serverToken ?? undefined,
        blocksToPull: rows[0]?.blocksToPull ?? 0,
      };
    }).pipe(Effect.withSpan('FeedStore.getSyncState'), SpanAttributes.annotateSpace(opts.spaceId));

  /**
   * Update the pull progress for the given space and namespace.
   */
  setSyncState = (opts: {
    spaceId: SpaceId;
    feedNamespace: string;
    lastPulledPosition: number;
    /** Token of the server that assigned `lastPulledPosition`; leaves the stored token as-is when omitted. */
    serverToken?: string;
    /** See {@link SyncState.blocksToPull}. Defaults to 0: a pull that reports nothing drained it. */
    blocksToPull?: number;
  }): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen({ self: this }, function* () {
      const sql = yield* SqlClient.SqlClient;
      const serverToken = opts.serverToken ?? null;
      const blocksToPull = opts.blocksToPull ?? 0;
      yield* sql`
        INSERT INTO sync_state (spaceId, feedNamespace, lastPulledPosition, serverToken, blocksToPull)
        VALUES (${opts.spaceId}, ${opts.feedNamespace}, ${opts.lastPulledPosition}, ${serverToken}, ${blocksToPull})
        ON CONFLICT (spaceId, feedNamespace) DO UPDATE SET
          lastPulledPosition = ${opts.lastPulledPosition},
          serverToken = COALESCE(${serverToken}, sync_state.serverToken),
          blocksToPull = ${blocksToPull}
      `;
    }).pipe(Effect.withSpan('FeedStore.setSyncState'), SpanAttributes.annotateSpace(opts.spaceId));

  /**
   * Discards everything derived from a server that no longer exists: strips the global position
   * from every block of the space/namespace and restarts pull progress under the new server's
   * token, so the next pull replays the namespace from the start.
   *
   * Blocks themselves are kept -- they are re-pushed and de-duplicated by (actorId, sequence) -- so
   * locally authored history survives a server swap.
   */
  resetSyncState = (opts: {
    spaceId: SpaceId;
    feedNamespace: string;
    serverToken: string;
  }): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen({ self: this }, function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql.withTransaction(
        Effect.gen(function* () {
          yield* sql`
            UPDATE blocks SET position = NULL
            WHERE feedPrivateId IN (
              SELECT feedPrivateId FROM feeds
              WHERE spaceId = ${opts.spaceId} AND feedNamespace = ${opts.feedNamespace}
            )
          `;
          yield* sql`
            DELETE FROM sync_state
            WHERE spaceId = ${opts.spaceId} AND feedNamespace = ${opts.feedNamespace}
          `;
          yield* sql`
            INSERT INTO sync_state (spaceId, feedNamespace, lastPulledPosition, serverToken)
            VALUES (${opts.spaceId}, ${opts.feedNamespace}, -1, ${opts.serverToken})
          `;
        }),
      );
      this.#emitBlocksChanged(opts.spaceId, opts.feedNamespace);
    }).pipe(Effect.withSpan('FeedStore.resetSyncState'), SpanAttributes.annotateSpace(opts.spaceId));

  /**
   * Clears every position above `position` in a space/namespace, returning how many blocks that
   * unpositioned.
   *
   * For a replica whose authority just reported `position` as its high-water mark: positions only
   * come from the authority, so a local one above its mark names a row the authority lost, and the
   * block holding it has to be pushed again -- which clearing it is what triggers.
   */
  clearPositionsAbove = (opts: {
    spaceId: SpaceId;
    feedNamespace: string;
    position: number;
  }): Effect.Effect<number, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql<{ insertionId: number }>`
        UPDATE blocks SET position = NULL
        WHERE feedPrivateId IN (
            SELECT feedPrivateId FROM feeds WHERE spaceId = ${opts.spaceId} AND feedNamespace = ${opts.feedNamespace}
          )
          AND position > ${opts.position}
        RETURNING insertionId
      `;
      return rows.length;
    }).pipe(Effect.withSpan('FeedStore.clearPositionsAbove'), SpanAttributes.annotateSpace(opts.spaceId));

  /**
   * Keys of the blocks holding `position` in a space/namespace, in insertion order.
   *
   * A store that agrees with its authority holds at most one; a replica whose ordering diverged can
   * hold two until the next pull evicts one, and a client comparing its cursor against the server's
   * has to see both to know it disagrees.
   */
  getPositionHolders = (opts: {
    spaceId: string;
    feedNamespace: string;
    position: number;
  }): Effect.Effect<readonly BlockKey[], SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      return yield* sql<BlockKey>`
        SELECT feeds.feedId, blocks.actorId, blocks.sequence
        FROM blocks
        JOIN feeds ON blocks.feedPrivateId = feeds.feedPrivateId
        WHERE feeds.spaceId = ${opts.spaceId} AND feeds.feedNamespace = ${opts.feedNamespace}
          AND blocks.position = ${opts.position}
        ORDER BY blocks.insertionId ASC
      `;
    }).pipe(Effect.withSpan('FeedStore.getPositionHolders'), SpanAttributes.annotateSpace(opts.spaceId));

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
   *
   * On a replica the appended blocks' positions are the authority's word and win over whatever the
   * local rows hold; see {@link AppendResult.displaced}.
   */
  append = (
    request: AppendRequest,
  ): Effect.Effect<AppendResult, SqlError.SqlError | CypherError, SqlClient.SqlClient> =>
    Effect.gen({ self: this }, function* () {
      const sealed = yield* this.#sealForInsert(request);
      const sql = yield* SqlClient.SqlClient;
      const now = yield* Clock.currentTimeMillis;
      // One transaction, so positions are assigned atomically and retention drops what the append
      // pushed past a limit before anyone can read it (a pulled block included, so it is not re-requested).
      const { positions, displaced, moved, trim } = yield* sql.withTransaction(
        Effect.gen({ self: this }, function* () {
          const inserted = yield* this.#insertSealed(request, sealed);
          const trim = yield* this.#trimRows(
            inserted.feedPrivateIds.map((feedPrivateId) => this.#feedRow(request.spaceId!, feedPrivateId)),
            now,
          );
          return { ...inserted, trim };
        }),
      );
      // Notify on the committed blocks, before the cursor token, which is a separate write.
      this.#emitBlocksChanged(request.spaceId!, request.feedNamespace);

      const serverToken = this.#options.assignPositions ? yield* this.#ensureCursorToken(request.spaceId!) : undefined;
      return { requestId: request.requestId, positions, serverToken, displaced, moved, trim };
    }).pipe(Effect.withSpan('FeedStore.append'));

  /**
   * Validates a request and seals its payloads. Runs outside any transaction, so the WebCrypto
   * round-trips never hold the store's connection open.
   */
  #sealForInsert = (request: AppendRequest): Effect.Effect<SealedBlock[], CypherError> =>
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
      return sealed;
    });

  /** Writes sealed blocks and returns their positions. The caller owns the transaction. */
  #insertSealed = (
    request: AppendRequest,
    sealed: SealedBlock[],
  ): Effect.Effect<
    { positions: number[]; displaced: number; moved: number; feedPrivateIds: number[] },
    SqlError.SqlError,
    SqlClient.SqlClient
  > =>
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
        maxPositions.set(request.feedNamespace, yield* this.#maxPosition(request.spaceId, request.feedNamespace));
      }

      // 3. Insert all blocks and compute positions.
      //
      // Critical: when a block already exists (conflict on (feedPrivateId, sequence, actorId))
      // we must (a) return the EXISTING position to the caller and (b) NOT advance the
      // namespace position counter. Otherwise the response contains wasted slots that
      // sync clients will try to UPDATE local rows to, tripping the
      // (feedPrivateId, position) UNIQUE constraint and stalling sync indefinitely.
      // On a replica, a pulled block the store already holds is the same block by
      // (actorId, sequence): adopt the server's position for it, even over a position the row
      // already carried (cleared, and counted, by #evictSlot just before). The authority is the
      // only source of positions, so a differing local one is stale -- kept, it would leave the
      // replica's ordering out of step for good.
      // A position authority must keep DO NOTHING -- the assignment path below distinguishes a
      // fresh row from a duplicate by whether the insert wrote one.
      const onConflict = this.#options.assignPositions
        ? sql`ON CONFLICT(feedPrivateId, sequence, actorId) DO NOTHING`
        : sql`ON CONFLICT(feedPrivateId, sequence, actorId) DO UPDATE SET position = excluded.position
              WHERE excluded.position IS NOT NULL AND blocks.position IS NOT excluded.position`;

      const positions: number[] = [];
      let displaced = 0;
      let moved = 0;
      for (const [blockIndex, block] of request.blocks.entries()) {
        const key = block.feedId!;
        const feedPrivateId = feedPrivateIds.get(key)!;
        const { data, encryptionKeyId, iv } = sealed[blockIndex];

        let positionToInsert: number | null = null;
        if (this.#options.assignPositions) {
          positionToInsert = maxPositions.get(request.feedNamespace)! + 1;
        } else if (block.position != null) {
          positionToInsert = block.position;
          const evicted = yield* this.#evictSlot(request.spaceId, request.feedNamespace, positionToInsert, {
            ...block,
            feedPrivateId,
          });
          displaced += evicted.displaced;
          moved += evicted.moved;
        }

        const predecessor = yield* this.#findPredecessor(feedPrivateId, block);
        const branch = inferBranch(block, predecessor);
        const inserted = yield* sql<{ position: number | null; insertionId: number }>`
          INSERT INTO blocks (
            feedPrivateId, position, sequence, actorId,
            prevSequence, prevActorId, timestamp, data, encryptionKeyId, iv, fork, branch
          ) VALUES (
            ${feedPrivateId}, ${positionToInsert}, ${block.sequence}, ${block.actorId},
            ${block.prevSequence}, ${block.prevActorId}, ${block.timestamp}, ${data}, ${encryptionKeyId}, ${iv},
            ${block.fork === true ? 1 : 0}, ${branch}
          )
          ${onConflict}
          RETURNING position, insertionId
        `;
        const feedNamespace = this.#feedNamespaces.get(feedPrivateId);
        if (inserted.length > 0 && feedNamespace != null) {
          this.#noteHead(request.spaceId, feedNamespace, inserted[0].insertionId);
        }
        if (inserted.length > 0) {
          yield* this.#noteBranchHead(feedPrivateId, block, branch, inserted[0].insertionId, predecessor);
          // A synced fork can arrive before its fork point; once the fork point lands, give its branch row the base.
          yield* sql`
            UPDATE branches
            SET baseBranchId = ${branch ?? ROOT_BRANCH_ROW}, forkInsertionId = ${inserted[0].insertionId}
            WHERE feedPrivateId = ${feedPrivateId}
              AND baseBranchId IS NULL AND forkInsertionId IS NULL AND branchId != ${ROOT_BRANCH_ROW}
              AND EXISTS (
                SELECT 1 FROM blocks
                WHERE blocks.insertionId = branches.baseInsertionId
                  AND blocks.prevSequence = ${block.sequence} AND blocks.prevActorId = ${block.actorId}
              )
          `;
        }

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

      return { positions, displaced, moved, feedPrivateIds: [...feedPrivateIds.values()] };
    });

  /**
   * Walks one feed along the path from the root branch to a target branch, in local order: each branch
   * on the path up to the fork point of the next, then the target. A backward walk gives the same blocks
   * in reverse. With `forks`, the base block of each branch that forks at a walked block follows that
   * block. Returns the opened blocks after `after`, or none when `after` is not on the walk.
   *
   * @performance One recursive query for the path, one read for each branch on it, and one for the
   * fork bases; it reads the whole path, so a page costs the path rather than the page.
   */
  walk = Effect.fn('FeedStore.walk')({ self: this }, function* (this: FeedStore, request: WalkRequest) {
    const sql = yield* SqlClient.SqlClient;
    const [feed] = yield* sql<{ feedPrivateId: number }>`
        SELECT feedPrivateId FROM feeds WHERE spaceId = ${request.spaceId} AND feedId = ${request.feedId}
      `;
    if (feed === undefined) {
      return [];
    }
    const { feedPrivateId } = feed;

    let after: StoredPredecessor | undefined;
    if (request.after !== undefined) {
      const block = FeedProtocol.parseBlockId(request.after);
      const [row] =
        block === undefined
          ? []
          : yield* sql<StoredPredecessor>`
                SELECT insertionId, branch FROM blocks
                WHERE feedPrivateId = ${feedPrivateId} AND sequence = ${block.sequence} AND actorId = ${block.actorId}
              `;
      if (row === undefined) {
        return [];
      }
      after = row;
    }

    const target =
      request.branch !== undefined ? request.branch : request.direction === 'desc' ? (after?.branch ?? null) : null;
    const path = yield* sql<BranchRow>`
        WITH RECURSIVE path(branchId, baseBranchId, baseInsertionId, forkInsertionId, depth) AS (
          SELECT branchId, baseBranchId, baseInsertionId, forkInsertionId, 0
            FROM branches WHERE feedPrivateId = ${feedPrivateId} AND branchId = ${target ?? ROOT_BRANCH_ROW}
          UNION ALL
          SELECT branches.branchId, branches.baseBranchId, branches.baseInsertionId, branches.forkInsertionId, path.depth + 1
            FROM branches JOIN path
              ON branches.feedPrivateId = ${feedPrivateId} AND branches.branchId = path.baseBranchId
        )
        SELECT branchId, baseBranchId, baseInsertionId, forkInsertionId FROM path ORDER BY depth DESC
      `;

    // Blocks past the feed's maxAge are hidden from every read until the next trim deletes them.
    const notExpired = yield* this.#notExpired(request.spaceId, request.feedNamespace);
    const sequence: Block[] = [];
    const onPath = new Set(path.map((row) => row.branchId));
    const forksAt = new Map<number, Block[]>();
    if (request.forks === true) {
      const others = yield* sql<BranchRow>`
          SELECT branchId, baseBranchId, baseInsertionId, forkInsertionId FROM branches
          WHERE feedPrivateId = ${feedPrivateId} AND forkInsertionId IS NOT NULL
        `;
      const bases = others.filter((row) => !onPath.has(row.branchId));
      const baseBlocks =
        bases.length === 0
          ? []
          : yield* sql<Block>`
                SELECT blocks.*, feeds.feedId, feeds.feedNamespace
                FROM blocks JOIN feeds ON blocks.feedPrivateId = feeds.feedPrivateId
                WHERE blocks.insertionId IN ${sql.in(bases.map((row) => row.baseInsertionId))}
                ${notExpired}
                ORDER BY blocks.insertionId ASC
              `;
      const forkOf = new Map(bases.map((row) => [row.baseInsertionId, row.forkInsertionId]));
      for (const block of baseBlocks) {
        const forkInsertionId = block.insertionId === undefined ? undefined : forkOf.get(block.insertionId);
        if (forkInsertionId != null) {
          forksAt.set(forkInsertionId, [...(forksAt.get(forkInsertionId) ?? []), block]);
        }
      }
    }

    for (const [index, row] of path.entries()) {
      const next = path[index + 1];
      // An ancestor is cut at the fork point of the next branch on the path, by local order.
      const cutoff = next === undefined ? Number.MAX_SAFE_INTEGER : (next.forkInsertionId ?? next.baseInsertionId - 1);
      const branch = row.branchId === ROOT_BRANCH_ROW ? null : row.branchId;
      const blocks = yield* sql<Block>`
          SELECT blocks.*, feeds.feedId, feeds.feedNamespace
          FROM blocks JOIN feeds ON blocks.feedPrivateId = feeds.feedPrivateId
          WHERE blocks.feedPrivateId = ${feedPrivateId} AND blocks.branch IS ${branch} AND blocks.insertionId <= ${cutoff}
          ${notExpired}
          ORDER BY blocks.insertionId ASC
        `;
      for (const block of blocks) {
        sequence.push(block, ...(block.insertionId === undefined ? [] : (forksAt.get(block.insertionId) ?? [])));
      }
    }

    const ordered = request.direction === 'desc' ? sequence.reverse() : sequence;
    const start = after === undefined ? 0 : ordered.findIndex((block) => block.insertionId === after.insertionId) + 1;
    if (start === 0 && after !== undefined) {
      return [];
    }
    return yield* this.#openRows(ordered.slice(start), request.spaceId, request.feedNamespace);
  });

  /** The stored predecessor of a block, or `undefined` when it has none or the store does not hold it. */
  #findPredecessor = Effect.fnUntraced(function* (
    feedPrivateId: number,
    block: Block,
  ): Effect.fn.Return<StoredPredecessor | undefined, SqlError.SqlError, SqlClient.SqlClient> {
    if (block.prevSequence == null || block.prevActorId == null) {
      return undefined;
    }
    const sql = yield* SqlClient.SqlClient;
    const rows = yield* sql<StoredPredecessor>`
        SELECT insertionId, branch FROM blocks
        WHERE feedPrivateId = ${feedPrivateId}
          AND sequence = ${block.prevSequence}
          AND actorId = ${block.prevActorId}
      `;
    return rows[0];
  });

  /**
   * Keeps the row of the branch a block was inserted on: a fork block (or the first block of a feed)
   * creates it, and every block moves its head.
   */
  #noteBranchHead = Effect.fnUntraced(function* (
    feedPrivateId: number,
    block: Block,
    branch: string | null,
    insertionId: number,
    predecessor: StoredPredecessor | undefined,
  ): Effect.fn.Return<void, SqlError.SqlError, SqlClient.SqlClient> {
    const sql = yield* SqlClient.SqlClient;
    const forks = block.fork === true && predecessor !== undefined;
    const baseBranchId = forks ? (predecessor.branch ?? ROOT_BRANCH_ROW) : null;
    const forkInsertionId = forks ? predecessor.insertionId : null;
    yield* sql`
        INSERT INTO branches (
          feedPrivateId, branchId, baseBranchId, baseInsertionId, forkInsertionId,
          headInsertionId, headSequence, headActorId
        ) VALUES (
          ${feedPrivateId}, ${branch ?? ROOT_BRANCH_ROW}, ${baseBranchId}, ${insertionId}, ${forkInsertionId},
          ${insertionId}, ${block.sequence}, ${block.actorId}
        )
        ON CONFLICT(feedPrivateId, branchId) DO UPDATE SET
          headInsertionId = excluded.headInsertionId,
          headSequence = excluded.headSequence,
          headActorId = excluded.headActorId
        WHERE excluded.headInsertionId > branches.headInsertionId
      `;
  });

  /**
   * Records pull progress for a pull that brought no blocks. Writes and notifies only when the
   * stored row would actually change, so a caught-up namespace polls without touching the database.
   */
  recordPullProgress = (request: {
    spaceId: SpaceId;
    feedNamespace: string;
    lastPulledPosition: number;
    blocksToPull: number;
  }): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen({ self: this }, function* () {
      const current = yield* this.getSyncState(request);
      if (current.lastPulledPosition === request.lastPulledPosition && current.blocksToPull === request.blocksToPull) {
        return;
      }
      yield* this.setSyncState(request);
      this.onSyncStateChanged.emit({ spaceId: request.spaceId });
    }).pipe(Effect.withSpan('FeedStore.recordPullProgress'), SpanAttributes.annotateSpace(request.spaceId));

  /**
   * Announces a change to a space's block rows. Positions are part of what `subscribeFeed` serves,
   * so assigning or clearing them is a block change, not only a sync-state change.
   */
  #emitBlocksChanged(spaceId: string, feedNamespace?: string): void {
    this.onNewBlocks.emit({ spaceId, feedNamespace });
    this.onSyncStateChanged.emit({ spaceId });
  }

  /**
   * Creates local blocks with sequential predecessors and appends grouped batches, trimming each
   * batch's feeds by their retention in the same transaction as {@link append} does.
   *
   * Retention trims in insertion order and does not compact: a block superseded by a newer same-id
   * block (a live feed object's `Obj.update`) is reclaimed only when it falls past a limit. A caller
   * that must drain a large trim loops {@link trim} while `more`.
   */
  appendLocal = Effect.fn('Feed.appendLocal')(
    (messages: LocalAppendMessage[]): Effect.Effect<Block[], SqlError.SqlError | CypherError, SqlClient.SqlClient> =>
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
        // Track in-flight sequences per feed, and in-flight heads per branch, to handle multiple messages to same feed.
        const currentSeqs = new Map<FeedKey, { sequence: number; actorId: string }>();
        const branchHeads = new Map<string, { sequence: number; actorId: string } | null>();
        const blocks: Block[] = [];
        const blocksBySpaceNamespace = new Map<string, { spaceId: string; feedNamespace: string; blocks: Block[] }>();

        for (const msg of messages) {
          const key = `${msg.spaceId}|${msg.feedNamespace}|${msg.feedId}`;
          const feedPrivateId = feedPrivateIds.get(key);
          invariant(feedPrivateId !== undefined, 'feed ensured above');

          const inFlight = currentSeqs.get(key);
          const sequence = (inFlight ?? lastSeqs.get(key))?.sequence;
          const nextSequence = (sequence ?? -1) + 1;

          // The predecessor is the fork point of a fork, else the head of the branch the block continues.
          let predecessor: { sequence: number; actorId: string } | null;
          let branch: string | null;
          if (msg.forkAt !== undefined) {
            const forkPoint = FeedProtocol.parseBlockId(msg.forkAt);
            if (forkPoint === undefined) {
              return yield* Effect.die(new Error(`Malformed fork point block id: ${msg.forkAt}`));
            }
            // A fork at a block the store does not hold would have no base, so no walk could reach its ancestors.
            const held = yield* sql<{ insertionId: number }>`
              SELECT insertionId FROM blocks
              WHERE feedPrivateId = ${feedPrivateId}
                AND sequence = ${forkPoint.sequence} AND actorId = ${forkPoint.actorId}
            `;
            if (held.length === 0) {
              return yield* Effect.die(new Error(`Unknown fork point block: ${msg.forkAt}`));
            }
            predecessor = forkPoint;
            branch = FeedProtocol.formatBlockId(this.#options.localActorId, nextSequence);
          } else {
            branch = msg.branch ?? null;
            const headKey = `${key}|${branch ?? ''}`;
            if (!branchHeads.has(headKey)) {
              const rows = yield* sql<{ sequence: number; actorId: string }>`
                SELECT headSequence AS sequence, headActorId AS actorId FROM branches
                WHERE feedPrivateId = ${feedPrivateId} AND branchId = ${branch ?? ROOT_BRANCH_ROW}
              `;
              if (rows.length === 0 && branch !== null) {
                return yield* Effect.die(new Error(`Unknown feed branch: ${branch}`));
              }
              branchHeads.set(headKey, rows[0] ?? null);
            }
            predecessor = branchHeads.get(headKey) ?? null;
          }

          const block: Block = {
            feedId: msg.feedId,
            actorId: this.#options.localActorId,
            sequence: nextSequence,
            prevActorId: predecessor?.actorId ?? null,
            prevSequence: predecessor?.sequence ?? null,
            ...(msg.forkAt !== undefined ? { fork: true } : {}),
            timestamp: Date.now(),
            data: msg.data,
            position: null, // Assigned by append.
          };

          blocks.push(block);

          // Update in-flight tracking.
          const head = { sequence: nextSequence, actorId: this.#options.localActorId };
          currentSeqs.set(key, head);
          branchHeads.set(`${key}|${branch ?? ''}`, head);

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
   * Adopts the positions a position authority reported for blocks this store already holds.
   *
   * The authority's word is final: a block whose local position differs takes the reported one, and
   * any other block occupying that slot is cleared (see {@link AppendResult.displaced}). Refusing
   * either would pin the replica to an ordering the authority no longer has, and a refusal retried
   * verbatim never resolves -- which is how a client wedged behind a server whose storage had been
   * rolled back.
   *
   * @returns How many other blocks were cleared to make room, and how many of the blocks themselves
   * left a different position.
   */
  setPosition = (request: {
    spaceId: string;
    blocks: { feedId: string; feedNamespace: string; actorId: string; sequence: number; position: number }[];
  }): Effect.Effect<{ displaced: number; moved: number }, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen({ self: this }, function* () {
      const sql = yield* SqlClient.SqlClient;
      const result = yield* sql.withTransaction(
        Effect.gen({ self: this }, function* () {
          // A push batch is almost always one feed, so resolve each feed once rather than per block.
          const feedPrivateIds = new Map<string, number>();
          let displaced = 0;
          let moved = 0;
          for (const block of request.blocks) {
            const feedKey = `${block.feedNamespace}|${block.feedId}`;
            const feedPrivateId =
              feedPrivateIds.get(feedKey) ??
              (yield* this.#ensureFeed(request.spaceId, block.feedId, block.feedNamespace));
            feedPrivateIds.set(feedKey, feedPrivateId);
            const evicted = yield* this.#evictSlot(request.spaceId, block.feedNamespace, block.position, {
              ...block,
              feedPrivateId,
            });
            displaced += evicted.displaced;
            moved += evicted.moved;
            yield* sql`
              UPDATE blocks SET position = ${block.position}
              WHERE feedPrivateId = ${feedPrivateId} AND actorId = ${block.actorId} AND sequence = ${block.sequence}
            `;
          }
          return { displaced, moved };
        }),
      );

      if (request.blocks.length > 0) {
        const namespaces = new Set(request.blocks.map((block) => block.feedNamespace));
        this.#emitBlocksChanged(request.spaceId, namespaces.size === 1 ? request.blocks[0].feedNamespace : undefined);
      }
      return result;
    }).pipe(Effect.withSpan('FeedStore.setPosition'));

  //
  // Feed options and retention.
  //

  /**
   * Stores a feed's options, creating its row when the feed has no blocks yet, and trims the feed by
   * them in the same transaction. Options already stored change nothing and trim nothing.
   *
   * Fails with a schema error, storing nothing, when the options are invalid.
   */
  setFeedOptions = (
    request: FeedKey & { options: FeedOptions },
  ): Effect.Effect<
    { changed: boolean; trim: TrimResult },
    SqlError.SqlError | Schema.SchemaError,
    SqlClient.SqlClient
  > =>
    Effect.gen({ self: this }, function* () {
      const sql = yield* SqlClient.SqlClient;
      const json = yield* Schema.encodeEffect(FeedOptionsJson)(request.options);
      const now = yield* Clock.currentTimeMillis;
      const result = yield* sql.withTransaction(
        Effect.gen({ self: this }, function* () {
          const feedPrivateId = yield* this.#ensureFeed(request.spaceId, request.feedId, request.feedNamespace);
          const [row] = yield* sql<{ options: string | null }>`
            SELECT options FROM feeds WHERE feedPrivateId = ${feedPrivateId}
          `;
          if (row?.options === json) {
            return { changed: false, trim: { deleted: 0, more: false } };
          }
          yield* sql`UPDATE feeds SET options = ${json} WHERE feedPrivateId = ${feedPrivateId}`;
          this.#feedOptions.set(feedPrivateId, decodeFeedOptions(json));
          const trim = yield* this.#trimRows([this.#feedRow(request.spaceId, feedPrivateId)], now);
          return { changed: true, trim };
        }),
      );
      if (result.trim.deleted > 0) {
        this.#emitBlocksChanged(request.spaceId, request.feedNamespace);
      }
      return result;
    }).pipe(Effect.withSpan('FeedStore.setFeedOptions'), SpanAttributes.annotateSpace(request.spaceId));

  /**
   * The feed's stored options, or undefined when it has none (the defaults); stored JSON that does
   * not decode reads as none, since a store must keep serving a feed whose options it cannot parse.
   */
  getFeedOptions = (feed: FeedKey): Effect.Effect<FeedOptions | undefined, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const [row] = yield* sql<{ options: string | null }>`
        SELECT options FROM feeds WHERE spaceId = ${feed.spaceId} AND feedId = ${feed.feedId}
      `;
      return decodeFeedOptions(row?.options ?? null);
    }).pipe(Effect.withSpan('FeedStore.getFeedOptions'), SpanAttributes.annotateSpace(feed.spaceId));

  /**
   * Every feed of the space with decodable stored options, keyed by feed id.
   */
  listFeedOptions = (
    spaceId: string,
  ): Effect.Effect<Map<string, FeedOptions>, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql<{ feedId: string; options: string }>`
        SELECT feedId, options FROM feeds WHERE spaceId = ${spaceId} AND options IS NOT NULL
      `;
      const result = new Map<string, FeedOptions>();
      for (const row of rows) {
        const options = decodeFeedOptions(row.options);
        if (options !== undefined) {
          result.set(row.feedId, options);
        }
      }
      return result;
    }).pipe(Effect.withSpan('FeedStore.listFeedOptions'), SpanAttributes.annotateSpace(spaceId));

  /**
   * Spaces holding a feed with stored options, which a host trims at open with {@link trimAll}.
   */
  listSpacesWithOptions = (): Effect.Effect<string[], SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql<{ spaceId: string }>`
        SELECT DISTINCT spaceId FROM feeds WHERE options IS NOT NULL ORDER BY spaceId
      `;
      return rows.map((row) => row.spaceId);
    }).pipe(Effect.withSpan('FeedStore.listSpacesWithOptions'));

  /**
   * The namespace a feed's blocks are stored under, or undefined when the store has no row for it.
   */
  getFeedNamespace = (feed: {
    spaceId: string;
    feedId: string;
  }): Effect.Effect<string | undefined, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const [row] = yield* sql<{ feedNamespace: string | null }>`
        SELECT feedNamespace FROM feeds WHERE spaceId = ${feed.spaceId} AND feedId = ${feed.feedId}
      `;
      return row?.feedNamespace ?? undefined;
    }).pipe(Effect.withSpan('FeedStore.getFeedNamespace'), SpanAttributes.annotateSpace(feed.spaceId));

  /**
   * Deletes, oldest first by insertion id, at most {@link TRIM_LIMIT} blocks of the feed that break
   * its `maxLength` (or the host cap) or `maxAge` at `now`, in one transaction; `more` reports that
   * blocks past a limit remain. Every partial trim is a prefix of the full one, so repeated and
   * concurrent calls converge on the same retained blocks.
   */
  trim = (feed: FeedKey, now: number): Effect.Effect<TrimResult, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen({ self: this }, function* () {
      const sql = yield* SqlClient.SqlClient;
      const result = yield* sql.withTransaction(
        Effect.gen({ self: this }, function* () {
          const rows = yield* sql<FeedRowColumns>`
            SELECT spaceId, feedPrivateId, feedNamespace, options FROM feeds
            WHERE spaceId = ${feed.spaceId} AND feedId = ${feed.feedId}
          `;
          return yield* this.#trimRows(rows.map(toFeedRow), now);
        }),
      );
      if (result.deleted > 0) {
        this.#emitBlocksChanged(feed.spaceId, feed.feedNamespace);
      }
      return result;
    }).pipe(Effect.withSpan('FeedStore.trim'), SpanAttributes.annotateSpace(feed.spaceId));

  /**
   * {@link trim} over every feed of the space that has options or a host cap, sharing one
   * {@link TRIM_LIMIT} budget across them. Run at store open and, on EDGE, from the alarm.
   */
  trimAll = (spaceId: string, now: number): Effect.Effect<TrimResult, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen({ self: this }, function* () {
      const sql = yield* SqlClient.SqlClient;
      const result = yield* sql.withTransaction(
        Effect.gen({ self: this }, function* () {
          const rows = yield* sql<FeedRowColumns>`
            SELECT spaceId, feedPrivateId, feedNamespace, options FROM feeds WHERE spaceId = ${spaceId}
            ORDER BY feedPrivateId ASC
          `;
          return yield* this.#trimRows(rows.map(toFeedRow), now);
        }),
      );
      if (result.deleted > 0) {
        this.#emitBlocksChanged(spaceId);
      }
      return result;
    }).pipe(Effect.withSpan('FeedStore.trimAll'), SpanAttributes.annotateSpace(spaceId));

  /**
   * Blocks retention deleted and not yet cleared, oldest first; `maxId` (-1 when none) is what to pass
   * to {@link clearTrimmed} once the caller has durably acted on them.
   */
  takeTrimmed = (
    opts: { limit?: number } = {},
  ): Effect.Effect<{ maxId: number; blocks: TrimmedBlock[] }, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql<TrimmedBlock & { id: number }>`
        SELECT trimmed_blocks.id, feeds.spaceId, feeds.feedId, feeds.feedNamespace,
          trimmed_blocks.insertionId, trimmed_blocks.position
        FROM trimmed_blocks
        JOIN feeds ON trimmed_blocks.feedPrivateId = feeds.feedPrivateId
        ORDER BY trimmed_blocks.id ASC
        ${opts.limit !== undefined ? sql`LIMIT ${opts.limit}` : sql``}
      `;
      return {
        maxId: rows.at(-1)?.id ?? -1,
        blocks: rows.map(({ id: _id, ...block }) => block),
      };
    }).pipe(Effect.withSpan('FeedStore.takeTrimmed'));

  /**
   * Forgets logged trimmed blocks up to and including `upToId`, as returned by {@link takeTrimmed}.
   */
  clearTrimmed = (upToId: number): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`DELETE FROM trimmed_blocks WHERE id <= ${upToId}`;
    }).pipe(Effect.withSpan('FeedStore.clearTrimmed'));

  /** A feed row from the caches {@link #ensureFeed} filled. */
  #feedRow(spaceId: string, feedPrivateId: number): FeedRow {
    return {
      spaceId,
      feedPrivateId,
      feedNamespace: this.#feedNamespaces.get(feedPrivateId) ?? null,
      options: this.#feedOptions.get(feedPrivateId),
    };
  }

  /**
   * A replica never trims a block it has not pushed: deleting it would lose local data the
   * authority never received.
   */
  get #trimsUnpushed(): boolean {
    return this.#options.assignPositions;
  }

  /** The limits retention enforces on a feed: its own options, with `maxLength` capped by the host. */
  #limits(row: FeedRow): { maxLength?: number; maxAge?: number } {
    const cap = row.feedNamespace != null ? this.#options.maxLengthCap?.(row.feedNamespace) : undefined;
    const own = row.options?.retention?.maxLength;
    const maxLength = own !== undefined && cap !== undefined ? Math.min(own, cap) : (own ?? cap);
    return { maxLength, maxAge: row.options?.retention?.maxAge };
  }

  /**
   * SQL condition dropping blocks past their feed's `maxAge` -- exactly those trim would delete by age
   * -- so reads hide them from the moment they expire rather than from the next trim.
   */
  #notExpired = (
    spaceId: string,
    feedNamespace: string,
  ): Effect.Effect<Statement.Fragment, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen({ self: this }, function* () {
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql<{ feedPrivateId: number; options: string }>`
        SELECT feedPrivateId, options FROM feeds
        WHERE spaceId = ${spaceId} AND feedNamespace = ${feedNamespace} AND options IS NOT NULL
      `;
      const now = yield* Clock.currentTimeMillis;
      const expired = rows.flatMap(({ feedPrivateId, options }) => {
        const maxAge = decodeFeedOptions(options)?.retention?.maxAge;
        return maxAge === undefined
          ? []
          : [sql`(blocks.feedPrivateId = ${feedPrivateId} AND blocks.timestamp < ${now - maxAge})`];
      });
      if (expired.length === 0) {
        return sql``;
      }
      return this.#trimsUnpushed
        ? sql`AND NOT (${sql.or(expired)})`
        : sql`AND NOT ((${sql.or(expired)}) AND blocks.position IS NOT NULL)`;
    });

  /**
   * Trims each feed in turn from one shared {@link TRIM_LIMIT} budget. The caller owns the transaction.
   */
  #trimRows = (
    rows: readonly FeedRow[],
    now: number,
  ): Effect.Effect<TrimResult, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen({ self: this }, function* () {
      let deleted = 0;
      for (const row of rows) {
        const result = yield* this.#trimFeed(row, now, TRIM_LIMIT - deleted);
        deleted += result.deleted;
        if (result.more) {
          return { deleted, more: true };
        }
      }
      return { deleted, more: false };
    });

  /**
   * Deletes at most `budget` of the feed's blocks past a limit, oldest insertion id first, logging each
   * in `trimmed_blocks`. With a budget of 0 it deletes nothing and only reports whether any remain.
   */
  #trimFeed = (
    row: FeedRow,
    now: number,
    budget: number,
  ): Effect.Effect<TrimResult, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen({ self: this }, function* () {
      const sql = yield* SqlClient.SqlClient;
      const { maxLength, maxAge } = this.#limits(row);
      const breaks: Statement.Fragment[] = [];
      if (maxLength !== undefined) {
        const [{ count }] = yield* sql<{ count: number }>`
          SELECT COUNT(*) AS count FROM blocks WHERE feedPrivateId = ${row.feedPrivateId}
        `;
        if (count > maxLength) {
          // The newest block of the excess: it and everything inserted before it break the length.
          const [{ insertionId }] = yield* sql<{ insertionId: number }>`
            SELECT insertionId FROM blocks WHERE feedPrivateId = ${row.feedPrivateId}
            ORDER BY insertionId ASC LIMIT 1 OFFSET ${count - maxLength - 1}
          `;
          breaks.push(sql`blocks.insertionId <= ${insertionId}`);
        }
      }
      if (maxAge !== undefined) {
        breaks.push(sql`blocks.timestamp < ${now - maxAge}`);
      }
      if (breaks.length === 0) {
        return { deleted: 0, more: false };
      }

      // An authority assigns the next position from the highest it holds, so deleting that block would
      // re-issue a position replicas already have; it stays, hidden by age, until a newer one exists.
      const keepHighest =
        this.#options.assignPositions && row.feedNamespace != null
          ? sql`AND (blocks.position IS NULL OR blocks.position < ${yield* this.#maxPosition(row.spaceId, row.feedNamespace)})`
          : sql``;
      const candidates = sql`
        blocks.feedPrivateId = ${row.feedPrivateId} AND (${sql.or(breaks)})
        ${this.#trimsUnpushed ? sql`` : sql`AND blocks.position IS NOT NULL`}
        ${keepHighest}
      `;
      // The first candidate past the budget bounds this call, so a partial trim is a prefix of the full one.
      const [overflow] = yield* sql<{ insertionId: number }>`
        SELECT blocks.insertionId FROM blocks WHERE ${candidates}
        ORDER BY blocks.insertionId ASC LIMIT 1 OFFSET ${budget}
      `;
      if (budget <= 0) {
        return { deleted: 0, more: overflow !== undefined };
      }
      const scope =
        overflow !== undefined ? sql`${candidates} AND blocks.insertionId < ${overflow.insertionId}` : candidates;
      yield* sql`
        INSERT INTO trimmed_blocks (feedPrivateId, insertionId, position)
        SELECT feedPrivateId, insertionId, position FROM blocks WHERE ${scope}
      `;
      const deleted = yield* sql<{ insertionId: number }>`DELETE FROM blocks WHERE ${scope} RETURNING insertionId`;
      return { deleted: deleted.length, more: overflow !== undefined };
    });

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

type FeedRowColumns = { spaceId: string; feedPrivateId: number; feedNamespace: string | null; options: string | null };

const toFeedRow = (row: FeedRowColumns): FeedRow => ({
  spaceId: row.spaceId,
  feedPrivateId: row.feedPrivateId,
  feedNamespace: row.feedNamespace,
  options: decodeFeedOptions(row.options),
});

/** Immutable natural key of a block, bound as AAD so sealed bytes cannot be relocated. */
const blockNaturalKey = (feedId: string, actorId: string, sequence: number) => `${feedId}:${actorId}:${sequence}`;

/** One item for {@link FeedStore.appendLocal}. */
export type LocalAppendMessage = {
  spaceId: string;
  feedId: string;
  feedNamespace: string;
  data: Uint8Array;
} & (
  | {
      /** Makes the block the base of a new branch that forks at this block id. */
      forkAt: string;
      branch?: never;
    }
  | {
      /** The branch the block continues; absent or `null` for the root branch. */
      branch?: string | null;
      forkAt?: never;
    }
);

/** One walk of a feed, for {@link FeedStore.walk}. */
export type WalkRequest = {
  spaceId: string;
  feedNamespace: string;
  feedId: string;
  /**
   * The branch the walk ends on: its id, or `null` for the root branch. Absent is the root branch, or on
   * a backward walk the branch of `after`.
   */
  branch?: string | null;
  /** The block id the walk starts after, excluded. */
  after?: string;
  direction: 'asc' | 'desc';
  /** Also gives the base block of each branch that forks at a walked block, right after that block. */
  forks?: boolean;
};

/** What a walk reads of a row of `branches`. */
type BranchRow = {
  branchId: string;
  baseBranchId: string | null;
  baseInsertionId: number;
  forkInsertionId: number | null;
};

/** The key `branches.branchId` uses for the root branch, which blocks and scopes name `null`. */
const ROOT_BRANCH_ROW = '';

/** What the insert of a block reads of its predecessor. */
type StoredPredecessor = { insertionId: number; branch: string | null };

/**
 * The branch of a block: its own block id when it forks, else the branch of its predecessor. A block
 * with no predecessor, or one the store does not hold, is on the root branch.
 */
const inferBranch = (block: Block, predecessor: StoredPredecessor | undefined): string | null =>
  block.fork === true ? FeedProtocol.formatBlockId(block.actorId, block.sequence) : (predecessor?.branch ?? null);

/** Reads the branch columns of a stored row as the `Block` fields; SQLite returns the flag as 0 or 1. */
const branchFieldsOf = (row: Block): Pick<Block, 'fork' | 'branch'> => ({
  fork: row.fork ? true : undefined,
  branch: row.branch ?? null,
});
