//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Feed, Migration, Obj, Ref } from '@dxos/echo';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { Message, Thread } from '@dxos/types';

/**
 * `Thread` 0.2.0 -> 0.3.0: messages move from a list of refs into a feed the thread owns. Each message is copied under
 * its own id, so anything that refers to a message by id still finds it.
 */
export const threadMessagesToFeed = Migration.define({
  from: Thread.LegacyThread,
  to: Thread.Thread,
  // Messages are copied here, where the thread is still live; `onMigration` receives only a JSON copy of it.
  transform: async ({ name, status, agent, messages }, { db }) => {
    const feed = db.add(Feed.make());
    const loaded = await Promise.all(messages.map((ref) => ref.load()));
    await db.appendToFeed(
      feed,
      Thread.sortMessages(loaded).map(({ id, ...fields }) => Obj.make(Message.Message, { id, ...fields })),
    );
    return { name, status, agent, feed: Ref.make(feed) };
  },
  // The replaced object is written without the `SetParent` stamp a live write would apply.
  onMigration: async ({ object }) => {
    const feed = await object.feed.load();
    Obj.setParent(feed, object);
  },
});

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(ClientCapabilities.Migration, [threadMessagesToFeed]);
  }),
);
