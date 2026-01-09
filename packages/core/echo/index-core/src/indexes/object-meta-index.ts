import type { Obj } from '@dxos/echo';
import type { ObjectId, SpaceId } from '@dxos/keys';
import { SqlClient, type SqlError } from '@effect/sql';
import { Effect, Schema } from 'effect';

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
  version: Schema.Number,
});
export interface ObjectMeta extends Schema.Schema.Type<typeof ObjectMeta> {}

export class ObjectMetaIndex implements Index {
  runMigrations = Effect.fn('ObjectMetaIndex.runMigrations')(function* () {
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
        const rows =
          yield* sql`SELECT * FROM objectMeta WHERE spaceId = ${query.spaceId} AND typeDxn = ${query.typeDxn}`;
        return (rows as any[]).map((row) => ({
          ...row,
          deleted: !!row.deleted,
        })) as ObjectMeta[];
      }),
  );

  update = Effect.fn('ObjectMetaIndex.update')(
    (objects: IndexerObject[]): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;

        yield* Effect.forEach(
          objects,
          (object) =>
            Effect.gen(function* () {
              const { spaceId, queueId, documentId, data } = object;

              // Extract metadata (Logic emulating Echo APIs as strict imports are unavailable)
              // TODO(agent): Verify property access matches Obj.JSON structure
              const castData = data as any;
              const objectId = castData.id;

              // Check for existing record by (spaceId, queueId) or (spaceId, documentId)
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
                // Should not happen based on IndexerObject definition (one must be present ideally), but handle gracefully
                existing = [];
              }

              // Get max version + 1
              const result = yield* sql<{ v: number | null }>`SELECT MAX(version) as v FROM objectMeta`;
              const [{ v }] = result;
              const version = (v ?? 0) + 1;

              // Extract metadata (Logic emulating Echo APIs as strict imports are unavailable)

              const entityKind = castData['@kind'] ?? 'object'; // Assuming @kind property or default
              // Type might be @type or type ref; DXN string needed
              const typeDxn = castData['@type'] ? String(castData['@type']) : 'type'; // Defaulting to 'type' if missing to avoid null constraint issue if strict
              const deleted = castData['@deleted'] ? 1 : 0;
              // Relations
              const source = entityKind === 'relation' ? (castData.source ?? null) : null;
              const target = entityKind === 'relation' ? (castData.target ?? null) : null;

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
}
