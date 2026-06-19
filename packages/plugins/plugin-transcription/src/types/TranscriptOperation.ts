//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { SpaceSchema } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { Database, Feed, Ref, Type, DXN } from '@dxos/echo';
import { Message, Transcript } from '@dxos/types';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

export const Create = Operation.make({
  meta: { key: makeKey('create'), name: 'Create Transcript', icon: 'ph--microphone--regular' },
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    space: SpaceSchema,
  }),
  output: Schema.Struct({
    object: Type.getSchema(Transcript.Transcript),
  }),
});

export const MessageWithRangeId = Schema.extend(
  Type.getSchema(Message.Message),
  Schema.Struct({
    rangeId: Schema.optional(Schema.Array(Schema.String)).annotations({
      description: 'The IDs of the messages that contain the sentences.',
    }),
  }),
);

export type MessageWithRangeIdType = Schema.Schema.Type<typeof MessageWithRangeId>;

export const Open = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.transcription.open'),
    name: 'Open',
    description: 'Opens and reads the contents of a transcription object.',
    icon: 'ph--folder-open--regular',
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
    key: DXN.make('org.dxos.function.transcription.summarize'),
    name: 'Summarize',
    description: 'Summarize a transcript of a meeting.',
    icon: 'ph--text-align-left--regular',
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

export const EnrichMessage = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.transcription.enrichMessage'),
    name: 'Enrich Transcript Message',
    description: 'Extract proper nouns from a transcript message and link them to objects in the space.',
    icon: 'ph--text-t--regular',
  },
  input: Schema.Struct({
    message: Type.getSchema(Message.Message),
  }),
  output: Schema.Struct({
    message: Type.getSchema(Message.Message),
  }),
  services: [AiService.AiService, Database.Service],
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
    key: DXN.make('org.dxos.function.transcription.sentenceNormalization'),
    name: 'Sentence Normalization',
    description: 'Post process of transcription for sentence normalization',
    icon: 'ph--text-t--regular',
  },
  input: SentenceNormalizationInput,
  output: SentenceNormalizationOutput,
  services: [],
});
