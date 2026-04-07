//
// Copyright 2025 DXOS.org
//

import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, expect } from 'vitest';

import { Blueprint } from '@dxos/blueprints';
import { Feed, Obj, Ref } from '@dxos/echo';
import { createFeedServiceLayer } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';

import { ContextBinding } from './context';
import { AiConversation } from './conversation';

describe('AiConversation', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  it.effect('loads blueprints on open', () =>
    Effect.gen(function* () {
      const peer = yield* Effect.promise(() =>
        builder.createPeer({ types: [Blueprint.Blueprint, ContextBinding, Feed.Feed] }),
      );
      const db = yield* Effect.promise(() => peer.createDatabase());
      const queues = peer.client.constructQueueFactory(db.spaceId);

      // Create feed.
      const feed = db.add(Feed.make());
      const feedServiceLayer = createFeedServiceLayer(queues);
      const feedRuntime = yield* Effect.runtime<Feed.FeedService>().pipe(Effect.provide(feedServiceLayer));

      // Create blueprint.
      const blueprint = db.add(
        Blueprint.make({
          key: 'example.com/blueprint/Test',
          name: 'Test Blueprint',
        }),
      );

      // Add blueprint to feed via binding.
      yield* Feed.append(feed, [
        Obj.make(ContextBinding, {
          blueprints: {
            added: [Ref.make(blueprint)],
            removed: [],
          },
          objects: {
            added: [],
            removed: [],
          },
        }),
      ]).pipe(Effect.provide(feedServiceLayer));

      const conversation = new AiConversation({ feed, feedRuntime });
      yield* Effect.promise(() => conversation.open());

      expect(conversation.context.getBlueprints()).toHaveLength(1);
      expect(conversation.context.getObjects()).toHaveLength(0);
    }),
  );
});
