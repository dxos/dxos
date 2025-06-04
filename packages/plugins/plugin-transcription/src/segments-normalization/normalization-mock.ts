//
// Copyright 2025 DXOS.org
//

import { defineFunction } from '@dxos/functions';

import { NormalizationInput, NormalizationOutput } from './normalization';

export const normalizationMockFn = defineFunction({
  description: 'Post process of transcription for sentence normalization',
  inputSchema: NormalizationInput,
  outputSchema: NormalizationOutput,
  handler: async ({ data: { segments } }) => {
    const words = segments.flatMap((segment) => segment.split(/\s+/)).map((word) => word.trim());

    let currentSentence: string[] = [];
    const resultSentences: string[] = [];
    for (const word of words) {
      currentSentence.push(word);
      if (word.endsWith('.')) {
        resultSentences.push(currentSentence.join(' '));
        currentSentence = [];
      }
    }

    if (currentSentence.length > 0) {
      resultSentences.push(currentSentence.join(' '));
    }

    return { sentences: resultSentences };
  },
});
