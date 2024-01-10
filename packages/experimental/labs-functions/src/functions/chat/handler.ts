//
// Copyright 2023 DXOS.org
//

import { join } from 'node:path';

import { Thread as ThreadType, Message as MessageType } from '@braneframe/types';
import { sleep } from '@dxos/async';
import { subscriptionHandler } from '@dxos/functions';
import { log } from '@dxos/log';

import { createContext, createSequence } from './request';
import { createResponse } from './response';
import { type ChainVariant, createChainResources } from '../../chain';
import { getKey } from '../../util';
import { createResolvers } from './resolvers';

export const handler = subscriptionHandler(async ({ event, context, response }) => {
  const { client, dataDir } = context;
  const { space, objects } = event;
  if (!space || !objects?.length) {
    return response.status(400);
  }

  const config = client.config;
  const resources = createChainResources((process.env.DX_AI_MODEL as ChainVariant) ?? 'openai', {
    baseDir: dataDir ? join(dataDir, 'agent/functions/embedding') : undefined,
    apiKey: getKey(config, 'openai.com/api_key'),
  });
  await resources.store.initialize();

  const resolvers = await createResolvers(client.config);

  // TODO(burdon): The handler is called before the mutation is processed!
  await sleep(500);

  // Get active threads.
  // TODO(burdon): Handle batches with multiple block mutations per thread?
  const { objects: threads } = space.db.query(ThreadType.filter());
  const activeThreads = objects.reduce((activeThreads, message) => {
    const thread = threads.find((thread) => thread.messages.some((m) => m.id === message.id));
    if (thread) {
      activeThreads.add(thread);
    }

    return activeThreads;
  }, new Set<ThreadType>());

  // Process threads.
  if (activeThreads) {
    await Promise.all(
      Array.from(activeThreads).map(async (thread) => {
        let disPostStatus = false;
        


        const message = thread.messages[thread.messages.length - 1];
        if (message.__meta.keys.length === 0) {
          if(!disPostStatus){
            space.postMessage(`${thread.id}/ephemeral_status`, {
              event: 'AI_GENERATING',
              ts: Date.now(),
              messageCount: thread.messages.length,
            }).catch(() => {})
            disPostStatus = true;
          }
          
          let blocks: MessageType.Block[];
          try {
            let text = message.blocks
              .map((message) => message.text)
              .filter(Boolean)
              .join('\n');

            // Check for command.
            let command: string | undefined;
            const match = text.match(/\/(\w+)\s*(.+)?/);
            if (match) {
              command = match[1];
              text = match[2];
            }

            const context = createContext(space, message, thread);
            const sequence = await createSequence(space, resources, context, resolvers, { command });
            const response = await sequence.invoke(text);
            log.info('response', { response });

            blocks = createResponse(space, context, response);
            log.info('response', { blocks });
          } catch (error) {
            log.error('processing message', { error });
            blocks = [{ text: 'There was an error generating the response.' }];
          }

          thread.messages.push(
            new MessageType(
              {
                from: {
                  identityKey: resources.identityKey,
                },
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
});
