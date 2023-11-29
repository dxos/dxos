//
// Copyright 2023 DXOS.org
//

import { Thread as ThreadType, Message as MessageType } from '@braneframe/types';
import { sleep } from '@dxos/async';
import { type FunctionHandler, type FunctionSubscriptionEvent } from '@dxos/functions';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { Chain, createOpenAIChainResources } from './chain';
import { createRequest } from './request';
import { createResponse } from './response';
import { getKey } from '../../util';

const identityKey = PublicKey.random().toHex(); // TODO(burdon): Pass in to context.

export const handler: FunctionHandler<FunctionSubscriptionEvent> = async ({
  event: { space: spaceKey, objects: messageIds },
  context: { client },
  response,
}) => {
  const config = client.config;
  const resources = createOpenAIChainResources({
    // TODO(burdon): Get from context (for agent profile).
    baseDir: '/tmp/dxos/agent/functions/embedding/openai',
    apiKey: getKey(config, 'openai.com/api_key')!,
    chat: { modelName: 'gpt-4' },
    // chat: { model: 'llama2' },
  });
  await resources.initialize();
  const chain = new Chain(resources, { precise: false });

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
          log('request', { messages });

          let blocks: MessageType.Block[];
          const text = message.blocks[0]?.text;
          if (text?.charAt(0) === '$') {
            const response = await chain.call(text.slice(1));
            blocks = [
              {
                timestamp: new Date().toISOString(),
                text: response,
              },
            ];
          } else {
            const { content } = await resources.chat.invoke(messages);
            log('response', { content: content.toString() });
            blocks = createResponse(client, space, content.toString());
          }

          thread.messages.push(
            new MessageType(
              {
                identityKey,
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
