//
// Copyright 2023 DXOS.org
//

import { join } from 'node:path';

import { Thread as ThreadType, Message as MessageType } from '@braneframe/types';
import { sleep } from '@dxos/async';
import { type Space } from '@dxos/client/echo';
import { subscriptionHandler } from '@dxos/functions';
import { log } from '@dxos/log';

import { createContext } from './context';
import { createSequence } from './request';
import { type ResolverMap } from './resolvers';
import { createResolvers } from './resolvers';
import { createResponse } from './response';
import { createStatusNotifier } from './status';
import { type ChainResources, type ChainVariant, createChainResources } from '../../chain';
import { getKey } from '../../util';

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
        const message = thread.messages[thread.messages.length - 1];
        if (message.__meta.keys.length === 0) {
          const blocks = await processMessage(resources, resolvers, space, thread, message);
          if (blocks) {
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
        }
      }),
    );
  }
});

// TODO(burdon): Create class.
const processMessage = async (
  resources: ChainResources,
  resolvers: ResolverMap,
  space: Space,
  thread: ThreadType,
  message: MessageType,
): Promise<MessageType.Block[] | undefined> => {
  let blocks: MessageType.Block[] | undefined;
  const { start, stop } = createStatusNotifier(space, thread.id);
  try {
    const text = message.blocks
      .map((message) => message.text)
      .filter(Boolean)
      .join('\n');

    const match = text.match(/\/(\w+)\s*(.+)?/);
    if (match) {
      const prompt = match[1];
      const content = match[2];

      start();
      log.info('processing', { prompt, content });
      const context = createContext(space, message, thread);
      const sequence = await createSequence(space, resources, context, resolvers, { prompt });
      if (sequence) {
        const response = await sequence.invoke(content);
        blocks = createResponse(space, context, response);
        log.info('response', { blocks });
      }
    }
  } catch (err) {
    log.error('processing message', err);
    blocks = [{ text: 'Error generating response.' }];
  } finally {
    stop();
  }

  return blocks;
};
