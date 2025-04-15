//
// Copyright 2025 DXOS.org
//

import { ObjectId } from '@dxos/echo-schema';
import { DXN, QueueSubspaceTags, SpaceId } from '@dxos/keys';

export const randomQueueDxn = (spaceId?: SpaceId) =>
  new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, spaceId ?? SpaceId.random(), ObjectId.random()]);
