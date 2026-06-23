//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { test } from 'vitest';

import { Instructions } from '@dxos/compute';
import { Database, Feed, Obj, Tag } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { EntityId } from '@dxos/keys';
import { Routine } from '@dxos/plugin-routine';
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
    Routine.Routine,
    Instructions.Instructions,
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
    'make creates the curation routine with the magazine, seeding its instructions',
    Effect.fnUntraced(
      function* ({ expect }) {
        const magazine = yield* Database.add(Magazine.make({ name: 'The Cosmos', instructions: 'Astronomy news' }));
        yield* Database.flush();

        // The Routine is created with the magazine (not lazily), parented to it.
        expect(magazine.routine).toBeDefined();
        if (!magazine.routine) {
          throw new Error('Expected magazine.routine to be defined.');
        }
        const routine = yield* Database.load(magazine.routine);
        expect(Obj.getParent(routine)?.id).toBe(magazine.id);

        // The Instructions is created with the magazine, parented to the Routine.
        expect(magazine.instructions).toBeDefined();
        if (!magazine.instructions) {
          throw new Error('Expected magazine.instructions to be defined.');
        }
        const instructions = yield* Database.load(magazine.instructions);
        expect(Obj.getParent(instructions)?.id).toBe(routine.id);
        expect(instructions.skills.length).toBeGreaterThan(0);

        const text = yield* Database.load(instructions.text);
        expect(text.content).toContain('## Topic');
        expect(text.content).toContain('Astronomy news');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
