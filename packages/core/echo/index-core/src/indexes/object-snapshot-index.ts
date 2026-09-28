//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Migrator from 'effect/unstable/sql/Migrator';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import type { Obj } from '@dxos/echo';
import { ATTR_META, ATTR_TYPE } from '@dxos/echo/internal';

import { MIGRATIONS, MIGRATIONS_TABLE } from '../migrations/object-snapshot/index.ts';
import { chunkArray, chunkRows } from '../utils.ts';
import type { Index, IndexerObject } from './interface.ts';

/** An object as the snapshot store holds it, with what a reader needs to rebuild its document. */
export type DocumentObjectRow = {
  readonly documentId: string;
  readonly objectId: string;
  /** Null while the store has not caught up with the object. */
  readonly snapshot: Obj.JSON | null;
  /** Heads of the document when the object was read; null for rows written before they were kept. */
  readonly heads: readonly string[] | null;
  /** The document's `access` and the object's stored fields other than `data`; null when not kept. */
  readonly stored: unknown;
};

/**
 * The JSON of every indexed object, keyed by its `objectMeta` record id.
 *
 * This is the row store: every query that reads object data reads it here, so it is written on the
 * indexing pass itself and is never behind the data source. The full-text index is a second step
 * over it (see {@link FtsIndex}), which is what lets that expensive rebuild lag without a reader
 * observing a stale row.
 */
export class ObjectSnapshotIndex implements Index {
  readonly #sql: SqlClient.SqlClient;

  constructor(sql: SqlClient.SqlClient) {
    this.#sql = sql;
  }

  /**
   * Applies any migrations this database has not recorded yet.
   */
  migrate = Effect.fn('ObjectSnapshotIndex.migrate')(() =>
    Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
      // A malformed bundled manifest is a defect, not something a caller can recover from.
      Effect.catchTag('MigrationError', (error) => Effect.die(error)),
      Effect.asVoid,
      Effect.provideService(SqlClient.SqlClient, this.#sql),
    ),
  );

  /**
   * Query snapshots by recordIds.
   * Returns the parsed JSON snapshots for queue objects.
   * RecordIds not present in the store are silently omitted from the result.
   */
  querySnapshotsJSON(
    recordIds: number[],
  ): Effect.Effect<readonly { recordId: number; snapshot: Obj.JSON }[], SqlError.SqlError> {
    return Effect.gen({ self: this }, function* () {
      if (recordIds.length === 0) {
        return [];
      }
      const sql = this.#sql;

      const results: { recordId: number; snapshot: Obj.JSON }[] = [];
      for (const chunk of chunkArray(recordIds)) {
        const rows = yield* sql<{
          recordId: number;
          snapshot: string;
        }>`SELECT recordId, snapshot FROM objectSnapshot WHERE recordId IN ${sql.in(chunk)}`;
        for (const row of rows) {
          results.push({ recordId: row.recordId, snapshot: JSON.parse(row.snapshot) });
        }
      }

      return results;
    });
  }

  /**
   * How many indexed objects have no snapshot yet. Non-zero only while the store is filling after
   * its introduction; a reader that cannot tolerate a partial store waits for this to reach zero.
   */
  countMissingSnapshots(): Effect.Effect<number, SqlError.SqlError, SqlClient.SqlClient> {
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const [row] = yield* sql<{ missing: number }>`
        SELECT COUNT(*) AS missing FROM objectMeta m LEFT JOIN objectSnapshot s ON s.recordId = m.recordId
        WHERE s.recordId IS NULL`;
      return row?.missing ?? 0;
    });
  }

  /** The objects stored in the given documents, read without loading the documents. */
  queryDocumentObjects = Effect.fn('ObjectSnapshotIndex.queryDocumentObjects')(
    (documentIds: readonly string[]): Effect.Effect<readonly DocumentObjectRow[], SqlError.SqlError> =>
      Effect.gen({ self: this }, function* () {
        const sql = this.#sql;
        const results: DocumentObjectRow[] = [];
        for (const chunk of chunkArray([...new Set(documentIds)])) {
          const rows = yield* sql<{
            documentId: string;
            objectId: string;
            snapshot: string | null;
            heads: string | null;
            stored: string | null;
          }>`
            SELECT m.documentId, m.objectId, s.snapshot, s.heads, s.stored
            FROM objectMeta AS m
            LEFT JOIN objectSnapshot AS s ON s.recordId = m.recordId
            WHERE ${sql.in('m.documentId', chunk)} AND m.queueId = ''
          `;
          for (const row of rows) {
            results.push({
              documentId: row.documentId,
              objectId: row.objectId,
              snapshot: row.snapshot === null ? null : JSON.parse(row.snapshot),
              heads: row.heads === null ? null : JSON.parse(row.heads),
              stored: row.stored === null ? null : JSON.parse(row.stored),
            });
          }
        }
        return results;
      }),
  );

  /** Delete snapshot rows by record id. Used by garbage collection. */
  deleteByRecordIds = Effect.fn('ObjectSnapshotIndex.deleteByRecordIds')(
    (recordIds: readonly number[]): Effect.Effect<void, SqlError.SqlError> =>
      Effect.gen({ self: this }, function* () {
        const sql = this.#sql;
        for (const chunk of chunkArray(recordIds)) {
          yield* sql`DELETE FROM objectSnapshot WHERE recordId IN ${sql.in(chunk)}`;
        }
      }),
  );

  update = Effect.fn('ObjectSnapshotIndex.update')((objects: IndexerObject[]): Effect.Effect<void, SqlError.SqlError> =>
    Effect.gen({ self: this }, function* () {
      if (objects.length === 0) {
        return;
      }
      const sql = this.#sql;

      const pending: { recordId: number; object: IndexerObject }[] = [];
      for (const object of objects) {
        if (object.recordId === null) {
          return yield* Effect.die(new Error('ObjectSnapshotIndex.update requires recordId to be set'));
        }
        pending.push({ recordId: object.recordId, object });
      }

      // A partial block carries no `@type`/body — notably the `{ id, '@deleted': true }` tombstone
      // appended by `Feed.remove`. Feed blocks are stored wholesale, so such a block is merged onto
      // the prior snapshot below to retain the body and type while layering the new marker;
      // otherwise the upsert would replace the full snapshot with the bare partial and the client
      // could not hydrate the deleted object (`Obj.fromJSON` needs `@type` to decode). Only those
      // blocks need the prior row, so the common case reads nothing at all.
      // TODO(wittjosiah): Generalise to field-level LWW once partial-update blocks exist
      // (see `EchoFeedCodec.encode` and `EntityMetaIndex.update`).
      const isPartialBlock = ({ object }: { object: IndexerObject }) =>
        (object.data as Record<string, unknown>)[ATTR_TYPE] === undefined;
      const partial = pending.filter(isPartialBlock).map(({ recordId }) => recordId);
      const prior = new Map<number, string>();
      for (const chunk of chunkArray(partial)) {
        const rows = yield* sql<{
          recordId: number;
          snapshot: string;
        }>`SELECT recordId, snapshot FROM objectSnapshot WHERE recordId IN ${sql.in(chunk)}`;
        for (const row of rows) {
          prior.set(row.recordId, row.snapshot);
        }
      }

      const rows = pending.map(({ recordId, object }) => {
        const existing = prior.get(recordId);
        const merged =
          isPartialBlock({ object }) && existing !== undefined
            ? { ...(JSON.parse(existing) as Record<string, unknown>), ...object.data }
            : object.data;
        // Document objects carry `@meta` only so the entity-meta index can extract the
        // convergence key, and this store is what the full-text index is built from — so
        // keeping it would let a search match on foreign keys and identity strings the
        // visible content never contains. Queue blocks always carried meta in their snapshot
        // (clients hydrate from it), so theirs stays.
        const stored = object.documentId
          ? Object.fromEntries(Object.entries(merged).filter(([key]) => key !== ATTR_META))
          : merged;
        const copy = object.documentCopy;
        return {
          recordId,
          snapshot: JSON.stringify(stored),
          heads: copy ? JSON.stringify(copy.heads) : null,
          stored: copy?.stored === undefined ? null : JSON.stringify(copy.stored),
        };
      });

      for (const chunk of chunkRows(rows)) {
        yield* sql`
            INSERT INTO objectSnapshot ${sql.insert(chunk)}
            ON CONFLICT (recordId) DO UPDATE SET
              snapshot = excluded.snapshot, heads = excluded.heads, stored = excluded.stored
          `;
      }
    }),
  );
}
