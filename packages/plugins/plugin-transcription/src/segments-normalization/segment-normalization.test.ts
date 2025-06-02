//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { AIServiceEdgeClient, OllamaClient } from '@dxos/ai';
import { AI_SERVICE_ENDPOINT } from '@dxos/ai/testing';
import { FunctionExecutor, ServiceContainer } from '@dxos/functions';
import { log } from '@dxos/log';
import { type DataType } from '@dxos/schema';

import { sentenceNormalization } from './function';

// Generate bunch of complex messages.
const segments: DataType.MessageBlock.Transcription[] = [
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
].map((string, index) => ({
  type: 'transcription',
  started: new Date(Date.now() + 1000 * index).toISOString(),
  text: string,
}));

const REMOTE_AI = true;

describe('SentenceNormalization', () => {
  const getExecutor = () => {
    return new FunctionExecutor(
      new ServiceContainer().setServices({
        ai: {
          client: REMOTE_AI
            ? new AIServiceEdgeClient({
                endpoint: AI_SERVICE_ENDPOINT.REMOTE,
                defaultGenerationOptions: {
                  model: '@anthropic/claude-3-5-sonnet-20241022',
                },
              })
            : new OllamaClient({
                overrides: {
                  model: 'llama3.1:8b',
                },
              }),
        },
      }),
    );
  };

  test.only('messages merging', { timeout: 120_000 }, async () => {
    const executor = getExecutor();

    const sentences: DataType.MessageBlock.Transcription[] = [];
    let buffer: DataType.MessageBlock.Transcription[] = [];
    let activeSentenceIndex = 0;
    for (const segment of segments) {
      const result = await executor.invoke(sentenceNormalization, {
        segments: [...buffer, segment],
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
