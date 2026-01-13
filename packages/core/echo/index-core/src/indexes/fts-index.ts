//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';

import type { SpaceId } from '@dxos/keys';

import type { Index, IndexerObject } from './interface';
import type { ObjectMeta } from './object-meta-index';

export interface FtsQuery {
  /**
   * Text to search.
   */
  query: string;

  /**
   * Space ID to search within.
   */
  spaceId?: SpaceId;
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

  query({ query, spaceId }: FtsQuery): Effect.Effect<readonly ObjectMeta[], SqlError.SqlError, SqlClient.SqlClient> {
    return Effect.gen(function* () {
      const trimmed = query.trim();
      if (trimmed.length === 0) {
        return [];
      }

      const sql = yield* SqlClient.SqlClient;

      let useLikeFallback = false;

      // Trigram tokenizer requires at least 3 characters per term.
      // Check if ALL terms are at least 3 chars; otherwise use LIKE fallback.
      const terms = trimmed.split(/\s+/).filter(Boolean);
      const minTermLength = Math.min(...terms.map((t) => t.length));
      useLikeFallback = minTermLength < 3;
      const ftsQuery = escapeFts5Query(trimmed);

      const conditions = useLikeFallback
        ? // LIKE fallback - scan the entire table, AND all terms.
          trimmed
            .split(/\s+/)
            .filter(Boolean)
            .map((term) => sql`f.snapshot LIKE ${'%' + term + '%'}`)
        : // MATCH - fast index lookup.
          [sql`f.snapshot MATCH ${ftsQuery}`];

      if (spaceId) {
        conditions.push(sql`m.spaceId = ${spaceId}`);
      }
      return yield* sql<ObjectMeta>`SELECT m.* FROM ftsIndex AS f JOIN objectMeta AS m ON f.rowid = m.recordId WHERE ${sql.and(conditions)}`;
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
                yield* Effect.die(new Error('FtsIndex.update requires recordId to be set'));
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
