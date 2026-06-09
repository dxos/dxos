//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Text } from '@dxos/schema';

import { VideoOperation } from '../types';

const handler: Operation.WithHandler<typeof VideoOperation.Transcribe> = VideoOperation.Transcribe.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ video, lang }) {
      const videoObj = yield* Database.load(video);
      invariant(videoObj.url, 'Video has no URL to transcribe.');

      const content = yield* fetchTranscript(videoObj.url, lang ?? DEFAULT_LANG);
      const transcript = yield* Database.add(
        Text.make({ name: videoObj.name ? `${videoObj.name} (transcript)` : 'Transcript', content }),
      );
      Obj.update(videoObj, (videoObj) => {
        videoObj.transcript = Ref.make(transcript);
      });

      return { transcript: Ref.make(transcript) };
    }),
  ),
);

export default handler;

const DEFAULT_LANG = 'en';

// TODO(burdon): Configure from config.
const TRANSCRIPTION_ENDPOINT = 'https://transcription.dxos.network/video';

const fetchTranscript = (url: string, lang: string) =>
  Effect.tryPromise({
    try: async () => {
      const params = new URLSearchParams({ url, lang });
      const response = await fetch(`${TRANSCRIPTION_ENDPOINT}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Transcription service returned ${response.status}.`);
      }
      const { text } = (await response.json()) as { text?: string };
      if (!text) {
        throw new Error('Transcription service returned an empty transcript.');
      }
      return text;
    },
    catch: (error) => (error instanceof Error ? error : new Error('Transcription failed.')),
  });
