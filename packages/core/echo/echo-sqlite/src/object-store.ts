//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Migrator from 'effect/sql/Migrator';
import * as SqlClient from 'effect/sql/SqlClient';
import type * as SqlError from 'effect/sql/SqlError';

import { Context } from '@dxos/context';
import { type Obj } from '@dxos/echo';
import { EchoFeedCodec } from '@dxos/echo-protocol';
import { TypeMetaSchemaDXN, objectStructureFromJson } from '@dxos/echo/internal';
import { CypherError, FeedStore } from '@dxos/feed';
import { IndexEngine } from '@dxos/index-core';
import { type SpaceId } from '@dxos/keys';

import { AutomergeFeedSource } from './automerge-source.ts';
import { AUTOMERGE_NAMESPACE, DocStore, type WriteResult, documentFeedId } from './doc-store.ts';
import { ItemFeedSource } from './feed-source.ts';
import { MIGRATIONS, MIGRATIONS_TABLE } from './migrations/index.ts';
import { type EntityRecord } from './record.ts';
import { type CompiledQuery } from './sql/compile.ts';

/**
 * A stored entity as the store returns it: its id and its ECHO JSON.
 */
export type StoredEntity = {
  readonly id: string;
  readonly body: Record<string, unknown>;
  /** Heads of the document the body was read at. */
  readonly heads?: readonly string[];
  /** The feed holding the row, and its namespace, for a feed item. */
  readonly queueId?: string;
  readonly queueNamespace?: string;
  /** When the entity was created and last changed, in unix ms, as the index holds them. */
  readonly createdAt?: number;
  readonly updatedAt?: number;
  /** The row's relevance to the query that read it. */
  readonly rank?: number;
  /** The aggregate group of the row, for a grouped query. */
  readonly group?: { readonly key: string; readonly ord: number; readonly aggregates: Record<string, unknown> };
};

type BodyRow = {
  id: string;
  body: string;
  version: string | null;
  createdAt?: number | null;
  updatedAt?: number | null;
  queueId?: string | null;
  queueNamespace?: string | null;
  rank?: number | null;
  groupKey?: string;
  groupOrd?: number;
  aggregates?: string;
};

type Store<A> = Effect.Effect<A, SqlError.SqlError, SqlClient.SqlClient>;

/** Rows of document objects (not feed items) of one space; `m` is the `objectMeta` alias. */
const DOCUMENT_ROWS = `m.queueId = ''`;

/**
 * SQLite I/O for the entities of one space. Each object is an Automerge document whose chunks are
 * blocks of the feed store; the indexer turns those documents into the `objectMeta` /
 * `objectSnapshot` / `reverseRef` / `ftsIndex` rows every read comes from. Every read is by id, by a
 * compiled query, or of the (small) set of persisted types.
 */
export class ObjectStore {
  readonly #spaceId: SpaceId;
  readonly #feedStore: FeedStore;
  readonly #docs: DocStore;
  readonly #engine: IndexEngine;
  readonly #source: AutomergeFeedSource;
  readonly #items: ItemFeedSource;

  private constructor(spaceId: SpaceId, sql: SqlClient.SqlClient, actorId: string) {
    this.#spaceId = spaceId;
    // A replica: positions come from the space's authority, never from this file.
    this.#feedStore = new FeedStore({ localActorId: actorId, assignPositions: false });
    this.#docs = new DocStore(this.#feedStore, spaceId);
    this.#engine = new IndexEngine(sql);
    this.#source = new AutomergeFeedSource({ feedStore: this.#feedStore, docs: this.#docs, spaceId, sql });
    this.#items = new ItemFeedSource({ feedStore: this.#feedStore, spaceId, sql });
  }

  /**
   * Applies pending migrations (feed store, indexer, then this store's) and opens the store.
   */
  static open(spaceId: SpaceId): Store<ObjectStore> {
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      // The feed store and the indexer share the file; their migrations come first, ours build on them.
      yield* new FeedStore({ localActorId: 'migrate', assignPositions: false }).migrate();
      yield* new IndexEngine(sql).migrate();
      yield* migrate();
      const actorId = yield* deviceActorId();
      return new ObjectStore(spaceId, sql, actorId);
    }).pipe(Effect.withSpan('ObjectStore.open'));
  }

  get feedStore(): FeedStore {
    return this.#feedStore;
  }

  /**
   * Reads the persisted type entities, which must be registered before any object can hydrate.
   */
  loadTypes(): Store<StoredEntity[]> {
    const spaceId = this.#spaceId;
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql.unsafe<BodyRow>(
        `SELECT m.objectId AS id, s.snapshot AS body, s.version AS version, m.createdAt, m.updatedAt FROM objectMeta m
CROSS JOIN objectSnapshot s ON s.recordId = m.recordId
WHERE m.spaceId = ? AND m.typeDXN = ? AND m.deleted = 0 AND ${DOCUMENT_ROWS}`,
        [spaceId, TypeMetaSchemaDXN.toString()],
      );
      return rows.map(parseRow);
    }).pipe(Effect.withSpan('ObjectStore.loadTypes'));
  }

  /**
   * Reads one entity by id.
   */
  load(id: string): Store<StoredEntity | undefined> {
    const spaceId = this.#spaceId;
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql.unsafe<BodyRow>(
        `SELECT m.objectId AS id, s.snapshot AS body, s.version AS version, m.createdAt, m.updatedAt FROM objectMeta m
CROSS JOIN objectSnapshot s ON s.recordId = m.recordId
WHERE m.spaceId = ? AND m.objectId = ? AND ${DOCUMENT_ROWS}`,
        [spaceId, id],
      );
      return rows.length > 0 ? parseRow(rows[0]) : undefined;
    }).pipe(Effect.withSpan('ObjectStore.load'));
  }

  /**
   * Runs a compiled query.
   */
  query(compiled: CompiledQuery): Store<StoredEntity[]> {
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql.unsafe<BodyRow>(compiled.sql, compiled.params);
      return rows.map(parseRow);
    }).pipe(Effect.withSpan('ObjectStore.query'));
  }

  /**
   * `EXPLAIN QUERY PLAN` of a compiled query, one detail line per step.
   */
  explain(compiled: CompiledQuery): Store<string[]> {
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql.unsafe<{ detail: string }>(`EXPLAIN QUERY PLAN ${compiled.sql}`, compiled.params);
      return rows.map((row) => row.detail);
    });
  }

  /**
   * Writes each entity into its Automerge document (one chunk per changed document), permanently
   * removes `purged` ids, and indexes what changed, so the next read sees it.
   */
  write(
    records: readonly (EntityRecord & { readonly heads?: readonly string[] })[],
    purged: readonly string[] = [],
  ): Store<{ results: Map<string, WriteResult>; indexed: Set<string> }> {
    return Effect.gen({ self: this }, function* () {
      const results =
        records.length > 0
          ? yield* this.#docs.write(
              records.map((record) => ({
                id: record.id,
                structure: objectStructureFromJson(record.body as Obj.JSON, { createdAt: record.createdAt }),
                heads: record.heads,
              })),
            )
          : new Map<string, WriteResult>();
      if (purged.length > 0) {
        yield* this.#purge(purged);
      }
      const indexed = yield* this.index();
      return { results, indexed };
    }).pipe(
      Effect.catchIf(isCypherError, (error) => Effect.die(error)),
      Effect.withSpan('ObjectStore.write'),
    );
  }

  /**
   * Indexes every block the indexer has not seen yet, then the text index.
   */
  index(): Store<Set<string>> {
    return Effect.gen({ self: this }, function* () {
      const ctx = Context.default();
      const documents = new Set<string>();
      while (true) {
        const result = yield* this.#engine.update(ctx, this.#source, { spaceId: this.#spaceId });
        result.documents.forEach((id) => documents.add(id));
        if (result.done) {
          break;
        }
      }
      while (!(yield* this.#engine.update(ctx, this.#items, { spaceId: this.#spaceId })).done) {}
      while (!(yield* this.#engine.updateSecondaryIndexes(ctx)).done) {}
      return documents;
    });
  }

  /**
   * Appends items to a feed as one block each: an item's whole JSON, or a tombstone for a removed id.
   */
  appendItems(feedId: string, namespace: string, items: readonly Record<string, unknown>[]): Store<void> {
    const spaceId = this.#spaceId;
    return this.#feedStore
      .appendLocal(
        items.map((item) => ({ spaceId, feedId, feedNamespace: namespace, data: EchoFeedCodec.encode(item) })),
      )
      .pipe(
        Effect.asVoid,
        Effect.catchIf(isCypherError, (error) => Effect.die(error)),
      );
  }

  /**
   * Blocks of a feed's namespace still to push, and in total, for its sync state.
   */
  itemCounts(namespace: string): Store<{ blocksToPush: number; totalBlocks: number }> {
    const spaceId = this.#spaceId;
    return Effect.gen({ self: this }, function* () {
      const blocksToPush = yield* this.#feedStore.countUnpositionedBlocks({ spaceId, feedNamespace: namespace });
      const totalBlocks = yield* this.#feedStore.countNamespaceBlocks({ spaceId, feedNamespace: namespace });
      return { blocksToPush, totalBlocks };
    });
  }

  /**
   * Forgets cached documents that another writer appended to, so the next write reads them again.
   */
  invalidate(ids: Iterable<string>): void {
    this.#docs.invalidate(ids);
  }

  #purge(ids: readonly string[]): Effect.Effect<void, SqlError.SqlError | CypherError, SqlClient.SqlClient> {
    return Effect.gen({ self: this }, function* () {
      yield* this.#engine.deleteObjects({
        spaceId: this.#spaceId,
        documentIds: ids,
        objects: ids.map((id) => ({ documentId: id, objectId: id })),
      });
      for (const id of ids) {
        yield* this.#feedStore.deleteOldestBlocks({
          spaceId: this.#spaceId,
          feedNamespace: AUTOMERGE_NAMESPACE,
          feedId: documentFeedId(id),
          count: Number.MAX_SAFE_INTEGER,
        });
      }
      this.#docs.invalidate(ids);
    });
  }

  /**
   * The distinct versions the space's objects with meta `key` carry, for a version range's pre-pass.
   */
  versionsOf(key: string): Store<string[]> {
    const spaceId = this.#spaceId;
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql.unsafe<{ version: string | null }>(
        `SELECT DISTINCT json_extract(s.snapshot, '$."@meta".version') AS version FROM objectMeta m
CROSS JOIN objectSnapshot s ON s.recordId = m.recordId
WHERE m.spaceId = ? AND json_extract(s.snapshot, '$."@meta".key') = ?`,
        [spaceId, key],
      );
      return rows.flatMap((row) => (typeof row.version === 'string' ? [row.version] : []));
    });
  }

  /**
   * Ids of deleted rows and of everything their deletion hides: descendants through `parentId` and
   * relations with a purged endpoint. Purging only the flagged rows would make those visible again.
   */
  deletedIds(): Store<string[]> {
    const spaceId = this.#spaceId;
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      // One recursive branch per indexed column: an OR across them would scan the space.
      const rows = yield* sql.unsafe<{ id: string }>(
        `WITH RECURSIVE gone(id) AS (
  SELECT m.objectId FROM objectMeta m WHERE m.spaceId = ?1 AND m.deleted = 1 AND ${DOCUMENT_ROWS}
  UNION
  SELECT m.objectId FROM gone g CROSS JOIN objectMeta m ON m.spaceId = ?1 AND m.parentId = g.id WHERE ${DOCUMENT_ROWS}
  UNION
  SELECT m.objectId FROM gone g CROSS JOIN objectMeta m ON m.spaceId = ?1 AND m.sourceId = g.id WHERE ${DOCUMENT_ROWS}
  UNION
  SELECT m.objectId FROM gone g CROSS JOIN objectMeta m ON m.spaceId = ?1 AND m.targetId = g.id WHERE ${DOCUMENT_ROWS}
)
SELECT id FROM gone`,
        [spaceId],
      );
      return rows.map((row) => row.id);
    });
  }

  /**
   * Row counts by deleted flag.
   */
  counts(): Store<{ alive: number; deleted: number }> {
    const spaceId = this.#spaceId;
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const [row] = yield* sql.unsafe<{ alive: number; deleted: number }>(
        `SELECT COALESCE(SUM(m.deleted = 0), 0) AS alive, COALESCE(SUM(m.deleted = 1), 0) AS deleted
FROM objectMeta m WHERE m.spaceId = ? AND ${DOCUMENT_ROWS}`,
        [spaceId],
      );
      return { alive: Number(row.alive), deleted: Number(row.deleted) };
    });
  }
}

/**
 * Applies this store's own migrations.
 */
export const migrate = (): Store<void> =>
  Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
    // A malformed bundled manifest is a defect, not something a caller recovers from.
    Effect.catchTag('MigrationError', (error) => Effect.die(error)),
    Effect.asVoid,
    Effect.withSpan('ObjectStore.migrate'),
  );

/**
 * The actor id this file writes blocks as, minted on first use.
 */
const deviceActorId = (): Store<string> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`INSERT OR IGNORE INTO echo_sqlite_device (id, actorId) VALUES (0, ${crypto.randomUUID()})`;
    const [{ actorId }] = yield* sql<{ actorId: string }>`SELECT actorId FROM echo_sqlite_device WHERE id = 0`;
    return actorId;
  });

const isCypherError = (error: unknown): error is CypherError => error instanceof CypherError;

const parseRow = (row: BodyRow): StoredEntity => ({
  id: row.id,
  body: JSON.parse(row.body),
  heads: row.version ? JSON.parse(row.version) : undefined,
  queueId: row.queueId ?? undefined,
  queueNamespace: row.queueNamespace ?? undefined,
  rank: row.rank ?? undefined,
  createdAt: row.createdAt ?? undefined,
  updatedAt: row.updatedAt ?? undefined,
  group:
    row.groupKey !== undefined && row.groupOrd !== undefined
      ? { key: row.groupKey, ord: Number(row.groupOrd), aggregates: JSON.parse(row.aggregates ?? '{}') }
      : undefined,
});
