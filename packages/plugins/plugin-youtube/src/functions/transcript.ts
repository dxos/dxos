//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import { type TranscriptResponse, YoutubeTranscript } from 'youtube-transcript';

import { log } from '@dxos/log';

import type { TranscriptSegment } from '../types/Video';

export type TranscriptResult = {
  segments: TranscriptSegment[];
  fullText: string;
};

/**
 * Fetches transcript for a YouTube video.
 * Uses the youtube-transcript package which scrapes transcripts from YouTube.
 * This does not require authentication.
 */
export const fetchTranscript = Effect.fn(function* (
  videoId: string,
): Generator<
  Effect.Effect<TranscriptResult | undefined, never, never>,
  TranscriptResult | undefined,
  TranscriptResponse[]
> {
  const transcriptResponse = yield* Effect.tryPromise({
    try: () => YoutubeTranscript.fetchTranscript(videoId),
    catch: (error) => {
      log('failed to fetch transcript', { videoId, error });
      return undefined;
    },
  }).pipe(
    Effect.catchAll(() => Effect.succeed(undefined)),
    Effect.timeout('30 seconds'),
    Effect.catchAll(() => Effect.succeed(undefined)),
  );

  if (!transcriptResponse || transcriptResponse.length === 0) {
    return undefined;
  }

  const segments: TranscriptSegment[] = transcriptResponse.map((segment: TranscriptResponse) => ({
    text: segment.text,
    offset: segment.offset / 1000,
    duration: segment.duration / 1000,
  }));

  const fullText = segments.map((segment) => segment.text).join(' ');

  return {
    segments,
    fullText,
  };
});
