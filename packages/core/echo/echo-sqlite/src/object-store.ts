//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Migrator from 'effect/sql/Migrator';
import * as SqlClient from 'effect/sql/SqlClient';
import type * as SqlError from 'effect/sql/SqlError';

import { Context } from '@dxos/context';
import { type Obj } from '@dxos/echo';
import { EchoFeedCodec } from '@dxos/echo-protocol';
import { TypeMetaSchemaDXN, objectStructureFromJson } from '@dxos/echo/internal';
import * as EffectEx from '@dxos/effect/EffectEx';
import { CypherError, type FeedOptions, FeedStore, type TrimResult } from '@dxos/feed';
import { IndexEngine } from '@dxos/index-core';
import { EID, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { AutomergeFeedSource } from './automerge-source.ts';
import {
  AUTOMERGE_NAMESPACE,
  type Doc,
  DocStore,
  type DocWrite,
  type WriteResult,
  documentFeedId,
} from './doc-store.ts';
import { ItemFeedSource } from './feed-source.ts';
import { ConvergenceKeyMerger, type MergeDocumentRef } from './merge.ts';
import { MIGRATIONS, MIGRATIONS_TABLE } from './migrations/index.ts';
import { type EntityRecord } from './record.ts';
import { type CompiledChanges } from './sql/changes.ts';
import { type CompiledQuery } from './sql/compile.ts';

/**
 * A stored entity as the store returns it: its id and its ECHO JSON.
 */
export type StoredEntity = {
  readonly id: string;
  /** The space of the row, when a query read several. */
  readonly spaceId?: string;
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
  spaceId?: string;
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
  /** Objects convergence-key merges changed since {@link takeMerged}. */
  #merged = new Set<string>();
  /** For the merge, whose document callbacks run effects from promises. */
  readonly #sql: SqlClient.SqlClient;
  /** Names this store's commits in the change log, so it skips its own. */
  readonly #writer = crypto.randomUUID();
  readonly #engine: IndexEngine;
  readonly #source: AutomergeFeedSource;
  readonly #items: ItemFeedSource;

  private constructor(spaceId: SpaceId, sql: SqlClient.SqlClient, actorId: string, assignPositions: boolean) {
    this.#spaceId = spaceId;
    this.#sql = sql;
    // A replica, whose positions come from the space's authority, unless this file is the authority.
    this.#feedStore = new FeedStore({ localActorId: actorId, assignPositions });
    this.#docs = new DocStore(this.#feedStore, spaceId);
    this.#engine = new IndexEngine(sql);
    this.#source = new AutomergeFeedSource({ feedStore: this.#feedStore, docs: this.#docs, spaceId, sql });
    this.#items = new ItemFeedSource({ feedStore: this.#feedStore, spaceId, sql });
  }

  /**
   * Applies pending migrations (feed store, indexer, then this store's) and opens the store.
   */
  static open(spaceId: SpaceId, options: { assignPositions?: boolean } = {}): Store<ObjectStore> {
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      // The feed store and the indexer share the file; their migrations come first, ours build on them.
      yield* new FeedStore({ localActorId: 'migrate', assignPositions: false }).migrate();
      yield* new IndexEngine(sql).migrate();
      yield* migrate();
      const actorId = yield* deviceActorId();
      return new ObjectStore(spaceId, sql, actorId, options.assignPositions ?? false);
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
   * Reads one feed item by its feed and id.
   */
  loadItem(feedId: string, id: string): Store<StoredEntity | undefined> {
    const spaceId = this.#spaceId;
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql.unsafe<BodyRow>(
        `SELECT m.objectId AS id, s.snapshot AS body, s.version AS version, m.createdAt, m.updatedAt, m.queueId, m.queueNamespace
FROM objectMeta m CROSS JOIN objectSnapshot s ON s.recordId = m.recordId
WHERE m.spaceId = ? AND m.queueId = ? AND m.objectId = ?`,
        [spaceId, feedId, id],
      );
      return rows.length > 0 ? parseRow(rows[0]) : undefined;
    });
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
   * Runs a compiled change query: change rows, or, for an aggregate, each group's record as JSON.
   */
  queryChanges(compiled: CompiledChanges): Store<Record<string, unknown>[]> {
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql.unsafe<Record<string, unknown>>(compiled.sql, compiled.params);
      return compiled.grouped
        ? rows.map((row) => JSON.parse(String(row.record)))
        : rows.map((row) => ({
            key: row.hash,
            source: 'document',
            time: row.time,
            actor: row.actor,
            seq: row.seq,
            ops: row.ops,
          }));
    }).pipe(Effect.withSpan('ObjectStore.queryChanges'));
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
        records.length > 0 ? yield* this.#docs.write(records.map(toDocWrite)) : new Map<string, WriteResult>();
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
   * Writes entities into their cached documents now; their next {@link write} appends the changes.
   * Undefined when a document is not cached.
   */
  edit(
    records: readonly (EntityRecord & { readonly heads?: readonly string[] })[],
  ): Map<string, WriteResult> | undefined {
    return this.#docs.edit(records.map(toDocWrite));
  }

  /** An object's cached document, if any. */
  peekDocument(id: string): Doc | undefined {
    return this.#docs.peek(id);
  }

  /**
   * Indexes every block the indexer has not seen yet, then the text index.
   */
  index(): Store<Set<string>> {
    return Effect.gen({ self: this }, function* () {
      const ctx = Context.default();
      const documents = new Set<string>();
      // A merge's writes are indexed in turn, which removes the losers from queries; a merge is
      // idempotent, so the pass after it finds nothing more to do.
      for (let round = 0; round < MAX_MERGE_ROUNDS; round++) {
        while (true) {
          const result = yield* this.#engine.update(ctx, this.#source, { spaceId: this.#spaceId });
          result.documents.forEach((id) => documents.add(id));
          if (result.done) {
            break;
          }
        }
        const merged = yield* this.#mergeConvergent();
        merged.forEach((id) => {
          documents.add(id);
          this.#merged.add(id);
        });
        if (merged.size === 0) {
          break;
        }
      }
      // After the object leg, which recorded them, and before the item leg, so it reads under the new options.
      yield* this.#applyFeedOptions();
      while (!(yield* this.#engine.update(ctx, this.#items, { spaceId: this.#spaceId })).done) {}
      // An append trims in its own transaction, but a bounded number of blocks; the rest goes here.
      yield* trimUntilDone(this.#feedStore.trimAll(this.#spaceId, Date.now()));
      yield* this.#purgeTrimmed();
      while (!(yield* this.#engine.updateSecondaryIndexes(ctx)).done) {}
      return documents;
    });
  }

  /**
   * Merges the duplicates among the convergence keys the last pass recorded (see {@link ConvergenceKeyMerger}),
   * and appends what the merge changed.
   *
   * @returns The objects whose documents the merge changed.
   */
  #mergeConvergent(): Store<Set<string>> {
    return Effect.gen({ self: this }, function* () {
      const { maxId, intents } = yield* this.#engine.takeConvergenceKeyIntents();
      if (intents.size === 0) {
        return new Set<string>();
      }
      const changed = new Set<string>();
      const run = <A, E>(effect: Effect.Effect<A, E, SqlClient.SqlClient>): Promise<A> =>
        EffectEx.runPromise(effect.pipe(Effect.provideService(SqlClient.SqlClient, this.#sql)));
      const docs = this.#docs;
      const documentRef = (id: string): MergeDocumentRef | null => {
        const doc = docs.peek(id);
        return doc
          ? {
              documentId: id,
              doc: () => docs.peek(id) ?? doc,
              change: (callback) => {
                if (docs.change(id, callback)) {
                  changed.add(id);
                }
              },
            }
          : null;
      };
      const merger = new ConvergenceKeyMerger({
        loadDoc: async (id) => {
          await run(docs.load([id]));
          return documentRef(id);
        },
        flushDoc: (id) => run(docs.persist([id])),
        queryByConvergenceKeys: (spaceId, keys) => run(this.#engine.queryByConvergenceKeys(spaceId, keys)),
        queryReferrers: (spaceId, targetId) =>
          run(this.#engine.queryReferrers(spaceId, EID.make({ entityId: targetId }))),
      });
      const { serviced } = yield* Effect.promise(() => merger.mergeDuplicates(intents));
      for (const [spaceId, keys] of serviced) {
        for (const key of keys) {
          yield* this.#engine.clearConvergenceKeyIntents(spaceId, key, maxId);
        }
      }
      // Reference rewrites are not flushed by the merge, which treats them as best effort.
      yield* docs.persist([...changed]);
      return changed;
    }).pipe(Effect.catchIf(isCypherError, (error) => Effect.die(error)));
  }

  /** The objects convergence-key merges changed since the last call, which resident copies lag. */
  takeMerged(): Set<string> {
    const merged = this.#merged;
    this.#merged = new Set();
    return merged;
  }

  /**
   * The space's convergence-key merge redirects: each merged-away object and the object it merged into.
   */
  redirects(): Store<Map<string, string>> {
    const spaceId = this.#spaceId;
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql<{ fromId: string; toId: string }>`
        SELECT fromId, toId FROM echo_sqlite_redirects WHERE spaceId = ${spaceId}`;
      return new Map(rows.map((row) => [row.fromId, row.toId]));
    });
  }

  /**
   * An object's merge record as its document holds it: what it merged into, and what merged into it.
   */
  mergeRecord(id: string): Store<{ mergedInto?: string; mergedFrom: string[] }> {
    return Effect.gen({ self: this }, function* () {
      const docs = yield* this.#docs.load([id]);
      const system = docs.get(id)?.objects?.[id]?.system;
      return {
        ...(system?.mergedInto !== undefined && { mergedInto: system.mergedInto }),
        mergedFrom: [...new Set(system?.mergedFrom ?? [])].sort(),
      };
    }).pipe(Effect.catchIf(isCypherError, (error) => Effect.die(error)));
  }

  /**
   * Stores each Feed object's options the last pass recorded on its feed, which trims the feed by them.
   * An intent stays pending when it cannot be applied, for the next pass.
   */
  #applyFeedOptions(): Store<void> {
    return Effect.gen({ self: this }, function* () {
      const { maxId, intents } = yield* this.#engine.takeFeedOptionsIntents();
      for (const { spaceId, feedId, namespace, options } of intents) {
        const feed = { spaceId, feedId, feedNamespace: namespace };
        const { trim } = yield* this.#feedStore.setFeedOptions({ ...feed, options });
        yield* trimUntilDone(this.#feedStore.trim(feed, Date.now()), trim);
        yield* this.#engine.clearFeedOptionsIntents(spaceId, feedId, maxId);
      }
    }).pipe(
      Effect.catchIf(Schema.isSchemaError, (error) =>
        Effect.sync(() => log.warn('feed options could not be applied', { error })),
      ),
    );
  }

  /** Removes the index rows of the blocks retention deleted, then forgets them. */
  #purgeTrimmed(): Store<void> {
    return Effect.gen({ self: this }, function* () {
      while (true) {
        const { maxId, blocks } = yield* this.#feedStore.takeTrimmed({ limit: PURGE_BATCH });
        if (blocks.length === 0) {
          return;
        }
        const byFeed = new Map<string, { spaceId: SpaceId; queueId: string; blocks: typeof blocks }>();
        for (const block of blocks) {
          if (!SpaceId.isValid(block.spaceId)) {
            continue;
          }
          const key = `${block.spaceId}/${block.feedId}`;
          const entry = byFeed.get(key) ?? { spaceId: block.spaceId, queueId: block.feedId, blocks: [] };
          entry.blocks.push(block);
          byFeed.set(key, entry);
        }
        for (const feed of byFeed.values()) {
          yield* this.#engine.purgeFeedBlocks(feed);
        }
        yield* this.#feedStore.clearTrimmed(maxId);
      }
    });
  }

  /**
   * Each feed's stored options, by feed id, which queries read to hide expired and unindexed items.
   */
  feedOptions(): Store<Map<string, FeedOptions>> {
    return this.#feedStore.listFeedOptions(this.#spaceId);
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
   * Forgets cached documents (and feed-store caches) that another writer appended to, so the next read sees them.
   */
  invalidate(ids: Iterable<string>): void {
    this.#docs.invalidate(ids);
    // The feed store caches feed heads and rows, which another writer's appends leave behind.
    this.#feedStore.resetCaches();
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
  /**
   * Records that this store's commit wrote `ids`, for other connections to the file, and forgets
   * records old enough that every polling connection has read them.
   */
  logChanges(ids: Iterable<string>): Store<void> {
    const spaceId = this.#spaceId;
    const writer = this.#writer;
    const objectIds = [...ids];
    return Effect.gen(function* () {
      if (objectIds.length === 0) {
        return;
      }
      const sql = yield* SqlClient.SqlClient;
      const now = Date.now();
      yield* sql.unsafe(
        `INSERT INTO echo_sqlite_change_log (spaceId, objectId, writer, at)
SELECT ?1, value, ?2, ?3 FROM json_each(?4)`,
        [spaceId, writer, now, JSON.stringify(objectIds)],
      );
      yield* sql`DELETE FROM echo_sqlite_change_log WHERE at < ${now - CHANGE_LOG_RETENTION_MS}`;
    });
  }

  /**
   * The objects other connections' commits wrote after change `afterId`, and the newest change id.
   * With no `afterId`, only the newest id: where a new reader starts.
   */
  readChanges(afterId?: number): Store<{ lastId: number; ids: Set<string> }> {
    const spaceId = this.#spaceId;
    const writer = this.#writer;
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      if (afterId === undefined) {
        const [row] = yield* sql<{ lastId: number | null }>`SELECT MAX(id) AS lastId FROM echo_sqlite_change_log`;
        return { lastId: row?.lastId ?? 0, ids: new Set<string>() };
      }
      const rows = yield* sql<{ id: number; objectId: string; writer: string }>`
        SELECT id, objectId, writer FROM echo_sqlite_change_log WHERE spaceId = ${spaceId} AND id > ${afterId} ORDER BY id`;
      const [newest] = yield* sql<{ lastId: number | null }>`SELECT MAX(id) AS lastId FROM echo_sqlite_change_log`;
      return {
        lastId: newest?.lastId ?? afterId,
        ids: new Set(rows.filter((row) => row.writer !== writer).map((row) => row.objectId)),
      };
    });
  }

  /** SQLite's `data_version`: it changes when another connection commits to the file. */
  dataVersion(): Store<number> {
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const [row] = yield* sql<{ data_version: number }>`PRAGMA data_version`;
      return row?.data_version ?? 0;
    });
  }

  /**
   * Takes or renews the space's sync lease for `holder`: granted when nobody holds it, `holder` already
   * does, or the holder has not renewed it for `ttl` ms. Atomic, so two connections never both hold it.
   */
  holdSyncLease(holder: string, ttl: number): Store<boolean> {
    const spaceId = this.#spaceId;
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const now = Date.now();
      yield* sql`
        INSERT INTO echo_sqlite_sync_leases (spaceId, holder, renewedAt) VALUES (${spaceId}, ${holder}, ${now})
        ON CONFLICT (spaceId) DO UPDATE SET holder = excluded.holder, renewedAt = excluded.renewedAt
        WHERE echo_sqlite_sync_leases.holder = excluded.holder OR echo_sqlite_sync_leases.renewedAt < ${now - ttl}`;
      const [row] = yield* sql<{
        holder: string;
      }>`SELECT holder FROM echo_sqlite_sync_leases WHERE spaceId = ${spaceId}`;
      return row?.holder === holder;
    });
  }

  /** Gives up the space's sync lease, if `holder` holds it, so another connection takes it at once. */
  releaseSyncLease(holder: string): Store<void> {
    const spaceId = this.#spaceId;
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`DELETE FROM echo_sqlite_sync_leases WHERE spaceId = ${spaceId} AND holder = ${holder}`;
    });
  }

  /**
   * Folds each stored document of the space into one chunk (see {@link DocStore.compact}).
   *
   * @returns The number of chunks deleted.
   */
  compactDocuments(): Store<number> {
    const spaceId = this.#spaceId;
    return Effect.gen({ self: this }, function* () {
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql.unsafe<{ id: string }>(
        `SELECT objectId AS id FROM objectMeta m WHERE m.spaceId = ?1 AND ${DOCUMENT_ROWS}`,
        [spaceId],
      );
      return yield* this.#docs.compact(rows.map((row) => row.id));
    }).pipe(Effect.catchIf(isCypherError, (error) => Effect.die(error)));
  }

  deletedIds(): Store<string[]> {
    const spaceId = this.#spaceId;
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      // One recursive branch per indexed column: an OR across them would scan the space.
      // A merged-away object is not garbage: it stays resolvable as a redirect to its winner.
      const rows = yield* sql.unsafe<{ id: string }>(
        `WITH RECURSIVE gone(id) AS (
  SELECT m.objectId FROM objectMeta m WHERE m.spaceId = ?1 AND m.deleted = 1 AND ${DOCUMENT_ROWS}
    AND NOT EXISTS (SELECT 1 FROM echo_sqlite_redirects x WHERE x.spaceId = ?1 AND x.fromId = m.objectId)
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
  spaceId: row.spaceId,
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

const toDocWrite = (record: EntityRecord & { readonly heads?: readonly string[] }): DocWrite => ({
  id: record.id,
  structure: objectStructureFromJson(record.body as Obj.JSON, { createdAt: record.createdAt }),
  heads: record.heads,
});

/** How long change-log records are kept (an hour), far beyond any connection's poll interval. */
const CHANGE_LOG_RETENTION_MS = 60 * 60 * 1000;

/** Index rounds a pass runs while convergence-key merges keep writing. */
const MAX_MERGE_ROUNDS = 4;

/** Trimmed blocks purged from the index per batch. */
const PURGE_BATCH = 500;

/** Repeats a bounded trim until it reports nothing left past a limit. */
const trimUntilDone = <E, R>(
  trim: Effect.Effect<TrimResult, E, R>,
  first: TrimResult = { deleted: 0, more: true },
): Effect.Effect<void, E, R> =>
  Effect.gen(function* () {
    let result = first;
    while (result.more) {
      result = yield* trim;
    }
  });
