//
// Copyright 2023 DXOS.org
//

import { Thread } from '@braneframe/types';
import { sleep } from '@dxos/async';
import { type FunctionHandler, type FunctionSubscriptionEvent } from '@dxos/functions';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { Chat } from './chat';
import { createRequest } from './request';
import { createResponse } from './response';
import { getKey } from '../../util';

const identityKey = PublicKey.random().toHex(); // TODO(burdon): Pass in to context.

export const handler: FunctionHandler<FunctionSubscriptionEvent> = async ({
  event: { space: spaceKey, objects: blockIds },
  context: { client, status },
}) => {
  const config = client.config;
  const chat = new Chat({
    // TODO(burdon): Normalize env.
    orgId: process.env.COM_OPENAI_ORG_ID ?? getKey(config, 'openai.com/org_id')!,
    apiKey: process.env.COM_OPENAI_API_KEY ?? getKey(config, 'openai.com/api_key')!,
  });

  // TODO(burdon): Logging (filename missing).
  const space = client.spaces.get(PublicKey.from(spaceKey))!;
  log.info('chatgpt', { space: space.key });

  // Get active threads.
  // TODO(burdon): Handle batches with multiple block mutations per thread?
  const query = space.db.query(Thread.filter());
  const threads: Thread[] = query.objects; // TODO(burdon): Infer type?
  const activeThreads = blockIds.reduce((set, blockId) => {
    const thread = threads.find((thread) => thread.blocks.some((block) => block.id === blockId));
    if (thread) {
      set.add(thread);
    }

    return set;
  }, new Set<Thread>());

  // Process threads.
  await Promise.all(
    Array.from(activeThreads).map(async (thread) => {
      // TODO(burdon): Wait for block to be added.
      await sleep(500);

      // TODO(burdon): Create set of messages.
      const block = thread.blocks[thread.blocks.length - 1];
      if (block.__meta.keys.length === 0) {
        const messages = createRequest(client, space, block);
        log.info('request', { messages });

        const { content } = (await chat.request(messages)) ?? {};
        log.info('response', { content });
        if (content) {
          thread.blocks.push(
            new Thread.Block(
              {
                identityKey,
                messages: createResponse(client, content),
              },
              {
                meta: {
                  keys: [{ source: 'openai.com' }],
                },
              },
            ),
          );
        }
      }
    }),
  );

  return status(200).succeed();
};
