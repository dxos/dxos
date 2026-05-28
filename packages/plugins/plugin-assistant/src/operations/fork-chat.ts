//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Runtime from 'effect/Runtime';

import { Capability } from '@dxos/app-framework';
import { getObjectPathFromObject, LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { createFeedServiceLayer } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ContentBlock, Message } from '@dxos/types';

import { AssistantOperation } from '#types';

const handler: Operation.WithHandler<typeof AssistantOperation.ForkChat> = AssistantOperation.ForkChat.pipe(
  Operation.withHandler(
    Effect.fnUntraced(
      function* ({ db, chat }) {
        const sourceFeed = chat.feed.target;
        invariant(sourceFeed, 'Chat feed not found.');

        const client = yield* Capability.get(ClientCapabilities.Client);
        const space = client.spaces.get(db.spaceId);
        invariant(space, 'Space not found.');

        const feedServiceLayer = createFeedServiceLayer(space.queues);
        const messages = yield* Feed.runQuery(sourceFeed, Filter.type(Message.Message)).pipe(
          Effect.provide(feedServiceLayer),
        );

        // Sort chronologically to find the last message.
        const sorted = messages
          .filter(Obj.instanceOf(Message.Message))
          .sort((a, b) => a.created.localeCompare(b.created));

        // Create a new chat with the same blueprints as the source.
        const { object: newChat } = yield* Operation.invoke(AssistantOperation.CreateChat, { db });
        const newFeed = newChat.feed.target;
        invariant(newFeed, 'New chat feed not found.');

        if (sorted.length > 0) {
          const lastMessage = sorted[sorted.length - 1];

          // Append a synthetic message containing the SessionLink as the first block of the new feed.
          const linkBlock: ContentBlock.SessionLink = {
            _tag: 'sessionLink',
            feedRef: Ref.make(sourceFeed),
            messageId: lastMessage.id,
          };
          const linkMessage = Message.make({ sender: 'user', blocks: [linkBlock] });

          const runtime = yield* Effect.runtime<Feed.FeedService>().pipe(Effect.provide(feedServiceLayer));
          yield* Effect.promise(() => Runtime.runPromise(runtime)(Feed.append(newFeed, [linkMessage])));
        }

        // Navigate to the forked chat.
        const chatPath = getObjectPathFromObject(newChat);
        yield* Operation.invoke(LayoutOperation.Open, { subject: [chatPath] });

        return { object: newChat };
      },
      (effect, { db }) => effect.pipe(Effect.provide(Database.layer(db))),
    ),
  ),
);

export default handler;
