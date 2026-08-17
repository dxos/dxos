//
// Copyright 2026 DXOS.org
//

import type * as Effect from 'effect/Effect';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import type { Obj } from '@dxos/echo';
import type { EntityId, SpaceId } from '@dxos/keys';
import type { SqlTransaction } from '@dxos/sql-sqlite';

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
 * SQLite-based index for storing and querying object data.
 */
export interface Index {
  /**
   * Runs necessary migrations to the index before it is usable.
   * Idempotent.
   */
  migrate: () => Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient | SqlTransaction.SqlTransaction>;

  /**
   * Updates the index with the given objects.
   * Idempotent.
   */
  update: (objects: IndexerObject[]) => Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient>;
}
