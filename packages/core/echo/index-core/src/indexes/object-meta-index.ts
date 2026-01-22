//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ATTR_DELETED, ATTR_RELATION_SOURCE, ATTR_RELATION_TARGET, ATTR_TYPE } from '@dxos/echo/internal';

import type { IndexerObject } from './interface';
import type { Index } from './interface';

export const ObjectMeta = Schema.Struct({
  recordId: Schema.Number,
  objectId: Schema.String,
  queueId: Schema.String,
  spaceId: Schema.String,
  documentId: Schema.String,
  entityKind: Schema.String,
  typeDxn: Schema.String,
  deleted: Schema.Boolean,
  source: Schema.NullOr(Schema.String),
  target: Schema.NullOr(Schema.String),
  /** Monotonically increasing sequence number assigned on insert/update for tracking indexing order. */
  version: Schema.Number,
});
export interface ObjectMeta extends Schema.Schema.Type<typeof ObjectMeta> {}

export class ObjectMetaIndex implements Index {
  migrate = Effect.fn('ObjectMetaIndex.runMigrations')(function* () {
    const sql = yield* SqlClient.SqlClient;

    yield* sql`CREATE TABLE IF NOT EXISTS objectMeta (
      recordId INTEGER PRIMARY KEY AUTOINCREMENT,
      objectId TEXT NOT NULL,
      queueId TEXT NOT NULL DEFAULT '',
      spaceId TEXT NOT NULL,
      documentId TEXT NOT NULL DEFAULT '',
      entityKind TEXT NOT NULL,
      typeDxn TEXT NOT NULL,
      deleted INTEGER NOT NULL,
      source TEXT,
      target TEXT,
      version INTEGER NOT NULL
    )`;

    yield* sql`CREATE INDEX IF NOT EXISTS idx_object_index_objectId ON objectMeta(spaceId, objectId)`;
    yield* sql`CREATE INDEX IF NOT EXISTS idx_object_index_typeDxn ON objectMeta(spaceId, typeDxn)`;
    yield* sql`CREATE INDEX IF NOT EXISTS idx_object_index_version ON objectMeta(version)`;
  });

  query = Effect.fn('ObjectMetaIndex.queryType')(
    (
      query: Pick<ObjectMeta, 'spaceId' | 'typeDxn'>,
    ): Effect.Effect<readonly ObjectMeta[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        // SQLite stores booleans as integers, so we need to specify the raw row type.
        const rows =
          yield* sql<ObjectMeta>`SELECT * FROM objectMeta WHERE spaceId = ${query.spaceId} AND typeDxn = ${query.typeDxn}`;
        return rows.map((row) => ({
          ...row,
          deleted: !!row.deleted,
        }));
      }),
  );

  // TODO(dmaretskyi): Update recordId on objects so that we don't need to look it up separately.
  update = Effect.fn('ObjectMetaIndex.update')(
    (objects: IndexerObject[]): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;

        yield* Effect.forEach(
          objects,
          (object) =>
            Effect.gen(function* () {
              const { spaceId, queueId, documentId, data } = object;

              // Extract metadata (Logic emulating Echo APIs as strict imports are unavailable).
              // TODO(agent): Verify property access matches Obj.JSON structure.
              const castData = data;
              const objectId = castData.id;

              // Check for existing record by (spaceId, queueId) or (spaceId, documentId).
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
                // Should not happen based on IndexerObject definition (one must be present ideally), but handle gracefully.
                existing = [];
              }

              // Get max version + 1.
              const result = yield* sql<{ v: number | null }>`SELECT MAX(version) as v FROM objectMeta`;
              const [{ v }] = result;
              const version = (v ?? 0) + 1;

              // Extract metadata.
              const entityKind = castData[ATTR_RELATION_SOURCE] ? 'relation' : 'object';
              const typeDxn = castData[ATTR_TYPE] ? String(castData[ATTR_TYPE]) : 'type';
              const deleted = castData[ATTR_DELETED] ? 1 : 0;
              // Relations.
              const source = entityKind === 'relation' ? (castData[ATTR_RELATION_SOURCE] ?? null) : null;
              const target = entityKind === 'relation' ? (castData[ATTR_RELATION_TARGET] ?? null) : null;

              if (existing.length > 0) {
                yield* sql`
                  UPDATE objectMeta SET
                    version = ${version},
                    entityKind = ${entityKind},
                    typeDxn = ${typeDxn},
                    deleted = ${deleted},
                    source = ${source},
                    target = ${target}
                  WHERE recordId = ${existing[0].recordId}
                `;
              } else {
                yield* sql`
                  INSERT INTO objectMeta (
                    objectId, queueId, spaceId, documentId, 
                    entityKind, typeDxn, deleted, source, target, version
                  ) VALUES (
                    ${objectId}, ${queueId ?? ''}, ${spaceId}, ${documentId ?? ''}, 
                    ${entityKind}, ${typeDxn}, ${deleted}, 
                    ${source}, ${target}, ${version}
                  )
                `;
              }
            }),
          { discard: true },
        );
      }),
  );

  /**
   * Look up `recordIds` for objects that are already stored in the ObjectMetaIndex.
   * Mutates the objects in place.
   */
  lookupRecordIds = Effect.fn('ObjectMetaIndex.lookupRecordIds')(
    (objects: IndexerObject[]): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;

        for (const object of objects) {
          const { spaceId, queueId, documentId, data } = object;
          const objectId = data.id;

          let result: readonly { recordId: number }[];
          if (documentId) {
            result = yield* sql<{
              recordId: number;
            }>`SELECT recordId FROM objectMeta WHERE spaceId = ${spaceId} AND documentId = ${documentId} AND objectId = ${objectId} LIMIT 1`;
          } else if (queueId) {
            result = yield* sql<{
              recordId: number;
            }>`SELECT recordId FROM objectMeta WHERE spaceId = ${spaceId} AND queueId = ${queueId} AND objectId = ${objectId} LIMIT 1`;
          } else {
            result = [];
          }

          if (result.length === 0) {
            // TODO(mykola): Handle this case gracefully.
            yield* Effect.die(
              new Error(`Object not found in ObjectMetaIndex: ${spaceId}/${documentId ?? queueId}/${objectId}`),
            );
          }
          object.recordId = result[0].recordId;
        }
      }),
  );

  /**
   * Look up object metadata by recordIds.
   */
  lookupByRecordIds = Effect.fn('ObjectMetaIndex.lookupByRecordIds')(
    (recordIds: number[]): Effect.Effect<readonly ObjectMeta[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        if (recordIds.length === 0) {
          return [];
        }

        const sql = yield* SqlClient.SqlClient;
        const placeholders = recordIds.map(() => '?').join(', ');
        const rows = yield* sql.unsafe<ObjectMeta>(
          `SELECT * FROM objectMeta WHERE recordId IN (${placeholders})`,
          recordIds,
        );

        return rows.map((row) => ({
          ...row,
          deleted: !!row.deleted,
        }));
      }),
  );
}
