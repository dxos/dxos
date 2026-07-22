//
// Copyright 2026 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { OpaqueToolkit, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { Trace } from '@dxos/compute';
import { operationServiceLayerNoop } from '@dxos/compute/testing';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { registryLayerNoop } from '@dxos/echo/testing';
import { ContentBlock, type Message } from '@dxos/types';

import * as AiRequest from './AiRequest';

const { text, toolCall, scriptedLanguageModelLayer } = ScriptedLanguageModel;

// A minimal echo tool: the deterministic developer code the loop invokes when the (scripted) model
// emits a tool call. Its handler runs for real, so a genuine tool-call → result → continue cycle is
// exercised without any live model.
const TestToolkit = Toolkit.make(
  Tool.make('Echo', {
    description: 'Returns its input value verbatim.',
    parameters: {
      value: Schema.String.annotations({ description: 'The value to echo.' }),
    },
    success: Schema.Struct({ value: Schema.String }),
    failure: Schema.Never,
  }),
);

const toolkit = OpaqueToolkit.make(
  TestToolkit,
  TestToolkit.toLayer({
    Echo: ({ value }) => Effect.succeed({ value }),
  }),
);

// `AiRequest.RunRequirements` declares `Database.Service | Registry.Service | Operation.Service |
// ToolExecutionService | ToolResolverService` but `run()` never actually yields them on this path
// (no bound objects/skills, and tool calls are dispatched through the `toolkit` argument, not
// through these services) — see AiRequest.ts. They exist only to satisfy the type, so noop/empty
// layers are correct here, not a shortcut.
const testLayer = (turns: readonly ScriptedLanguageModel.ScriptedTurn[]) =>
  Layer.mergeAll(
    scriptedLanguageModelLayer(turns),
    ToolExecutionService.layerEmpty,
    ToolResolverService.layerEmpty,
    TestDatabaseLayer(),
    registryLayerNoop,
    operationServiceLayerNoop,
    Trace.testTraceService().pipe(Layer.provide(Trace.layerNoop)),
  );

// Dimension D (harness / turn loop): deterministic developer code driven by a scripted model.
// Exercises `AiRequest.Request` directly against the minimal set of services it actually requires,
// rather than the full assistant-session/agent-service composition (see `scripted-loop.test.ts` in
// `@dxos/agent-runtime` for the heavier, higher-level equivalent).
describe('AiRequest.Request.run (scripted model)', () => {
  it.effect('completes in one turn when the model emits no tool calls', () =>
    Effect.gen(function* () {
      const request = new AiRequest.Request();
      const messages = yield* request.run({ prompt: 'Say hi.', history: [] });

      expect(textOf(messages)).toContain('Hi there.');
      expect(request.toolCalls).toEqual(0);
    }).pipe(Effect.provide(testLayer([{ parts: [text('Hi there.')] }]))),
  );

  it.effect('executes a tool call, feeds the result back, then stops', () =>
    Effect.gen(function* () {
      const request = new AiRequest.Request();
      const messages = yield* request.run({ toolkit, prompt: 'Echo hello.', history: [] });

      expect(toolResultsOf(messages)).toHaveLength(1);
      expect(textOf(messages)).toContain('Echoed the value.');
      expect(request.toolCalls).toEqual(1);
    }).pipe(
      Effect.provide(
        testLayer([{ parts: [toolCall('Echo', { value: 'hello' })] }, { parts: [text('Echoed the value.')] }]),
      ),
    ),
  );

  it.effect('iterates until the model stops, feeding each tool result back', () =>
    Effect.gen(function* () {
      const request = new AiRequest.Request();
      const messages = yield* request.run({ toolkit, prompt: 'Echo twice.', history: [] });

      expect(toolResultsOf(messages)).toHaveLength(2);
      expect(textOf(messages)).toContain('All done.');
      expect(request.toolCalls).toEqual(2);
    }).pipe(
      Effect.provide(
        testLayer([
          { parts: [toolCall('Echo', { value: 'first' })] },
          { parts: [toolCall('Echo', { value: 'second' })] },
          { parts: [text('All done.')] },
        ]),
      ),
    ),
  );
});

const textOf = (messages: readonly Message.Message[]): string =>
  messages
    .flatMap((message) => message.blocks)
    .filter(ContentBlock.is('text'))
    .map((block) => block.text)
    .join('');

const toolResultsOf = (messages: readonly Message.Message[]) =>
  messages.flatMap((message) => message.blocks).filter(ContentBlock.is('toolResult'));
