//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Feed } from '@dxos/echo';
import { Message } from '@dxos/types';

import { AppendChannelMessage } from './definitions';

const handler: Operation.WithHandler<typeof AppendChannelMessage> = AppendChannelMessage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ channel, sender, text }) {
      const feed = yield* Database.load(channel.feed);
      const message = Message.make({
        sender,
        blocks: [{ _tag: 'text', text }],
      });
      yield* Feed.append(feed, [message]);
    }),
  ),
);

export default handler;
