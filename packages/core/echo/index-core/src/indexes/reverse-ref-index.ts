//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import type { Index, IndexerObject } from './interface';

/**
 * Encoded reference format: `{ '/': 'dxn:...' }`.
 */
type EncodedReference = { '/': string };

/**
 * Checks if a value is an encoded reference.
 */
const isEncodedReference = (value: unknown): value is EncodedReference =>
  typeof value === 'object' &&
  value !== null &&
  Object.keys(value).length === 1 &&
  typeof (value as any)['/'] === 'string';

/**
 * Escapes property path segments for storage.
 * - '\' becomes '\\'
 * - '.' becomes '\.'
 * - Segments joined with '.'
 */
const escapePropPath = (path: string[]): string => {
  return path.map((p) => p.toString().replaceAll('\\', '\\\\').replaceAll('.', '\\.')).join('.');
};

/**
 * Extracts all outgoing references from an object's data.
 */
const extractReferences = (data: Record<string, unknown>): { path: string[]; targetDxn: string }[] => {
  const refs: { path: string[]; targetDxn: string }[] = [];
  const visit = (path: string[], value: unknown) => {
    if (isEncodedReference(value)) {
      refs.push({ path, targetDxn: value['/'] });
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
  targetDxn: Schema.String,
  propPath: Schema.String,
});
export interface ReverseRef extends Schema.Schema.Type<typeof ReverseRef> {}

/**
 * Indexes reverse references - tracks which objects reference which targets.
 * Only indexes references, not relations.
 */
export class ReverseRefIndex implements Index {
  migrate = Effect.fn('ReverseRefIndex.migrate')(function* () {
    const sql = yield* SqlClient.SqlClient;

    yield* sql`CREATE TABLE IF NOT EXISTS reverseRef (
      recordId INTEGER NOT NULL,
      targetDxn TEXT NOT NULL,
      propPath TEXT NOT NULL,
      PRIMARY KEY (recordId, targetDxn, propPath)
    )`;

    yield* sql`CREATE INDEX IF NOT EXISTS idx_reverse_ref_target ON reverseRef(targetDxn)`;
  });

  /**
   * Query all references pointing to a target DXN.
   */
  query = Effect.fn('ReverseRefIndex.query')(
    (targetDxn: string): Effect.Effect<readonly ReverseRef[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const rows = yield* sql`SELECT * FROM reverseRef WHERE targetDxn = ${targetDxn}`;
        return rows as ReverseRef[];
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
              const { spaceId, queueId, documentId, data } = object;

              const castData = data as Record<string, unknown>;
              const objectId = castData.id as string;

              // Look up recordId from objectMeta.
              let existing: readonly { recordId: number }[];
              if (documentId) {
                existing = yield* sql<{
                  recordId: number;
                }>`SELECT recordId FROM objectMeta WHERE spaceId = ${spaceId} AND documentId = ${documentId} AND objectId = ${objectId} LIMIT 1`;
              } else if (queueId) {
                existing = yield* sql<{
                  recordId: number;
                }>`SELECT recordId FROM objectMeta WHERE spaceId = ${spaceId} AND queueId = ${queueId} AND objectId = ${objectId} LIMIT 1`;
              } else {
                existing = [];
              }



              const recordId = existing[0].recordId;

              if (recordId) {
                // Delete existing references for this record.
                yield* sql`DELETE FROM reverseRef WHERE recordId = ${recordId}`;
              }

              // Extract references from data.
              const refs = extractReferences(castData);

              // Insert new references.
              yield* Effect.forEach(
                refs,
                (ref) =>
                  sql`INSERT INTO reverseRef (recordId, targetDxn, propPath) VALUES (${recordId}, ${ref.targetDxn}, ${escapePropPath(ref.path)})`,
                { discard: true },
              );
            }),
          { discard: true },
        );
      }),
  );
}
