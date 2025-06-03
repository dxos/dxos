//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { create, getMeta } from '@dxos/echo-schema';
import { defineFunction } from '@dxos/functions';
import { ObjectId } from '@dxos/keys';
import { DataType } from '@dxos/schema';

import { type MessageWithRangeId } from './normalization';
import { log } from '@dxos/log';

export const NormalizationInput = Schema.Struct({
  messages: Schema.Array(DataType.Message).annotations({
    description: 'The IDs of the messages that contain the sentences.',
  }),
});

export const NormalizationOutput = Schema.Struct({
  sentences: Schema.Array(DataType.Message.pipe(Schema.mutable)).pipe(Schema.mutable).annotations({
    description: 'The sentences of the transcript.',
  }),
});

const createFinalizedMessage = ({
  text,
  timestamp,
  succeeds,
  originalMessage,
}: {
  text: string;
  timestamp: string;
  succeeds: ObjectId[];
  originalMessage: DataType.Message;
}): MessageWithRangeId => {
  const message = create(DataType.Message, {
    ...originalMessage,
    id: ObjectId.random(),
    blocks: [{ type: 'transcription', started: timestamp, text: text.trim() }],
    created: timestamp,
  });

  getMeta(message).succeeds.push(...succeeds);
  return message;
};

export const normalizationMockFn = defineFunction({
  description: 'Post process of transcription for sentence normalization',
  inputSchema: NormalizationInput,
  outputSchema: NormalizationOutput,
  handler: async ({ data: { messages } }) => {
    const sentences: MessageWithRangeId[] = [];

    // Sort messages by timestamp
    const sortedMessages = [...messages].sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());

    let currentSentence = '';
    let currentMessageIds: string[] = [];
    let currentTimestamp = '';
    let firstMessageData: DataType.Message | undefined;

    for (const message of sortedMessages) {
      // Extract text from message blocks
      const textBlocks = message.blocks?.filter((block) => block.type === 'transcription') || [];
      const text = textBlocks.map((block) => (block as any).text).join(' ');

      if (!text.trim()) {
        continue;
      }

      currentSentence += (currentSentence ? ' ' : '') + text.trim();
      currentMessageIds.push(message.id, ...getMeta(message).succeeds);

      if (!firstMessageData) {
        firstMessageData = message;
        currentTimestamp = message.created;
      }

      // Check for sentence-ending punctuation
      const sentenceEnders = /[.!?]/g;
      const matches = [...currentSentence.matchAll(sentenceEnders)];

      if (matches.length > 0) {
        // Split by sentence-ending punctuation
        const parts = currentSentence.split(/([.!?])/);
        let tempSentence = '';

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];

          if (/[.!?]/.test(part)) {
            // This is punctuation, add it to current sentence and finalize
            tempSentence += part;

            if (tempSentence.trim()) {
              sentences.push(
                createFinalizedMessage({
                  text: tempSentence,
                  timestamp: currentTimestamp,
                  succeeds: currentMessageIds,
                  originalMessage: firstMessageData!,
                }),
              );
            }

            // Reset for next sentence
            tempSentence = '';
            currentMessageIds = [];
          } else if (part.trim()) {
            // This is text content
            tempSentence += part;
          }
        }

        // Handle any remaining text that doesn't end with punctuation
        if (tempSentence.trim()) {
          currentSentence = tempSentence.trim();
          // Keep current state for potential continuation
        } else {
          currentSentence = '';
          currentMessageIds = [];
          firstMessageData = undefined;
        }
      }
    }

    // Handle any remaining incomplete sentence
    if (currentSentence.trim() && firstMessageData) {
      sentences.push(
        createFinalizedMessage({
          text: currentSentence,
          timestamp: currentTimestamp,
          succeeds: currentMessageIds,
          originalMessage: firstMessageData,
        }),
      );
    }

    return { sentences };
  },
});
