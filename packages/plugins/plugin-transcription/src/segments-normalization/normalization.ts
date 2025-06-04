//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { DEFAULT_EDGE_MODEL } from '@dxos/ai';
import { AISession } from '@dxos/assistant';
import { AiService, defineFunction } from '@dxos/functions';
import { ObjectId } from '@dxos/keys';
import { log } from '@dxos/log';
import { invariant } from '@dxos/invariant';

export const NormalizationInput = Schema.Struct({
  segments: Schema.Array(Schema.String).annotations({
    description: 'The sentences to normalize.',
  }),
});

export const NormalizationOutput = Schema.Struct({
  sentences: Schema.Array(Schema.String).pipe(Schema.mutable).annotations({
    description: 'The sentences of the transcript.',
  }),
});

const prompt = `
# Task Description:
  - Your task is to process the provided segments and return the remapped sentences.
  - Reconstruct sentences from the provided segments.

# Output Format:
  - You need to provide me an array of new sentences as an array of strings.  
  - Do not output anything other than the expected format.

# Restrictions:
  - Do not add or remove any words or phrases.
  - Do not rephrase the sentences.
`;

export const sentenceNormalization = defineFunction({
  description: 'Post process of transcription for sentence normalization',
  inputSchema: NormalizationInput,
  outputSchema: NormalizationOutput,
  handler: async ({ data: { segments }, context }) => {
    log.info('input', { segments });
    if (segments.length === 0) {
      return { sentences: [] };
    }

    const ai = context.getService(AiService);
    const session = new AISession({ operationModel: 'configured' });
    const response = await session.run({
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

    const lastMessage = response.at(-1)?.content.at(-1);
    log.info('lastMessage', { lastMessage });
    invariant(lastMessage?.type === 'text', 'Last message is not a text');
    const sentences = JSON.parse(lastMessage.text);
    log.info('sentences', { sentences });

    return { sentences };
  },
});
