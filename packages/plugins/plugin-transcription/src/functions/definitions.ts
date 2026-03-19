//
// Copyright 2025 DXOS.org
//

import { Operation } from '@dxos/operation';
import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { Database, Ref } from '@dxos/echo';
import { QueueService } from '@dxos/functions';
import { Message, Transcript } from '@dxos/types';

export const MessageWithRangeId = Schema.extend(
  Message.Message,
  Schema.Struct({
    rangeId: Schema.optional(Schema.Array(Schema.String)).annotations({
      description: 'The IDs of the messages that contain the sentences.',
    }),
  }),
);

export type MessageWithRangeIdType = Schema.Schema.Type<typeof MessageWithRangeId>;

export const Open = Operation.make({
  meta: {
    key: 'org.dxos.function.transcription.open',
    name: 'Open',
    description: 'Opens and reads the contents of a transcription object.',
  },
  input: Schema.Struct({
    transcript: Ref.Ref(Transcript.Transcript).annotations({
      description: 'The ID of the transcription object.',
    }),
  }),
  output: Schema.Struct({
    content: Schema.String,
  }),
  services: [Database.Service, QueueService],
});

export const Summarize = Operation.make({
  meta: {
    key: 'org.dxos.function.transcription.summarize',
    name: 'Summarize',
    description: 'Summarize a transcript of a meeting.',
  },
  input: Schema.Struct({
    transcript: Schema.String.annotations({
      description: 'The transcript of the meeting.',
    }),
    notes: Schema.optional(Schema.String).annotations({
      description: 'Additional notes from the participants.',
    }),
  }),
  output: Schema.Struct({
    summary: Schema.String.annotations({
      description: 'The summary of the transcript.',
    }),
  }),
  services: [AiService.AiService],
});

export const SentenceNormalizationInput = Schema.Struct({
  messages: Schema.Array(MessageWithRangeId).annotations({
    description: 'Messages to normalize into sentences.',
  }),
});

export type SentenceNormalizationInputType = Schema.Schema.Type<typeof SentenceNormalizationInput>;

export const SentenceNormalizationOutput = Schema.Struct({
  sentences: Schema.Array(MessageWithRangeId.pipe(Schema.mutable)).pipe(Schema.mutable).annotations({
    description: 'The sentences of the transcript.',
  }),
});

export const SentenceNormalization = Operation.make({
  meta: {
    key: 'org.dxos.function.transcription.sentence-normalization',
    name: 'Sentence Normalization',
    description: 'Post process of transcription for sentence normalization',
  },
  input: SentenceNormalizationInput,
  output: SentenceNormalizationOutput,
  services: [],
});
