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
  log.info('chatgpt', { space: space.key });

  const query = space.db.query(Thread.filter());
  // TODO(burdon): Infer type.
  const threads: Thread[] = query.objects as Thread[];
  objects.forEach((objectId: string) => {
    const block = space.db.getObjectById(objectId) as Thread.Block;

    // TODO(burdon): First update includes ALL objects IDs. Next update has zero messages.

    // TODO(burdon): Test origin of change (i.e., not us); e.g., system vs. user.
    if (block.identityKey) {
      // Find parent thread.
      // TODO(burdon): Access parent object via db?
      const thread = threads.find((thread) => thread.blocks.find(({ id }) => id === block.id));
      if (thread) {
        log.info('block', {
          thread: thread?.id.slice(0, 8),
          block: block.id.slice(0, 8),
          messages: block.messages.length,
        }); // JSON.stringify(block));
      }

      // TODO(burdon): Only respond to last block.
      // console.log('block', PublicKey.from(block.identityKey).truncate(), block.messages);
    }
  });

  return context.status(200).succeed({ greeting: 'Hello' });
};
