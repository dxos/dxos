//
// Copyright 2023 DXOS.org
//

import {
  ChainPromptType,
  DocumentType,
  MessageType,
  SectionType,
  StackType,
  TextV0Type,
  ThreadType,
} from '@braneframe/types';
import { Filter, loadObjectReferences } from '@dxos/echo-db';
import { create, foreignKey, getMeta, getTypename, S } from '@dxos/echo-schema';
import { subscriptionHandler } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { nonNullable } from '@dxos/util';

import { RequestProcessor } from './processor';
import { createResolvers } from './resolvers';
import { ModelInvokerFactory } from '../../chain/model-invoker';

const AI_SOURCE = 'dxos.org/service/ai';

const types = [ChainPromptType, DocumentType, MessageType, SectionType, StackType, TextV0Type, ThreadType];

/**
 * Trigger configuration.
 */
export const MetaSchema = S.mutable(
  S.Struct({
    model: S.optional(S.String),
    prompt: ChainPromptType,
  }),
);

export type Meta = S.Schema.Type<typeof MetaSchema>;

// TODO(burdon): Create test.
export const handler = subscriptionHandler<Meta>(async ({ event, context }) => {
  const { client, dataDir } = context;
  const { space, objects, meta } = event.data;
  invariant(space);
  if (!objects) {
    return;
  }

  // Get threads for queried objects.
  // TODO(burdon): Handle batches with multiple block mutations per thread?
  const { objects: threads } = await space.db.query(Filter.schema(ThreadType)).run();
  await loadObjectReferences(threads, (thread: ThreadType) => thread.messages ?? []);

  // Filter messages to process.
  // TODO(burdon): Generalize to other object types.
  const messages = objects
    .map((message) => {
      if (!(message instanceof MessageType)) {
        log.warn('unexpected object type', { type: getTypename(message) });
        return null;
      }

      // Skip messages older than one hour.
      if (message.date && Date.now() - new Date(message.date).getTime() > 60 * 60 * 1_000) {
        return null;
      }

      // Check the message wasn't already processed/created by the AI.
      if (getMeta(message).keys.find((key) => key.source === AI_SOURCE)) {
        return null;
      }

      // Separate messages that don't belong to an active thread.
      const thread = threads.find((thread: ThreadType) => thread.messages.some((msg) => msg?.id === message.id));
      if (!thread) {
        return [message, undefined] as [MessageType, ThreadType | undefined];
      }

      // Only react to the last message in the thread.
      // TODO(burdon): Need better marker.
      if (thread.messages[thread.messages.length - 1]?.id !== message.id) {
        return null;
      }

      return [message, thread] as [MessageType, ThreadType | undefined];
    })
    .filter(nonNullable);

  log.info('processing', {
    objects: objects.length,
    threads: messages.filter(([_, thread]) => thread != null).length,
    messages: messages.length,
  });

  // Process messages.
  if (messages.length > 0) {
    const resources = ModelInvokerFactory.createChainResources(client, { dataDir, model: meta.model });
    await resources.init();

    const resolvers = await createResolvers(client.config);
    const modelInvoker = ModelInvokerFactory.createModelInvoker(resources);
    const processor = new RequestProcessor(modelInvoker, resources, resolvers);

    await Promise.all(
      Array.from(messages).map(async ([message, thread]) => {
        const { success, blocks } = await processor.processThread({
          space,
          thread,
          message,
          prompt: meta.prompt,
        });

        if (blocks?.length) {
          const metaKey = foreignKey(AI_SOURCE, Date.now().toString());
          if (thread) {
            const response = create(
              MessageType,
              {
                from: { identityKey: resources.identityKey },
                blocks,
              },
              {
                keys: [metaKey],
              },
            );

            thread.messages.push(response);
          } else if (success) {
            // Check success to avoid modifying the message with an "Error generating response" block.
            // TODO(burdon): Mark the message as "processed".
            getMeta(message).keys.push(metaKey);
            message.blocks.push(...blocks);
          }
        }
      }),
    );
  }
}, types);
