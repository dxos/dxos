//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { MemoizedAiService } from '@dxos/ai/testing';
import { AiConversationService } from '@dxos/assistant';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Blueprint, Prompt } from '@dxos/blueprints';
import { Database, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { FunctionInvocationService } from '@dxos/functions';
import { ObjectId } from '@dxos/keys';
import { OperationHandlerSet } from '@dxos/operation';

import { AgentPrompt } from './definitions';
import defaultAgentPrompt from './prompt';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  operationHandlers: OperationHandlerSet.make(defaultAgentPrompt),
  types: [Prompt.Prompt, Blueprint.Blueprint],
  tracing: 'pretty',
});

const provideTestLayers = Effect.provide(AiConversationService.layerNewQueue().pipe(Layer.provideMerge(TestLayer)));

describe('Prompts referencing prompts', () => {
  it.effect(
    'main prompt can invoke a sub-prompt as a tool',
    Effect.fnUntraced(
      function* (_) {
        const subPrompt = yield* Database.add(
          Prompt.make({
            name: 'greeting-generator',
            description: 'Generates a greeting message. Call this tool when you need to generate a greeting.',
            instructions: 'Generate a friendly greeting. Always respond with exactly: "Hello, friend!"',
          }),
        );

        const mainPrompt = yield* Database.add(
          Prompt.make({
            name: 'main-prompt',
            instructions:
              'You have access to a greeting generator tool. Use it to generate a greeting and return the result.',
            prompts: [Ref.make(subPrompt)],
          }),
        );

        yield* Database.flush();

        const result = yield* FunctionInvocationService.invokeFunction(AgentPrompt, {
          prompt: Ref.make(mainPrompt),
          input: {},
        });

        expect(result.note).toBeDefined();
        expect(result.note?.toLowerCase()).toContain('hello');
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: MemoizedAiService.isGenerationEnabled() ? 240_000 : 60_000 },
  );

  it.effect(
    'sub-prompt receives input from main prompt',
    Effect.fnUntraced(
      function* (_) {
        const calculatorPrompt = yield* Database.add(
          Prompt.make({
            name: 'simple-calculator',
            description:
              'A simple calculator that adds two numbers. Call with input containing "a" and "b" number fields.',
            instructions:
              'You are a calculator. Given input with fields "a" and "b", return their sum. Respond with only the number result.',
          }),
        );

        const mainPrompt = yield* Database.add(
          Prompt.make({
            name: 'math-assistant',
            instructions:
              'You have access to a calculator tool. Use it to calculate 5 + 3 and tell me the result. Pass the numbers as input fields "a" and "b".',
            prompts: [Ref.make(calculatorPrompt)],
          }),
        );

        yield* Database.flush();

        const result = yield* FunctionInvocationService.invokeFunction(AgentPrompt, {
          prompt: Ref.make(mainPrompt),
          input: {},
        });

        expect(result.note).toBeDefined();
        expect(result.note).toContain('8');
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: MemoizedAiService.isGenerationEnabled() ? 240_000 : 60_000 },
  );
});
