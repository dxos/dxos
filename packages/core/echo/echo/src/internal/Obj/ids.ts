//
// Copyright 2024 DXOS.org
//

import { EchoURI, ObjectId, SpaceId } from '@dxos/keys';

/**
 * @deprecated Use `Feed.make(...)` + `db.add(feed)` then `Feed.getQueueDxn(feed)`.
 */
// TODO(burdon): Move to @dxos/keys.
export const createQueueDXN = (spaceId = SpaceId.random(), queueId = ObjectId.random()): EchoURI.EchoURI =>
  EchoURI.fromSpaceAndObjectId(spaceId, queueId);
