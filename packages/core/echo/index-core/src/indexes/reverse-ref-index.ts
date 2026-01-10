//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { decodeReference, isEncodedReference } from '@dxos/echo-protocol';

import { EscapedPropPath } from '../utils';

import type { Index, IndexerObject } from './interface';

/**
 * Extracts all outgoing references from an object's data.
 */
const extractReferences = (data: Record<string, unknown>): { path: string[]; targetDxn: string }[] => {
  const refs: { path: string[]; targetDxn: string }[] = [];
  const visit = (path: string[], value: unknown) => {
    if (isEncodedReference(value)) {
      const dxn = decodeReference(value).toDXN();
      const echoId = dxn.asEchoDXN()?.echoId;
      if (!echoId) {
        return; // Skip non-echo references.
      }
      refs.push({ path, targetDxn: dxn.toString() });
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

export interface ReverseRefQuery {
  targetDxn: string;
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
    ({ targetDxn }: ReverseRefQuery): Effect.Effect<readonly ReverseRef[], SqlError.SqlError, SqlClient.SqlClient> =>
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
              const { recordId, data } = object;
              if (recordId === null) {
                yield* Effect.die(new Error('ReverseRefIndex.update requires recordId to be set'));
              }

              // Delete existing references for this record.
              yield* sql`DELETE FROM reverseRef WHERE recordId = ${recordId}`;

              // Extract references from data.
              const refs = extractReferences(data as Record<string, unknown>);

              // Insert new references.
              yield* Effect.forEach(
                refs,
                (ref) =>
                  sql`INSERT INTO reverseRef (recordId, targetDxn, propPath) VALUES (${recordId}, ${ref.targetDxn}, ${EscapedPropPath.escape(ref.path)})`,
                { discard: true },
              );
            }),
          { discard: true },
        );
      }),
  );
}
