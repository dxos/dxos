//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

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
 * Fetch the full published description for a video by loading its watch page (via the Composer
 * extension's CRX render-proxy, falling back to the EDGE CORS proxy) and parsing the description
 * out of the page HTML. The description is written back onto the video.
 */
export const FetchDescription = Operation.make({
  meta: {
    key: makeKey('fetch-description'),
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
