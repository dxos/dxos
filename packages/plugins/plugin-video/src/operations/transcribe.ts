//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Text } from '@dxos/schema';

import { TranscriptionService } from '#operations';
import { VideoOperation } from '#types';

const DEFAULT_LANG = 'en';

// Addressed through the EDGE entrypoint, like every other service. An operation handler has no
// client config to read, so the environment is pinned here.
// TODO(burdon): Configure from config.
const TRANSCRIPTION_ENDPOINT = 'https://dxos.network/transcription/video';

const handler: Operation.WithHandler<typeof VideoOperation.Transcribe> = VideoOperation.Transcribe.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ video, lang }) {
      const videoObj = yield* Database.load(video);
      invariant(videoObj.url, 'Video has no URL to transcribe.');

      const { text, title } = yield* fetchTranscript(videoObj.url, lang ?? DEFAULT_LANG);
      const transcript = yield* Database.add(
        Text.make({ name: videoObj.name ? `${videoObj.name} (transcript)` : 'Transcript', content: text }),
      );

      Obj.update(videoObj, (videoObj) => {
        videoObj.transcript = Ref.make(transcript);
        // Adopt the video's title from the service when the user hasn't named it.
        if (title && !videoObj.name?.trim()) {
          videoObj.name = title;
        }
      });

      return { transcript: Ref.make(transcript) };
    }),
  ),
);

export default handler;

const fetchTranscript = (url: string, lang: string) =>
  Effect.tryPromise({
    try: async () => {
      const target = new URL(TRANSCRIPTION_ENDPOINT);
      target.searchParams.set('url', url);
      target.searchParams.set('lang', lang);
      // Direct: behind the EDGE entrypoint the response carries EDGE's CORS headers, so the hop
      // through the CORS proxy that transcription-service's own hostname needed is gone.
      const response = await fetch(target);
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        if (response.status === 404) {
          // The transcription worker returns 404 when the video is private, deleted, or region-restricted.
          throw new Error(`Video is unavailable or private. (${body.trim() || response.status})`);
        }
        throw new Error(`Transcription service returned ${response.status}.`);
      }
      const payload = (await response.json()) as TranscriptionService.TranscriptResponse;
      if (!payload.success || !payload.result?.text) {
        throw new Error('Transcription service returned an empty transcript.');
      }

      const raw = payload.result.markdown ?? payload.result.text;
      return {
        title: payload.result.title,
        // Normalize to one tight line per segment: join a timestamp link onto the text that follows it
        // (the worker puts the timestamp on its own line), then collapse any remaining blank lines.
        // Otherwise the hidden timestamp line renders as a blank row above each segment.
        text: raw.replace(/(\[[^\]]*\]\([^)]*\))\s*\n\s*/g, '$1 ').replace(/\n{2,}/g, '\n'),
      };
    },
    catch: (error) => (error instanceof Error ? error : new Error('Transcription failed.')),
  });
