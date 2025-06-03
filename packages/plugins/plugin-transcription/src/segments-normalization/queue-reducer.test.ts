//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { create, ObjectId } from '@dxos/echo-schema';
import { DataType } from '@dxos/schema';
import { ServiceContainer } from '@dxos/functions';
import { FunctionExecutor } from '@dxos/functions';
import { log } from '@dxos/log';
import { normalizationMockFn } from './normalization-mock';

export const sender = {
  identityDid: 'did:key:1',
};

const segments = [
  // Control message.
  'Hello, every body. We will talk about quantum entanglement today.',

  // Sentence broken into pieces.
  'Quantum entanglement',
  'is one of the most',
  'perplexing and fascinating phenomena',
  'in modern physics.',

  'It challenges our classical',
  'intuitions about how the universe works',
  'and forces us to reconsider our assumptions',
  'about space, time, and information. At its',
  'core, quantum entanglement',
  'refers to a peculiar connection between',
  'two or more particles in such a way that',
  'the state of one particle instantly',
  'determines the state of the other, no matter',
  'how far apart they may be',
  '— even if they are light-years away.',

  // 2 sentences are merged.
  'This seemingly instantaneous correlation between distant particles has baffled physicists since the early 20th century. To understand entanglement, we',
  'first need to touch on the fundamentals of quantum mechanics.',

  // No punctuation.
  'In classical physics objects have well-defined properties such as position speed and momentum.',
];

describe.only('QueueReducer', () => {
  test('sanity check', async () => {
    const executor = new FunctionExecutor(new ServiceContainer());
    let buffer: string[] = [];
    const sentences: string[] = [];
    let activeSentenceIndex = 0;

    for (const segment of segments) {
      const result = await executor.invoke(normalizationMockFn, {
        segments: [...buffer, segment],
      });

      sentences.splice(activeSentenceIndex, sentences.length - activeSentenceIndex, ...result.sentences);

      if (sentences.length > 0) {
        activeSentenceIndex = sentences.length - 1;
        buffer = sentences.slice(activeSentenceIndex);
      }
    }
    sentences.push(...buffer);

    log.info('result', { sentences });
  });

  test('reduce queue', async () => {
    const executor = new FunctionExecutor(new ServiceContainer());
    const result = await executor.invoke(normalizationMockFn, {
      segments,
    });
    log.info('result', { result });
  });
});
