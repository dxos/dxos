//
// Copyright 2025 DXOS.org
//

import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { describe, expect } from 'vitest';

import { Blueprint } from '@dxos/blueprints';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/functions-runtime/testing';

import { ContextBinding } from './context';
import { AiConversation } from './conversation';

describe('AiConversation', () => {
  const TestLayer = TestDatabaseLayer({
    types: [Blueprint.Blueprint, ContextBinding],
  });

  it.effect('loads blueprints on open', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;

      // Create feed.
      const feed = db.add(Feed.make());

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
      ]);

      const runtime = yield* Effect.runtime<Feed.FeedService>();
      const conversation = new AiConversation({ feed, runtime });
      yield* Effect.promise(() => conversation.open());

      expect(conversation.context.getBlueprints()).toHaveLength(1);
      expect(conversation.context.getObjects()).toHaveLength(0);
    }).pipe(Effect.provide(TestLayer)),
  );
});
