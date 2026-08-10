//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Filter } from '@dxos/echo';
import { Message } from '@dxos/types';

import * as TranscriptOperation from '../types/TranscriptOperation';
import { renderByline } from '../util';

const handler: Operation.WithHandler<typeof TranscriptOperation.Open> = TranscriptOperation.Open.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ transcript }) {
      const transcriptObj = yield* Database.load(transcript);
      const feed = yield* Database.load(transcriptObj.feed);
      const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
      const content = messages
        .flatMap((message: Message.Message, index: number) => renderByline([])(message, index))
        .join('\n\n');
      return { content };
    }),
  ),
);

export default handler;
