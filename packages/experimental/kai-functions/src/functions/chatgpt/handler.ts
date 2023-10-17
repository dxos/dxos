//
// Copyright 2023 DXOS.org
//

import { Thread } from '@braneframe/types';
import { sleep } from '@dxos/async';
import { type FunctionContext } from '@dxos/functions';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { ChatModel } from './chat-model';
import { parseMessage } from './parser';
import { getKey } from '../../util';

type HandlerProps = {
  space: string;
  objects: string[];
};

// TODO(burdon): Feedback (presence).
// TODO(burdon): Prevent multiple responses (esp. if slow).

const identityKey = PublicKey.random().toHex(); // TODO(burdon): ???

export default async (event: HandlerProps, context: FunctionContext) => {
  const { space: spaceKey, objects: blockIds } = event; // TODO(burdon): Rename objects.
  const config = context.client.config;
  const space = context.client.spaces.get(PublicKey.from(spaceKey))!;

  // TODO(burdon): Logging (filename missing).
  log.info('chatgpt', { space: space.key });

  // Get active threads.
  // TODO(burdon): Handle batches with multiple block mutations per thread?
  const query = space.db.query(Thread.filter());
  const threads: Thread[] = query.objects; // TODO(burdon): Infer type?
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
      // Wait for block to be added.
      await sleep(500);
      // TODO(burdon): Create set of messages.
      const block = thread.blocks[thread.blocks.length - 1];

      if (block.__meta.keys.length === 0) {
        const model = new ChatModel({
          // TODO(burdon): Normalize env.
          orgId: process.env.COM_OPENAI_ORG_ID ?? getKey(config, 'openai.com/org_id')!,
          apiKey: process.env.COM_OPENAI_API_KEY ?? getKey(config, 'openai.com/api_key')!,
        });

        log.info('block', {
          thread: thread?.id.slice(0, 8),
          block: block.id.slice(0, 8),
          messages: block.messages.length,
          meta: block.__meta, // TODO(burdon): Use to distinguish generated messages.
        });

        // TODO(burdon): Pass in history.
        // TODO(burdon): Error handling (e.g., 401);
        const { content } =
          (await model.request(block.messages.map((message) => ({ role: 'user', content: message.text ?? '' })))) ?? {};

        log.info('response', { content });

        if (content) {
          const timestamp = new Date().toISOString();
          const messages = [];

          const result = parseMessage(content, 'json');
          if (result) {
            const { pre, data, post } = result;
            pre && messages.push({ timestamp, text: pre });
            messages.push({ timestamp, data: JSON.stringify(data) });
            post && messages.push({ timestamp, text: post }); // TODO(burdon): Skip TS.
          } else {
            messages.push({
              timestamp,
              text: content,
            });
          }

          thread.blocks.push(
            new Thread.Block(
              {
                identityKey,
                messages,
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

  return context.status(200).succeed();
};
