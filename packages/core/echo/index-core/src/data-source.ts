//
// Copyright 2026 DXOS.org
//

import type * as Effect from 'effect/Effect';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import { type Context } from '@dxos/context';
import type { SpaceId } from '@dxos/keys';

import { type DocumentActivity, type IndexerObject } from './indexes/interface.ts';

/**
 * Cursor into indexable data-source.
 */
export interface DataSourceCursor {
  spaceId: SpaceId | null;

  /**
   * documentId or queueNamespace.
   */
  resourceId: string | null;

  /**
   * heads or queue position.
   */
  cursor: number | string;
}

export interface IndexDataSource {
  readonly sourceName: string; // e.g. queue, automerge, etc.

  /**
   * Objects already carry their `objectMeta` row and `recordId` because they were read back out of
   * the index. A pass over such a source only writes its own index: re-stamping the metadata would
   * bump the very counter the source reads, so the pass would never catch up with itself.
   */
  readonly indexed?: boolean;

  /**
   * Marks the start/end of one `IndexEngine.update` pass, letting a source reuse the
   * cursor-independent part of its read across every index updated in that pass. Cursors differ per
   * index, so the diff itself cannot be shared — only the underlying snapshot. Optional: a source
   * with no expensive shared read can omit both.
   */
  beginPass?(): void;
  endPass?(): void;

  /**
   * Objects changed since `cursors`, and, when `opts.activity` is set, the changes behind them per
   * document (the activity index's input). Both are relative to the same cursors, so a source
   * reporting a change once per cursor advance reports it exactly once. `opts.objects === false`
   * asks for the activity alone, so an activity-only caller does not pay for object extraction.
   */
  getChangedObjects(
    ctx: Context,
    cursors: DataSourceCursor[],
    opts?: { limit?: number; activity?: boolean; objects?: boolean },
  ): Effect.Effect<
    { objects: IndexerObject[]; cursors: DataSourceCursor[]; activity?: DocumentActivity[] },
    SqlError.SqlError
  >;
}
