//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Migrator from 'effect/unstable/sql/Migrator';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import { type SpaceId } from '@dxos/keys';

import { MIGRATIONS, MIGRATIONS_TABLE } from './migrations/index.ts';

/**
 * Stored form of one entity.
 */
export type ObjectRecord = {
  id: string;
  kind: string;
  typename: string;
  deleted: boolean;
  /** ECHO JSON (`Obj.toJSON`) plus `@parent`. */
  data: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
};

type ObjectRow = {
  id: string;
  kind: string;
  typename: string;
  deleted: number;
  data: string;
  created_at: number;
  updated_at: number;
};

/**
 * SQLite persistence for the entities of one space.
 */
export class ObjectStore {
  readonly #spaceId: SpaceId;

  constructor(spaceId: SpaceId) {
    this.#spaceId = spaceId;
  }

  /**
   * Applies pending schema migrations.
   */
  migrate(): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> {
    return Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
      // A malformed bundled manifest is a defect, not something a caller recovers from.
      Effect.catchTag('MigrationError', (error) => Effect.die(error)),
      Effect.asVoid,
      Effect.withSpan('ObjectStore.migrate'),
    );
  }

  /**
   * Reads every stored entity of the space, deleted ones included.
   */
  list(): Effect.Effect<ObjectRecord[], SqlError.SqlError, SqlClient.SqlClient> {
    const spaceId = this.#spaceId;
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql<ObjectRow>`
        SELECT id, kind, typename, deleted, data, created_at, updated_at
        FROM echo_objects WHERE space_id = ${spaceId} ORDER BY id
      `;
      return rows.map((row): ObjectRecord => ({
        id: row.id,
        kind: row.kind,
        typename: row.typename,
        deleted: Number(row.deleted) !== 0,
        data: JSON.parse(row.data),
        createdAt: Number(row.created_at),
        updatedAt: Number(row.updated_at),
      }));
    }).pipe(Effect.withSpan('ObjectStore.list'));
  }

  /**
   * Inserts or replaces entities in a single transaction.
   */
  write(records: readonly ObjectRecord[]): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> {
    const spaceId = this.#spaceId;
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql.withTransaction(
        Effect.forEach(
          records,
          (record) => sql`
            INSERT INTO echo_objects (space_id, id, kind, typename, deleted, data, created_at, updated_at)
            VALUES (${spaceId}, ${record.id}, ${record.kind}, ${record.typename}, ${record.deleted ? 1 : 0},
              ${JSON.stringify(record.data)}, ${record.createdAt}, ${record.updatedAt})
            ON CONFLICT (space_id, id) DO UPDATE SET
              kind = excluded.kind,
              typename = excluded.typename,
              deleted = excluded.deleted,
              data = excluded.data,
              updated_at = excluded.updated_at
          `,
          { discard: true },
        ),
      );
    }).pipe(Effect.withSpan('ObjectStore.write'));
  }

  /**
   * Permanently removes entities.
   */
  delete(ids: readonly string[]): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> {
    const spaceId = this.#spaceId;
    return Effect.gen(function* () {
      if (ids.length === 0) {
        return;
      }
      const sql = yield* SqlClient.SqlClient;
      yield* sql`DELETE FROM echo_objects WHERE space_id = ${spaceId} AND ${sql.in('id', ids)}`;
    }).pipe(Effect.withSpan('ObjectStore.delete'));
  }
}
