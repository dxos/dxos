//
// Copyright 2024 DXOS.org
//

import { DXN, ObjectId, QueueSubspaceTags, SpaceId } from '@dxos/keys';

/**
 * @deprecated Use `Feed.make(...)` + `db.add(feed)` then `Feed.getDXN(feed)`.
 */
// TODO(burdon): Move to @dxos/keys.
export const createQueueDXN = (spaceId = SpaceId.random(), queueId = ObjectId.random()) =>
  new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, spaceId, queueId]);
