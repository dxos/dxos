//
// Copyright 2023 DXOS.org
//

import { Thread } from '@braneframe/types';
import { FunctionContext } from '@dxos/functions';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

export default async (event: any, context: FunctionContext) => {
  const { space: spaceKey, objects } = event;
  const space = context.client.getSpace(PublicKey.from(spaceKey))!;
  log.info('chatgpt', { space: space.key, type: Thread.type.name });

  // TODO(burdon): Query by type?
  const query = space.db.query((object) => object.__typename === Thread.type.name);
  // TODO(burdon): Infer type.
  const threads: Thread[] = query.objects as Thread[];
  objects.forEach((objectId: string) => {
    const block = space.db.getObjectById(objectId) as Thread.Block;

    // TODO(burdon): First update includes ALL objects IDs.

    // TODO(burdon): Test origin of change (i.e., not us); e.g., system vs. user.
    if (block.identityKey) {
      const thread = threads.find((thread) => thread.blocks.find(({ id }) => id === block.id));
      if (thread) {
        console.log('block', thread?.id.slice(0, 8), block.id.slice(0, 8), block.messages.length); // JSON.stringify(block));
      }

      // TODO(burdon): Only respond to last block.
      // console.log('block', PublicKey.from(block.identityKey).truncate(), block.messages);
      // Find parent thread.
      // TODO(burdon): Access via db?
    }
  });

  // await done.wait();
  return context.status(200).succeed({ greeting: 'Hello' });
};
