//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';

import { log } from '@dxos/log';

import type { TranscriptSegment } from '../types/Video';

export type TranscriptResult = {
  segments: TranscriptSegment[];
  fullText: string;
};

/**
 * Fetches captions for a YouTube video using youtube-caption-extractor.
 * Works in both browser and Node/edge environments.
 */
export const fetchTranscript = (videoId: string, lang?: string): Effect.Effect<TranscriptResult | undefined> =>
  Effect.tryPromise({
    try: async () => {
      const { getSubtitles } = await import('youtube-caption-extractor');
      const subtitles = await getSubtitles({ videoID: videoId, lang: lang ?? 'en' });

      if (!subtitles || subtitles.length === 0) {
        return undefined;
      }

      const segments: TranscriptSegment[] = subtitles.map((sub) => ({
        text: sub.text,
        offset: parseFloat(sub.start),
        duration: parseFloat(sub.dur),
      }));

      const fullText = segments.map((segment) => segment.text).join(' ');
      return { segments, fullText };
    },
    catch: (error) => {
      log('failed to fetch transcript', { videoId, error });
      return undefined;
    },
  }).pipe(
    Effect.catchAll(() => Effect.succeed(undefined)),
    Effect.timeout('30 seconds'),
    Effect.catchAll(() => Effect.succeed(undefined)),
  );
