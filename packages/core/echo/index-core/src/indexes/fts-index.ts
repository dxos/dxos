//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import type * as Statement from '@effect/sql/Statement';
import * as Effect from 'effect/Effect';

import type { Obj } from '@dxos/echo';
import type { ObjectId, SpaceId } from '@dxos/keys';

import type { Index, IndexerObject } from './interface';
import type { ObjectMeta } from './object-meta-index';

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
   * Queue IDs to search within.
   */
  queueIds: readonly ObjectId[] | null;
}

/**
 * Result of FTS query including the indexed snapshot data.
 */
export interface FtsResult extends ObjectMeta {
  /**
   * The indexed snapshot data (JSON string).
   * Used to load queue objects without going through document loading.
   */
  snapshot: string;
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

export class FtsIndex implements Index {
  migrate = Effect.fn('FtsIndex.migrate')(function* () {
    const sql = yield* SqlClient.SqlClient;

    // https://sqlite.org/fts5.html#the_trigram_tokenizer
    // FTS5 tables are created as virtual tables; they implicitly have a `rowid`.
    // Trigram tokenizer enables substring matching (e.g., "rog" matches "programming").
    //
    // Data structure: inverted index mapping trigrams to document IDs.
    // "hello" → trigrams ["hel", "ell", "llo"] → B-tree entries: "hel"→[1], "ell"→[1], "llo"→[1].
    // Query "ell" → O(log n) B-tree lookup → returns [1].
    // Posting lists are compressed, so index size scales well with document count.
    yield* sql`CREATE VIRTUAL TABLE IF NOT EXISTS ftsIndex USING fts5(snapshot, tokenize='trigram')`;
  });

  query({
    query,
    spaceId,
    includeAllQueues,
    queueIds,
  }: FtsQuery): Effect.Effect<readonly ObjectMeta[], SqlError.SqlError, SqlClient.SqlClient> {
    return Effect.gen(function* () {
      const trimmed = query.trim();
      if (trimmed.length === 0) {
        return [];
      }

      const sql = yield* SqlClient.SqlClient;

      // Trigram tokenizer requires at least 3 characters per term.
      // Check if ALL terms are at least 3 chars; otherwise use LIKE fallback.
      const terms = trimmed.split(/\s+/).filter(Boolean);
      const minTermLength = Math.min(...terms.map((t) => t.length));

      const conditions =
        minTermLength < 3
          ? // LIKE fallback - scan the entire table, AND all terms.
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

      if (queueIds && queueIds.length > 0) {
        // Items from specific queues.
        sourceConditions.push(sql`m.queueId IN ${sql.in(queueIds)}`);
      }

      if (sourceConditions.length > 0) {
        conditions.push(sql`(${sql.or(sourceConditions)})`);
      }

      return yield* sql<ObjectMeta>`SELECT m.* FROM ftsIndex AS f JOIN objectMeta AS m ON f.rowid = m.recordId WHERE ${sql.and(conditions)}`;
    });
  }

  /**
   * Query snapshots by recordIds.
   * Returns the parsed JSON snapshots for queue objects.
   */
  querySnapshotsJSON(
    recordIds: number[],
  ): Effect.Effect<readonly { recordId: number; snapshot: Obj.JSON }[], SqlError.SqlError, SqlClient.SqlClient> {
    return Effect.gen(function* () {
      if (recordIds.length === 0) {
        return [];
      }
      const sql = yield* SqlClient.SqlClient;
      const results = yield* sql<{
        rowid: number;
        snapshot: string;
      }>`SELECT rowid, snapshot FROM ftsIndex WHERE rowid IN ${sql.in(recordIds)}`;
      return results.map((r) => ({
        recordId: r.rowid,
        snapshot: JSON.parse(r.snapshot),
      }));
    });
  }

  update = Effect.fn('FtsIndex.update')(
    (objects: IndexerObject[]): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;

        yield* Effect.forEach(
          objects,
          (object) =>
            Effect.gen(function* () {
              const { recordId, data } = object;
              if (recordId === null) {
                return yield* Effect.die(new Error('FtsIndex.update requires recordId to be set'));
              }

              const snapshot = JSON.stringify(data);

              // FTS5 doesn't support UPDATE, need DELETE + INSERT for upsert.
              const existing = yield* sql<{ rowid: number }>`SELECT rowid FROM ftsIndex WHERE rowid = ${recordId}`;
              if (existing.length > 0) {
                yield* sql`DELETE FROM ftsIndex WHERE rowid = ${recordId}`;
              }

              yield* sql`INSERT INTO ftsIndex (rowid, snapshot) VALUES (${recordId}, ${snapshot})`;
            }),
          { discard: true },
        );
      }),
  );
}
