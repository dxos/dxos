//
// Copyright 2026 DXOS.org
//

import type * as Effect from 'effect/Effect';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import type { Obj } from '@dxos/echo';
import type { EntityId, SpaceId } from '@dxos/keys';

/**
 * Data describing objects returned from sources to the indexer.
 */
export interface IndexerObject {
  spaceId: SpaceId;
  /**
   * Queue id if object is from the queue.
   * If null, `documentId` must be set.
   */
  queueId: EntityId | null;
  /**
   * Queue subspace namespace (e.g. 'data', 'trace') the object lives in.
   * Set together with `queueId`; null for non-queue objects.
   */
  queueNamespace: string | null;
  /**
   * Document id if object is from the automerge document.
   * If null, `queueId` must be set.
   */
  documentId: string | null;

  /**
   * Global position the position authority assigned this object's feed block — the monotonic
   * insertion id a feed cursor names. Set only for queue objects that have been positioned; null
   * for automerge objects and for local blocks not yet acknowledged.
   */
  queuePosition?: number | null;

  /**
   * Record id from the objectMeta index.
   * `Null` before the object is stored in the EntityMetaIndex.
   * Enriched by the IndexEngine after the object is stored in the EntityMetaIndex.
   */
  recordId: number | null;

  /**
   * JSON data of the object.
   */
  data: Obj.JSON;

  /**
   * Unix ms timestamp when this object was first created.
   * Sourced from system.createdAt in the automerge document; null for legacy objects
   * created before this field was introduced.
   */
  createdAt: number | null;

  /**
   * Timestamp of the last update of the object.
   */
  updatedAt: number;
}

/**
 * One Automerge change as the activity index counts it.
 */
export interface ChangeSummary {
  /** Author's clock, unix ms. */
  time: number;
  ops: number;
}

/**
 * Changes to one document since its activity cursor.
 */
export interface DocumentActivity {
  spaceId: SpaceId;
  documentId: string;
  /**
   * `changes` is the document's whole history and replaces whatever was recorded for it; with no
   * changes the document's rows are discarded (a branch document).
   */
  full: boolean;
  changes: readonly ChangeSummary[];
}

/**
 * SQLite-based index for storing and querying object data.
 */
export interface Index {
  /**
   * Runs necessary migrations to the index before it is usable.
   * Idempotent.
   */
  migrate: () => Effect.Effect<void, SqlError.SqlError>;

  /**
   * Updates the index with the given objects.
   * Idempotent.
   */
  update: (objects: IndexerObject[]) => Effect.Effect<void, SqlError.SqlError>;
}
