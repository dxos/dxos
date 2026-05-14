//
// Copyright 2025 DXOS.org
//

import { type Entity } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { EchoId } from '@dxos/keys';

import { type Client } from '../client';
import { type Space } from '../echo';

// TOOD(burdon): Move to client class?
// TODO(dmaretskyi): Align with `graph.createRefResolver` API.
/**
 * @deprecated Use `db.makeRef(dxn)` or `graph.makeRef(dxn)` instead.
 */
export const resolveRef = <T extends Entity.Unknown = Entity.Unknown>(
  client: Client,
  dxn: EchoId.EchoId,
  defaultSpace?: Space,
): T | undefined => {
  if (!EchoId.isEchoId(dxn)) {
    return undefined;
  }

  const spaceId = EchoId.getSpaceId(dxn);
  const objectId = EchoId.getObjectId(dxn);

  if (objectId && !EchoId.isLocal(dxn)) {
    const space = spaceId ? client.spaces.get(spaceId) : defaultSpace;
    if (!space) {
      return undefined;
    }

    return space.db.getObjectById(objectId) as T;
  }

  if (objectId && spaceId) {
    // Queue object lookup: use EchoId to identify the queue.
    invariant(objectId, 'objectId missing');
    const queueEchoId = EchoId.fromSpaceAndObjectId(spaceId, objectId);
    const queue = client.spaces.get(spaceId)?.queues.get<T>(queueEchoId);
    invariant(queue, 'queue missing');
    return queue.objects.find((object) => object.id === objectId);
  }

  return undefined;
};
