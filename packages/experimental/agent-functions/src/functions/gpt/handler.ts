//
// Copyright 2023 DXOS.org
//

import { join } from 'node:path';

import { MessageType, ThreadType } from '@braneframe/types';
import { sleep } from '@dxos/async';
import { Filter, loadObjectReferences } from '@dxos/echo-db';
import { create, foreignKey, getMeta } from '@dxos/echo-schema';
import { subscriptionHandler } from '@dxos/functions';
import { invariant } from '@dxos/invariant';

import { RequestProcessor } from './processor';
import { createResolvers } from './resolvers';
import { type ChainVariant, createChainResources } from '../../chain';
import { getKey, registerTypes } from '../../util';

// TODO(burdon): Create test.
export const handler = subscriptionHandler(async ({ event, context }) => {
  const { client, dataDir } = context;
  const { space, objects } = event.data;
  invariant(space);
  registerTypes(space);
  if (!objects) {
    return;
  }

  //

  // TODO(burdon): The handler is called before the mutation is processed?
  await sleep(500);

  // Get threads for queried objects.
  // TODO(burdon): Handle batches with multiple block mutations per thread?
  const { objects: threads } = await space.db.query(Filter.schema(ThreadType)).run();
  await loadObjectReferences(objects, (thread) => thread.messages ?? []);
  const activeThreads = objects.reduce((activeThreads, message) => {
    const thread = threads.find((thread) => thread.messages.some((m) => m?.id === message.id));
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
        // Get last message.
        const message = thread.messages[thread.messages.length - 1];
        // Check the message wasn't created by the AI.
        if (message && getMeta(message).keys.length === 0) {
          const blocks = await processor.processThread(space, thread, message);
          if (blocks?.length) {
            const newMessage = create(
              MessageType,
              {
                from: { identityKey: resources.identityKey },
                blocks,
              },
              {
                keys: [foreignKey('openai.com')],
              },
            );

            // getMeta(newMessage).keys.push({ source: 'openai.com' }); // TODO(burdon): Get from chain resources.
            thread.messages.push(newMessage);
          }
        }
      }),
    );
  }
});
