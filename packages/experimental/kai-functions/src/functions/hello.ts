//
// Copyright 2023 DXOS.org
//

import { FunctionContext } from '@dxos/functions';

export default async (event: any, context: FunctionContext) => {
  const identity = context.client.halo.identity.get();

  // TODO(burdon): Have standard event types to put this into context by default?
  const space = context.client.spaces.get().find((space) => space.key.equals(event.space));
  if (!space) {
    return;
  }
  await space!.waitUntilReady();

  for (const objId of event.objects) {
    // TODO(burdon): Extract this into the framework?
    const obj = space.db.getObjectById(objId);
    if (!obj) {
      continue;
    }

    obj.functionCount = (obj.count ?? 0) + 1;
  }

  await space.db.flush();

  return context.status(200).succeed({ event, greeting: `Hello, ${identity?.profile?.displayName}` });
};
