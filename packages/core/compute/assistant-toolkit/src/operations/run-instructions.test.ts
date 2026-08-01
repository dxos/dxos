//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { AiContext } from '@dxos/assistant';
import { Instructions, Operation, OperationHandlerSet, Plan } from '@dxos/compute';
import { Database, Feed, Filter, JsonSchema, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Message } from '@dxos/types';

import * as Chat from '../types/Chat';
import { RunInstructions } from './definitions';
import defaultAgentPrompt from './run-instructions';

EntityId.dangerouslyDisableRandomness();

// The agent finishes by calling `completeJob`; scripting that call drives the whole operation
// without a live model, so what is asserted is the operation's own behaviour rather than the
// model's. A scripted turn replaces the memoized conversation this file used to replay.
const layerWithResult = (success: unknown) =>
  AssistantTestLayer({
    operationHandlers: OperationHandlerSet.make(defaultAgentPrompt),
    types: [Chat.Chat, Message.Message, AiContext.Binding, Text.Text, Plan.Plan],
    aiService: ScriptedLanguageModel.scriptedAiService([
      { parts: [ScriptedLanguageModel.toolCall('completeJob', { success })] },
      // The loop asks again once the tool result is fed back; a text-only turn stops it.
      { parts: [ScriptedLanguageModel.text('Done.')] },
    ]),
  });

describe('RunInstructions', () => {
  it.effect(
    'chat mode appends assistant messages to the chat queue',
    Effect.fnUntraced(
      function* (_) {
        const feed = yield* Database.add(Feed.make());
        const messageCountBefore = yield* countFeedMessages(feed);

        const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
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
      Effect.provide(layerWithResult('ack')),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'returns an object conforming to the instructions output schema',
    Effect.fnUntraced(
      function* (_) {
        const Person = Schema.Struct({ name: Schema.String, age: Schema.Number });

        const instructions = yield* Database.add(
          Instructions.make({
            name: 'output-schema-test',
            text: 'Invent a fictional person and call completeJob with the success object describing them.',
            output: Person,
            skills: [],
          }),
        );
        yield* Database.flush();

        const result = yield* Operation.invoke(RunInstructions, {
          instructions: Ref.make(instructions),
          input: {},
        });

        // The instructions persist their declared output as a JSON schema; decode it back and assert
        // the returned object satisfies that schema.
        const outputSchema = JsonSchema.toEffectSchema(instructions.output);
        const decoded = Schema.decodeUnknownSync(outputSchema)(result);
        expect(decoded).toEqual({ name: 'Ada Lovelace', age: 36 });
      },
      Effect.provide(layerWithResult({ name: 'Ada Lovelace', age: 36 })),
      TestHelpers.provideTestContext,
    ),
  );
});

const countFeedMessages = (feed: Feed.Feed) =>
  Effect.gen(function* () {
    const items = yield* Feed.query(feed, Filter.everything()).run;
    return items.filter(Obj.instanceOf(Message.Message)).length;
  });
