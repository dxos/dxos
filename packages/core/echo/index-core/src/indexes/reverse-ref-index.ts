//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Migrator from 'effect/sql/Migrator';
import * as SqlClient from 'effect/sql/SqlClient';
import type * as SqlError from 'effect/sql/SqlError';

import { EncodedReference, EscapedPropPath, isEncodedReference, referenceIndexKey } from '@dxos/echo-protocol';
import { ATTR_META } from '@dxos/echo/internal';
import { type EntityId, type SpaceId, URI } from '@dxos/keys';

import { MIGRATIONS, MIGRATIONS_TABLE } from '../migrations/reverse-ref/index.ts';
import { type EntityPropPath, chunkArray, chunkRows, normalizePropPath } from '../utils.ts';
import type { Index, IndexerObject } from './interface.ts';

/**
 * Extracts all outgoing references from an object's data.
 */
const extractReferences = (data: Record<string, unknown>): { path: string[]; targetDXN: URI.URI }[] => {
  const refs: { path: string[]; targetDXN: URI.URI }[] = [];
  const visit = (path: string[], value: unknown) => {
    if (isEncodedReference(value)) {
      const targetDXN = referenceIndexKey(EncodedReference.toURI(value));
      if (targetDXN === undefined) {
        return;
      }
      refs.push({ path, targetDXN });
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      for (const [key, v] of Object.entries(value)) {
        visit([...path, key], v);
      }
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        visit([...path, String(i)], value[i]);
      }
    }
  };
  visit([], data);
  return refs;
};

export const ReverseRef = Schema.Struct({
  recordId: Schema.Number,
  targetDXN: URI.Schema,
  /**
   * Escaped property path within an object.
   *
   * Escaping rules:
   *
   * - '.' -> '\.'
   * - '\' -> '\\'
   * - contact with .
   */
  propPath: Schema.String,
});
export interface ReverseRef extends Schema.Schema.Type<typeof ReverseRef> {}

export interface ReverseRefQuery {
  targetDXN: URI.URI;
  // TODO: Add prop filter
}

/**
 * One object holding references to a target, joined to the object metadata for its document.
 * `propPaths` are the unescaped property paths within the referrer's data that the index
 * recorded as pointing at the target.
 */
export type Referrer = {
  objectId: EntityId;
  documentId: string;
  propPaths: EntityPropPath[];
};

/**
 * Indexes reverse references - tracks which objects reference which targets.
 * Only indexes references, not relations.
 */
export class ReverseRefIndex implements Index {
  readonly #sql: SqlClient.SqlClient;

  constructor(sql: SqlClient.SqlClient) {
    this.#sql = sql;
  }

  /**
   * Applies any migrations this database has not recorded yet.
   */
  migrate = Effect.fn('ReverseRefIndex.migrate')(() =>
    Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
      // A malformed bundled manifest is a defect, not something a caller can recover from.
      Effect.catchTag('MigrationError', (error) => Effect.die(error)),
      Effect.asVoid,
      Effect.provideService(SqlClient.SqlClient, this.#sql),
    ),
  );

  /**
   * Query all references pointing to a target DXN.
   */
  query = Effect.fn('ReverseRefIndex.query')(
    ({ targetDXN }: ReverseRefQuery): Effect.Effect<readonly ReverseRef[], SqlError.SqlError> =>
      Effect.gen({ self: this }, function* () {
        const sql = this.#sql;
        const normalized = referenceIndexKey(targetDXN);
        if (normalized === undefined) {
          return [];
        }
        // TODO(mykola): Join objectMeta table here.
        const rows = yield* sql`SELECT * FROM reverseRef WHERE targetDXN = ${normalized}`;
        return rows as ReverseRef[];
      }),
  );

  /**
   * Referrers of one target in one space, joined to the object metadata for the referrer's
   * document — the point lookup behind merge reference rewriting. Queue entities carry no
   * document to rewrite and rows from other spaces are not this space's to repoint, so both
   * are excluded in SQL.
   */
  queryReferrers = Effect.fn('ReverseRefIndex.queryReferrers')(
    ({
      spaceId,
      targetDXN,
    }: {
      spaceId: SpaceId;
      targetDXN: URI.URI;
    }): Effect.Effect<readonly Referrer[], SqlError.SqlError> =>
      Effect.gen({ self: this }, function* () {
        const sql = this.#sql;
        const normalized = referenceIndexKey(targetDXN);
        if (normalized === undefined) {
          return [];
        }
        const rows = yield* sql<{ objectId: EntityId; documentId: string; propPath: string }>`
          SELECT om.objectId, om.documentId, rr.propPath
          FROM reverseRef rr JOIN objectMeta om ON om.recordId = rr.recordId
          WHERE rr.targetDXN = ${normalized} AND om.spaceId = ${spaceId} AND om.documentId != ''`;
        const byReferrer = new Map<string, Referrer>();
        for (const row of rows) {
          // Object ids are unique within a space, but the row's document is the one the index saw.
          const key = `${row.documentId}/${row.objectId}`;
          const referrer = byReferrer.get(key) ?? { objectId: row.objectId, documentId: row.documentId, propPaths: [] };
          referrer.propPaths.push(EscapedPropPath.unescape(row.propPath));
          byReferrer.set(key, referrer);
        }
        return [...byReferrer.values()];
      }),
  );

  /** Delete reverse-reference rows by record id. Used by garbage collection. */
  deleteByRecordIds = Effect.fn('ReverseRefIndex.deleteByRecordIds')(
    (recordIds: readonly number[]): Effect.Effect<void, SqlError.SqlError> =>
      Effect.gen({ self: this }, function* () {
        const sql = this.#sql;
        for (const chunk of chunkArray(recordIds)) {
          yield* sql`DELETE FROM reverseRef WHERE ${sql.in('recordId', chunk)}`;
        }
      }),
  );

  update = Effect.fn('ReverseRefIndex.update')((objects: IndexerObject[]): Effect.Effect<void, SqlError.SqlError> =>
    Effect.gen({ self: this }, function* () {
      const sql = this.#sql;

      type Row = { recordId: number; targetDXN: string; propPath: string; propPathNormalized: string };
      // By record, so a record written twice in one batch keeps only its last references, as before.
      const rowsByRecord = new Map<number, Row[]>();
      for (const object of objects) {
        const { recordId, data } = object;
        if (recordId === null) {
          return yield* Effect.die(new Error('ReverseRefIndex.update requires recordId to be set'));
        }
        const rows: Row[] = [];
        rowsByRecord.set(recordId, rows);

        // Document objects carry `@meta` only so the entity-meta index can extract the
        // convergence key — indexing `meta.tags` here would make `Query.incoming()` on a Tag
        // return everything merely tagged with it. Queue blocks always carried meta, so
        // their extraction is unchanged.
        const extractable = object.documentId
          ? Object.fromEntries(
              Object.entries(data as unknown as Record<string, unknown>).filter(([key]) => key !== ATTR_META),
            )
          : (data as unknown as Record<string, unknown>);
        for (const ref of extractReferences(extractable)) {
          rows.push({
            recordId,
            targetDXN: ref.targetDXN,
            propPath: EscapedPropPath.escape(ref.path),
            propPathNormalized: EscapedPropPath.escape(normalizePropPath(ref.path)),
          });
        }
      }

      // Replaced in chunks rather than a statement per object and per reference: a client whose SQLite
      // runs in a worker pays a message for each statement.
      for (const chunk of chunkArray([...rowsByRecord.keys()])) {
        yield* sql`DELETE FROM reverseRef WHERE ${sql.in('recordId', chunk)}`;
      }
      for (const chunk of chunkRows([...rowsByRecord.values()].flat())) {
        yield* sql`INSERT INTO reverseRef ${sql.insert(chunk)}`;
      }
    }),
  );
}
