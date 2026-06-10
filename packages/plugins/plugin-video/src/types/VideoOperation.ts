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

// TODO(burdon): Factor out.

type NoHyphens<S extends string> = S extends `${string}-${string}` ? never : S;

function makeKey<const Head extends readonly string[], const Last extends string>(
  ...parts: [...Head, NoHyphens<Last>]
) {
  return DXN.make(parts.join('.'));
}

/**
 * Transcribe a video via the remote EDGE transcription service and link the resulting
 * transcript text object back to the video.
 */
export const Transcribe = Operation.make({
  meta: {
    key: makeKey(meta.id, 'operation', 'transcribe'),
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
    key: makeKey(meta.id, 'operation', 'summarize'),
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

/**
 * Fetch a video's transcript directly from its published caption tracks: query YouTube's InnerTube
 * player endpoint (via the EDGE CORS proxy) to discover the timed-text tracks, download the
 * best-matching track, and link the formatted transcript onto the video. An alternative to
 * {@link Transcribe} (which uses the remote EDGE transcription service) for videos that already
 * publish captions — no server-side ASR round-trip.
 */
export const FetchTranscript = Operation.make({
  meta: {
    key: makeKey(meta.id, 'operation', 'fetchTranscript'),
    name: 'Fetch Video Transcript',
    description: "Loads a video's published caption tracks and links the transcript.",
    icon: 'ph--closed-captioning--regular',
  },
  input: Schema.Struct({
    video: Ref.Ref(Video.Video).annotations({ description: 'The video to fetch the transcript for.' }),
    lang: Schema.optional(Schema.String).annotations({
      description: 'Preferred BCP-47 language code (defaults to "en").',
    }),
  }),
  output: Schema.Struct({
    transcript: Ref.Ref(Text.Text).annotations({ description: 'The generated transcript text object.' }),
  }),
  services: [Database.Service],
});

/**
 * Fetch the full published description for a video by loading its watch page (via the Composer
 * extension's CRX render-proxy, falling back to the EDGE CORS proxy) and parsing the description
 * out of the page HTML. The description is written back onto the video.
 */
export const FetchDescription = Operation.make({
  meta: {
    key: makeKey(meta.id, 'operation', 'fetchDescription'),
    name: 'Fetch Video Description',
    description: "Loads a video's watch page via the CRX proxy and extracts the full description.",
    icon: 'ph--text-align-left--regular',
  },
  input: Schema.Struct({
    video: Ref.Ref(Video.Video).annotations({ description: 'The video to fetch the description for.' }),
  }),
  output: Schema.Struct({
    description: Schema.String.annotations({ description: 'The extracted video description.' }),
  }),
  services: [Database.Service],
});
