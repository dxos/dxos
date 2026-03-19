//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { trim } from '@dxos/util';

import {
  SentenceNormalization,
  SentenceNormalizationOutput,
  type MessageWithRangeIdType,
  type SentenceNormalizationInputType,
} from '../functions/definitions';

export type MessageWithRangeId = MessageWithRangeIdType;

/** @deprecated Use SentenceNormalizationInputType */
export type NormalizationInput = SentenceNormalizationInputType;

/** @deprecated Use SentenceNormalizationOutput */
export type NormalizationOutput = Schema.Schema.Type<typeof SentenceNormalizationOutput>;

/**
 * Sentence normalization for transcription.
 * TODO(dmaretskyi): Reimplement using AiSession.run or LanguageModel.generateObject - runStructured was removed.
 */
export const sentenceNormalization = SentenceNormalization.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ messages }) {
      log.info('input', { messages });
      // TODO(dmaretskyi): runStructured was removed from AiSession. Reimplement using new API.
      return yield* Effect.die(
        new Error(
          'Sentence normalization needs to be reimplemented - runStructured was removed from AiSession. Use AiSession.run or LanguageModel.generateObject.',
        ),
      );
    }),
  ),
);

const _unusedPrompt = trim`
  You are observing a real-time transcript of a single person speaking.
  The transcription is delivered in chunks of 10 seconds or less. As a result, individual sentences may be split across multiple messages, or multiple sentences may appear within a single message. Additionally, because this is real-time transcription, punctuation and capitalization may be incorrect or missing.

  # Task Description:
    - Your task is to detect and reconstruct broken or incomplete sentences by merging segments into coherent, grammatically correct sentences where appropriate.

  # Input Format:
    - The input is an array of messages that contain transcription blocks.
    - Each message is a Message.Message, as described in the output format.

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
