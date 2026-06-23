//
// Copyright 2025 DXOS.org
//

import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { describe, expect } from 'vitest';

import { AiSession, AiContext } from '@dxos/assistant';
import { Skill } from '@dxos/compute';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';

describe('AiSession', () => {
  const TestLayer = TestDatabaseLayer({
    types: [Skill.Skill, AiContext.Binding],
  });

  it.effect('loads skills on open', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;

      // Create feed.
      const feed = db.add(Feed.make());

      // Create skill.
      const skill = db.add(
        Skill.make({
          key: 'com.example.skill.test',
          name: 'Test Skill',
        }),
      );

      // Add skill to feed via binding.
      yield* Feed.append(feed, [
        Obj.make(AiContext.Binding, {
          skills: {
            added: [Ref.make(skill)],
            removed: [],
          },
          objects: {
            added: [],
            removed: [],
          },
        }),
      ]);

      const runtime = yield* Effect.runtime<Database.Service>();
      const session = new AiSession.Session({ feed, runtime });
      yield* Effect.promise(() => session.open());

      expect(session.context.getSkills()).toHaveLength(1);
      expect(session.context.getObjects()).toHaveLength(0);
    }).pipe(Effect.provide(TestLayer)),
  );
});
