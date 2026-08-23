//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { test } from 'vitest';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { Database, Feed, Tag } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
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
    'make creates the curation routine with the magazine, seeding its instructions',
    Effect.fnUntraced(
      function* ({ expect }) {
        const magazine = yield* Database.add(Magazine.make({ name: 'The Cosmos', instructions: 'Astronomy news' }));
        yield* Database.flush();

        // The instructions are created with the magazine (not lazily).
        expect(magazine.instructions).toBeDefined();
        const instructions = yield* Database.load(magazine.instructions!);
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
