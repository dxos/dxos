//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

export const Settings = Schema.Struct({
  detectMeetings: Schema.optional(
    Schema.Boolean.annotate({
      title: 'Detect meetings',
      description:
        'Offer to take notes when another app (Zoom, Meet, Teams, FaceTime, ...) starts using the microphone. Desktop only.',
    }),
  ).pipe(Schema.withConstructorDefault(Effect.succeed(true))),

  autoStart: Schema.optional(
    Schema.Boolean.annotate({
      title: 'Start recording automatically',
      description: 'Begin recording as soon as a meeting is detected instead of asking first.',
    }),
  ).pipe(Schema.withConstructorDefault(Effect.succeed(false))),

  autoStop: Schema.optional(
    Schema.Boolean.annotate({
      title: 'Stop when the meeting ends',
      description: 'Stop recording once the meeting app releases the microphone.',
    }),
  ).pipe(Schema.withConstructorDefault(Effect.succeed(true))),

  autoSummarize: Schema.optional(
    Schema.Boolean.annotate({
      title: 'Summarize when recording stops',
      description: 'Write an AI summary of the transcript and your notes into the meeting.',
    }),
  ).pipe(Schema.withConstructorDefault(Effect.succeed(true))),

  captureSystemAudio: Schema.optional(
    Schema.Boolean.annotate({
      title: 'Record other participants',
      description: 'Transcribe the system audio output as the other side of the call. Desktop only.',
    }),
  ).pipe(Schema.withConstructorDefault(Effect.succeed(true))),

  ignoredApps: Schema.optional(
    Schema.Array(Schema.String).annotate({
      title: 'Ignored apps',
      description:
        'Bundle ids of further apps whose microphone use is not a meeting; dictation apps, IDEs and screen recorders are ignored already.',
    }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}

export const defaultSettings = (): Settings => ({
  detectMeetings: true,
  autoStart: false,
  autoStop: true,
  autoSummarize: true,
  captureSystemAudio: true,
});
