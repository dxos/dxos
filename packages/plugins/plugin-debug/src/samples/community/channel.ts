//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Feed } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Channel, Message } from '@dxos/types';

import { MESSAGES } from './triage-script.ts';

export type ChannelResult = { channel: Channel.Channel; feed: Feed.Feed; messages: Message.Message[] };

/** The synced #general channel: a feed-backed `Channel` and its eight messages, oldest first. */
export const ChannelPartial: SampleSpace.Partial<ChannelResult> = SampleSpace.partial('channel', {
  schemas: [Channel.Channel, Feed.Feed, Message.Message],
  run: () =>
    Effect.gen(function* () {
      const channel = yield* Database.add(Channel.make({ name: '#general' }));
      const feed = Channel.getFeed(channel);
      invariant(feed, 'A default channel is feed-backed.');

      const messages = yield* Effect.forEach(MESSAGES, (seed) =>
        SampleSpace.daysAgo(seed.daysAgo, 10).pipe(
          Effect.map((created) =>
            Message.make({
              created,
              sender: { role: 'user', name: seed.name },
              blocks: [{ _tag: 'text', text: seed.text }],
            }),
          ),
        ),
      );
      yield* SampleSpace.appendToFeed(feed, messages);
      return { channel, feed, messages };
    }),
});
