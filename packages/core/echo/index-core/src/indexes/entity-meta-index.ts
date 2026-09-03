//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Migrator from 'effect/unstable/sql/Migrator';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';
import type * as Statement from 'effect/unstable/sql/Statement';

import { ATTR_DELETED, ATTR_PARENT, ATTR_RELATION_SOURCE, ATTR_RELATION_TARGET, ATTR_TYPE } from '@dxos/echo/internal';
import { DXN, EID, EntityId, SpaceId, URI } from '@dxos/keys';
import { SqlTransaction } from '@dxos/sql-sqlite';

import { MIGRATIONS, MIGRATIONS_TABLE } from '../migrations/entity-meta';
import { SQL_CHUNK_SIZE, chunkArray } from '../utils';
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

/**
 * WHERE fragment matching the `typeDXN` column against any of the given type identifiers,
 * covering legacy-equivalent stored forms and — for versionless DXNs — versioned rows via a
 * LIKE prefix. Shared with `FtsIndex` so type scoping matches identically across indexes.
 */
export const buildTypeDxnCondition = (sql: SqlClient.SqlClient, typeDxns: readonly string[]): Statement.Fragment =>
  sql.or(
    typeDxns.map((typeDXN) => {
      const normalized = _normalizeTypeUri(typeDXN);
      const parsedDxn = DXN.isDXN(normalized) ? normalized : undefined;
      const hasNoVersion = parsedDxn !== undefined && DXN.getVersion(parsedDxn) === undefined;
      const forms = _typeUriEquivalents(normalized);
      const exactMatch = sql.or(forms.map((form) => sql`typeDXN = ${form}`));
      return hasNoVersion
        ? sql.or([exactMatch, sql.or(forms.map((form) => sql`typeDXN LIKE ${_escapeLikePrefix(form)} ESCAPE '\\'`))])
        : exactMatch;
    }),
  );

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
  /** Monotonically increasing sequence number assigned on insert/update for tracking indexing order. */
  version: Schema.Number,
  /** Unix ms timestamp when the object was first indexed. */
  createdAt: Schema.NullOr(Schema.Number),
  /** Unix ms timestamp when the object was last re-indexed. */
  updatedAt: Schema.NullOr(Schema.Number),
  /**
   * Global position assigned to the object's feed block — the insertion id a feed cursor names.
   * Null for automerge objects and for feed blocks not yet positioned.
   */
  queuePosition: Schema.NullOr(Schema.Number),
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

/**
 * Window over a feed's positioned blocks: resume after a cursor position and cap the page.
 * Only meaningful for a queue-scoped query — `queuePosition` is null for automerge objects, so a
 * caller must not apply this to a query that also selects from a space's documents.
 */
export interface QueueWindow {
  /** Exclusive lower bound: only blocks positioned strictly after this are returned. */
  after: number;
  /** Exclusive upper bound: only blocks positioned strictly before this are returned. */
  before?: number;
  /** Maximum rows to return, applied after ordering by position. */
  limit?: number;
  /**
   * Take the window from the end of the range instead of the start, so `limit` keeps the newest
   * blocks. Such a read also returns the unpositioned blocks — they follow every positioned one —
   * unless `before` bounds the window below the feed's end.
   */
  tail?: boolean;
}

/**
 * Trailing `... AND queuePosition > ? ORDER BY queuePosition LIMIT ?` for a windowed queue read.
 * Empty when the window is empty, so the unwindowed query keeps its previous shape (and its
 * unspecified row order).
 *
 * A tail read reverses the scan so the limit keeps the range's newest blocks. Rows still come back
 * in scan order, which for a tail read is newest-first — a caller that wants append order sorts
 * them, as it must anyway once unpositioned blocks are in the set.
 */
const buildQueueWindow = (sql: SqlClient.SqlClient, window: QueueWindow | undefined): Statement.Fragment => {
  if (window === undefined) {
    return sql``;
  }

  // A cursor read is over positioned blocks only — `queuePosition > ?` excludes the nulls, and
  // that is the intent: an unpositioned block has no place in the ordering yet, so admitting it
  // would let it slip past a later read that resumes beyond its eventual position.
  const upper = window.before !== undefined ? sql` AND queuePosition < ${window.before}` : sql``;
  const positioned = sql`queuePosition > ${window.after}${upper}`;
  const limit = window.limit !== undefined ? sql` LIMIT ${window.limit}` : sql``;

  if (!window.tail) {
    return sql` AND ${positioned} ORDER BY queuePosition ASC${limit}`;
  }

  // A tail read bounded above stops short of the feed's end, so the unpositioned blocks — which sit
  // past every position — are outside it; an unbounded one ends at the feed's end and includes them.
  const scope = window.before === undefined ? sql`(${positioned} OR queuePosition IS NULL)` : positioned;
  // Nulls are the newest blocks, so they lead a newest-first scan. SQLite would sort them last in
  // `DESC`, hence the explicit null-rank key.
  return sql` AND ${scope} ORDER BY (queuePosition IS NULL) DESC, queuePosition DESC${limit}`;
};

export class EntityMetaIndex implements Index {
  /**
   * Applies any migrations this database has not recorded yet.
   *
   * `SqlTransaction.clientLayer` is provided because the migrator wraps its work in the client's
   * `withTransaction`, which emits `BEGIN` / `COMMIT` — rejected in workerd.
   */
  migrate = Effect.fn('EntityMetaIndex.runMigrations')(() =>
    Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
      Effect.provide(SqlTransaction.clientLayer),
      // A malformed bundled manifest is a defect, not something a caller can recover from.
      Effect.catchTag('MigrationError', (error) => Effect.die(error)),
      Effect.asVoid,
    ),
  );

  query = Effect.fn('EntityMetaIndex.query')(
    (
      query: Pick<EntityMeta, 'spaceId' | 'typeDXN'>,
    ): Effect.Effect<readonly EntityMeta[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        // SQLite stores booleans as integers, so we need to specify the raw row type.
        const rows =
          yield* sql<EntityMeta>`SELECT * FROM objectMeta WHERE spaceId = ${query.spaceId} AND (${buildTypeDxnCondition(sql, [query.typeDXN])})`;
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
      window?: QueueWindow;
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
        const window = buildQueueWindow(sql, query.window);
        const rows = yield* sql<EntityMeta>`SELECT * FROM objectMeta WHERE ${sourceCondition}${window}`;
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
      window,
    }: {
      spaceIds: readonly EntityMeta['spaceId'][];
      typeDxns: readonly EntityMeta['typeDXN'][];
      inverted?: boolean;
      includeAllQueues?: boolean;
      queueIds?: readonly string[] | null;
      window?: QueueWindow;
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
          const rows =
            yield* sql<EntityMeta>`SELECT * FROM objectMeta WHERE ${sourceCondition}${buildQueueWindow(sql, window)}`;
          return rows.map((row) => ({
            ...row,
            deleted: !!row.deleted,
          }));
        }
        const sql = yield* SqlClient.SqlClient;
        const sourceCondition = buildSourceCondition(sql, spaceIds, includeAllQueues, queueIds);
        const typeWhere = buildTypeDxnCondition(sql, typeDxns);
        const queueWindow = buildQueueWindow(sql, window);
        const rows = inverted
          ? yield* sql<EntityMeta>`SELECT * FROM objectMeta WHERE ${sourceCondition} AND NOT ${typeWhere}${queueWindow}`
          : yield* sql<EntityMeta>`SELECT * FROM objectMeta WHERE ${sourceCondition} AND ${typeWhere}${queueWindow}`;
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
              const { spaceId, queueId, queueNamespace, documentId, data, queuePosition } = object;

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
              };
              let existing: readonly ExistingRow[];
              if (documentId) {
                existing =
                  yield* sql<ExistingRow>`SELECT recordId, entityKind, typeDXN, source, target, parent FROM objectMeta WHERE spaceId = ${spaceId} AND documentId = ${documentId} AND objectId = ${objectId} LIMIT 1`;
              } else if (queueId) {
                existing =
                  yield* sql<ExistingRow>`SELECT recordId, entityKind, typeDXN, source, target, parent FROM objectMeta WHERE spaceId = ${spaceId} AND queueId = ${queueId} AND objectId = ${objectId} LIMIT 1`;
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
                    updatedAt = ${updatedAtTimestamp},
                    queuePosition = ${queuePosition ?? null}
                  WHERE recordId = ${existing[0].recordId}
                `;
              } else {
                yield* sql`
                  INSERT INTO objectMeta (
                    objectId, queueId, queueNamespace, spaceId, documentId,
                    entityKind, typeDXN, deleted, source, target, parent, version,
                    createdAt, updatedAt, queuePosition
                  ) VALUES (
                    ${objectId}, ${queueId ?? ''}, ${queueNamespace ?? ''}, ${spaceId}, ${documentId ?? ''},
                    ${entityKind}, ${typeDXN}, ${deleted},
                    ${source}, ${target}, ${parent}, ${version},
                    ${createdAtTimestamp}, ${updatedAtTimestamp}, ${queuePosition ?? null}
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
   * Record ids of rows belonging to whole documents or specific objects — the set garbage
   * collection reclaims across the dependent indexes.
   */
  selectRecordIdsForRemoval = Effect.fn('EntityMetaIndex.selectRecordIdsForRemoval')(
    (query: {
      spaceId: SpaceId;
      documentIds: readonly string[];
      objects: readonly { documentId: string; objectId: string }[];
    }): Effect.Effect<number[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const recordIds = new Set<number>();

        for (const chunk of chunkArray(query.documentIds)) {
          const rows = yield* sql<{
            recordId: number;
          }>`SELECT recordId FROM objectMeta WHERE spaceId = ${query.spaceId} AND ${sql.in('documentId', chunk)}`;
          rows.forEach((row) => recordIds.add(row.recordId));
        }

        // Two bound variables per object; keep chunks under the SQLite limit.
        for (const chunk of chunkArray(query.objects, Math.floor(SQL_CHUNK_SIZE / 2))) {
          const conditions = chunk.map(
            (object) => sql`(documentId = ${object.documentId} AND objectId = ${object.objectId})`,
          );
          const rows = yield* sql<{
            recordId: number;
          }>`SELECT recordId FROM objectMeta WHERE spaceId = ${query.spaceId} AND (${sql.or(conditions)})`;
          rows.forEach((row) => recordIds.add(row.recordId));
        }

        return [...recordIds];
      }),
  );

  /** Delete metadata rows by record id. */
  deleteByRecordIds = Effect.fn('EntityMetaIndex.deleteByRecordIds')(
    (recordIds: readonly number[]): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        for (const chunk of chunkArray(recordIds)) {
          yield* sql`DELETE FROM objectMeta WHERE ${sql.in('recordId', chunk)}`;
        }
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
