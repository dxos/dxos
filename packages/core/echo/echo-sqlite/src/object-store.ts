//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Migrator from 'effect/unstable/sql/Migrator';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import { type SpaceId } from '@dxos/keys';

import { MIGRATIONS, MIGRATIONS_TABLE } from './migrations/index.ts';
import { type EntityRecord } from './record.ts';
import { type CompiledQuery } from './sql/compile.ts';

/**
 * A stored entity as the store returns it: its id and its ECHO JSON.
 */
export type StoredEntity = { readonly id: string; readonly body: Record<string, unknown> };

type BodyRow = { id: string; body: string };

type Store<A> = Effect.Effect<A, SqlError.SqlError, SqlClient.SqlClient>;

/**
 * SQLite I/O for the entities of one space. Every statement is constrained to the space, and every
 * read is either by id, by a compiled query, or of the (small) set of persisted types.
 */
export class ObjectStore {
  readonly #spaceId: SpaceId;

  constructor(spaceId: SpaceId) {
    this.#spaceId = spaceId;
  }

  /**
   * Applies pending schema migrations.
   */
  migrate(): Store<void> {
    return Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
      // A malformed bundled manifest is a defect, not something a caller recovers from.
      Effect.catchTag('MigrationError', (error) => Effect.die(error)),
      Effect.asVoid,
      Effect.withSpan('ObjectStore.migrate'),
    );
  }

  /**
   * Reads the persisted type entities, which must be registered before any object can hydrate.
   */
  loadTypes(): Store<StoredEntity[]> {
    const spaceId = this.#spaceId;
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql<BodyRow>`
        SELECT id, body FROM echo_entities INDEXED BY echo_entities_kind
        WHERE space_id = ${spaceId} AND kind = 'type' AND deleted = 0
      `;
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
      const rows = yield* sql<BodyRow>`SELECT id, body FROM echo_entities WHERE space_id = ${spaceId} AND id = ${id}`;
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
   * Upserts entities (row, reference rows and text) and permanently removes `purged` ids, in one
   * transaction.
   */
  write(records: readonly EntityRecord[], purged: readonly string[] = [], now = Date.now()): Store<void> {
    const spaceId = this.#spaceId;
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const writeOne = (record: EntityRecord) =>
        Effect.gen(function* () {
          const [{ seq }] = yield* sql<{ seq: number }>`
            INSERT INTO echo_entities
              (space_id, id, kind, type_dxn, deleted, parent_id, source_id, target_id, created_at, updated_at, body)
            VALUES (${spaceId}, ${record.id}, ${record.kind}, ${record.typeDxn}, ${record.deleted ? 1 : 0},
              ${record.parentId}, ${record.sourceId}, ${record.targetId}, ${now}, ${now}, ${JSON.stringify(record.body)})
            ON CONFLICT (space_id, id) DO UPDATE SET
              kind = excluded.kind, type_dxn = excluded.type_dxn, deleted = excluded.deleted,
              parent_id = excluded.parent_id, source_id = excluded.source_id, target_id = excluded.target_id,
              updated_at = excluded.updated_at, body = excluded.body
            RETURNING seq
          `;
          yield* sql`DELETE FROM echo_refs WHERE space_id = ${spaceId} AND source_id = ${record.id}`;
          for (const ref of record.refs) {
            yield* sql`INSERT OR IGNORE INTO echo_refs (space_id, source_id, prop_path, target_id)
              VALUES (${spaceId}, ${record.id}, ${ref.path}, ${ref.targetId})`;
          }
          yield* sql`DELETE FROM echo_fts WHERE rowid = ${seq}`;
          yield* sql`INSERT INTO echo_fts (rowid, text) VALUES (${seq}, ${record.text})`;
        });
      yield* sql.withTransaction(
        Effect.gen(function* () {
          yield* Effect.forEach(records, writeOne, { discard: true });
          if (purged.length > 0) {
            const ids = JSON.stringify(purged);
            yield* sql`DELETE FROM echo_fts WHERE rowid IN (SELECT seq FROM echo_entities
              WHERE space_id = ${spaceId} AND id IN (SELECT value FROM json_each(${ids})))`;
            yield* sql`DELETE FROM echo_refs WHERE space_id = ${spaceId} AND source_id IN (SELECT value FROM json_each(${ids}))`;
            yield* sql`DELETE FROM echo_entities WHERE space_id = ${spaceId} AND id IN (SELECT value FROM json_each(${ids}))`;
          }
        }),
      );
    }).pipe(Effect.withSpan('ObjectStore.write'));
  }

  /**
   * Ids of deleted rows and of everything their deletion hides: descendants through `parent_id` and
   * relations with a purged endpoint. Purging only the flagged rows would make those visible again.
   */
  deletedIds(): Store<string[]> {
    const spaceId = this.#spaceId;
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      // One recursive branch per indexed column: an OR across them would scan the space.
      const rows = yield* sql<{ id: string }>`
        WITH RECURSIVE gone(id) AS (
          SELECT id FROM echo_entities WHERE space_id = ${spaceId} AND deleted = 1
          UNION
          SELECT e.id FROM gone g CROSS JOIN echo_entities e ON e.space_id = ${spaceId} AND e.parent_id = g.id
          UNION
          SELECT e.id FROM gone g CROSS JOIN echo_entities e ON e.space_id = ${spaceId} AND e.source_id = g.id
          UNION
          SELECT e.id FROM gone g CROSS JOIN echo_entities e ON e.space_id = ${spaceId} AND e.target_id = g.id
        )
        SELECT id FROM gone
      `;
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
      const [row] = yield* sql<{ alive: number; deleted: number }>`
        SELECT COALESCE(SUM(deleted = 0), 0) AS alive, COALESCE(SUM(deleted = 1), 0) AS deleted
        FROM echo_entities WHERE space_id = ${spaceId}
      `;
      return { alive: Number(row.alive), deleted: Number(row.deleted) };
    });
  }
}

const parseRow = (row: BodyRow): StoredEntity => ({ id: row.id, body: JSON.parse(row.body) });
