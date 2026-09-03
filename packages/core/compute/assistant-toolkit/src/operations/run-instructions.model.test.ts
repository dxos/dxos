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
import * as Chat from '@dxos/assistant/Chat';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { Database, Feed, JsonSchema, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Message, Outline } from '@dxos/types';

import { RunInstructions } from './definitions.ts';
import defaultAgentPrompt from './run-instructions.ts';

EntityId.dangerouslyDisableRandomness();

// A live model, not the test, chooses whether an omitted field arrives absent or as `null`.
const TestLayer = AssistantTestLayer({
  operationHandlers: OperationHandlerSet.make(defaultAgentPrompt),
  types: [Chat.Chat, Message.Message, AiContext.Binding, Text.Text, Outline.Outline, Feed.Feed],
  // No `model`: the operation resolves its own from the invocation and never reads a layer model.
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
            name: 'unobtainable-figure',
            // The figure is not in the input and there are no tools to look it up, so the only
            // honest outcome is a failure.
            text: 'Report the exact closing share price of the company named in the input on that date. Never guess or estimate: if you cannot obtain the real figure, report a failure instead.',
            output: Schema.Struct({ closingPrice: Schema.Number }),
            skills: [],
          }),
        );
        yield* Database.flush();

        const exit = yield* Operation.invoke(RunInstructions, {
          instructions: Ref.make(instructions),
          input: { company: 'Acme Manufacturing Holdings', date: '2019-04-02' },
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
