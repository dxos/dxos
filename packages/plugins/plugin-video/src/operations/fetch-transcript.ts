//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Text } from '@dxos/schema';

import { VideoOperation } from '../types';
import {
  fetchPage,
  fetchResource,
  formatTranscriptMarkdown,
  parseTimedText,
  parseYouTubeCaptionTracks,
  selectCaptionTrack,
} from '../util';

const DEFAULT_LANG = 'en';

const handler: Operation.WithHandler<typeof VideoOperation.FetchTranscript> = VideoOperation.FetchTranscript.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ video, lang }) {
      const videoObj = yield* Database.load(video);
      invariant(videoObj.url, 'Video has no URL to fetch a transcript for.');

      // Discover the caption tracks from the watch page (render-proxy preferred), then pick one.
      const html = yield* fetchPage(videoObj.url);
      const tracks = parseYouTubeCaptionTracks(html);
      invariant(tracks.length > 0, 'No captions are available for this video.');
      const track = selectCaptionTrack(tracks, lang ?? DEFAULT_LANG);
      invariant(track, 'No suitable caption track was found.');

      // The track baseUrl is a signed timed-text data endpoint: fetch it raw via the CORS proxy.
      const xml = yield* fetchResource(track.baseUrl);
      const segments = parseTimedText(xml);
      invariant(segments.length > 0, 'The caption track was empty.');

      const content = formatTranscriptMarkdown(segments, videoObj.url);
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
