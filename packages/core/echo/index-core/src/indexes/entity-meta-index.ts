//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import type * as Statement from '@effect/sql/Statement';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import {
  ATTR_DELETED,
  ATTR_META,
  ATTR_PARENT,
  ATTR_RELATION_SOURCE,
  ATTR_RELATION_TARGET,
  ATTR_TYPE,
} from '@dxos/echo/internal';
import { DXN, EID, EntityId, SpaceId, URI } from '@dxos/keys';

import type { IndexerObject } from './interface';
import type { Index } from './interface';

/**
 * Normalizes an echo: EID to the local (unqualified) form so SQL comparisons are consistent.
 * Rows are indexed in the canonical `echo:///<entityId>` form; a space-qualified
 * `echo://<space>/<entityId>` would otherwise miss every row for that type.
 */
const _normalizeTypeUri = (typeDXN: string): string => {
  if (!typeDXN.startsWith('echo:')) {
    return typeDXN;
  }
  const eid = EID.tryParse(typeDXN);
  if (!eid) {
    return typeDXN;
  }
  const entityId = EID.getEntityId(eid);
  return entityId ? EID.make({ entityId }) : typeDXN;
};

/**
 * Every stored `typeDXN` form equivalent to a normalized type identifier. Rows written before
 * `echo:///<id>` became the canonical local EID hold the single-slash `echo:/<id>` form; both
 * address the same stored schema, so queries must match either without requiring a reindex.
 */
const _typeUriEquivalents = (normalized: string): string[] => {
  if (normalized.startsWith('echo:///')) {
    return [normalized, `echo:/${normalized.slice('echo:///'.length)}`];
  }
  return [normalized];
};

const _escapeLikePrefix = (prefix: string) => {
  // Escape LIKE metacharacters in the *literal* prefix (we still append a wildcard for the version suffix).
  // Backslash is used as the ESCAPE character.
  // See: https://www.sqlite.org/lang_expr.html#like
  const escaped = prefix.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
  return `${escaped}:%`;
};

export const EntityMeta = Schema.Struct({
  recordId: Schema.Number,
  objectId: EntityId,
  /** Empty string for non-queue objects. */
  queueId: Schema.String,
  /** Queue subspace namespace (e.g. 'data', 'trace'). Empty string for non-queue objects. */
  queueNamespace: Schema.String,
  spaceId: SpaceId,
  documentId: Schema.String,
  entityKind: Schema.String,
  /**
   * Type identifier URI for the object — typename DXN for non-stored schemas,
   * schema-as-object EID for stored (dynamic) schemas. Mirrors the value
   * written into the object's `system.type`.
   */
  typeDXN: URI.Schema,
  deleted: Schema.Boolean,
  source: Schema.NullOr(EID.Schema),
  target: Schema.NullOr(EID.Schema),
  /** Parent object id (nullable). */
  parent: Schema.NullOr(EID.Schema),
  /** Caller-supplied domain identity from `meta.naturalKey` (nullable); duplicates sharing one merge. */
  naturalKey: Schema.NullOr(Schema.String),
  /** Monotonically increasing sequence number assigned on insert/update for tracking indexing order. */
  version: Schema.Number,
  /** Unix ms timestamp when the object was first indexed. */
  createdAt: Schema.NullOr(Schema.Number),
  /** Unix ms timestamp when the object was last re-indexed. */
  updatedAt: Schema.NullOr(Schema.Number),
});
export interface EntityMeta extends Schema.Schema.Type<typeof EntityMeta> {}

/**
 * Builds a SQL condition for filtering by space and queue source.
 * When `includeAllQueues` is false and no `queueIds`, only non-queue objects are returned.
 */
const buildSourceCondition = (
  sql: SqlClient.SqlClient,
  spaceIds: readonly string[],
  includeAllQueues: boolean,
  queueIds: readonly string[] | null,
): Statement.Fragment => {
  const conditions: Statement.Fragment[] = [];

  if (spaceIds.length > 0) {
    if (includeAllQueues) {
      conditions.push(sql`${sql.in('spaceId', spaceIds)}`);
    } else {
      conditions.push(sql`(${sql.in('spaceId', spaceIds)} AND queueId = '')`);
    }
  }

  if (queueIds && queueIds.length > 0) {
    conditions.push(sql`${sql.in('queueId', queueIds)}`);
  }

  if (conditions.length === 0) {
    return sql`1 = 0`;
  }

  return sql.or(conditions);
};

// SQLite caps bound variables (conventionally 999); chunk well below it, matching the FTS index.
const QUERY_CHUNK_SIZE = 500;

export class EntityMetaIndex implements Index {
  migrate = Effect.fn('EntityMetaIndex.runMigrations')(function* () {
    const sql = yield* SqlClient.SqlClient;

    // Detect an upgrade from a schema without `naturalKey` BEFORE the DDL runs: rows indexed by
    // the old build hold NULL where a key may exist in the document, and re-indexing is
    // per-object — an unchanged object would never repopulate, so duplicate detection would
    // silently miss it forever. The fix is a one-time cursor reset (below) forcing a full
    // re-index; a fresh database creates the table with the column and skips it.
    const priorColumns = yield* sql<{ name: string }>`SELECT name FROM pragma_table_info('objectMeta')`;
    const needsNaturalKeyBackfill = priorColumns.length > 0 && !priorColumns.some(({ name }) => name === 'naturalKey');
    if (needsNaturalKeyBackfill) {
      // The tracker migrates before the indexes, so the cursor table exists here. Dropping every
      // cursor re-presents all documents to the indexing loop, whose per-index upserts are
      // idempotent — the one-time cost of a full re-index buys correct duplicate detection over
      // data indexed before the column existed. The wipe runs BEFORE the ALTER below: migration
      // statements auto-commit individually, and a crash between them must re-run the wipe on
      // the next startup, not see the column and skip it.
      yield* sql`DELETE FROM indexCursor`;
    }

    yield* sql`CREATE TABLE IF NOT EXISTS objectMeta (
      recordId INTEGER PRIMARY KEY AUTOINCREMENT,
      objectId TEXT NOT NULL,
      queueId TEXT NOT NULL DEFAULT '',
      queueNamespace TEXT NOT NULL DEFAULT '',
      spaceId TEXT NOT NULL,
      documentId TEXT NOT NULL DEFAULT '',
      entityKind TEXT NOT NULL,
      typeDXN TEXT NOT NULL,
      deleted INTEGER NOT NULL,
      source TEXT,
      target TEXT,
      parent TEXT,
      naturalKey TEXT,
      version INTEGER NOT NULL,
      createdAt INTEGER,
      updatedAt INTEGER
    )`;

    // Add `parent` column for tables created before it was introduced.
    yield* Effect.catchAll(sql`ALTER TABLE objectMeta ADD COLUMN parent TEXT`, () => Effect.void);
    // Add `naturalKey` column for tables created before it was introduced.
    yield* Effect.catchAll(sql`ALTER TABLE objectMeta ADD COLUMN naturalKey TEXT`, () => Effect.void);
    // Add timestamp columns for tables created before they were introduced.
    yield* Effect.catchAll(sql`ALTER TABLE objectMeta ADD COLUMN createdAt INTEGER`, () => Effect.void);
    yield* Effect.catchAll(sql`ALTER TABLE objectMeta ADD COLUMN updatedAt INTEGER`, () => Effect.void);
    // Add queueNamespace column for tables created before it was introduced.
    yield* Effect.catchAll(
      sql`ALTER TABLE objectMeta ADD COLUMN queueNamespace TEXT NOT NULL DEFAULT ''`,
      () => Effect.void,
    );

    yield* sql`CREATE INDEX IF NOT EXISTS idx_object_index_objectId ON objectMeta(spaceId, objectId)`;
    yield* sql`CREATE INDEX IF NOT EXISTS idx_object_index_typeDXN ON objectMeta(spaceId, typeDXN)`;
    yield* sql`CREATE INDEX IF NOT EXISTS idx_object_index_version ON objectMeta(version)`;
    yield* sql`CREATE INDEX IF NOT EXISTS idx_object_index_parent ON objectMeta(spaceId, parent)`;
    yield* sql`CREATE INDEX IF NOT EXISTS idx_object_index_naturalKey ON objectMeta(spaceId, naturalKey)`;
    yield* sql`CREATE INDEX IF NOT EXISTS idx_object_index_updatedAt ON objectMeta(updatedAt)`;
    yield* sql`CREATE INDEX IF NOT EXISTS idx_object_index_createdAt ON objectMeta(createdAt)`;

    // Write-ahead intents for natural-key merging: rows are inserted in the same transaction
    // that commits index rows and cursors, and deleted only after the merge pass services the
    // key — so a crash or a faulted pass can never leave a detected duplicate unserviced.
    yield* sql`CREATE TABLE IF NOT EXISTS naturalKeyIntents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      spaceId TEXT NOT NULL,
      naturalKey TEXT NOT NULL
    )`;
  });

  /**
   * Document-backed object rows carrying any of the given natural keys in one space.
   *
   * The detection point-lookup for natural-key merging: called with only the keys seen in a just
   * indexed batch, so its cost is proportional to writes that carry a natural key. Tombstoned
   * rows are included — a merged-away loser that received late edits must be found so those
   * edits can be folded into the winner; the merge re-verifies every row against its document.
   */
  queryByNaturalKeys = Effect.fn('EntityMetaIndex.queryByNaturalKeys')(
    (
      spaceId: SpaceId,
      naturalKeys: readonly string[],
    ): Effect.Effect<readonly EntityMeta[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        if (naturalKeys.length === 0) {
          return [];
        }
        const sql = yield* SqlClient.SqlClient;
        // Chunked to stay under SQLite's bound-variable limit — an initial index of a fresh
        // clone can present thousands of keys in one batch, and a thrown query here would skip
        // detection for the whole batch with no retry.
        const results: EntityMeta[] = [];
        for (let offset = 0; offset < naturalKeys.length; offset += QUERY_CHUNK_SIZE) {
          const chunk = naturalKeys.slice(offset, offset + QUERY_CHUNK_SIZE);
          const rows =
            yield* sql<EntityMeta>`SELECT * FROM objectMeta WHERE spaceId = ${spaceId} AND ${sql.in('naturalKey', chunk)} AND entityKind = 'object' AND queueId = ''`;
          results.push(...rows.map((row) => ({ ...row, deleted: !!row.deleted })));
        }
        return results;
      }),
  );

  /**
   * Durably queue natural keys for duplicate detection. Runs inside the same transaction that
   * commits the index rows and cursors (see `IndexEngine.#update`), so a keyed write can never
   * be indexed-but-forgotten: until the merge pass services the key and clears the intent, every
   * later pass re-presents it.
   */
  recordNaturalKeyIntents = Effect.fn('EntityMetaIndex.recordNaturalKeyIntents')(
    (
      intents: readonly { spaceId: SpaceId; naturalKey: string }[],
    ): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        if (intents.length === 0) {
          return;
        }
        const sql = yield* SqlClient.SqlClient;
        for (const { spaceId, naturalKey } of intents) {
          yield* sql`INSERT INTO naturalKeyIntents (spaceId, naturalKey) VALUES (${spaceId}, ${naturalKey})`;
        }
      }),
  );

  /**
   * All pending natural-key intents, deduplicated per space, with the high-water id to pass back
   * to {@link clearNaturalKeyIntents} — intents recorded after this read have larger ids and
   * survive the clear, so a concurrent indexing pass cannot have its trigger erased.
   */
  takeNaturalKeyIntents = Effect.fn('EntityMetaIndex.takeNaturalKeyIntents')(
    (): Effect.Effect<{ maxId: number; intents: Map<SpaceId, Set<string>> }, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const rows = yield* sql<{ id: number; spaceId: SpaceId; naturalKey: string }>`
          SELECT id, spaceId, naturalKey FROM naturalKeyIntents`;
        let maxId = 0;
        const intents = new Map<SpaceId, Set<string>>();
        for (const { id, spaceId, naturalKey } of rows) {
          maxId = Math.max(maxId, id);
          const keys = intents.get(spaceId) ?? new Set();
          keys.add(naturalKey);
          intents.set(spaceId, keys);
        }
        return { maxId, intents };
      }),
  );

  /**
   * Clear a serviced natural-key intent, bounded by the id captured at read time.
   */
  clearNaturalKeyIntents = Effect.fn('EntityMetaIndex.clearNaturalKeyIntents')(
    (
      spaceId: SpaceId,
      naturalKey: string,
      upToId: number,
    ): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`DELETE FROM naturalKeyIntents WHERE spaceId = ${spaceId} AND naturalKey = ${naturalKey} AND id <= ${upToId}`;
      }),
  );

  query = Effect.fn('EntityMetaIndex.query')(
    (
      query: Pick<EntityMeta, 'spaceId' | 'typeDXN'>,
    ): Effect.Effect<readonly EntityMeta[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const normalizedTypeDXN = _normalizeTypeUri(query.typeDXN);
        const parsedDxn = DXN.isDXN(normalizedTypeDXN) ? normalizedTypeDXN : undefined;
        const hasNoVersion = parsedDxn !== undefined && DXN.getVersion(parsedDxn) === undefined;
        const forms = _typeUriEquivalents(normalizedTypeDXN);
        const exactMatch = sql.or(forms.map((form) => sql`typeDXN = ${form}`));
        // Version wildcard must cover every equivalent form so a versionless query still matches
        // legacy versioned rows written under the single-slash prefix.
        const likeMatch = sql.or(forms.map((form) => sql`typeDXN LIKE ${_escapeLikePrefix(form)} ESCAPE '\\'`));

        // SQLite stores booleans as integers, so we need to specify the raw row type.
        const rows = hasNoVersion
          ? yield* sql<EntityMeta>`SELECT * FROM objectMeta WHERE spaceId = ${query.spaceId} AND (${exactMatch} OR ${likeMatch})`
          : yield* sql<EntityMeta>`SELECT * FROM objectMeta WHERE spaceId = ${query.spaceId} AND ${exactMatch}`;
        return rows.map((row) => ({
          ...row,
          deleted: !!row.deleted,
        }));
      }),
  );

  queryAll = Effect.fn('EntityMetaIndex.queryAll')(
    (query: {
      spaceIds: readonly EntityMeta['spaceId'][];
      includeAllQueues?: boolean;
      queueIds?: readonly string[] | null;
    }): Effect.Effect<readonly EntityMeta[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        if (query.spaceIds.length === 0 && (!query.queueIds || query.queueIds.length === 0)) {
          return [];
        }

        const sql = yield* SqlClient.SqlClient;
        const sourceCondition = buildSourceCondition(
          sql,
          query.spaceIds,
          query.includeAllQueues ?? false,
          query.queueIds ?? null,
        );
        const rows = yield* sql<EntityMeta>`SELECT * FROM objectMeta WHERE ${sourceCondition}`;
        return rows.map((row) => ({
          ...row,
          deleted: !!row.deleted,
        }));
      }),
  );

  queryTypes = Effect.fn('EntityMetaIndex.queryTypes')(
    ({
      spaceIds,
      typeDxns,
      inverted = false,
      includeAllQueues = false,
      queueIds = null,
    }: {
      spaceIds: readonly EntityMeta['spaceId'][];
      typeDxns: readonly EntityMeta['typeDXN'][];
      inverted?: boolean;
      includeAllQueues?: boolean;
      queueIds?: readonly string[] | null;
    }): Effect.Effect<readonly EntityMeta[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        if (spaceIds.length === 0 && (!queueIds || queueIds.length === 0)) {
          return [];
        }

        if (typeDxns.length === 0) {
          if (!inverted) {
            return [];
          }

          const sql = yield* SqlClient.SqlClient;
          const sourceCondition = buildSourceCondition(sql, spaceIds, includeAllQueues, queueIds);
          const rows = yield* sql<EntityMeta>`SELECT * FROM objectMeta WHERE ${sourceCondition}`;
          return rows.map((row) => ({
            ...row,
            deleted: !!row.deleted,
          }));
        }
        const sql = yield* SqlClient.SqlClient;
        const sourceCondition = buildSourceCondition(sql, spaceIds, includeAllQueues, queueIds);
        const typeWhere = sql.or(
          typeDxns.map((typeDXN) => {
            const normalized = _normalizeTypeUri(typeDXN);
            const parsedDxn = DXN.isDXN(normalized) ? normalized : undefined;
            const hasNoVersion = parsedDxn !== undefined && DXN.getVersion(parsedDxn) === undefined;
            const forms = _typeUriEquivalents(normalized);
            const exactMatch = sql.or(forms.map((form) => sql`typeDXN = ${form}`));
            return hasNoVersion
              ? sql.or([
                  exactMatch,
                  sql.or(forms.map((form) => sql`typeDXN LIKE ${_escapeLikePrefix(form)} ESCAPE '\\'`)),
                ])
              : exactMatch;
          }),
        );
        const rows = inverted
          ? yield* sql<EntityMeta>`SELECT * FROM objectMeta WHERE ${sourceCondition} AND NOT ${typeWhere}`
          : yield* sql<EntityMeta>`SELECT * FROM objectMeta WHERE ${sourceCondition} AND ${typeWhere}`;
        return rows.map((row) => ({
          ...row,
          deleted: !!row.deleted,
        }));
      }),
  );

  queryRelations = Effect.fn('EntityMetaIndex.queryRelations')(
    ({
      endpoint,
      anchorDxns,
    }: {
      endpoint: 'source' | 'target';
      anchorDxns: readonly string[];
    }): Effect.Effect<readonly EntityMeta[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        if (anchorDxns.length === 0) {
          return [];
        }
        const sql = yield* SqlClient.SqlClient;
        const column = endpoint === 'source' ? 'source' : 'target';
        const rows = yield* sql<EntityMeta>`SELECT * FROM objectMeta WHERE entityKind = 'relation' AND ${sql.in(
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
  update = Effect.fn('EntityMetaIndex.update')(
    (objects: IndexerObject[]): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;

        yield* Effect.forEach(
          objects,
          (object) =>
            Effect.gen(function* () {
              const { spaceId, queueId, queueNamespace, documentId, data } = object;

              // Extract metadata (Logic emulating Echo APIs as strict imports are unavailable).
              const castData = data;
              const objectId = castData.id;

              // Check for existing record by (spaceId, queueId) or (spaceId, documentId).
              type ExistingRow = {
                recordId: number;
                entityKind: string;
                typeDXN: string;
                source: string | null;
                target: string | null;
                parent: string | null;
                naturalKey: string | null;
              };
              let existing: readonly ExistingRow[];
              if (documentId) {
                existing =
                  yield* sql<ExistingRow>`SELECT recordId, entityKind, typeDXN, source, target, parent, naturalKey FROM objectMeta WHERE spaceId = ${spaceId} AND documentId = ${documentId} AND objectId = ${objectId} LIMIT 1`;
              } else if (queueId) {
                existing =
                  yield* sql<ExistingRow>`SELECT recordId, entityKind, typeDXN, source, target, parent, naturalKey FROM objectMeta WHERE spaceId = ${spaceId} AND queueId = ${queueId} AND objectId = ${objectId} LIMIT 1`;
              } else {
                // Should not happen based on IndexerObject definition (one must be present ideally), but handle gracefully.
                existing = [];
              }

              // Get max version + 1.
              const result = yield* sql<{ v: number | null }>`SELECT MAX(version) as v FROM objectMeta`;
              const [{ v }] = result;
              const version = (v ?? 0) + 1;

              // A partial block carries no `@type`/body — notably the `{ id, '@deleted': true }`
              // tombstone appended by `Feed.remove`. Preserve the prior row's body-derived columns
              // (type, kind, relation endpoints, parent) rather than recomputing them from the empty
              // block; otherwise `typeDXN` collapses to the `'type'` fallback and type-scoped queries
              // with `deleted: 'include'` stop matching the deleted object. Only `deleted`/`version`/
              // `updatedAt` advance for such a block.
              const priorRow = existing.length > 0 ? existing[0] : undefined;
              const isPartialBlock = castData[ATTR_TYPE] === undefined;
              const preserveBody = isPartialBlock && priorRow !== undefined;

              // Extract metadata.
              const entityKind = preserveBody
                ? priorRow.entityKind
                : castData[ATTR_RELATION_SOURCE]
                  ? 'relation'
                  : 'object';
              // Type identifier as stored on `system.type`: a typename DXN for static schemas,
              // an `echo:` EID for stored (dynamic) schemas. Normalize the EID form so the indexed
              // value matches the normalized value the query path compares against (legacy
              // single-slash `echo:/<id>` and canonical `echo:///<id>` address the same schema).
              // A preserved prior row was normalized when it was written, so it needs no re-normalizing.
              const typeDXN = preserveBody
                ? priorRow.typeDXN
                : URI.make(_normalizeTypeUri(castData[ATTR_TYPE] ? String(castData[ATTR_TYPE]) : 'type'));
              const deleted = castData[ATTR_DELETED] ? 1 : 0;
              // Relations.
              const source = preserveBody
                ? priorRow.source
                : entityKind === 'relation'
                  ? (castData[ATTR_RELATION_SOURCE] ?? null)
                  : null;
              const target = preserveBody
                ? priorRow.target
                : entityKind === 'relation'
                  ? (castData[ATTR_RELATION_TARGET] ?? null)
                  : null;
              // Parent (nullable).
              const parent = preserveBody ? priorRow.parent : (castData[ATTR_PARENT] ?? null);
              // Natural key (nullable) — from the meta section of the serialized object.
              const naturalKey = preserveBody
                ? priorRow.naturalKey
                : ((castData[ATTR_META] as { naturalKey?: string } | undefined)?.naturalKey ?? null);

              const updatedAtTimestamp = object.updatedAt;
              // Prefer the creation timestamp stored in the document (survives compaction/migrations).
              // Fall back to the automerge-derived updatedAt for legacy objects that predate this field.
              const createdAtTimestamp = object.createdAt ?? updatedAtTimestamp;

              if (existing.length > 0) {
                // Feed entries collapse by id to the latest whole-object block — a re-append reusing
                // an existing id (a live feed object's `Obj.update`) UPDATEs this row wholesale.
                // TODO(wittjosiah): With partial-update blocks (see `EchoFeedCodec.encode`'s TODO),
                // this becomes a field-level last-write-wins merge instead of a wholesale replace.
                yield* sql`
                  UPDATE objectMeta SET
                    version = ${version},
                    queueNamespace = ${queueNamespace ?? ''},
                    entityKind = ${entityKind},
                    typeDXN = ${typeDXN},
                    deleted = ${deleted},
                    source = ${source},
                    target = ${target},
                    parent = ${parent},
                    naturalKey = ${naturalKey},
                    updatedAt = ${updatedAtTimestamp}
                  WHERE recordId = ${existing[0].recordId}
                `;
              } else {
                yield* sql`
                  INSERT INTO objectMeta (
                    objectId, queueId, queueNamespace, spaceId, documentId,
                    entityKind, typeDXN, deleted, source, target, parent, naturalKey, version,
                    createdAt, updatedAt
                  ) VALUES (
                    ${objectId}, ${queueId ?? ''}, ${queueNamespace ?? ''}, ${spaceId}, ${documentId ?? ''},
                    ${entityKind}, ${typeDXN}, ${deleted},
                    ${source}, ${target}, ${parent}, ${naturalKey}, ${version},
                    ${createdAtTimestamp}, ${updatedAtTimestamp}
                  )
                `;
              }
            }),
          { discard: true },
        );
      }),
  );

  /**
   * Look up `recordIds` for objects that are already stored in the EntityMetaIndex.
   * Mutates the objects in place.
   */
  lookupRecordIds = Effect.fn('EntityMetaIndex.lookupRecordIds')(
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
              new Error(`Object not found in EntityMetaIndex: ${spaceId}/${documentId ?? queueId}/${objectId}`),
            );
          }
          object.recordId = result[0].recordId;
        }
      }),
  );

  /**
   * Look up object metadata by recordIds.
   */
  lookupByRecordIds = Effect.fn('EntityMetaIndex.lookupByRecordIds')(
    (recordIds: number[]): Effect.Effect<readonly EntityMeta[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        if (recordIds.length === 0) {
          return [];
        }

        const sql = yield* SqlClient.SqlClient;
        const rows = yield* sql<EntityMeta>`SELECT * FROM objectMeta WHERE ${sql.in('recordId', recordIds)}`;

        return rows.map((row) => ({
          ...row,
          deleted: !!row.deleted,
        }));
      }),
  );

  /**
   * Look up object metadata by object id across one or more spaces (space db and queue items).
   */
  queryObjectIds = Effect.fn('EntityMetaIndex.queryObjectIds')(
    (query: {
      spaceIds: readonly EntityMeta['spaceId'][];
      objectIds: readonly EntityMeta['objectId'][];
    }): Effect.Effect<readonly EntityMeta[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        if (query.spaceIds.length === 0 || query.objectIds.length === 0) {
          return [];
        }

        const sql = yield* SqlClient.SqlClient;
        const rows =
          yield* sql<EntityMeta>`SELECT * FROM objectMeta WHERE ${sql.in('spaceId', query.spaceIds)} AND ${sql.in('objectId', query.objectIds)}`;
        return rows.map((row) => ({
          ...row,
          deleted: !!row.deleted,
        }));
      }),
  );

  /**
   * Look up object metadata by objectId, spaceId, and queueId.
   */
  lookupByObjectId = Effect.fn('EntityMetaIndex.lookupByObjectId')(
    (query: {
      objectId: string;
      spaceId: string;
      queueId: string;
    }): Effect.Effect<EntityMeta | null, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const rows =
          yield* sql<EntityMeta>`SELECT * FROM objectMeta WHERE spaceId = ${query.spaceId} AND queueId = ${query.queueId} AND objectId = ${query.objectId} LIMIT 1`;

        if (rows.length === 0) {
          return null;
        }

        return {
          ...rows[0],
          deleted: !!rows[0].deleted,
        };
      }),
  );

  /**
   * Query objects by timestamp range.
   */
  queryByTimeRange = Effect.fn('EntityMetaIndex.queryByTimeRange')(
    (query: {
      spaceIds: readonly string[];
      updatedAfter?: number;
      updatedBefore?: number;
      createdAfter?: number;
      createdBefore?: number;
      includeAllQueues?: boolean;
      queueIds?: readonly string[] | null;
    }): Effect.Effect<readonly EntityMeta[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        if (query.spaceIds.length === 0 && (!query.queueIds || query.queueIds.length === 0)) {
          return [];
        }

        const sql = yield* SqlClient.SqlClient;
        const sourceCondition = buildSourceCondition(
          sql,
          query.spaceIds,
          query.includeAllQueues ?? false,
          query.queueIds ?? null,
        );

        const timeConditions: Statement.Fragment[] = [];
        if (query.updatedAfter != null) {
          timeConditions.push(sql`updatedAt >= ${query.updatedAfter}`);
        }
        if (query.updatedBefore != null) {
          timeConditions.push(sql`updatedAt <= ${query.updatedBefore}`);
        }
        if (query.createdAfter != null) {
          timeConditions.push(sql`createdAt >= ${query.createdAfter}`);
        }
        if (query.createdBefore != null) {
          timeConditions.push(sql`createdAt <= ${query.createdBefore}`);
        }

        const rows =
          timeConditions.length > 0
            ? yield* sql<EntityMeta>`SELECT * FROM objectMeta WHERE ${sourceCondition} AND ${sql.and(timeConditions)}`
            : yield* sql<EntityMeta>`SELECT * FROM objectMeta WHERE ${sourceCondition}`;

        return rows.map((row) => ({
          ...row,
          deleted: !!row.deleted,
        }));
      }),
  );

  /**
   * Query children by parent object ids.
   * Matches both:
   * - Objects whose `parent` field references one of the given parent ids (standard parent/child hierarchy).
   * - Queue items whose `queueId` equals one of the parent ids (e.g. items inside a Feed, since a feed's queue
   *   DXN uses the feed's object id as its queue id — see `Feed.getFeedUri`).
   */
  queryChildren = Effect.fn('EntityMetaIndex.queryChildren')(
    (query: {
      spaceId: SpaceId[];
      parentIds: EntityId[];
    }): Effect.Effect<readonly EntityMeta[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        if (query.parentIds.length === 0) {
          return [];
        }

        const sql = yield* SqlClient.SqlClient;
        const parentDzns = query.parentIds.map((id) => EID.make({ entityId: id }));
        const parentDxns = parentDzns;
        const rows =
          yield* sql<EntityMeta>`SELECT * FROM objectMeta WHERE ${sql.in('spaceId', query.spaceId)} AND (${sql.in('parent', parentDxns)} OR ${sql.in('queueId', query.parentIds)})`;

        return rows.map((row) => ({
          ...row,
          deleted: !!row.deleted,
        }));
      }),
  );
}
