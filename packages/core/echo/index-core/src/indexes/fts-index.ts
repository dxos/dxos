//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Migrator from 'effect/unstable/sql/Migrator';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';
import type * as Statement from 'effect/unstable/sql/Statement';

import type { SpaceId } from '@dxos/keys';

import { IndexTracker } from '../index-tracker.ts';
import { MIGRATIONS, MIGRATIONS_TABLE } from '../migrations/fts/index.ts';
import { SQL_CHUNK_SIZE, chunkArray } from '../utils.ts';
import { type EntityMeta, type QueueRef, buildTypeDxnCondition } from './entity-meta-index.ts';

/**
 * Cursor identity of the full-text step. `index` rather than `automerge`/`queue` because this step
 * reads the index itself; the generation suffix retires the name the index used while it was fed
 * from a data source (see `migrations/tracker/0004_retire_fts_cursor.sql`).
 */
const FTS_INDEX_NAME = 'fts7';
const FTS_SOURCE_NAME = 'index';

/**
 * The space and queue constrains are combined together using a logical OR.
 */
export interface FtsQuery {
  /**
   * Text to search.
   */
  query: string;

  /**
   * Space ID to search within.
   */
  spaceId: readonly SpaceId[] | null;

  /**
   * If true, include all queues in the spaces specified by `spaceId`.
   */
  includeAllQueues: boolean;

  /**
   * Queues to search within, each scoped by the space owning it — a queue id is unique only
   * within its own space. A ref without a `spaceId` matches on the id alone.
   */
  queues: readonly QueueRef[] | null;

  /**
   * Type identifiers to restrict matches to (any form accepted by the meta index — typename
   * DXN or stored-schema EID). Null or undefined disables type scoping; an empty list matches
   * nothing.
   */
  typeDxns?: readonly string[] | null;
}

/**
 * Result of FTS query including the indexed snapshot data.
 */
export interface FtsResult extends EntityMeta {
  /**
   * The indexed snapshot data (JSON string).
   * Used to load queue objects without going through document loading.
   */
  snapshot: string;
}

/**
 * Result of FTS query with rank.
 */
export interface FtsQueryResult extends EntityMeta {
  /**
   * Relevance rank from FTS5.
   * Higher values indicate better matches.
   * Uses BM25 algorithm when available, falls back to 1 for non-BM25 queries.
   */
  rank: number;
}

/**
 * Escapes user input for safe FTS5 queries.
 *
 * FTS5 has special syntax characters that can cause errors or unexpected behavior:
 * - `*` suffix for prefix matching (e.g., `prog*` matches "program", "programming")
 * - `"..."` for phrase queries
 * - `.` for column specification
 * - `AND`, `OR`, `NOT` boolean operators
 * - `+`, `-` for required/excluded terms
 *
 * This function wraps each whitespace-separated term in double quotes, treating all
 * characters as literals. Double quotes within terms are escaped by doubling (`""`).
 *
 * Example: `prog* AND test.` becomes `"prog*" "AND" "test."`.
 */
const escapeFts5Query = (text: string): string => {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `"${term.replace(/"/g, '""')}"`)
    .join(' ');
};

/**
 * Trigram full-text index over {@link ObjectSnapshotIndex}.
 *
 * The second step of indexing: its source is the index itself rather than automerge or a feed, so
 * it tracks `objectMeta.version` — the monotonic counter stamped on every object the first step
 * writes — as an ordinary cursor in `indexCursor`. That is what makes re-tokenization deferrable,
 * and it is why re-tokenizing is cheap under a burst: 300 edits move one object's counter 300
 * times and are caught up in one rebuild.
 *
 * Deferring it matters because re-tokenizing is what made editing expensive — FTS5 cannot update a
 * row in place and a trigram tokenizer emits one token per 3-character window, so one changed
 * property rewrote hundreds of kilobytes. Nothing but `MATCH` reads this table, and matching calls
 * {@link flushPending} first, so a search never sees a stale index.
 */
export class FtsIndex {
  readonly #tracker: IndexTracker;

  /**
   * @param tracker Owner of `indexCursor`; the default is equivalent, since it holds no state of
   * its own.
   */
  constructor(tracker: IndexTracker = new IndexTracker()) {
    this.#tracker = tracker;
  }

  /**
   * Applies any migrations this database has not recorded yet.
   */
  migrate = Effect.fn('FtsIndex.migrate')(() =>
    Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
      // A malformed bundled manifest is a defect, not something a caller can recover from.
      Effect.catchTag('MigrationError', (error) => Effect.die(error)),
      Effect.asVoid,
    ),
  );

  query({
    query,
    spaceId,
    includeAllQueues,
    queues,
    typeDxns,
  }: FtsQuery): Effect.Effect<readonly FtsQueryResult[], SqlError.SqlError, SqlClient.SqlClient> {
    return Effect.gen({ self: this }, function* () {
      const trimmed = query.trim();
      if (trimmed.length === 0) {
        return [];
      }

      // An explicit empty type scope admits no type, so no row can match.
      if (typeDxns && typeDxns.length === 0) {
        return [];
      }

      const sql = yield* SqlClient.SqlClient;

      // Trigram tokenizer requires at least 3 characters per term.
      // Check if ALL terms are at least 3 chars; otherwise use LIKE fallback.
      const terms = trimmed.split(/\s+/).filter(Boolean);
      const minTermLength = Math.min(...terms.map((t) => t.length));

      // Use BM25 ranking for FTS5 MATCH queries, fall back to rank 1 for LIKE queries.
      // BM25 returns negative values where lower (more negative) means better match,
      // so we negate it to get higher = better.
      const useBm25 = minTermLength >= 3;

      const conditions =
        minTermLength < 3
          ? // LIKE fallback - scan the entire snapshot store, AND all terms.
            terms.map((term) => sql`f.snapshot LIKE ${'%' + term + '%'}`)
          : // MATCH - fast index lookup.
            [sql`f.snapshot MATCH ${escapeFts5Query(trimmed)}`];

      // Space and queue constraints are combined with OR.
      const sourceConditions: Statement.Statement<{}>[] = [];

      if (spaceId && spaceId.length > 0) {
        if (includeAllQueues) {
          // All items from these spaces (both space objects and queue objects).
          sourceConditions.push(sql`m.spaceId IN ${sql.in(spaceId)}`);
        } else {
          // Only space objects (not queue objects) from these spaces.
          sourceConditions.push(sql`(m.spaceId IN ${sql.in(spaceId)} AND m.queueId = '')`);
        }
      }

      if (queues && queues.length > 0) {
        // Items from specific queues, each scoped by its own space: a queue id is unique only
        // within one, so matching on the id alone would admit another space's rows.
        sourceConditions.push(
          sql`(${sql.or(
            queues.map((queue) =>
              queue.spaceId !== undefined
                ? sql`(m.spaceId = ${queue.spaceId} AND m.queueId = ${queue.queueId})`
                : sql`m.queueId = ${queue.queueId}`,
            ),
          )})`,
        );
      }

      if (sourceConditions.length > 0) {
        conditions.push(sql`(${sql.or(sourceConditions)})`);
      }

      // `typeDXN` is unambiguous in the join: the FTS virtual table only exposes `snapshot`.
      if (typeDxns && typeDxns.length > 0) {
        conditions.push(sql`(${buildTypeDxnCondition(sql, typeDxns)})`);
      }

      if (useBm25) {
        // Matching is the one read that goes to the index rather than the snapshot store, so it is
        // also the one that has to wait for the deferred re-tokenization.
        yield* this.flushPending();

        // Use BM25 ranking for FTS5 MATCH queries.
        // BM25 returns negative values, negate to get higher = better match.
        // Order by rank descending so best matches come first.
        // Note: bm25() requires the actual table name, not an alias.
        const rows = yield* sql<EntityMeta & { rank: number }>`
          SELECT m.*, -bm25(ftsIndex) AS rank 
          FROM ftsIndex AS f 
          JOIN objectMeta AS m ON f.rowid = m.recordId 
          WHERE ${sql.and(conditions)}
          ORDER BY rank DESC
        `;
        return rows;
      } else {
        // LIKE fallback - no ranking available, default to 1. Scans the snapshot store directly,
        // so a term below the trigram minimum matches writes the index has not caught up with.
        const rows = yield* sql<EntityMeta>`
          SELECT m.* 
          FROM objectSnapshot AS f 
          JOIN objectMeta AS m ON f.recordId = m.recordId 
          WHERE ${sql.and(conditions)}
        `;
        return rows.map((row) => ({ ...row, rank: 1 }));
      }
    });
  }

  /** Delete index rows by record id. Used by garbage collection. */
  deleteByRecordIds = Effect.fn('FtsIndex.deleteByRecordIds')(
    (recordIds: readonly number[]): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        for (const chunk of chunkArray(recordIds)) {
          yield* sql`DELETE FROM ftsIndex WHERE rowid IN ${sql.in(chunk)}`;
        }
      }),
  );

  /** Counter of the last object this step re-tokenized; 0 before it has ever run. */
  #readCursor(): Effect.Effect<number, SqlError.SqlError, SqlClient.SqlClient> {
    return Effect.gen({ self: this }, function* () {
      const cursors = yield* this.#tracker.queryCursors({
        indexName: FTS_INDEX_NAME,
        sourceName: FTS_SOURCE_NAME,
      });
      const cursor = cursors[0]?.cursor;
      return typeof cursor === 'number' ? cursor : 0;
    });
  }

  /**
   * Re-tokenizes every object indexed since this step last ran.
   *
   * Draining in chunks keeps one transaction proportional to the batch rather than to the backlog,
   * and advancing the cursor in the same transaction as the index write is what lets an interrupted
   * flush resume instead of losing the record. A record with no snapshot row contributes nothing
   * here, which is the intended no-op: writing one stamps a fresh counter, so it comes back.
   *
   * @returns Number of records re-indexed.
   */
  flushPending = Effect.fn('FtsIndex.flushPending')((): Effect.Effect<number, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen({ self: this }, function* () {
      const sql = yield* SqlClient.SqlClient;
      let cursor = yield* this.#readCursor();
      let flushed = 0;

      for (;;) {
        const pending = yield* sql<{ recordId: number; version: number }>`
          SELECT recordId, version FROM objectMeta WHERE version > ${cursor} ORDER BY version LIMIT ${SQL_CHUNK_SIZE}
        `;
        if (pending.length === 0) {
          return flushed;
        }

        const recordIds = pending.map((row) => row.recordId);
        const advanced = pending[pending.length - 1].version;
        yield* sql.withTransaction(
          Effect.gen({ self: this }, function* () {
            // FTS5 has no UPDATE; an upsert is a delete followed by an insert.
            yield* sql`DELETE FROM ftsIndex WHERE rowid IN ${sql.in(recordIds)}`;
            yield* sql`
              INSERT INTO ftsIndex (rowid, snapshot)
              SELECT recordId, snapshot FROM objectSnapshot WHERE recordId IN ${sql.in(recordIds)}
            `;
            yield* this.#tracker.updateCursors([
              {
                indexName: FTS_INDEX_NAME,
                spaceId: null,
                sourceName: FTS_SOURCE_NAME,
                resourceId: null,
                cursor: advanced,
              },
            ]);
          }),
        );
        cursor = advanced;
        flushed += recordIds.length;
      }
    }),
  );

  /** Records indexed since this step last ran. */
  pendingCount = Effect.fn('FtsIndex.pendingCount')((): Effect.Effect<number, SqlError.SqlError, SqlClient.SqlClient> =>
    Effect.gen({ self: this }, function* () {
      const sql = yield* SqlClient.SqlClient;
      const cursor = yield* this.#readCursor();
      const rows = yield* sql<{ count: number }>`SELECT COUNT(*) AS count FROM objectMeta WHERE version > ${cursor}`;
      return rows[0]?.count ?? 0;
    }),
  );
}
