//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import * as Take from './Take.ts';

export const Settings = Schema.Struct({
  audioInput: Schema.optional(
    Schema.String.annotate({ title: 'Microphone', description: 'The input a voice-over is recorded from.' }),
  ),
  videoSource: Schema.optional(
    Take.VideoSource.annotate({
      title: 'Video',
      description: 'What a take records besides the voice: nothing, a screen or window, or a camera.',
    }),
  ),
  videoInput: Schema.optional(
    Schema.String.annotate({ title: 'Camera', description: 'The camera a take records when the video is a camera.' }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}

export const defaults = (): Settings => ({ videoSource: 'none' });
