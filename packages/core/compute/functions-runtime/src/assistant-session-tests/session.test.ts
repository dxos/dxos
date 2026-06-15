//
// Copyright 2025 DXOS.org
//

import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { describe, expect } from 'vitest';

import { AiSession, AiContext } from '@dxos/assistant';
import { Blueprint } from '@dxos/compute';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';

describe('AiSession', () => {
  const TestLayer = TestDatabaseLayer({
    types: [Blueprint.Blueprint, AiContext.Binding],
  });

  it.effect('loads blueprints on open', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;

      // Create feed.
      const feed = db.add(Feed.make());

      // Create blueprint.
      const blueprint = db.add(
        Blueprint.make({
          key: 'com.example.blueprint.test',
          name: 'Test Blueprint',
        }),
      );

      // Add blueprint to feed via binding.
      yield* Feed.append(feed, [
        Obj.make(AiContext.Binding, {
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
      const session = new AiSession.Session({ feed, runtime });
      yield* Effect.promise(() => session.open());

      expect(session.context.getBlueprints()).toHaveLength(1);
      expect(session.context.getObjects()).toHaveLength(0);
    }).pipe(Effect.provide(TestLayer)),
  );
});
