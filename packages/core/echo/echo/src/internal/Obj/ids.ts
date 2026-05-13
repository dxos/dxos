//
// Copyright 2024 DXOS.org
//

import { EchoId, ObjectId, SpaceId } from '@dxos/keys';

/**
 * @deprecated Use `db.queues.create()`
 */
// TODO(burdon): Move to @dxos/keys.
export const createQueueDXN = (spaceId = SpaceId.random(), queueId = ObjectId.random()): EchoId.EchoId =>
  EchoId.fromSpaceAndObjectId(spaceId, queueId);
