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

const RE_YOUTUBE =
  /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|&v(?:i)?=))([^#&?]*).*/;
const RE_XML_TRANSCRIPT = /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g;

type TranscriptConfig = {
  lang?: string;
};

type TranscriptResponse = {
  text: string;
  duration: number;
  offset: number;
  lang?: string;
};

/**
 * Fetches transcript for a YouTube video.
 * This implementation doesn't require authentication.
 */
export const fetchTranscript = Effect.fn(function* (
  videoId: string,
  config?: TranscriptConfig,
): Generator<Effect.Effect<TranscriptResult | undefined, never, never>, TranscriptResult | undefined, unknown> {
  const transcriptResponse = yield* Effect.tryPromise({
    try: async () => {
      const identifier = videoId.length === 11 ? videoId : RE_YOUTUBE.exec(videoId)?.[1];
      if (!identifier) {
        throw new Error(`Invalid YouTube video ID: ${videoId}`);
      }

      const videoPageResponse = await fetch(`https://www.youtube.com/watch?v=${identifier}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      const videoPageBody = await videoPageResponse.text();

      const splittedHTML = videoPageBody.split('"captions":');
      if (splittedHTML.length < 2) {
        return undefined;
      }

      const captionsMatch = splittedHTML[1].split(',"videoDetails')[0].replace('\n', '');
      let captions;
      try {
        captions = JSON.parse(captionsMatch);
      } catch {
        return undefined;
      }

      const captionTracks = captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (!captionTracks || captionTracks.length === 0) {
        return undefined;
      }

      let transcriptURL: string;
      if (config?.lang) {
        const track = captionTracks.find((track: { languageCode: string }) => track.languageCode === config.lang);
        transcriptURL = track?.baseUrl;
      } else {
        transcriptURL = captionTracks[0]?.baseUrl;
      }

      if (!transcriptURL) {
        return undefined;
      }

      const transcriptResponse = await fetch(transcriptURL);
      const transcriptBody = await transcriptResponse.text();

      const results: TranscriptResponse[] = [];
      let match;
      RE_XML_TRANSCRIPT.lastIndex = 0;

      while ((match = RE_XML_TRANSCRIPT.exec(transcriptBody)) !== null) {
        results.push({
          text: match[3]
            .replace(/&amp;/gi, '&')
            .replace(/&quot;/gi, '"')
            .replace(/&#39;/gi, "'")
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/\n/g, ' '),
          duration: parseFloat(match[2]),
          offset: parseFloat(match[1]),
          lang: config?.lang ?? captionTracks[0]?.languageCode,
        });
      }

      return results;
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

  if (!transcriptResponse || transcriptResponse.length === 0) {
    return undefined;
  }

  const segments: TranscriptSegment[] = transcriptResponse.map((segment) => ({
    text: segment.text,
    offset: segment.offset,
    duration: segment.duration,
  }));

  const fullText = segments.map((segment) => segment.text).join(' ');

  return {
    segments,
    fullText,
  };
});
