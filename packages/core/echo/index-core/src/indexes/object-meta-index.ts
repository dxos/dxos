//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ATTR_DELETED, ATTR_PARENT, ATTR_RELATION_SOURCE, ATTR_RELATION_TARGET, ATTR_TYPE } from '@dxos/echo/internal';
import { DXN, type ObjectId, type SpaceId } from '@dxos/keys';

import type { IndexerObject } from './interface';
import type { Index } from './interface';

const _escapeLikePrefix = (prefix: string) => {
  // Escape LIKE metacharacters in the *literal* prefix (we still append a wildcard for the version suffix).
  // Backslash is used as the ESCAPE character.
  // See: https://www.sqlite.org/lang_expr.html#like
  const escaped = prefix.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
  return `${escaped}:%`;
};

export const ObjectMeta = Schema.Struct({
  recordId: Schema.Number,
  objectId: Schema.String,
  queueId: Schema.String,
  spaceId: Schema.String,
  documentId: Schema.String,
  entityKind: Schema.String,
  /** The versioned DXN of the type of the object. */
  typeDxn: Schema.String,
  deleted: Schema.Boolean,
  source: Schema.NullOr(Schema.String),
  target: Schema.NullOr(Schema.String),
  /** Parent object id (nullable). */
  parent: Schema.NullOr(Schema.String),
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
      parent TEXT,
      version INTEGER NOT NULL
    )`;

    yield* sql`CREATE INDEX IF NOT EXISTS idx_object_index_objectId ON objectMeta(spaceId, objectId)`;
    yield* sql`CREATE INDEX IF NOT EXISTS idx_object_index_typeDxn ON objectMeta(spaceId, typeDxn)`;
    yield* sql`CREATE INDEX IF NOT EXISTS idx_object_index_version ON objectMeta(version)`;
    yield* sql`CREATE INDEX IF NOT EXISTS idx_object_index_parent ON objectMeta(spaceId, parent)`;
  });

  query = Effect.fn('ObjectMetaIndex.queryType')(
    (
      query: Pick<ObjectMeta, 'spaceId' | 'typeDxn'>,
    ): Effect.Effect<readonly ObjectMeta[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const parsedType = DXN.tryParse(query.typeDxn)?.asTypeDXN();

        // SQLite stores booleans as integers, so we need to specify the raw row type.
        const rows =
          parsedType && parsedType.version === undefined
            ? yield* sql<ObjectMeta>`SELECT * FROM objectMeta WHERE spaceId = ${query.spaceId} AND (typeDxn = ${
                query.typeDxn
              } OR typeDxn LIKE ${_escapeLikePrefix(query.typeDxn)} ESCAPE '\\')`
            : yield* sql<ObjectMeta>`SELECT * FROM objectMeta WHERE spaceId = ${query.spaceId} AND typeDxn = ${query.typeDxn}`;
        return rows.map((row) => ({
          ...row,
          deleted: !!row.deleted,
        }));
      }),
  );

  queryAll = Effect.fn('ObjectMetaIndex.queryAll')(
    (query: {
      spaceIds: readonly ObjectMeta['spaceId'][];
    }): Effect.Effect<readonly ObjectMeta[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        if (query.spaceIds.length === 0) {
          return [];
        }

        const sql = yield* SqlClient.SqlClient;
        const rows = yield* sql<ObjectMeta>`SELECT * FROM objectMeta WHERE ${sql.in('spaceId', query.spaceIds)}`;
        return rows.map((row) => ({
          ...row,
          deleted: !!row.deleted,
        }));
      }),
  );

  queryTypes = Effect.fn('ObjectMetaIndex.queryTypes')(
    ({
      spaceIds,
      typeDxns,
      inverted = false,
    }: {
      spaceIds: readonly ObjectMeta['spaceId'][];
      typeDxns: readonly ObjectMeta['typeDxn'][];
      inverted?: boolean;
    }): Effect.Effect<readonly ObjectMeta[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        if (spaceIds.length === 0) {
          return [];
        }

        if (typeDxns.length === 0) {
          if (!inverted) {
            return [];
          }

          const sql = yield* SqlClient.SqlClient;
          const rows = yield* sql<ObjectMeta>`SELECT * FROM objectMeta WHERE ${sql.in('spaceId', spaceIds)}`;
          return rows.map((row) => ({
            ...row,
            deleted: !!row.deleted,
          }));
        }
        const sql = yield* SqlClient.SqlClient;
        const spaceWhere = sql.in('spaceId', spaceIds);
        const typeWhere = sql.or(
          typeDxns.map((typeDxn) => {
            const parsedType = DXN.tryParse(typeDxn)?.asTypeDXN();
            return parsedType && parsedType.version === undefined
              ? sql.or([sql`typeDxn = ${typeDxn}`, sql`typeDxn LIKE ${_escapeLikePrefix(typeDxn)} ESCAPE '\\'`])
              : sql`typeDxn = ${typeDxn}`;
          }),
        );
        const rows = inverted
          ? yield* sql<ObjectMeta>`SELECT * FROM objectMeta WHERE ${spaceWhere} AND NOT ${typeWhere}`
          : yield* sql<ObjectMeta>`SELECT * FROM objectMeta WHERE ${spaceWhere} AND ${typeWhere}`;
        return rows.map((row) => ({
          ...row,
          deleted: !!row.deleted,
        }));
      }),
  );

  queryRelations = Effect.fn('ObjectMetaIndex.queryRelations')(
    ({
      endpoint,
      anchorDxns,
    }: {
      endpoint: 'source' | 'target';
      anchorDxns: readonly string[];
    }): Effect.Effect<readonly ObjectMeta[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        if (anchorDxns.length === 0) {
          return [];
        }
        const sql = yield* SqlClient.SqlClient;
        const column = endpoint === 'source' ? 'source' : 'target';
        const rows = yield* sql<ObjectMeta>`SELECT * FROM objectMeta WHERE entityKind = 'relation' AND ${sql.in(
          column,
          anchorDxns,
        )}`;
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
              // Parent (nullable).
              const parent = castData[ATTR_PARENT] ?? null;

              if (existing.length > 0) {
                yield* sql`
                  UPDATE objectMeta SET
                    version = ${version},
                    entityKind = ${entityKind},
                    typeDxn = ${typeDxn},
                    deleted = ${deleted},
                    source = ${source},
                    target = ${target},
                    parent = ${parent}
                  WHERE recordId = ${existing[0].recordId}
                `;
              } else {
                yield* sql`
                  INSERT INTO objectMeta (
                    objectId, queueId, spaceId, documentId, 
                    entityKind, typeDxn, deleted, source, target, parent, version
                  ) VALUES (
                    ${objectId}, ${queueId ?? ''}, ${spaceId}, ${documentId ?? ''}, 
                    ${entityKind}, ${typeDxn}, ${deleted}, 
                    ${source}, ${target}, ${parent}, ${version}
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
            return yield* Effect.die(
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
        const rows = yield* sql<ObjectMeta>`SELECT * FROM objectMeta WHERE ${sql.in('recordId', recordIds)}`;

        return rows.map((row) => ({
          ...row,
          deleted: !!row.deleted,
        }));
      }),
  );

  /**
   * Query children by parent object ids.
   */
  queryChildren = Effect.fn('ObjectMetaIndex.queryChildren')(
    (query: {
      spaceId: SpaceId[];
      parentIds: ObjectId[];
    }): Effect.Effect<readonly ObjectMeta[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        if (query.parentIds.length === 0) {
          return [];
        }

        const sql = yield* SqlClient.SqlClient;
        const rows =
          yield* sql<ObjectMeta>`SELECT * FROM objectMeta WHERE spaceId IN ${sql.in(query.spaceId)} AND parent IN ${sql.in(query.parentIds.map((id) => DXN.fromLocalObjectId(id).toString()))}`;

        return rows.map((row) => ({
          ...row,
          deleted: !!row.deleted,
        }));
      }),
  );

  /**
   * Query parent by object id.
   */
  queryParent = Effect.fn('ObjectMetaIndex.queryParent')(
    (query: {
      spaceId: string;
      objectId: string;
    }): Effect.Effect<ObjectMeta | null, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;

        // First get the object to find its parent id.
        const objects =
          yield* sql<ObjectMeta>`SELECT * FROM objectMeta WHERE spaceId = ${query.spaceId} AND objectId = ${query.objectId} LIMIT 1`;
        if (objects.length === 0 || objects[0].parent === null) {
          return null;
        }

        // Then get the parent object.
        const parentId = objects[0].parent;
        const parents =
          yield* sql<ObjectMeta>`SELECT * FROM objectMeta WHERE spaceId = ${query.spaceId} AND objectId = ${parentId} LIMIT 1`;
        if (parents.length === 0) {
          return null;
        }

        return {
          ...parents[0],
          deleted: !!parents[0].deleted,
        };
      }),
  );
}
