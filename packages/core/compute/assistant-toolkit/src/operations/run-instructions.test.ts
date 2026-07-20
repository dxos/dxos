//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { ScriptedAiService } from '@dxos/ai/testing';
import { AiContext } from '@dxos/assistant';
import { Instructions, Operation, OperationHandlerSet } from '@dxos/compute';
import { Database, Feed, Filter, JsonSchema, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { Text } from '@dxos/schema';
import { Message } from '@dxos/types';

import * as Chat from '../types/Chat';
import * as Plan from '../types/Plan';
import { RunInstructions } from './definitions';
import defaultAgentPrompt from './run-instructions';

const operationHandlerSet = OperationHandlerSet.make(defaultAgentPrompt);

// The agent's model behaviour is scripted inline per test: it calls the inline `completeJob` tool
// (defined in run-instructions.ts) with the output, then produces a final text turn so the agent
// loop terminates. No recorded conversation, so editing prompts/tools no longer breaks these tests.
const testLayer = (script: ScriptedAiService.Script) =>
  AssistantTestLayer({
    operationHandlers: operationHandlerSet,
    types: [Chat.Chat, Message.Message, AiContext.Binding, Text.Text, Plan.Plan],
    aiService: ScriptedAiService.layer(script),
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

        const instructions = yield* Database.add(
          Instructions.make({
            name: 'chat-mode-test',
            text: 'Reply with a single word: ack.',
            skills: [],
            output: Schema.String,
          }),
        );

        yield* Database.flush();

        const result = yield* Operation.invoke(RunInstructions, {
          instructions: Ref.make(instructions),
          input: {},
          chat: Ref.make(chat),
        });

        const messageCountAfter = yield* countFeedMessages(feed);

        expect(messageCountAfter).toBeGreaterThan(messageCountBefore);
        expect(result).toBe('ack');
      },
      Effect.provide(
        testLayer([
          ScriptedAiService.turn({ text: 'ack', tools: [{ name: 'completeJob', input: { success: 'ack' } }] }),
          ScriptedAiService.text('ack'),
        ]),
      ),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'generates an object conforming to the instructions output schema',
    Effect.fnUntraced(
      function* (_) {
        const Person = Schema.Struct({
          name: Schema.String,
          age: Schema.Number,
        });

        const instructions = yield* Database.add(
          Instructions.make({
            name: 'output-schema-test',
            text: 'Invent a fictional person and call completeJob with the success object describing them (name and age).',
            output: Person,
            skills: [],
          }),
        );

        yield* Database.flush();

        const result = yield* Operation.invoke(RunInstructions, {
          instructions: Ref.make(instructions),
          input: {},
        });

        // The instructions persists its declared output as a JSON schema; decode it back and assert the
        // agent-produced object satisfies that schema.
        const outputSchema = JsonSchema.toEffectSchema(instructions.output);
        const decoded = Schema.decodeUnknownSync(outputSchema)(result);
        expect(typeof decoded.name).toBe('string');
        expect(typeof decoded.age).toBe('number');
      },
      Effect.provide(
        testLayer([
          ScriptedAiService.turn({
            text: "I'll invent a fictional person.",
            tools: [{ name: 'completeJob', input: { success: { name: 'Eleanor Whitfield', age: 34 } } }],
          }),
          ScriptedAiService.text('Done.'),
        ]),
      ),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );
});

const countFeedMessages = (feed: Feed.Feed) =>
  Effect.gen(function* () {
    const items = yield* Feed.query(feed, Filter.everything()).run;
    return items.filter(Obj.instanceOf(Message.Message)).length;
  });
