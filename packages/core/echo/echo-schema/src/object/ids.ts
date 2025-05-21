//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { DXN, ObjectId, QueueSubspaceTags, SpaceId } from '@dxos/keys';

export const SpaceIdSchema: Schema.Schema<SpaceId, string> = Schema.String.pipe(Schema.filter(SpaceId.isValid));

// TODO(burdon): Move to @dxos/keys once ObjectId is moved there.
export const createQueueDxn = (spaceId = SpaceId.random(), queueId = ObjectId.random()) =>
  new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, spaceId, queueId]);
