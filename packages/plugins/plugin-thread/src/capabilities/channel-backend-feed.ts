//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Database, type Entity, Feed, Filter, Obj, Query } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Channel, Message, Reaction } from '@dxos/types';

import { ThreadCapabilities } from '../types';

/**
 * Default local ECHO-feed-backed channel provider. Stores messages and reactions in one `Feed`
 * (`makeConfig` → `Feed.make()`), reads them via reactive database queries, and writes via
 * `Feed.append`. This is the backend `Channel.make()` defaults to.
 */
export const feedChannelBackend: ThreadCapabilities.ChannelBackendProvider = {
  kind: Channel.FeedBackendKind,
  label: 'Feed',
  icon: 'ph--rows--regular',
  createFields: Schema.Struct({}),
  makeConfig: () => Feed.make(),
  subscribe: (channel, onMessages) => subscribeType(channel, Message.Message, onMessages),
  subscribeReactions: (channel, onReactions) => subscribeType(channel, Reaction.Reaction, onReactions),
  send: (channel, message) => appendToFeed(channel, [message]),
  appendReaction: (channel, reaction) => appendToFeed(channel, [reaction]),
  remove: (channel, message) => removeFromFeed(channel, [message]),
  removeReaction: (channel, reaction) => removeFromFeed(channel, [reaction]),
  readOnly: (channel) => Obj.getMeta(channel).keys.length > 0,
};

/** Reactive feed-scoped query over one item type, delivering the current list immediately. */
const subscribeType = <T extends Entity.Unknown>(
  channel: Channel.Channel,
  type: Parameters<typeof Filter.type>[0],
  onItems: (items: readonly T[]) => void,
): (() => void) => {
  const feed = Channel.getFeed(channel);
  const db = Obj.getDatabase(channel);
  if (!feed || !db) {
    onItems([]);
    return () => {};
  }

  const result = db.query(Query.select(Filter.type(type)).from(feed));
  return result.subscribe(() => onItems(result.results as readonly T[]), { fire: true });
};

const appendToFeed = (channel: Channel.Channel, items: Entity.Unknown[]) =>
  withFeed(channel, (feed, db) => Feed.append(feed, items).pipe(Effect.provide(Database.layer(db))));

const removeFromFeed = (channel: Channel.Channel, items: Entity.Unknown[]) =>
  withFeed(channel, (feed, db) => Feed.remove(feed, items).pipe(Effect.provide(Database.layer(db))));

/** Resolves the channel's feed and the owning space db, which `Feed.append`/`remove` require. */
const withFeed = (
  channel: Channel.Channel,
  run: (feed: Feed.Feed, db: Database.Database) => Effect.Effect<void>,
): Effect.Effect<void, Error, Capability.Service> =>
  Effect.gen(function* () {
    const objectDb = Obj.getDatabase(channel);
    invariant(objectDb, 'Database not found');
    const client = yield* Capability.get(ClientCapabilities.Client);
    const space = client.spaces.get(objectDb.spaceId);
    invariant(space, 'Space not found');
    const feed = Channel.getFeed(channel);
    invariant(feed, 'Channel is not feed-backed');
    yield* run(feed, space.db);
  });

/** Contributes the default feed-backed channel provider. */
export const ChannelBackendFeed = Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(ThreadCapabilities.ChannelBackend, feedChannelBackend);
  }),
);

export default ChannelBackendFeed;
