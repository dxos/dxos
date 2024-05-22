//
// Copyright 2023 DXOS.org
//

import { join } from 'node:path';

import { MessageType, ThreadType } from '@braneframe/types';
import { sleep } from '@dxos/async';
import { Filter, loadObjectReferences } from '@dxos/echo-db';
import { create, foreignKey, getMeta, getTypename } from '@dxos/echo-schema';
import { subscriptionHandler } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { nonNullable } from '@dxos/util';

import { RequestProcessor } from './processor';
import { createResolvers } from './resolvers';
import { type ChainVariant, createChainResources } from '../../chain';
import { getKey, registerTypes } from '../../util';

// TODO(burdon): Create test.
export const handler = subscriptionHandler<{ prompt?: string }>(async ({ event, context }) => {
  const { client, dataDir } = context;
  const { space, objects, meta } = event.data;
  invariant(space);
  registerTypes(space);
  if (!objects) {
    return;
  }

  // TODO(burdon): Get from chain resources.
  const aiMessageSource = 'openai.com';

  // TODO(burdon): The handler is called before the mutation is processed?
  await sleep(500);

  // Get threads for queried objects.
  // TODO(burdon): Handle batches with multiple block mutations per thread?
  const { objects: threads } = await space.db.query(Filter.schema(ThreadType)).run();
  await loadObjectReferences(threads, (thread: ThreadType) => thread.messages ?? []);

  const processorInput = objects
    .map((message) => {
      if (!(message instanceof MessageType)) {
        log.warn('unexpected object type', { type: getTypename(message) });
        return null;
      }
      // Check the message wasn't already processed / sent by the AI.
      if (getMeta(message).keys.find((k) => k.source === aiMessageSource)) {
        return null;
      }
      const thread = threads.find((thread: ThreadType) =>
        thread.messages.some((threadMsg) => threadMsg?.id === message.id),
      );
      if (!thread) {
        return [message, undefined] as [MessageType, ThreadType | undefined];
      }
      // Only react to the last message in the thread.
      if (thread.messages[thread.messages.length - 1]?.id !== message.id) {
        return null;
      }
      return [message, thread] as [MessageType, ThreadType | undefined];
    })
    .filter(nonNullable);

  log.info('processing objects', {
    totalObjectsCount: objects.length,
    processorInputSize: processorInput.length,
    objectsWithThread: processorInput.filter(([_, thread]) => thread != null).length,
  });

  // Process threads.
  if (processorInput.length > 0) {
    const resources = createChainResources((process.env.DX_AI_MODEL as ChainVariant) ?? 'openai', {
      baseDir: dataDir ? join(dataDir, 'agent/functions/embedding') : undefined,
      apiKey: getKey(client.config, 'openai.com/api_key'),
    });

    await resources.store.initialize();
    const resolvers = await createResolvers(client.config);
    const processor = new RequestProcessor(resources, resolvers);

    await Promise.all(
      Array.from(processorInput).map(async ([message, thread]) => {
        const blocks = await processor.processThread({
          space,
          thread,
          message,
          defaultPrompt: meta.prompt,
        });

        if (blocks?.length) {
          const metaKey = foreignKey(aiMessageSource);
          if (thread) {
            const newMessage = create(
              MessageType,
              {
                from: { identityKey: resources.identityKey },
                blocks,
              },
              { keys: [metaKey] },
            );
            getMeta(newMessage).keys.push(metaKey);
            thread.messages.push(newMessage);
          } else {
            getMeta(message).keys.push(metaKey);
            message.blocks.push(...blocks);
          }
        }
      }),
    );
  }
});
