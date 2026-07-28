//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { Instructions } from '@dxos/compute';
import { Database, Feed, Obj, Ref, Relation, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';

import { Chat, Plan } from '../types';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  types: [Chat.Chat, Chat.CompanionTo, Plan.Plan, Feed.Feed, Text.Text, Instructions.Instructions],
  disableLlmMemoization: true,
});

const makeChat = Effect.gen(function* () {
  const feed = yield* Database.add(Feed.make());
  const chat = yield* Database.add(Chat.make({ name: 'Test', feed: Ref.make(feed) }));
  yield* Database.flush();
  return chat;
});

describe('Chat', () => {
  it.scoped(
    'is a standalone type carrying no agent reference',
    Effect.fnUntraced(
      function* ({ expect }) {
        const chat = yield* makeChat;

        expect(Type.getTypename(Chat.Chat)).toBe('org.dxos.type.assistant.chat');
        expect(Type.getVersion(Chat.Chat)).toBe('0.1.0');
        expect(chat.name).toBe('Test');

        // Asserted on the schema, not the instance: `in` reports false for any declared-but-unset
        // optional field. The agent a chat runs as is reached through CompanionTo, never a field —
        // that field was the edge that made Agent and Chat mutually dependent.
        expect(Object.keys(Chat.Chat.fields).sort()).toEqual(['feed', 'instructions', 'name', 'plan', 'viewType']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.scoped(
    'ensurePlan attaches a plan lazily and returns the same one thereafter',
    Effect.fnUntraced(
      function* ({ expect }) {
        const chat = yield* makeChat;
        expect(chat.plan).toBeUndefined();

        const plan = yield* Chat.ensurePlan(chat);
        expect(chat.plan?.uri).toBe(Ref.make(plan).uri);
        expect(plan.tasks).toEqual([]);

        // Second call reuses the attached plan rather than replacing it.
        const again = yield* Chat.ensurePlan(chat);
        expect(again.id).toBe(plan.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.scoped(
    'CompanionTo links a chat to an arbitrary companion object',
    Effect.fnUntraced(
      function* ({ expect }) {
        const chat = yield* makeChat;
        const companion = yield* Database.add(Instructions.make({ text: 'Steer.' }));
        const relation = yield* Database.add(
          Relation.make(Chat.CompanionTo, {
            [Relation.Source]: chat,
            [Relation.Target]: companion,
          }),
        );
        yield* Database.flush();

        expect(Relation.getSource(relation).id).toBe(chat.id);
        expect(Relation.getTarget(relation).id).toBe(companion.id);
        expect(Obj.instanceOf(Chat.Chat, Relation.getSource(relation))).toBe(true);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
