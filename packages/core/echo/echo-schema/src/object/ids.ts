//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { DXN, ObjectId, QueueSubspaceTags, SpaceId } from '@dxos/keys';

// TODO(burdon): Move to @dxos/keys once ObjectId is moved there.
export const createQueueDxn = (spaceId = SpaceId.random(), queueId = ObjectId.random()) =>
  new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, spaceId, queueId]);
