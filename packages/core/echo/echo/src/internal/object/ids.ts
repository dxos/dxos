//
// Copyright 2024 DXOS.org
//

import { DXN, ObjectId, QueueSubspaceTags, SpaceId } from '@dxos/keys';

/**
 * @deprecated Use `db.queues.create()`
 */
// TODO(burdon): Move to @dxos/keys once ObjectId is moved there.
export const createQueueDXN = (spaceId = SpaceId.random(), queueId = ObjectId.random()) =>
  new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, spaceId, queueId]);
