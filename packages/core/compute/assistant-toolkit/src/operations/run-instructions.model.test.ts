//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { AiContext } from '@dxos/assistant';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { Database, Feed, JsonSchema, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Message, Outline } from '@dxos/types';

import * as Chat from '../types/Chat';
import { RunInstructions } from './definitions';
import defaultAgentPrompt from './run-instructions';

EntityId.dangerouslyDisableRandomness();

// A live model decides for itself how to encode the completion signal — whether an omitted field
// arrives absent or as an explicit `null`. Scripted turns cannot cover that, so both outcomes of a
// routine are replayed against a recorded model here (DX-1189).
const TestLayer = AssistantTestLayer({
  operationHandlers: OperationHandlerSet.make(defaultAgentPrompt),
  types: [Chat.Chat, Message.Message, AiContext.Binding, Text.Text, Outline.Outline, Feed.Feed],
  // No `model` here: the operation resolves its own from the invocation, so a layer model would be
  // dead config that disagrees with the model the fixtures record.
  aiServicePreset: 'direct',
});

const Summary = Schema.Struct({
  title: Schema.String,
  wordCount: Schema.Number,
});

describe('RunInstructions (recorded model)', { tags: ['model-fixture'] }, () => {
  it.effect(
    'completes with the declared output',
    Effect.fnUntraced(
      function* (_) {
        const instructions = yield* Database.add(
          Instructions.make({
            name: 'summarize-title',
            text: 'Report the title of the document in the input and how many words that title contains.',
            output: Summary,
            skills: [],
          }),
        );
        yield* Database.flush();

        const result = yield* Operation.invoke(RunInstructions, {
          instructions: Ref.make(instructions),
          input: { title: 'The Wind in the Willows' },
        });

        const decoded = Schema.decodeUnknownSync(JsonSchema.toEffectSchema(instructions.output))(result);
        expect(decoded).toMatchObject({ title: 'The Wind in the Willows', wordCount: 5 });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 120_000 },
  );

  it.effect(
    'fails with the reason the agent reports',
    Effect.fnUntraced(
      function* (_) {
        const instructions = yield* Database.add(
          Instructions.make({
            name: 'curate-without-topic',
            // The DX-1189 shape: the instructions promise a Topic that is never supplied, so the
            // only honest completion is a failure.
            text: 'Select the candidates in the input that clearly match the editorial Topic described below.',
            output: Schema.Struct({ selected: Schema.Array(Schema.String) }),
            skills: [],
          }),
        );
        yield* Database.flush();

        const exit = yield* Operation.invoke(RunInstructions, {
          instructions: Ref.make(instructions),
          input: { candidates: ['US-Canada trade talks', 'Humanoid robotics funding round'] },
        }).pipe(Effect.exit);

        // `Operation.invoke` types only `NoHandlerError`, so the operation's own PromptError
        // surfaces as a defect.
        expect(Exit.isFailure(exit)).toBe(true);
        expect(String(Exit.isFailure(exit) && Cause.squash(exit.cause))).toContain('PromptError');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 120_000 },
  );
});
