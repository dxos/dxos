//
// Copyright 2025 DXOS.org
//

import { ObjectId } from '@dxos/echo-schema';
import { DXN, QueueSubspaceTags, SpaceId } from '@dxos/keys';

// TODO(burdon): Factor out.
export const randomQueueDxn = (spaceId?: SpaceId): DXN =>
  new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, spaceId ?? SpaceId.random(), ObjectId.random()]);
