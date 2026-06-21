//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { test } from 'vitest';

import { Database, Feed, Tag } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { EntityId } from '@dxos/keys';
import { StateMap, TagIndex, Text } from '@dxos/schema';

import * as Magazine from './Magazine';
import * as Subscription from './Subscription';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  types: [
    Feed.Feed,
    Subscription.Subscription,
    Subscription.Post,
    Magazine.Magazine,
    Tag.Tag,
    Text.Text,
    StateMap.StateMap,
    TagIndex.TagIndex,
  ],
  disableLlmMemoization: true,
});

describe('Magazine', () => {
  describe('composeInstructions', () => {
    test('returns the default methodology when no topic is set', ({ expect }) => {
      expect(Magazine.composeInstructions()).toBe(Magazine.DEFAULT_INSTRUCTIONS);
      expect(Magazine.composeInstructions('   ')).toBe(Magazine.DEFAULT_INSTRUCTIONS);
    });

    test('weaves the topic in under a Topic heading', ({ expect }) => {
      const result = Magazine.composeInstructions('Space exploration');
      expect(result.startsWith(Magazine.DEFAULT_INSTRUCTIONS)).toBe(true);
      expect(result).toContain('## Topic');
      expect(result).toContain('Space exploration');
    });
  });

  it.effect(
    'ensureRoutine lazily creates the routine once, seeding the topic',
    Effect.fnUntraced(
      function* ({ expect }) {
        const magazine = yield* Database.add(Magazine.make({ name: 'The Cosmos', topic: 'Astronomy news' }));
        yield* Database.flush();
        // Created lazily — absent until the first ensureRoutine.
        expect(magazine.routine).toBeUndefined();

        const routine = yield* Magazine.ensureRoutine(magazine);
        expect(magazine.routine).toBeDefined();

        const instructions = yield* Database.load(routine.instructions);
        expect(instructions.content).toContain('## Topic');
        expect(instructions.content).toContain('Astronomy news');

        // Idempotent: a second call returns the same routine rather than creating another.
        const again = yield* Magazine.ensureRoutine(magazine);
        expect(again.id).toBe(routine.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
