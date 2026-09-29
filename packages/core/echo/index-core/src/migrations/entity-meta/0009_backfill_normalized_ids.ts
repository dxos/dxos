//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

import { type SpaceId } from '@dxos/keys';

import { localEntityId } from '../../entity-ids.ts';

type Row = {
  recordId: number;
  spaceId: string;
  parent: string | null;
  source: string | null;
  target: string | null;
};

/** Bounded so a large store migrates in steady memory rather than one statement per row. */
const BATCH_SIZE = 500;

/**
 * Fills `parentId`/`sourceId`/`targetId` for rows written before 0008 added them.
 *
 * 0008 only adds the columns, and `objectMeta` rows are rewritten by the primary indexing pass,
 * whose cursors no migration resets — so without this an upgraded database keeps the columns NULL
 * until each object next changes, and the compiled query path, which joins through them, silently
 * omits dependency, `child-of` and relation results. Derived with {@link localEntityId}, the same
 * rule the indexing pass applies, so a backfilled row is indistinguishable from a rewritten one.
 * NULL stays valid for a cross-space or non-entity reference, so a row is selected on `parent`,
 * `source` or `target` being set rather than on its id column being NULL.
 */
export const backfillNormalizedIds = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  let after = 0;
  while (true) {
    const rows = yield* sql<Row>`
      SELECT recordId, spaceId, parent, source, target FROM objectMeta
      WHERE recordId > ${after} AND (parent IS NOT NULL OR source IS NOT NULL OR target IS NOT NULL)
      ORDER BY recordId LIMIT ${BATCH_SIZE}`;
    if (rows.length === 0) {
      return;
    }
    for (const row of rows) {
      const spaceId = row.spaceId as SpaceId;
      yield* sql`
        UPDATE objectMeta SET
          parentId = ${localEntityId(row.parent, spaceId)},
          sourceId = ${localEntityId(row.source, spaceId)},
          targetId = ${localEntityId(row.target, spaceId)}
        WHERE recordId = ${row.recordId}`;
    }
    after = rows[rows.length - 1].recordId;
  }
});
