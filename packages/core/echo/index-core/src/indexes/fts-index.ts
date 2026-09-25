//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Migrator from 'effect/unstable/sql/Migrator';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';
import type * as Statement from 'effect/unstable/sql/Statement';

import type { SpaceId } from '@dxos/keys';

import { MIGRATIONS, MIGRATIONS_TABLE } from '../migrations/fts/index.ts';
import { chunkArray, chunkRows } from '../utils.ts';
import { type EntityMeta, type QueueRef, buildTypeDxnCondition } from './entity-meta-index.ts';
import { type Index, type IndexerObject } from './interface.ts';
import { extractIndexableText } from './text-extractor.ts';

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
 * A secondary index: `IndexEngine` feeds it from {@link IndexedObjectSource} rather than from
 * automerge or a feed, which is what makes re-tokenization deferrable — and cheap under a burst,
 * since 300 edits move one object's counter 300 times and are caught up in a single pass.
 *
 * Deferring it matters because re-tokenizing is what made editing expensive: FTS5 cannot update a
 * row in place and a trigram tokenizer emits one token per 3-character window, so one changed
 * property rewrote hundreds of kilobytes. Only search reads this table — every read of object data
 * goes to the snapshot store, which is never behind. A caller that needs its own write matched
 * drains first, via `Database.flush({ secondaryIndexes: true })`.
 *
 * The indexed column holds the object's extracted text, not its JSON (see
 * {@link extractIndexableText}), so property names are not searchable.
 */
export class FtsIndex implements Index {
  readonly #sql: SqlClient.SqlClient;

  constructor(sql: SqlClient.SqlClient) {
    this.#sql = sql;
  }

  /**
   * Applies any migrations this database has not recorded yet.
   */
  migrate = Effect.fn('FtsIndex.migrate')(() =>
    Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
      // A malformed bundled manifest is a defect, not something a caller can recover from.
      Effect.catchTag('MigrationError', (error) => Effect.die(error)),
      Effect.asVoid,
      Effect.provideService(SqlClient.SqlClient, this.#sql),
    ),
  );

  query({
    query,
    spaceId,
    includeAllQueues,
    queues,
    typeDxns,
  }: FtsQuery): Effect.Effect<readonly FtsQueryResult[], SqlError.SqlError> {
    return Effect.gen({ self: this }, function* () {
      const trimmed = query.trim();
      if (trimmed.length === 0) {
        return [];
      }

      // An explicit empty type scope admits no type, so no row can match.
      if (typeDxns && typeDxns.length === 0) {
        return [];
      }

      const sql = this.#sql;

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
          ? // LIKE fallback - scan the index text column, AND all terms.
            terms.map((term) => sql`f.text LIKE ${'%' + term + '%'}`)
          : // MATCH - fast index lookup.
            [sql`f.text MATCH ${escapeFts5Query(trimmed)}`];

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

      // `typeDXN` is unambiguous in the join: the FTS virtual table only exposes `text`.
      if (typeDxns && typeDxns.length > 0) {
        conditions.push(sql`(${buildTypeDxnCondition(sql, typeDxns)})`);
      }

      if (useBm25) {
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
        // LIKE fallback - no ranking available, default to 1. A term below the trigram minimum
        // has no tokens to match, so this scans the stored text of every row instead.
        const rows = yield* sql<EntityMeta>`
          SELECT m.* 
          FROM ftsIndex AS f 
          JOIN objectMeta AS m ON f.rowid = m.recordId 
          WHERE ${sql.and(conditions)}
        `;
        return rows.map((row) => ({ ...row, rank: 1 }));
      }
    });
  }

  /** Delete index rows by record id. Used by garbage collection. */
  deleteByRecordIds = Effect.fn('FtsIndex.deleteByRecordIds')(
    (recordIds: readonly number[]): Effect.Effect<void, SqlError.SqlError> =>
      Effect.gen({ self: this }, function* () {
        const sql = this.#sql;
        for (const chunk of chunkArray(recordIds)) {
          yield* sql`DELETE FROM ftsIndex WHERE rowid IN ${sql.in(chunk)}`;
        }
      }),
  );

  /**
   * Re-tokenizes the given objects, whose text this reads from {@link IndexerObject.data} rather
   * than from the snapshot store so that one pass writes one index. Only the text
   * {@link extractIndexableText} pulls out of the object is stored — never its property names.
   */
  update = Effect.fn('FtsIndex.update')((objects: IndexerObject[]): Effect.Effect<void, SqlError.SqlError> =>
    Effect.gen({ self: this }, function* () {
      if (objects.length === 0) {
        return;
      }
      const sql = this.#sql;

      const rows: { rowid: number; text: string }[] = [];
      for (const object of objects) {
        if (object.recordId === null) {
          return yield* Effect.die(new Error('FtsIndex.update requires recordId to be set'));
        }
        rows.push({ rowid: object.recordId, text: extractIndexableText(object.data) });
      }

      // FTS5 has no UPDATE; an upsert is a delete followed by an insert.
      for (const chunk of chunkArray(rows.map((row) => row.rowid))) {
        yield* sql`DELETE FROM ftsIndex WHERE rowid IN ${sql.in(chunk)}`;
      }
      for (const chunk of chunkRows(rows)) {
        yield* sql`INSERT INTO ftsIndex ${sql.insert(chunk)}`;
      }
    }),
  );
}

/**
 * The `WHERE` fragment matching `ftsIndex f` against free text, and whether BM25 ranking applies.
 * Terms shorter than the trigram tokenizer's three characters fall back to `LIKE`, which cannot
 * rank. `undefined` when the text has no terms. Mirrors the conditions {@link FtsIndex.query}
 * builds, so the compiled and in-memory executors match the same rows.
 */
export const buildFtsCondition = (
  sql: SqlClient.SqlClient,
  text: string,
): { condition: Statement.Fragment; ranked: boolean } | undefined => {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  const terms = trimmed.split(/\s+/).filter(Boolean);
  const minTermLength = Math.min(...terms.map((term) => term.length));
  if (minTermLength < 3) {
    return { condition: sql.and(terms.map((term) => sql`f.text LIKE ${'%' + term + '%'}`)), ranked: false };
  }
  return { condition: sql`f.text MATCH ${escapeFts5Query(trimmed)}`, ranked: true };
};
