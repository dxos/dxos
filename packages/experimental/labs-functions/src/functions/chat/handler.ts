//
// Copyright 2023 DXOS.org
//

import { ChatOpenAI } from 'langchain/chat_models/openai';

import { Thread as ThreadType, Message as MessageType } from '@braneframe/types';
import { sleep } from '@dxos/async';
import { type FunctionHandler, type FunctionSubscriptionEvent } from '@dxos/functions';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { createRequest } from './request';
import { createResponse } from './response';
import { getKey } from '../../util';

// TODO(burdon): https://platform.openai.com/docs/plugins/examples

const identityKey = PublicKey.random().toHex(); // TODO(burdon): Pass in to context.

export const handler: FunctionHandler<FunctionSubscriptionEvent> = async ({
  event: { space: spaceKey, objects: messageIds },
  context: { client, status },
}) => {
  const config = client.config;
  const chat = new ChatOpenAI({
    openAIApiKey: process.env.COM_OPENAI_API_KEY ?? getKey(config, 'openai.com/api_key')!,
  });

  // TODO(burdon): Logging (filename missing).
  const space = client.spaces.get(PublicKey.from(spaceKey));
  if (!space) {
    return status(400).succeed();
  }

  // Get active threads.
  // TODO(burdon): Handle batches with multiple block mutations per thread?
  const { objects: threads } = space.db.query(ThreadType.filter());
  const activeThreads = messageIds.reduce((activeThreads, blockId) => {
    const thread = threads.find((thread) => thread.messages.some((message) => message.id === blockId));
    if (thread) {
      activeThreads.add(thread);
    }

    return activeThreads;
  }, new Set<ThreadType>());

  // Process threads.
  await Promise.all(
    Array.from(activeThreads).map(async (thread) => {
      // TODO(burdon): Wait for block to be added???
      await sleep(100);

      const message = thread.messages[thread.messages.length - 1];
      if (message.__meta.keys.length === 0) {
        const messages = createRequest(space, message);
        log.info('request', { messages });

        // TODO(burdon): Error handling (e.g., 401);
        // TODO(burdon): Streaming API.
        const { content } = await chat.call(messages);
        log('response', { content });
        if (content) {
          const blocks = createResponse(client, space, content);
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
      }
    }),
  );

  return status(200).succeed();
};
