//
// Copyright 2023 DXOS.org
//

import * as S from '@effect/schema/Schema';
import * as Either from 'effect/Either';
import { join } from 'node:path';

import { Thread as ThreadType, Message as MessageType } from '@braneframe/types';
import { sleep } from '@dxos/async';
import { type Space } from '@dxos/client/echo';
import { type FunctionSubscriptionEvent2, subscriptionHandler } from '@dxos/functions';
import { ComplexSet } from '@dxos/util';

import { RequestProcessor, type RequestProcessorInput } from './processor';
import { createResolvers } from './resolvers';
import { type ChainVariant, createChainResources } from '../../chain';
import { getKey } from '../../util';

const TriggerPromptSignalSchema = S.struct({
  kind: S.literal('suggestion'),
  data: S.struct({
    type: S.literal('trigger-prompt'),
    value: S.struct({
      threadId: S.string,
      prompt: S.string,
      content: S.optional(S.string),
      contextObjectId: S.optional(S.string),
    }),
  }),
});
type TriggerPromptSignal = S.Schema.Type<typeof TriggerPromptSignalSchema>;
const TriggerPromptSignalSchemaParser = S.validateEither(TriggerPromptSignalSchema);

export const handler = subscriptionHandler(async ({ event, context, response }) => {
  const { client, dataDir } = context;
  const space = event.space;
  if (space == null) {
    return response.status(400);
  }

  // TODO(burdon): The handler is called before the mutation is processed!
  await sleep(500);

  const signalInput = TriggerPromptSignalSchemaParser(event.signal);
  const activeThreads = Either.isRight(signalInput)
    ? getActiveThreadsFromSignal(space, signalInput.right)
    : getActiveThreadsFromObjects(space, event);
  if (activeThreads == null) {
    return response.status(400);
  }

  const resources = createChainResources((process.env.DX_AI_MODEL as ChainVariant) ?? 'openai', {
    baseDir: dataDir ? join(dataDir, 'agent/functions/embedding') : undefined,
    apiKey: getKey(client.config, 'openai.com/api_key'),
  });

  await resources.store.initialize();
  const resolvers = await createResolvers(client.config);

  const processor = new RequestProcessor(resources, resolvers);

  await Promise.all(
    Array.from(activeThreads).map(async (thread) => {
      const processorInput = getRequestProcessorInput(processor, thread, Either.getOrNull(signalInput));
      const blocks = await processor.processThread(space, thread, processorInput);
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
    }),
  );
});

const getRequestProcessorInput = (
  processor: RequestProcessor,
  thread: ThreadType,
  signal: TriggerPromptSignal | null,
): RequestProcessorInput | null => {
  if (signal != null) {
    const value = signal.data.value;
    return {
      prompt: value.prompt,
      content: value.content ?? '',
      contextObjectId: value.contextObjectId,
    };
  } else {
    const lastMessage = thread.messages[thread.messages.length - 1];
    if (lastMessage?.__meta?.keys?.length) {
      return null;
    }
    return processor.createInputFromMessage(thread, lastMessage);
  }
};

const getActiveThreadsFromSignal = (space: Space, signal: TriggerPromptSignal): ComplexSet<ThreadType> | undefined => {
  const threadId = signal.data.value.threadId;
  const { objects: threads } = space.db.query(ThreadType.filter((t) => t.id === threadId));
  if (threads.length === 0) {
    return undefined;
  }
  return new ComplexSet<ThreadType>((t) => t.id).add(threads[0]);
};

const getActiveThreadsFromObjects = (
  space: Space,
  event: FunctionSubscriptionEvent2,
): ComplexSet<ThreadType> | undefined => {
  if (!event.objects) {
    return undefined;
  }
  // Get active threads.
  // TODO(burdon): Handle batches with multiple block mutations per thread?
  const { objects: threads } = space.db.query(ThreadType.filter());
  return event.objects.reduce(
    (activeThreads, message) => {
      const thread = threads.find((thread) => thread.messages.some((m) => m.id === message.id));
      if (thread) {
        activeThreads.add(thread);
      }
      return activeThreads;
    },
    new ComplexSet<ThreadType>((t) => t.id),
  );
};
