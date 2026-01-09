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
   * JSON data of the object.
   */
  data: Obj.JSON;
}

export interface Index {
  migrate: () => Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient>;
  update: (objects: IndexerObject[]) => Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient>;
}
