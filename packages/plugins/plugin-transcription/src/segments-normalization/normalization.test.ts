//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-core';
import { describe, test } from 'vitest';

import { scheduleTaskInterval } from '@dxos/async';
import { Context } from '@dxos/context';
import { Obj } from '@dxos/echo';
import { createQueueDXN } from '@dxos/echo/internal';
import { MemoryQueue } from '@dxos/echo-db';
import { FunctionExecutor, ServiceContainer } from '@dxos/functions';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

import { MessageNormalizer } from './message-normalizer';
import { type MessageWithRangeId, sentenceNormalization } from './normalization';
import { getActorId } from './utils';

const sender: DataType.Actor = {
  identityDid: 'did:key:123',
};

// Generate bunch of complex messages.
const messages: MessageWithRangeId[] = [
  // Control message.
  'Hello, every body. We will talk about quantum entanglement today',

  // Two sentences in one message.
  'hello every body we will talk about quantum entanglement today',

  // Sentence broken into pieces.
  'quantum entanglement',
  'is one of the most...',
  'perplexing and fascinating phenomena',
  'in modern physics',

  // Two sentences without separators.
  'it challenges our classical intuitions about how the universe works and forces us to reconsider our assumptions about space, time, and information',
  'at its core, quantum entanglement refers to a peculiar connection between two or more particles in such a way that the state of one particle instantly...',
  'determines the state of the other, no matter how far apart they may be — even if they are light-years away',

  // 2 sentences are merged.
  'this seemingly instantaneous correlation between distant particles has baffled physicists since the early 20th century to understand entanglement, we',
  'first need to touch on the fundamentals of quantum mechanics',

  // No punctuation.
  'in classical physics objects have well-defined properties such as position speed and momentum',
].map((string, index) =>
  Obj.make(DataType.Message, {
    created: new Date(Date.now() + 1_000 * index).toISOString(),
    sender,
    blocks: [{ _tag: 'transcript', started: new Date(Date.now() + 1_000 * index).toISOString(), text: string }],
  }),
);

// const REMOTE_AI = true;

describe.skip('SentenceNormalization', () => {
  const getExecutor = () => {
    return new FunctionExecutor(
      new ServiceContainer().setServices({
        // ai: {
        //   client: REMOTE_AI
        //     ? new Edge AiServiceClient({
        //         endpoint: AI_SERVICE_ENDPOINT.REMOTE,
        //         defaultGenerationOptions: {
        //           model: '@anthropic/claude-3-5-sonnet-20241022',
        //         },
        //       })
        //     : new Ollama AiServiceClient({
        //         overrides: {
        //           model: 'llama3.1:8b',
        //         },
        //       }),
        // },
      }),
    );
  };

  test('messages merging', { timeout: 120_000 }, async () => {
    const executor = getExecutor();
    const sentences: MessageWithRangeId[] = [];
    let buffer: MessageWithRangeId[] = [];
    let activeSentenceIndex = 0;
    for (const message of messages) {
      const result = await executor.invoke(sentenceNormalization, {
        messages: [...buffer, message],
      });
      log.info('BEFORE sentence splicing', { activeSentenceIndex, sentences, inserting: result.sentences });
      sentences.splice(activeSentenceIndex, sentences.length - activeSentenceIndex, ...result.sentences);
      log.info('AFTER sentence splicing', { activeSentenceIndex, sentences });

      if (sentences.length > 0) {
        activeSentenceIndex = sentences.length - 1;
        buffer = sentences.slice(activeSentenceIndex);
      }
    }

    log.info('sentences', {
      originalMessages: JSON.stringify(messages, null, 2),
      sentences: JSON.stringify(sentences, null, 2),
    });
    throw new Error('test');
  });

  test.only('queue', { timeout: 120_000 }, async () => {
    // Create queue.
    // TODO(dmaretskyi): Use space.queues.create() instead.
    const queue = new MemoryQueue<DataType.Message>(createQueueDXN());
    const ctx = new Context();
    let idx = 0;
    scheduleTaskInterval(
      ctx,
      async () => {
        if (idx >= messages.length) {
          void ctx.dispose();
          return;
        }
        await queue.append([messages[idx]]);
        idx++;
      },
      2_000,
    );

    // Create normalizer.
    const normalizer = new MessageNormalizer({
      functionExecutor: getExecutor(),
      queue,
      startingCursor: { actorId: getActorId(sender), timestamp: '0' },
    });

    // Start normalizer.
    await normalizer.open();
    effect(() => {
      log.info('normalizer');
      log.info(JSON.stringify(queue.objects, null, 2));
    });

    await new Promise(() => {});
  });
});
