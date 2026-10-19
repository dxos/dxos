//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import { Database, Feed, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Channel } from '@dxos/types';

import { ChannelBackend, ThreadCapabilities } from '#types';

/**
 * Default local ECHO-feed-backed channel provider. Stores messages in a `Feed`
 * (`makeConfig` → `Feed.make()`), reads them via a reactive database query, and
 * writes via `Feed.append`. This is the backend `Channel.make()` defaults to.
 */
export const feedChannelBackend: ThreadCapabilities.ChannelBackendProvider = {
  kind: Channel.FeedBackendKind,
  label: 'Feed',
  icon: 'ph--rows--regular',
  createFields: Schema.Struct({}),
  makeConfig: () => Feed.make(),
  subscribe: (channel, onMessages) => {
    const feed = Channel.getFeed(channel);
    const db = Obj.getDatabase(channel);
    if (!feed || !db) {
      onMessages([]);
      return () => {};
    }

    return ChannelBackend.subscribeFeed(db, feed, onMessages);
  },
  send: (channel, message) =>
    Effect.gen(function* () {
      const db = Obj.getDatabase(channel);
      invariant(db, 'Database not found');
      const feed = Channel.getFeed(channel);
      invariant(feed, 'Channel is not feed-backed');
      yield* Feed.append(feed, [message]).pipe(Effect.provide(Database.layer(db)));
    }),
  readOnly: (channel) => Obj.getMeta(channel).keys.length > 0,
};

/** Contributes the default feed-backed channel provider. */
export const ChannelBackendFeed = Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(ThreadCapabilities.ChannelBackend, feedChannelBackend);
  }),
);

export default ChannelBackendFeed;
