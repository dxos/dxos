//
// Copyright 2025 DXOS.org
//

import { type Entity } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { type DXN } from '@dxos/keys';

import { type Client } from '../client';
import { type Space } from '../echo';

// TOOD(burdon): Move to client class?
// TODO(dmaretskyi): Align with `graph.createRefResolver` API.
/**
 * @deprecated Use `db.makeRef(dxn)` or `graph.makeRef(dxn)` instead.
 */
export const resolveRef = <T extends Entity.Unknown = Entity.Unknown>(
  client: Client,
  dxn: DXN,
  defaultSpace?: Space,
): T | undefined => {
  const echoDxn = dxn?.asEchoDXN();
  if (echoDxn) {
    const space = echoDxn.spaceId ? client.spaces.get(echoDxn.spaceId) : defaultSpace;
    if (!space) {
      return undefined;
    }

    return space.db.getObjectById(echoDxn.echoId) as T; // TODO(burdon): Type check?
  }

  const queueDxn = dxn?.asQueueDXN();
  if (queueDxn) {
    const { spaceId, objectId } = dxn.asQueueDXN()!;
    invariant(objectId, 'objectId missing');
    const queue = client.spaces.get(spaceId)?.queues.get<T>(dxn);
    invariant(queue, 'queue missing');
    return queue.objects.find((object) => object.id === objectId);
  }

  return undefined;
};
