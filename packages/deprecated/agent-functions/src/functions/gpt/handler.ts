//
// Copyright 2023 DXOS.org
//

import { Filter, loadObjectReferences } from '@dxos/echo-db';
import { S, foreignKey, getTypename } from '@dxos/echo-schema';
import { subscriptionHandler } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { create, getMeta, makeRef } from '@dxos/live-object';
import { log } from '@dxos/log';
import { TemplateType } from '@dxos/plugin-automation/types';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { CollectionType, MessageType, ThreadType } from '@dxos/plugin-space/types';
import { TextType } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { RequestProcessor } from './processor';
import { createResolvers } from './resolvers';
import { ModelInvokerFactory } from '../../chain';

const AI_SOURCE = 'dxos.org/service/ai';

const types = [
  // Default types.
  TemplateType,
  CollectionType,
  DocumentType,
  MessageType,
  TextType,
  ThreadType,
];

/**
 * Trigger configuration.
 */
export const MetaSchema = S.mutable(
  S.Struct({
    model: S.optional(S.String),
    prompt: TemplateType,
  }),
);

export type Meta = S.Schema.Type<typeof MetaSchema>;

export const handler = subscriptionHandler<Meta>(async ({ event, context }) => {
  const { client, dataDir } = context;
  const { space, objects, meta } = event.data;
  invariant(space);
  if (!objects) {
    return;
  }

  // Get threads for queried objects.
  // TODO(burdon): Handle batches with multiple block mutations per thread?
  const { objects: threads } = await space.db.query(Filter.schema(ThreadType)).run({ timeout: 3000 });
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
      if (message.timestamp && Date.now() - new Date(message.timestamp).getTime() > 60 * 60 * 1_000) {
        return null;
      }

      // Check the message wasn't already processed/created by the AI.
      if (getMeta(message).keys.find((key) => key.source === AI_SOURCE)) {
        return null;
      }

      // Separate messages that don't belong to an active thread.
      const thread = threads.find((thread: ThreadType) =>
        thread.messages.some((msg) => msg?.target?.id === message.id),
      );
      if (!thread) {
        return [message, undefined] as [MessageType, ThreadType | undefined];
      }

      // Only react to the last message in the thread.
      // TODO(burdon): Need better marker.
      if (thread.messages[thread.messages.length - 1]?.target?.id !== message.id) {
        return null;
      }

      return [message, thread] as [MessageType, ThreadType | undefined];
    })
    .filter(isNonNullable);

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
        const { success, text, parts } = await processor.processThread({
          space,
          thread,
          message,
          prompt: meta.prompt,
        });

        if (text) {
          const metaKey = foreignKey(AI_SOURCE, Date.now().toString());
          if (thread) {
            const response = create(
              MessageType,
              {
                sender: { identityKey: resources.identityKey },
                timestamp: new Date().toISOString(),
                text,
                // parts, // TODO(burdon): Type.
              },
              {
                keys: [metaKey],
              },
            );

            thread.messages.push(makeRef(response));
          } else if (success) {
            // Check success to avoid modifying the message with an "Error generating response" block.
            // TODO(burdon): Mark the message as "processed".
            // TODO(wittjosiah): Needs thread.
            // getMeta(message).keys.push(metaKey);
            // message.blocks.push(...blocks);
          }
        }
      }),
    );
  }
}, types);
