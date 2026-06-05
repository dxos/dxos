//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Feed, Filter, Obj, Query } from '@dxos/echo';
import { createFeedServiceLayer } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Channel, Message } from '@dxos/types';

import { ThreadCapabilities } from '../types';

/** Local ECHO-feed-backed channel provider (the default backend). */
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

    const result = db.query(Query.select(Filter.type(Message.Message)).from(feed));
    return result.subscribe(() => onMessages(result.results), { fire: true });
  },
  send: (channel, message) =>
    Effect.gen(function* () {
      const db = Obj.getDatabase(channel);
      invariant(db, 'Database not found');
      const client = yield* Capability.get(ClientCapabilities.Client);
      const space = client.spaces.get(db.spaceId);
      invariant(space, 'Space not found');
      const feed = Channel.getFeed(channel);
      invariant(feed, 'Channel is not feed-backed');
      yield* Feed.append(feed, [message]).pipe(Effect.provide(createFeedServiceLayer(space.queues)));
    }),
  readOnly: (channel) => Obj.getMeta(channel).keys.length > 0,
};

/** Contributes the default feed-backed channel provider. */
export const ChannelBackendFeed = Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(ThreadCapabilities.ChannelBackend, feedChannelBackend);
  }),
);

export default ChannelBackendFeed;
