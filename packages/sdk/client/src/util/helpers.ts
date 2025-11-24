//
// Copyright 2025 DXOS.org
//

import type { Obj, Relation } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { type DXN } from '@dxos/keys';

import { type Client } from '../client';
import { type Space } from '../echo';

// TODO(burdon): Type check?
// TOOD(burdon): Move to client class?
// TODO(dmaretskyi): Align with `graph.createRefResolver` API.
/**
 * @deprecated Use `db.makeRef(dxn)` or `graph.ref(dxn)` instead.
 */
export const resolveRef = <T extends Obj.Any | Relation.Any = Obj.Any | Relation.Any>(
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

    return space.db.getObjectById<T>(echoDxn.echoId);
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
