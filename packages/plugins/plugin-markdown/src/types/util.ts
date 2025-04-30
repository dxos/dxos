//
// Copyright 2025 DXOS.org
//

import { type Client } from '@dxos/client';
import { type BaseEchoObject, ObjectId } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { DXN, QueueSubspaceTags, type SpaceId } from '@dxos/keys';
import { type Space } from '@dxos/react-client/echo';

// TODO(burdon): Factor out (reconcile with ThreadContainer.stories.tsx)
export const randomQueueDxn = (spaceId: SpaceId) =>
  new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, spaceId, ObjectId.random()]);

// TODO(burdon): Do type check.
export const resolveRef = async <T extends BaseEchoObject = BaseEchoObject>(
  client: Client,
  dxn: DXN,
  defaultSpace?: Space,
): Promise<T | undefined> => {
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
    return queue.items.find((item) => item.id === objectId);
  }

  return undefined;
};
