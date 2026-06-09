//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { Operation } from '@dxos/compute';
import { DXN, Database, Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';

import { meta } from '#meta';

import * as Video from './Video';

const makeKey = (name: string) => DXN.make(`${meta.id}.operation.${name}`);

/**
 * Transcribe a video via the remote EDGE transcription service and link the resulting
 * transcript text object back to the video.
 */
export const Transcribe = Operation.make({
  meta: {
    key: makeKey('transcribe'),
    name: 'Transcribe Video',
    description: 'Transcribes a video via the EDGE transcription service and links the transcript.',
    icon: 'ph--subtitles--regular',
  },
  input: Schema.Struct({
    video: Ref.Ref(Video.Video).annotations({ description: 'The video to transcribe.' }),
    lang: Schema.optional(Schema.String).annotations({
      description: 'BCP-47 language code (defaults to "en").',
    }),
  }),
  output: Schema.Struct({
    transcript: Ref.Ref(Text.Text).annotations({ description: 'The generated transcript text object.' }),
  }),
  services: [Database.Service],
});

/**
 * Summarize a video's transcript via the assistant AI stack and link the resulting summary
 * text object back to the video.
 */
export const Summarize = Operation.make({
  meta: {
    key: makeKey('summarize'),
    name: 'Summarize Video',
    description: "Summarizes the video's transcript and links the summary.",
    icon: 'ph--text-align-left--regular',
  },
  input: Schema.Struct({
    video: Ref.Ref(Video.Video).annotations({ description: 'The video whose transcript to summarize.' }),
  }),
  output: Schema.Struct({
    summary: Ref.Ref(Text.Text).annotations({ description: 'The generated summary text object.' }),
  }),
  services: [Database.Service, AiService.AiService],
});
