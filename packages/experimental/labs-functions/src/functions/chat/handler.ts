//
// Copyright 2023 DXOS.org
//

import { join } from 'node:path';

import { Thread as ThreadType, Message as MessageType } from '@braneframe/types/proto';
import { sleep } from '@dxos/async';
import { subscriptionHandler } from '@dxos/functions';

import { RequestProcessor } from './processor';
import { createResolvers } from './resolvers';
import { type ChainVariant, createChainResources } from '../../chain';
import { getKey } from '../../util';

export const handler = subscriptionHandler(async ({ event, context, response }) => {
  const { client, dataDir } = context;
  const { space, objects } = event;
  if (!space || !objects?.length) {
    return response.status(400);
  }

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
    const resources = createChainResources((process.env.DX_AI_MODEL as ChainVariant) ?? 'openai', {
      baseDir: dataDir ? join(dataDir, 'agent/functions/embedding') : undefined,
      apiKey: getKey(client.config, 'openai.com/api_key'),
    });

    await resources.store.initialize();
    const resolvers = await createResolvers(client.config);

    const processor = new RequestProcessor(resources, resolvers);

    await Promise.all(
      Array.from(activeThreads).map(async (thread) => {
        const message = thread.messages[thread.messages.length - 1];
        if (message.__meta.keys.length === 0) {
          const blocks = await processor.processThread(space, thread, message);
          if (blocks?.length) {
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
                    keys: [{ source: 'openai.com' }], // TODO(burdon): Get from chain resources.
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
