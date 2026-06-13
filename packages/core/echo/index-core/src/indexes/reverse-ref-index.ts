//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { EncodedReference, isEncodedReference } from '@dxos/echo-protocol';
import { EID } from '@dxos/keys';

import { EscapedPropPath } from '../utils';
import type { Index, IndexerObject } from './interface';

/**
 * Extracts all outgoing references from an object's data.
 */
const extractReferences = (data: Record<string, unknown>): { path: string[]; targetDXN: EID.EID }[] => {
  const refs: { path: string[]; targetDXN: EID.EID }[] = [];
  const visit = (path: string[], value: unknown) => {
    if (isEncodedReference(value)) {
      const uri = EncodedReference.toURI(value);
      const parsedEchoUri = EID.tryParse(uri);
      const echoUri = parsedEchoUri ? EID.getEntityId(parsedEchoUri) : undefined;
      if (!echoUri || !parsedEchoUri) {
        return; // Skip non-echo references.
      }
      // Key by the local (space-less) form so a space-qualified ref and a bare ref to the same entity index
      // under the same key. The index is scoped to one space (entity ids are unique within it), and lookups
      // normalize the same way (see `query`).
      refs.push({ path, targetDXN: EID.toLocal(parsedEchoUri) });
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
  targetDXN: EID.Schema,
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
  targetDXN: EID.EID;
  // TODO: Add prop filter
}

/**
 * Indexes reverse references - tracks which objects reference which targets.
 * Only indexes references, not relations.
 */
export class ReverseRefIndex implements Index {
  migrate = Effect.fn('ReverseRefIndex.migrate')(function* () {
    const sql = yield* SqlClient.SqlClient;

    yield* sql`CREATE TABLE IF NOT EXISTS reverseRef (
      recordId INTEGER NOT NULL,
      targetDXN TEXT NOT NULL,
      propPath TEXT NOT NULL,
      PRIMARY KEY (recordId, targetDXN, propPath)
    )`;

    yield* sql`CREATE INDEX IF NOT EXISTS idx_reverse_ref_target ON reverseRef(targetDXN)`;
  });

  /**
   * Query all references pointing to a target DXN.
   */
  query = Effect.fn('ReverseRefIndex.query')(
    ({ targetDXN }: ReverseRefQuery): Effect.Effect<readonly ReverseRef[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        // Normalize to the local form to match how references are keyed on write (space-qualified and bare
        // EIDs for the same entity collapse to one key).
        const normalized = EID.toLocal(targetDXN);
        // TODO(mykola): Join objectMeta table here.
        const rows = yield* sql`SELECT * FROM reverseRef WHERE targetDXN = ${normalized}`;
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
              const { recordId, data } = object;
              if (recordId === null) {
                yield* Effect.die(new Error('ReverseRefIndex.update requires recordId to be set'));
              }

              // Delete existing references for this record.
              yield* sql`DELETE FROM reverseRef WHERE recordId = ${recordId}`;

              // Extract references from data.
              const refs = extractReferences(data as unknown as Record<string, unknown>);

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
