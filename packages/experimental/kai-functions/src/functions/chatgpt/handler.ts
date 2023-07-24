//
// Copyright 2023 DXOS.org
//

import { Thread } from '@braneframe/types';
import { FunctionContext } from '@dxos/functions';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { ChatModel } from '../../bots';
import { getKey } from '../../bots/util';

type HandlerProps = {
  space: string;
  objects: string[];
};

const identityKey = PublicKey.random().toHex(); // TODO(burdon): ???

export default async (event: HandlerProps, context: FunctionContext) => {
  const { space: spaceKey, objects: blockIds } = event; // TODO(burdon): Rename objects.
  const config = context.client.config;
  const space = context.client.getSpace(PublicKey.from(spaceKey))!;

  // TODO(burdon): Logging (filename missing).
  log.info('chatgpt', { space: space.key });

  // Get active threads.
  // TODO(burdon): Handle batches with multiple block mutations per thread?
  const query = space.db.query(Thread.filter());
  const threads: Thread[] = query.objects as Thread[]; // TODO(burdon): Infer type?
  const activeThreads = blockIds.reduce((set, blockId) => {
    const thread = threads.find((thread) => thread.blocks.some((block) => block.id === blockId));
    if (thread) {
      set.add(thread);
    }
    return set;
  }, new Set<Thread>());

  // Process threads.
  await Promise.all(
    Array.from(activeThreads).map(async (thread) => {
      // TODO(burdon): Create set of messages.
      const block = thread.blocks[thread.blocks.length - 1];

      // TODO(burdon): Use to distinguish generated messages.
      if (!block.meta) {
        const model = new ChatModel({
          // TODO(burdon): Normalize env.
          orgId: process.env.COM_OPENAI_ORG_ID ?? getKey(config, 'openai.com/org_id')!,
          apiKey: process.env.COM_OPENAI_API_KEY ?? getKey(config, 'openai.com/api_key')!,
        });

        log.info('block', {
          thread: thread?.id.slice(0, 8),
          block: block.id.slice(0, 8),
          messages: block.messages.length,
          meta: block.meta, // TODO(burdon): Use to distinguish generated messages.
        });

        // TODO(burdon): Error handling (e.g., 401);
        const { content } =
          (await model.request(block.messages.map((message) => ({ role: 'user', content: message.text ?? '' })))) ?? {};

        if (content) {
          const messages = [];
          // TODO(burdon): Parse results (possibly multiple JSON segments).
          const match = content.replace(/\n/, '').match(/(.+)?```json(.+)```(.+)/);
          const timestamp = new Date().toISOString();
          console.log(content, match);
          if (match) {
            const [_, before, json, after] = match;
            messages.push(
              {
                timestamp,
                text: before,
              },
              {
                timestamp,
                data: JSON.stringify(parseJson(json)),
              },
              {
                timestamp,
                text: after,
              },
            );
          } else {
            const data = parseJson(content);
            if (data) {
              messages.push({
                timestamp,
                data: JSON.stringify(data),
              });
            } else {
              messages.push({
                timestamp,
                text: content,
              });
            }
          }

          const response = space.db.add(
            new Thread.Block({
              identityKey,
              meta: {
                keys: [{ source: 'openai.com' }],
              },
              messages,
            }),
          );

          thread.blocks.push(response);
        }
      }
    }),
  );

  return context.status(200).succeed();
};

// TODO(burdon): Factor out.
const parseJson = (content: string) => {
  try {
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
};
