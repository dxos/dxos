//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import { type Context } from '@dxos/context';
import type { Obj } from '@dxos/echo';
import { EntityId } from '@dxos/keys';

import { type DataSourceCursor, type IndexDataSource } from './data-source.ts';
import { type EntityMeta } from './indexes/entity-meta-index.ts';
import { type IndexerObject } from './indexes/interface.ts';
import { SQL_CHUNK_SIZE } from './utils.ts';

/**
 * Cursor identity of every index fed from this source. `objectMeta.version` is global, so one
 * unscoped cursor row per index covers every space.
 */
const CURSOR: Omit<DataSourceCursor, 'cursor'> = { spaceId: null, resourceId: null };

/**
 * The index read back as a data source, ordered by the `objectMeta.version` counter the primary
 * pass stamps on everything it writes.
 *
 * Secondary indexes are built from what is already indexed rather than from automerge or a feed,
 * which is what lets them lag: a burst of 300 edits moves one object's counter 300 times and is
 * caught up in a single pass. Tracking that counter as an ordinary cursor in `indexCursor` means a
 * secondary index is retired and rebuilt exactly like a primary one — by dropping its cursor name.
 */
export class IndexedObjectSource implements IndexDataSource {
  readonly sourceName = 'index';
  readonly indexed = true;

  readonly #sql: SqlClient.SqlClient;

  constructor(sql: SqlClient.SqlClient) {
    this.#sql = sql;
  }

  getChangedObjects(
    _ctx: Context,
    cursors: DataSourceCursor[],
    opts?: { limit?: number },
  ): Effect.Effect<{ objects: IndexerObject[]; cursors: DataSourceCursor[] }, SqlError.SqlError> {
    return Effect.gen({ self: this }, function* () {
      const sql = this.#sql;
      const position = cursors[0]?.cursor;
      const cursor = typeof position === 'number' ? position : 0;
      // One batch is one transaction downstream, so the chunk size bounds it regardless of the
      // document-oriented limit a caller passes.
      const limit = Math.min(opts?.limit ?? SQL_CHUNK_SIZE, SQL_CHUNK_SIZE);

      // Inner join: a record's snapshot row is written in the same transaction that stamps its
      // counter, so a counter with no snapshot names a record that no longer exists.
      const rows = yield* sql<EntityMeta & { snapshot: string }>`
        SELECT m.*, s.snapshot
        FROM objectMeta AS m
        JOIN objectSnapshot AS s ON s.recordId = m.recordId
        WHERE m.version > ${cursor}
        ORDER BY m.version
        LIMIT ${limit}
      `;
      if (rows.length === 0) {
        return { objects: [], cursors: [] };
      }

      const objects = rows.map((row): IndexerObject => ({
        spaceId: row.spaceId,
        queueId: row.queueId === '' ? null : Schema.decodeSync(EntityId)(row.queueId),
        queueNamespace: row.queueNamespace === '' ? null : row.queueNamespace,
        documentId: row.documentId === '' ? null : row.documentId,
        queuePosition: row.queuePosition,
        recordId: row.recordId,
        data: JSON.parse(row.snapshot) as Obj.JSON,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt ?? 0,
      }));

      return { objects, cursors: [{ ...CURSOR, cursor: rows[rows.length - 1].version }] };
    });
  }
}
