//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { FunctionExecutor, ServiceContainer } from '@dxos/compute-runtime';
import { log } from '@dxos/log';
import { type Actor, Message } from '@dxos/types';

import { type MessageWithRangeId, sentenceNormalization } from './normalization';

const sender: Actor.Actor = {
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
  Obj.make(Message.Message, {
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
        //           model: 'ai.claude.model.claude-3-5-sonnet-20241022',
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
      messages: JSON.stringify(messages, null, 2),
      sentences: JSON.stringify(sentences, null, 2),
    });
    throw new Error('test');
  });

  // TODO(burdon): Restore a Feed-based version once `MessageNormalizer` has a
  //   space-backed test fixture available; the previous `MemoryQueue`-based
  //   test was incompatible with the `Feed.Feed` + `FeedService` refactor.
});
