//
// Copyright 2023 DXOS.org
//

import { Thread } from '@braneframe/types';
import { FunctionContext } from '@dxos/functions';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

type HandlerProps = {
  space: string;
  objects: string[];
};

export default async (event: HandlerProps, context: FunctionContext) => {
  const { space: spaceKey, objects: blockIds } = event; // TODO(burdon): Rename objects.
  const space = context.client.getSpace(PublicKey.from(spaceKey))!;
  log.info('chatgpt', { space: space.key });

  const query = space.db.query(Thread.filter());
  const threads: Thread[] = query.objects as Thread[]; // TODO(burdon): Infer type?

  const activeThreads = threads.filter((thread) => {
    return thread.blocks.some((block) => blockIds.some((id) => block.id === id));
  });

  blocks.forEach((blockId: string) => {
    const block = space.db.getObjectById(blockId) as Thread.Block;

    // TODO(burdon): First update includes ALL objects IDs. Next update has zero messages.
    if (block.identityKey) {
      // Find parent thread.
      // TODO(burdon): Access parent object via db?
      const thread = threads.find((thread) => thread.blocks.find(({ id }) => id === block.id));
      if (thread) {
        log.info('block', {
          thread: thread?.id.slice(0, 8),
          block: block.id.slice(0, 8),
          messages: block.messages.length,
          meta: block.meta ?? 'xxx', // TODO(burdon): Use to distinguish generated messages.
        });
      }

      // TODO(burdon): Only respond to last block.
      // console.log('block', PublicKey.from(block.identityKey).truncate(), block.messages);
    }
  });

  return context.status(200).succeed({ greeting: 'Hello' });
};
