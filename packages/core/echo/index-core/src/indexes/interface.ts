//
// Copyright 2026 DXOS.org
//

import type * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import type * as Effect from 'effect/Effect';

import type { Obj } from '@dxos/echo';
import type { ObjectId, SpaceId } from '@dxos/keys';

/**
 * Data describing objects returned from sources to the indexer.
 */
export interface IndexerObject {
  spaceId: SpaceId;
  /**
   * Queue id if object is from the queue.
   * If null, `documentId` must be set.
   */
  queueId: ObjectId | null;
  /**
   * Document id if object is from the automerge document.
   * If null, `queueId` must be set.
   */
  documentId: string | null;

  /**
   * Record id from the objectMeta index.
   * `Null` before the object is stored in the ObjectMetaIndex.
   * Enriched by the IndexEngine after the object is stored in the ObjectMetaIndex.
   */
  recordId: number | null;

  /**
   * JSON data of the object.
   */
  data: Obj.JSON;
}

/**
 * SQLite-based index for storing and querying object data.
 */
export interface Index {
  /**
   * Runs necessary migrations to the index before it is usable.
   * Idempotent.
   */
  migrate: () => Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient>;

  /**
   * Updates the index with the given objects.
   * Idempotent.
   */
  update: (objects: IndexerObject[]) => Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient>;
}
