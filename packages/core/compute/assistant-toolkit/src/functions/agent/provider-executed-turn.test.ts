//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

import { AiService } from '@dxos/ai';
import { AiRequest, ToolExecutionServices } from '@dxos/assistant';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';

// Reproduces the production CRM-routine failure ("Agent did not signal task completion"): the agent
// emits a provider-executed (server-side) tool call — Anthropic web search — which pauses the turn
// (`stop_reason: pause_turn`), expecting the client to re-send to let the provider finish. The turn
// loop in `AiRequest.runAgentTurn` derives `done` from `getToolCalls()`, which filters out
// provider-executed calls, so a paused web-search turn reports `done: true` and the loop exits
// before the search completes — the agent never gets results and never calls `completeJob`.

const FINISH = (reason: string) => ({ type: 'finish', reason, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } });

// Turn 1: a provider-executed web-search call, then a paused finish (no results yet).
const PAUSED_WEB_SEARCH_TURN = [
  { type: 'tool-params-start', id: 'srv1', name: 'AnthropicWebSearch', providerExecuted: true },
  { type: 'tool-params-delta', id: 'srv1', delta: '{"query":"Sentry"}' },
  { type: 'tool-params-end', id: 'srv1' },
  FINISH('pause_turn'),
];

// Turn 2 onwards: nothing to do — a finish with no tool calls ends the loop.
const DONE_TURN = [FINISH('stop')];

/** Scripted LanguageModel that returns a fixed sequence of streamed responses and counts calls. */
const makeScriptedModel = (responses: unknown[][]) => {
  let callCount = 0;
  const model = {
    generateText: () => Effect.succeed({ text: '', content: [] }),
    generateObject: () => Effect.succeed({ value: undefined, content: [] }),
    streamText: () => {
      const parts = responses[Math.min(callCount, responses.length - 1)];
      callCount += 1;
      return Stream.fromIterable(parts);
    },
  } as unknown as LanguageModel.LanguageModel;
  return {
    model,
    get callCount() {
      return callCount;
    },
  };
};

const scriptedAiService = (model: LanguageModel.LanguageModel): Layer.Layer<AiService.AiService> =>
  Layer.succeed(AiService.AiService, { model: () => Layer.succeed(LanguageModel.LanguageModel, model) });

describe('AiRequest provider-executed tool turns', () => {
  it.effect(
    'continues the turn loop after a paused provider-executed (web search) tool call',
    Effect.fnUntraced(
      function* ({ expect }) {
        const scripted = makeScriptedModel([PAUSED_WEB_SEARCH_TURN, DONE_TURN, DONE_TURN]);

        const request = new AiRequest.Request();
        yield* request
          .run({ prompt: 'Research Sentry.', system: 'You are a test agent.' })
          .pipe(
            Effect.provide(ToolExecutionServices),
            Effect.provide(AssistantTestLayer({ aiService: scriptedAiService(scripted.model) })),
          );

        // The loop must call the model at least twice: once for the paused web-search turn, then
        // again to continue once the provider tool completes. With the bug it stops after one call.
        expect(scripted.callCount).toBeGreaterThanOrEqual(2);
      },
      TestHelpers.provideTestContext,
    ),
    { timeout: 20_000 },
  );
});
