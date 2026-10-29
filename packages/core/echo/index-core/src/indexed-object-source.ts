//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import type * as SqlError from 'effect/sql/SqlError';

import { type Context } from '@dxos/context';
import { EntityId } from '@dxos/keys';

import { type DataSourceCursor, type IndexDataSource } from './data-source.ts';
import { type IndexerObject } from './indexes/interface.ts';
import { type ObjectSnapshotIndex } from './indexes/object-snapshot-index.ts';

/**
 * Cursor identity of every index fed from this source. `objectMeta.version` is global, so one
 * unscoped cursor row per index covers every space.
 */
const CURSOR: Omit<DataSourceCursor, 'cursor'> = { spaceId: null, resourceId: null };

/**
 * Most objects one pass reads; the engine asks for at most one transaction's worth. Independent of
 * how many bound variables a statement may carry - the indexes chunk their own SQL (see `chunkRows`).
 */
const INDEX_BATCH_SIZE = 500;

const readVersion = (cursors: DataSourceCursor[]): number => {
  const cursor = cursors[0]?.cursor;
  return typeof cursor === 'number' ? cursor : 0;
};

/**
 * The index read back as a data source, ordered by the `objectMeta.version` counter the primary
 * pass stamps on everything it writes.
 *
 * Secondary indexes are built from what is already indexed rather than from automerge or a feed,
 * which is what lets them lag: a burst of 300 edits moves one object's counter 300 times and is
 * caught up in a single pass. Tracking that counter as an ordinary cursor in `indexCursor` means a
 * secondary index is retired and rebuilt exactly like a primary one - by dropping its cursor name.
 */
export class IndexedObjectSource implements IndexDataSource {
  readonly sourceName = 'index';
  readonly indexed = true;

  readonly #snapshots: ObjectSnapshotIndex;

  constructor(snapshots: ObjectSnapshotIndex) {
    this.#snapshots = snapshots;
  }

  /** How many objects {@link getChangedObjects} has yet to read past `cursors`. */
  countChangedObjects(cursors: DataSourceCursor[]): Effect.Effect<number, SqlError.SqlError> {
    return this.#snapshots.countStampedSince(readVersion(cursors));
  }

  getChangedObjects(
    _ctx: Context,
    cursors: DataSourceCursor[],
    opts?: { limit?: number },
  ): Effect.Effect<{ objects: IndexerObject[]; cursors: DataSourceCursor[] }, SqlError.SqlError> {
    return Effect.gen({ self: this }, function* () {
      const limit = Math.min(opts?.limit ?? INDEX_BATCH_SIZE, INDEX_BATCH_SIZE);
      const rows = yield* this.#snapshots.readStampedSince(readVersion(cursors), limit);
      if (rows.length === 0) {
        return { objects: [], cursors: [] };
      }

      const objects = rows.map(({ meta, snapshot }): IndexerObject => ({
        spaceId: meta.spaceId,
        queueId: meta.queueId === '' ? null : Schema.decodeSync(EntityId)(meta.queueId),
        queueNamespace: meta.queueNamespace === '' ? null : meta.queueNamespace,
        documentId: meta.documentId === '' ? null : meta.documentId,
        queuePosition: meta.queuePosition,
        recordId: meta.recordId,
        data: snapshot,
        createdAt: meta.createdAt,
        updatedAt: meta.updatedAt ?? 0,
      }));

      return { objects, cursors: [{ ...CURSOR, cursor: rows[rows.length - 1].meta.version }] };
    });
  }
}
