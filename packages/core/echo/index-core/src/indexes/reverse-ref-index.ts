//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Migrator from 'effect/unstable/sql/Migrator';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import { EncodedReference, isEncodedReference } from '@dxos/echo-protocol';
import { ATTR_META } from '@dxos/echo/internal';
import { DXN, EID, URI } from '@dxos/keys';
import { SqlTransaction } from '@dxos/sql-sqlite';

import { MIGRATIONS, MIGRATIONS_TABLE } from '../migrations/reverse-ref';
import { EscapedPropPath, chunkArray } from '../utils';
import type { Index, IndexerObject } from './interface';

/**
 * Normalizes a reference URI so every spelling of the same target shares one index key: an echo
 * reference by its local (space-less) form, a named-entity `dxn:` by its unversioned NSID. Lookups
 * normalize identically (see `query`).
 */
export const referenceIndexKey = (uri: URI.URI): URI.URI | undefined => {
  const parsedEchoUri = EID.tryParse(uri);
  if (parsedEchoUri) {
    return EID.getEntityId(parsedEchoUri) ? EID.toLocal(parsedEchoUri) : undefined;
  }
  if (DXN.isDXN(uri)) {
    return DXN.tryMake(uri) ? DXN.make<string>(DXN.getName(uri)) : undefined;
  }
  return uri;
};

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
 * Indexes reverse references - tracks which objects reference which targets.
 * Only indexes references, not relations.
 */
export class ReverseRefIndex implements Index {
  /**
   * Applies any migrations this database has not recorded yet.
   *
   * `SqlTransaction.clientLayer` is provided because the migrator wraps its work in the client's
   * `withTransaction`, which emits `BEGIN` / `COMMIT` — rejected in workerd.
   */
  migrate = Effect.fn('ReverseRefIndex.migrate')(() =>
    Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
      Effect.provide(SqlTransaction.clientLayer),
      // A malformed bundled manifest is a defect, not something a caller can recover from.
      Effect.catchTag('MigrationError', (error) => Effect.die(error)),
      Effect.asVoid,
    ),
  );

  /**
   * Query all references pointing to a target DXN.
   */
  query = Effect.fn('ReverseRefIndex.query')(
    ({ targetDXN }: ReverseRefQuery): Effect.Effect<readonly ReverseRef[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const normalized = referenceIndexKey(targetDXN);
        if (normalized === undefined) {
          return [];
        }
        // TODO(mykola): Join objectMeta table here.
        const rows = yield* sql`SELECT * FROM reverseRef WHERE targetDXN = ${normalized}`;
        return rows as ReverseRef[];
      }),
  );

  /** Delete reverse-reference rows by record id. Used by garbage collection. */
  deleteByRecordIds = Effect.fn('ReverseRefIndex.deleteByRecordIds')(
    (recordIds: readonly number[]): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        for (const chunk of chunkArray(recordIds)) {
          yield* sql`DELETE FROM reverseRef WHERE ${sql.in('recordId', chunk)}`;
        }
      }),
  );

  update = Effect.fn('ReverseRefIndex.update')(
    (objects: IndexerObject[]): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;

        yield* Effect.forEach(
          objects,
          (object) =>
            Effect.gen(function* () {
              const { recordId, data } = object;
              if (recordId === null) {
                return yield* Effect.die(new Error('ReverseRefIndex.update requires recordId to be set'));
              }

              // Delete existing references for this record.
              yield* sql`DELETE FROM reverseRef WHERE recordId = ${recordId}`;

              // Document objects carry `@meta` only so the entity-meta index can extract the
              // convergence key — indexing `meta.tags` here would make `Query.incoming()` on a Tag
              // return everything merely tagged with it. Queue blocks always carried meta, so
              // their extraction is unchanged.
              const extractable = object.documentId
                ? Object.fromEntries(
                    Object.entries(data as unknown as Record<string, unknown>).filter(([key]) => key !== ATTR_META),
                  )
                : (data as unknown as Record<string, unknown>);
              const refs = extractReferences(extractable);

              // Insert new references.
              yield* Effect.forEach(
                refs,
                (ref) =>
                  sql`INSERT INTO reverseRef (recordId, targetDXN, propPath) VALUES (${recordId}, ${ref.targetDXN}, ${EscapedPropPath.escape(ref.path)})`,
                { discard: true },
              );
            }),
          { discard: true },
        );
      }),
  );
}
