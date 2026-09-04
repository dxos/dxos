//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { SpaceSchema } from '@dxos/client/echo';
import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Ref, Type } from '@dxos/echo';
import { SchemaAST } from '@dxos/effect';
// Message and Person are used via Type.getSchema(Message.Message); they also appear in emitted .d.ts.
// eslint-disable-next-line unused-imports/no-unused-imports
import { Message, type Person, Transcript } from '@dxos/types';

export const Create = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.transcription.create'),
    name: 'Create Transcript',
    icon: 'ph--microphone--regular',
  },
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    space: SpaceSchema,
  }),
  output: Schema.Struct({
    object: Type.getSchema(Transcript.Transcript),
  }),
});

// `SchemaAST.assignFields`, not `mapFields`: `Type.getSchema` returns a `Codec`, which carries no
// field literals for a struct operation.
export const MessageWithRangeId = Schema.make<Schema.Codec<any, any>>(
  SchemaAST.assignFields(
    Type.getSchema(Message.Message).ast,
    Schema.Struct({
      rangeId: Schema.optional(Schema.Array(Schema.String)).annotate({
        description: 'The IDs of the messages that contain the sentences.',
      }),
    }).ast,
  ),
);

export type MessageWithRangeIdType = Schema.Schema.Type<typeof MessageWithRangeId>;

export const Open = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.transcription.open'),
    name: 'Open',
    description: 'Opens and reads the contents of a transcription object.',
    icon: 'ph--folder-open--regular',
  },
  input: Schema.Struct({
    transcript: Ref.Ref(Transcript.Transcript).annotate({
      description: 'The ID of the transcription object.',
    }),
  }),
  output: Schema.Struct({
    content: Schema.String,
  }),
  services: [Database.Service],
});

export const Summarize = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.transcription.summarize'),
    name: 'Summarize',
    description: 'Summarize a transcript of a meeting.',
    icon: 'ph--text-align-left--regular',
  },
  input: Schema.Struct({
    transcript: Schema.String.annotate({
      description: 'The transcript of the meeting.',
    }),
    notes: Schema.optional(Schema.String).annotate({
      description: 'Additional notes from the participants.',
    }),
  }),
  output: Schema.Struct({
    summary: Schema.String.annotate({
      description: 'The summary of the transcript.',
    }),
  }),
  services: [AiService.AiService],
}).pipe(Operation.visible);

export const EnrichMessage = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.transcription.enrichMessage'),
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
  messages: Schema.Array(MessageWithRangeId).annotate({
    description: 'Messages to normalize into sentences.',
  }),
});

export type SentenceNormalizationInputType = Schema.Schema.Type<typeof SentenceNormalizationInput>;

export const SentenceNormalizationOutput = Schema.Struct({
  sentences: Schema.Array(MessageWithRangeId).pipe(Schema.mutable).annotate({
    description: 'The sentences of the transcript.',
  }),
});

export const SentenceNormalization = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.transcription.normalizeSentence'),
    name: 'Sentence Normalization',
    description: 'Post process of transcription for sentence normalization',
    icon: 'ph--text-t--regular',
  },
  input: SentenceNormalizationInput,
  output: SentenceNormalizationOutput,
  services: [],
});
