//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiContext } from '@dxos/assistant';
import { Routine, Operation, OperationHandlerSet } from '@dxos/compute';
import { Database, Feed, Filter, JsonSchema, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Message } from '@dxos/types';

import * as Chat from '../../types/Chat';
import { AgentPrompt } from './definitions';
import defaultAgentPrompt from './prompt';

EntityId.dangerouslyDisableRandomness();

const operationHandlerSet = OperationHandlerSet.make(defaultAgentPrompt);

const TestLayer = AssistantTestLayer({
  operationHandlers: operationHandlerSet,
  types: [Chat.Chat, Message.Message, AiContext.Binding, Text.Text],
  aiServicePreset: 'edge-remote',
});

const countFeedMessages = (feed: Feed.Feed) =>
  Effect.gen(function* () {
    const items = yield* Feed.runQuery(feed, Filter.everything());
    return items.filter(Obj.instanceOf(Message.Message)).length;
  });

describe('Agent prompt', () => {
  it.effect(
    'chat mode appends assistant messages to the chat queue',
    Effect.fnUntraced(
      function* (_) {
        const feed = yield* Database.add(Feed.make());
        const messageCountBefore = yield* countFeedMessages(feed);

        const chat = yield* Database.add(
          Chat.make({
            feed: Ref.make(feed),
          }),
        );

        const prompt = yield* Database.add(
          Routine.make({
            name: 'chat-mode-test',
            instructions: 'Reply with a single word: ack.',
            skills: [],
          }),
        );

        yield* Database.flush();

        const result = yield* Operation.invoke(AgentPrompt, {
          prompt: Ref.make(prompt),
          input: {},
          chat: Ref.make(chat),
        });

        const messageCountAfter = yield* countFeedMessages(feed);

        expect(messageCountAfter).toBeGreaterThan(messageCountBefore);
        expect(result).toBe('ack');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'generates an object conforming to the routine output schema',
    Effect.fnUntraced(
      function* (_) {
        const Person = Schema.Struct({
          name: Schema.String,
          age: Schema.Number,
        });

        const routine = yield* Database.add(
          Routine.make({
            name: 'output-schema-test',
            instructions:
              'Invent a fictional person and call completeJob with the success object describing them (name and age).',
            output: Person,
            skills: [],
          }),
        );

        yield* Database.flush();

        const result = yield* Operation.invoke(AgentPrompt, {
          prompt: Ref.make(routine),
          input: {},
        });

        // The routine persists its declared output as a JSON schema; decode it back and assert the
        // agent-produced object satisfies that schema.
        const outputSchema = JsonSchema.toEffectSchema(routine.output);
        const decoded = Schema.decodeUnknownSync(outputSchema)(result);
        expect(typeof decoded.name).toBe('string');
        expect(typeof decoded.age).toBe('number');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );
});
