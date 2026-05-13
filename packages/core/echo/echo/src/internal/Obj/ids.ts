//
// Copyright 2024 DXOS.org
//

import { EchoId, ObjectId, SpaceId } from '@dxos/keys';

/**
 * @deprecated Use `Feed.make(...)` + `db.add(feed)` then `Feed.getQueueDxn(feed)`.
 */
// TODO(burdon): Move to @dxos/keys.
export const createQueueDXN = (spaceId = SpaceId.random(), queueId = ObjectId.random()): EchoId.EchoId =>
  EchoId.fromSpaceAndObjectId(spaceId, queueId);
