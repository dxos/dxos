//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Migrator from 'effect/unstable/sql/Migrator';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import { type SpaceId } from '@dxos/keys';

import { MIGRATIONS, MIGRATIONS_TABLE } from './migrations/device-annotations/index.ts';
import { chunkArray, chunkSizeForBoundVariables } from './utils.ts';

/**
 * One device-scoped annotation value.
 */
export type DeviceAnnotationRow = {
  spaceId: SpaceId;
  documentId: string;
  objectId: string;
  key: string;
  /** JSON encoding of the value. */
  value: string;
};

/**
 * A write to a device-scoped annotation; an absent `value` deletes the key.
 */
export type DeviceAnnotationWrite = Omit<DeviceAnnotationRow, 'value'> & { value?: string };

/**
 * Values of annotations declared with `storage: 'device'`.
 *
 * Not an index: the rows are the only copy of the data, never derived from a document. They live in
 * the index database because queries filter on them alongside `objectMeta`, and that database is
 * already local to the device.
 */
export class DeviceAnnotationStore {
  readonly #sql: SqlClient.SqlClient;

  constructor(sql: SqlClient.SqlClient) {
    this.#sql = sql;
  }

  /**
   * Applies any migrations this database has not recorded yet.
   */
  migrate = Effect.fn('DeviceAnnotationStore.migrate')(() =>
    Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
      // A malformed bundled manifest is a defect, not something a caller can recover from.
      Effect.catchTag('MigrationError', (error) => Effect.die(error)),
      Effect.asVoid,
      Effect.provideService(SqlClient.SqlClient, this.#sql),
    ),
  );

  /**
   * Applies writes in one transaction, in order.
   */
  write = Effect.fn('DeviceAnnotationStore.write')(
    (writes: readonly DeviceAnnotationWrite[]): Effect.Effect<void, SqlError.SqlError> =>
      Effect.gen({ self: this }, function* () {
        if (writes.length === 0) {
          return;
        }
        const sql = this.#sql;
        yield* sql.withTransaction(
          Effect.forEach(
            writes,
            ({ spaceId, documentId, objectId, key, value }) =>
              value === undefined
                ? sql`DELETE FROM deviceAnnotations WHERE spaceId = ${spaceId} AND objectId = ${objectId} AND key = ${key}`
                : sql`INSERT INTO deviceAnnotations (spaceId, objectId, key, documentId, value)
                    VALUES (${spaceId}, ${objectId}, ${key}, ${documentId}, ${value})
                    ON CONFLICT (spaceId, objectId, key) DO UPDATE SET documentId = excluded.documentId, value = excluded.value`,
            { discard: true },
          ),
        );
      }),
  );

  /**
   * Every value recorded against the given documents.
   */
  queryByDocuments = Effect.fn('DeviceAnnotationStore.queryByDocuments')(
    (documentIds: readonly string[]): Effect.Effect<readonly DeviceAnnotationRow[], SqlError.SqlError> =>
      Effect.gen({ self: this }, function* () {
        const sql = this.#sql;
        const rows: DeviceAnnotationRow[] = [];
        for (const chunk of chunkArray([...new Set(documentIds)], chunkSizeForBoundVariables(1))) {
          rows.push(
            ...(yield* sql<DeviceAnnotationRow>`SELECT spaceId, documentId, objectId, key, value FROM deviceAnnotations WHERE ${sql.in('documentId', chunk)}`),
          );
        }
        return rows;
      }),
  );

  /**
   * Every value recorded against the given objects of one space.
   */
  queryByObjects = Effect.fn('DeviceAnnotationStore.queryByObjects')(
    (
      spaceId: SpaceId,
      objectIds: readonly string[],
    ): Effect.Effect<readonly DeviceAnnotationRow[], SqlError.SqlError> =>
      Effect.gen({ self: this }, function* () {
        const sql = this.#sql;
        const rows: DeviceAnnotationRow[] = [];
        for (const chunk of chunkArray([...new Set(objectIds)], chunkSizeForBoundVariables(2))) {
          rows.push(
            ...(yield* sql<DeviceAnnotationRow>`SELECT spaceId, documentId, objectId, key, value FROM deviceAnnotations WHERE spaceId = ${spaceId} AND ${sql.in('objectId', chunk)}`),
          );
        }
        return rows;
      }),
  );

  /**
   * Drops the values of garbage-collected documents and objects.
   */
  deleteObjects = Effect.fn('DeviceAnnotationStore.deleteObjects')(
    (opts: {
      spaceId: SpaceId;
      documentIds: readonly string[];
      objects: readonly { objectId: string }[];
    }): Effect.Effect<void, SqlError.SqlError> =>
      Effect.gen({ self: this }, function* () {
        const sql = this.#sql;
        const chunkSize = chunkSizeForBoundVariables(2);
        for (const chunk of chunkArray([...new Set(opts.documentIds)], chunkSize)) {
          yield* sql`DELETE FROM deviceAnnotations WHERE spaceId = ${opts.spaceId} AND ${sql.in('documentId', chunk)}`;
        }
        const objectIds = [...new Set(opts.objects.map(({ objectId }) => objectId))];
        for (const chunk of chunkArray(objectIds, chunkSize)) {
          yield* sql`DELETE FROM deviceAnnotations WHERE spaceId = ${opts.spaceId} AND ${sql.in('objectId', chunk)}`;
        }
      }),
  );
}
