//
// Copyright 2023 DXOS.org
//

import { join } from 'node:path';

import { Thread as ThreadType, Message as MessageType } from '@braneframe/types';
import { sleep } from '@dxos/async';
import { type FunctionHandler, type FunctionSubscriptionEvent } from '@dxos/functions';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { createRequest } from './request';
import { createResponse } from './response';
import { Chain, type ChainVariant, createChainResources } from '../../chain';
import { getKey } from '../../util';

export const handler: FunctionHandler<FunctionSubscriptionEvent> = async ({
  event: { space: spaceKey, objects: messageIds },
  context: { client, dataDir },
  response,
}) => {
  const config = client.config;
  const resources = createChainResources((process.env.DX_AI_MODEL as ChainVariant) ?? 'openai', {
    baseDir: dataDir ? join(dataDir, 'agent/functions/embedding') : undefined,
    apiKey: getKey(config, 'openai.com/api_key'),
  });
  await resources.store.initialize();
  const chain = new Chain(resources, { context: false });

  const space = spaceKey && client.spaces.get(PublicKey.from(spaceKey));
  if (!space) {
    return response.status(400);
  }

  // TODO(burdon): The handler is called before the mutation is processed!
  await sleep(500);

  // Get active threads.
  // TODO(burdon): Handle batches with multiple block mutations per thread?
  const { objects: threads } = space.db.query(ThreadType.filter());
  const activeThreads = messageIds?.reduce((activeThreads, blockId) => {
    const thread = threads.find((thread) => thread.messages.some((message) => message.id === blockId));
    if (thread) {
      activeThreads.add(thread);
    }

    return activeThreads;
  }, new Set<ThreadType>());

  // Process threads.
  if (activeThreads) {
    await Promise.all(
      Array.from(activeThreads).map(async (thread) => {
        const message = thread.messages[thread.messages.length - 1];
        if (message.__meta.keys.length === 0) {
          const messages = createRequest(space, message);
          log.info('request', { messages });

          let blocks: MessageType.Block[];
          const text = message.blocks[0]?.text;
          if (text?.charAt(0) === '$') {
            const response = await chain.call(text.slice(1));
            log.info('response', { content: response });
            blocks = [
              {
                timestamp: new Date().toISOString(),
                text: response,
              },
            ];
          } else {
            const { content } = await resources.chat.invoke(messages);
            log.info('response', { content: content.toString() });
            blocks = createResponse(client, space, content.toString());
          }

          thread.messages.push(
            new MessageType(
              {
                identityKey: resources.identityKey,
                blocks,
              },
              {
                meta: {
                  keys: [{ source: 'openai.com' }],
                },
              },
            ),
          );
        }
      }),
    );
  }
};
