import type { Obj } from '@dxos/echo';
import type { ObjectId, SpaceId } from '@dxos/keys';
import type { SqlClient, SqlError } from '@effect/sql';
import type { Effect } from 'effect';

/**
 * Data describing objects returned from sources to the indexer.
 */
export interface IndexerObject {
  spaceId: SpaceId;
  /**
   * Queue id if object is from queue.
   * If null, `documentId` must be set.
   */
  queueId: ObjectId | null;
  /**
   * Document id if object is from document.
   * If null, `queueId` must be set.
   */
  documentId: string | null;

  data: Obj.JSON;
}

export interface Index {
  update: (objects: IndexerObject[]) => Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient>;
}
