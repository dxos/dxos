//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { SpaceSchema } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { Database, Feed, Ref } from '@dxos/echo';
import { Message, Transcript } from '@dxos/types';

import { meta } from '#meta';

const TRANSCRIPT_OPERATION = `${meta.id}.operation`;

export const Create = Operation.make({
  meta: { key: `${TRANSCRIPT_OPERATION}.create`, name: 'Create Transcript' },
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    space: SpaceSchema,
  }),
  output: Schema.Struct({
    object: Transcript.Transcript,
  }),
});

export type MessageWithRangeIdType = Message.Message & { readonly rangeId?: readonly string[] };

export const MessageWithRangeId: Schema.Schema.AnyNoContext = Schema.extend(
  Message.Message,
  Schema.Struct({
    rangeId: Schema.optional(Schema.Array(Schema.String)).annotations({
      description: 'The IDs of the messages that contain the sentences.',
    }),
  }),
);

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
  services: [Database.Service, Feed.FeedService],
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

export type SentenceNormalizationInputType = { readonly messages: readonly MessageWithRangeIdType[] };

export const SentenceNormalizationInput: Schema.Schema.AnyNoContext = Schema.Struct({
  messages: Schema.Array(MessageWithRangeId as Schema.Schema.AnyNoContext).annotations({
    description: 'Messages to normalize into sentences.',
  }),
});

export const SentenceNormalizationOutput: Schema.Schema.AnyNoContext = Schema.Struct({
  sentences: Schema.Array((MessageWithRangeId as Schema.Schema.AnyNoContext).pipe(Schema.mutable))
    .pipe(Schema.mutable)
    .annotations({
      description: 'The sentences of the transcript.',
    }),
});

export const SentenceNormalization: Operation.Definition.Any = Operation.make({
  meta: {
    key: 'org.dxos.function.transcription.sentence-normalization',
    name: 'Sentence Normalization',
    description: 'Post process of transcription for sentence normalization',
  },
  input: SentenceNormalizationInput,
  output: SentenceNormalizationOutput,
  services: [],
});
