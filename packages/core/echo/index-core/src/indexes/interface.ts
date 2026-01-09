import type { Obj } from '@dxos/echo';
import type { ObjectId, SpaceId } from '@dxos/keys';
import type { SqlClient, SqlError } from '@effect/sql';
import type { Effect } from 'effect';

/**
 * Data describing objects returned from sources to the indexer.
 */
export interface IndexerObject {
  spaceId: SpaceId;
  queueId: ObjectId | null;
  documentId: string | null;

  data: Obj.JSON;
}

export interface Index {
  update: (objects: IndexerObject[]) => Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient>;
}
