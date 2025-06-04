//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-core';
import { describe, onTestFinished, test } from 'vitest';

import { AIServiceClient, AIServiceEdgeClient, OllamaClient } from '@dxos/ai';
import { AI_SERVICE_ENDPOINT } from '@dxos/ai/testing';
import { scheduleTaskInterval } from '@dxos/async';
import { Context } from '@dxos/context';
import { MemoryQueue } from '@dxos/echo-db';
import { createQueueDxn, ObjectId } from '@dxos/echo-schema';
import { FunctionExecutor, ServiceContainer } from '@dxos/functions';
import { log } from '@dxos/log';
import { type DataType } from '@dxos/schema';

import { MessageNormalizer } from './message-normalizer';
import { sentenceNormalization } from './normalization';
import { getActorId } from './utils';
import { LanguageModelClient } from './language-model-client';

const sender: DataType.Actor = {
  identityDid: 'did:key:123',
};

// Generate bunch of complex messages.
const messages: string[] = [
  // Control message.
  'Hello, every body. We will talk about quantum entanglement today',

  // Two sentences in one message.
  'hello every body we will talk about quantum entanglement today',

  // Sentence broken into pieces.
  // 'quantum entanglement',
  // 'is one of the most...',
  // 'perplexing and fascinating phenomena',
  // 'in modern physics',

  // // Two sentences without separators.
  // 'it challenges our classical',
  // 'intuitions about how the universe works',
  // 'and forces us to reconsider our assumptions about space',
  // 'time, and information at its core, quantum',
  // 'entanglement refers to a peculiar connection',
  // 'between two or more particles in such a way',
  // 'that the state of one particle instantly...',
  // 'determines the state of the other, no matter how far apart',
  // 'they may be — even if they are light-years away',

  // // 2 sentences are merged.
  // 'this seemingly instantaneous correlation between distant particles has baffled physicists since the early 20th century to understand entanglement, we',
  // 'first need to touch on the fundamentals of quantum mechanics',

  // // No punctuation.
  // 'in classical physics objects have well-defined properties such as position speed and momentum',
];

describe('SentenceNormalization', () => {
  const getExecutor = async ({ inBrowser = false, remote = true }: { inBrowser?: boolean; remote?: boolean } = {}) => {
    let client: AIServiceClient;

    if (inBrowser) {
      const languageModelClient = new LanguageModelClient();
      await languageModelClient.open();
      onTestFinished(async () => {
        await languageModelClient.close();
      });
      client = languageModelClient;
    } else if (remote) {
      client = new AIServiceEdgeClient({
        endpoint: AI_SERVICE_ENDPOINT.REMOTE,
        defaultGenerationOptions: {
          model: '@anthropic/claude-3-5-sonnet-20241022',
        },
      });
    } else {
      client = new OllamaClient({
        overrides: {
          model: 'llama3.1:8b',
        },
      });
    }
    return new FunctionExecutor(
      new ServiceContainer().setServices({
        ai: { client },
      }),
    );
  };

  test('messages merging', { timeout: 120_000 }, async () => {
    const executor = await getExecutor();
    const sentences: string[] = [];
    let buffer: string[] = [];
    let activeSentenceIndex = 0;
    for (const message of messages) {
      const result = await executor.invoke(sentenceNormalization, {
        segments: [...buffer, message],
      });
      log.info('BEFORE sentence splicing', { activeSentenceIndex, sentences, inserting: result.sentences });
      sentences.splice(activeSentenceIndex, sentences.length - activeSentenceIndex, ...result.sentences);
      log.info('AFTER sentence splicing', { activeSentenceIndex, sentences });

      if (sentences.length > 0) {
        activeSentenceIndex = sentences.length - 1;
        buffer = sentences.slice(activeSentenceIndex);
      }
    }
    log.info('sentences', { sentences });
    throw new Error('test');
  });
});
