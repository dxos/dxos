//
// Copyright 2025 DXOS.org
//

// ISSUE(burdon): defineFunction
// @ts-nocheck

import * as Schema from 'effect/Schema';

import { AiService, DEFAULT_EDGE_MODEL } from '@dxos/ai';
import { AiSession } from '@dxos/assistant';
import { Obj } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { ObjectId } from '@dxos/keys';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';
import { trim } from '@dxos/util';

const MessageWithRangeId = Schema.extend(
  DataType.Message.Message,
  Schema.Struct({
    // TODO(mykola): Move to meta in DataType.Message. Use `DataType.Message.Message` instead.
    rangeId: Schema.optional(Schema.Array(Schema.String)).annotations({
      description: 'The IDs of the messages that contain the sentences.',
    }),
  }),
);

export interface MessageWithRangeId extends Schema.Schema.Type<typeof MessageWithRangeId> {}

export const NormalizationInput = Schema.Struct({
  // TODO(mykola): Move to meta in DataType.Message. Use `DataType.Message.Message` instead.
  messages: Schema.Array(MessageWithRangeId).annotations({
    description: 'Messages to normalize into sentences.',
  }),
});
export interface NormalizationInput extends Schema.Schema.Type<typeof NormalizationInput> {}

export const NormalizationOutput = Schema.Struct({
  sentences: Schema.Array(MessageWithRangeId.pipe(Schema.mutable)).pipe(Schema.mutable).annotations({
    description: 'The sentences of the transcript.',
  }),
});
export interface NormalizationOutput extends Schema.Schema.Type<typeof NormalizationOutput> {}

export const sentenceNormalization = defineFunction<NormalizationInput, NormalizationOutput>({
  description: 'Post process of transcription for sentence normalization',
  inputSchema: NormalizationInput,
  outputSchema: NormalizationOutput,
  handler: async ({ data: { messages }, context }) => {
    log.info('input', { messages });
    const ai = context.getService(AiService);
    const session = new AiSession({ operationModel: 'configured' });

    // TODO(dmaretskyi): This got broken after effect-ai transition.
    const response = session.runStructured(NormalizationOutput, {
      generationOptions: {
        model: DEFAULT_EDGE_MODEL,
      },
      client: ai.client,
      tools: [],
      artifacts: [],
      history: [
        Obj.make(DataType.Message.Message, {
          created: new Date().toISOString(),
          sender: {
            role: 'user',
          },
          blocks: messages.map((message) => ({ _tag: 'text', text: JSON.stringify(message) }) as const),
        }),
      ],
      prompt,
    }) as any;

    response.sentences.forEach((sentence) => {
      sentence.id = ObjectId.random();
    });
    log.info('response', { response });
    return response;
  },
});

const prompt = trim`
  You are observing a real-time transcript of a single person speaking.
  The transcription is delivered in chunks of 10 seconds or less. As a result, individual sentences may be split across multiple messages, or multiple sentences may appear within a single message. Additionally, because this is real-time transcription, punctuation and capitalization may be incorrect or missing.

  # Task Description:
    - Your task is to detect and reconstruct broken or incomplete sentences by merging segments into coherent, grammatically correct sentences where appropriate.

  # Input Format:
    - The input is an array of messages that contain transcription blocks.
    - Each message is a DataType.Message.Message, as described in the output format.

  # Output Format:
    - You have been provided with the tool that defines the output format; make sure to query it.
    - Do not output anything other than the expected format.

  # Segment Handling Rules:
    - Sort messages by timestamp.
    - Leave ID of the first message in a sentence.
    - Each divided sentence should be added to the output as a separate message or block within existing messages, preserving the original order.
    - If one message contains multiple sentences, you should not split them.
    - The last sentence may be incomplete; it should still be output as a separate block or message.
    - Keep track of the original timestamps of the messages and blocks and, use the timestamp of the first message/block of a sentence as the 'started' field of the merged message.
    - The 'rangeId' field of the merged message should include 'messageId'-s and 'rangeId'-s of all messages that have been used to construct this message.

  # Punctuation and Capitalization:
    - Do not rely on the original punctuation and capitalization—they may be incorrect.
    - Use logical reasoning to apply appropriate punctuation (e.g., period, comma, question mark, exclamation mark) and capitalization.

  # Restrictions:
    - Do not alter the order of the original messages; maintain the natural flow of speech.
    - Do not interpret or infer meaning beyond reconstructing sentences.
    - Do not add or remove any words or phrases.
`;
