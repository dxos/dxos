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

export const InputSchema = Schema.Struct({
  segments: Schema.Array(DataType.MessageBlock.Transcription).annotations({
    description: 'Segments to normalize into sentences.',
  }),
});

export const OutputSchema = Schema.Struct({
  sentences: Schema.Array(DataType.MessageBlock.Transcription).pipe(Schema.mutable).annotations({
    description: 'The sentences of the transcript.',
  }),
});

const prompt = `
You are observing a real-time transcript of a single person speaking.
The transcription is delivered in chunks of 10 seconds or less. As a result, individual sentences may be split across multiple messages, or multiple sentences may appear within a single message. Additionally, because this is real-time transcription, punctuation and capitalization may be incorrect or missing.

# Task Description:
  - Your task is to detect and reconstruct broken or incomplete sentences by merging fragments into coherent, grammatically correct sentences where appropriate.
  - Keep track of the original timestamps of the segments and put the timestamp of the first segment of a sentence as the started field of the output sentence.


# Input Format:
- The input is an array of segments.
- Each segment is of type DataType.MessageBlock.Transcription as in the output format.

# Output Format:
  - You have been provided with the tool that describes the output format, make sure to query it.
  - Do not output anything else than the output format.

# Segment Handling Rules:
  - Each complete sentence should be added as a separate string to output, preserving the original order.
  - Last sentence could be incomplete, but it should be outputted as a separate string.

# Punctuation and Capitalization:
  - Do not rely on the original punctuation and capitalization—they may be incorrect.
  - Use logical reasoning to insert appropriate punctuation (e.g., period, comma, question mark, exclamation mark) and capitalization.

# Restrictions:
  - Do not alter the order of the original messages; maintain the natural flow of speech.
  - Do not interpret or infer meaning beyond reconstructing sentences.
  - Do not add or remove any words or phrases.
`;

export const sentenceNormalization = defineFunction({
  description: 'Post process of transcription for sentence normalization',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ data: { segments }, context }) => {
    log.info('input', { segments });
    const ai = context.getService(AiService);
    const session = new AISession({ operationModel: 'configured' });

    const response = await session.runStructured(OutputSchema, {
      generationOptions: { model: DEFAULT_EDGE_MODEL },
      client: ai.client,
      tools: [],
      artifacts: [],
      history: [
        {
          id: ObjectId.random(),
          role: 'user',
          content: segments.map((segment) => ({ type: 'text', text: JSON.stringify(segment) })),
        },
      ],
      prompt,
    });

    log.info('response', { response });
    return response;
  },
});
