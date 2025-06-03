//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { DEFAULT_EDGE_MODEL } from '@dxos/ai';
import { AISession } from '@dxos/assistant';
import { AiService, defineFunction } from '@dxos/functions';
import { ObjectId } from '@dxos/keys';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

export const NormalizationInput = Schema.Struct({
  segments: Schema.Array(Schema.String).annotations({
    description: 'The sentences to normalize.',
  }),
});

export const NormalizationOutput = Schema.Struct({
  sentences: Schema.Array(Schema.String).annotations({
    description: 'The sentences of the transcript.',
  }),
});

const prompt = `
# Task Description:
  - Reconstruct sentences from the provided segments.

# Output Format:
  - You have been provided with the tool that defines the output format; make sure to query it.
  - Do not output anything other than the expected format.

# Restrictions:
  - Do not alter the order of the original messages; maintain the natural flow of speech.
  - Do not add or remove any words or phrases.
`;

export const sentenceNormalization = defineFunction({
  description: 'Post process of transcription for sentence normalization',
  inputSchema: NormalizationInput,
  outputSchema: NormalizationOutput,
  handler: async ({ data: { segments }, context }) => {
    log.info('input', { segments });
    const ai = context.getService(AiService);
    const session = new AISession({ operationModel: 'configured' });

    const response = await session.runStructured(NormalizationOutput, {
      generationOptions: { model: DEFAULT_EDGE_MODEL },
      client: ai.client,
      tools: [],
      artifacts: [],
      history: [
        {
          id: ObjectId.random(),
          role: 'user',
          content: segments.map((segment) => ({ type: 'text', text: segment })),
        },
      ],
      prompt,
    });

    log.info('response', { response });
    return response;
  },
});
