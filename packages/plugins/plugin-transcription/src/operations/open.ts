//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Feed, Filter } from '@dxos/echo';
import { Operation } from '@dxos/compute';
import { Message } from '@dxos/types';

import { renderByline } from '../util';
import { Open } from './definitions';

const handler: Operation.WithHandler<typeof Open> = Open.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ transcript }) {
      const transcriptObj = yield* Database.load(transcript);
      const feed = yield* Database.load(transcriptObj.feed);
      const messages = yield* Feed.runQuery(feed, Filter.type(Message.Message));
      const content = messages
        .flatMap((message: Message.Message, index: number) => renderByline([])(message, index))
        .join('\n\n');
      return { content };
    }),
  ),
);

export default handler;
