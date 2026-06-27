//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const Settings = Schema.mutable(
  Schema.Struct({
    entityExtraction: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Entity extraction',
        description:
          'While transcribing, use the Assistant to detect and annotate mentions of known objects such as people or organizations.',
      }),
    ).pipe(Schema.withConstructorDefault(() => true)),

    transcribeAfterMs: Schema.optional(
      Schema.Number.annotations({
        title: 'Initial buffering (ms)',
        description: 'How long to accumulate audio before producing the first transcription.',
      }),
    ).pipe(Schema.withConstructorDefault(() => 4000)),

    streamMode: Schema.optional(
      Schema.Literal('batch', 'word').annotations({
        title: 'Reveal mode',
        description: 'Whether transcribed text appears in batches or streams word-by-word.',
      }),
    ).pipe(Schema.withConstructorDefault(() => 'word' as const)),

    wordIntervalMs: Schema.optional(
      Schema.Number.annotations({
        title: 'Word interval (ms)',
        description: 'Pacing between words when streaming word-by-word.',
      }),
    ).pipe(Schema.withConstructorDefault(() => 80)),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
