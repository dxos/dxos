import type { Obj } from '@dxos/echo';
import type { ObjectId, SpaceId } from '@dxos/keys';

/**
 * Data describing objects returned from sources to the indexer.
 */
export interface IndexerObject {
  spaceId: SpaceId;
  queueId: ObjectId | null;
  documentId: string | null;

  data: Obj.JSON;
}
