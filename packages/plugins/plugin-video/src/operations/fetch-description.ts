//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { VideoOperation } from '../types';
import { fetchPage, parseYouTubeDescription } from '../util';

const handler: Operation.WithHandler<typeof VideoOperation.FetchDescription> = VideoOperation.FetchDescription.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ video }) {
      const videoObj = yield* Database.load(video);
      invariant(videoObj.url, 'Video has no URL to fetch a description for.');

      const html = yield* fetchPage(videoObj.url);
      const description = parseYouTubeDescription(html);
      invariant(description, 'Could not extract a description from the video page.');

      Obj.update(videoObj, (videoObj) => {
        videoObj.description = description;
      });

      return { description };
    }),
  ),
);

export default handler;
