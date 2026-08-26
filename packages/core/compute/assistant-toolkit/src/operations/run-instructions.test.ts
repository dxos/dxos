//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { AiContext } from '@dxos/assistant';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { Database, Feed, Filter, JsonSchema, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Message, Outline } from '@dxos/types';

import * as Chat from '../types/Chat';
import { RunInstructions } from './definitions';
import defaultAgentPrompt from './run-instructions';

EntityId.dangerouslyDisableRandomness();

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

  it.effect(
    'reports the failure when completeJob omits success with an explicit null',
    Effect.fnUntraced(
      function* (_) {
        const instructions = yield* Database.add(
          Instructions.make({
            name: 'null-success-test',
            text: 'Attempt the task and report failure via completeJob.',
            output: Schema.String,
            skills: [],
          }),
        );
        yield* Database.flush();

        // Models emit `null` rather than omitting a field, and the tool must accept that.
        const exit = yield* Operation.invoke(RunInstructions, {
          instructions: Ref.make(instructions),
          input: {},
        }).pipe(Effect.exit);

        // `Operation.invoke` types only `NoHandlerError`, so the operation's own PromptError
        // surfaces as a defect.
        expect(Exit.isFailure(exit)).toBe(true);
        expect(String(Exit.isFailure(exit) && Cause.squash(exit.cause))).toContain('No topic was provided.');
      },
      Effect.provide(
        layerWithToolCall({ success: null, failure: { message: 'No topic was provided.', description: null } }),
      ),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'keeps the result when completeJob reports a failure alongside a success',
    Effect.fnUntraced(
      function* (_) {
        const instructions = yield* Database.add(
          Instructions.make({
            name: 'both-branches-test',
            text: 'Curate the input and call completeJob with the selection.',
            output: Schema.Struct({ posts: Schema.Array(Schema.String) }),
            skills: [],
          }),
        );
        yield* Database.flush();

        // A placeholder in the unused branch must not lose the work the agent completed.
        const result = yield* Operation.invoke(RunInstructions, {
          instructions: Ref.make(instructions),
          input: {},
        });

        expect(result).toEqual({ posts: ['alpha'] });
      },
      Effect.provide(
        layerWithToolCall({
          success: { posts: ['alpha'] },
          failure: { message: 'n/a', description: 'n/a' },
        }),
      ),
      TestHelpers.provideTestContext,
    ),
  );
});

// Scripting the `completeJob` call drives the whole operation without a live model, so what is
// asserted is the operation's own behaviour.
function layerWithToolCall(input: unknown) {
  return AssistantTestLayer({
    operationHandlers: OperationHandlerSet.make(defaultAgentPrompt),
    types: [Chat.Chat, Message.Message, AiContext.Binding, Text.Text, Outline.Outline],
    aiService: ScriptedLanguageModel.scriptedAiService([
      { parts: [ScriptedLanguageModel.toolCall('completeJob', input)] },
      // The loop asks again once the tool result is fed back; a text-only turn stops it.
      { parts: [ScriptedLanguageModel.text('Done.')] },
    ]),
  });
}

function layerWithResult(success: unknown) {
  return layerWithToolCall({ success });
}

const countFeedMessages = (feed: Feed.Feed) =>
  Effect.gen(function* () {
    const items = yield* Feed.query(feed, Filter.everything()).run;
    return items.filter(Obj.instanceOf(Message.Message)).length;
  });
