//
// Copyright 2026 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { OpaqueToolkit } from '@dxos/ai';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { AiRequest, ToolExecutionServices } from '@dxos/assistant';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { ContentBlock, type Message } from '@dxos/types';

import { AssistantTestLayer } from '../testing';

const { text, toolCall, scriptedAiService } = ScriptedLanguageModel;

EntityId.dangerouslyDisableRandomness();

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

const toolkitLayer = TestToolkit.toLayer({
  Echo: ({ value }) => Effect.succeed({ value }),
});

// Drives the real `AiRequest` loop against a scripted model instead of a live/memoized provider.
const testLayer = (turns: readonly ScriptedLanguageModel.ScriptedTurn[]) =>
  Layer.empty.pipe(
    Layer.provideMerge(ToolExecutionServices),
    Layer.provideMerge(AssistantTestLayer({ aiService: scriptedAiService(turns) })),
    Layer.provideMerge(toolkitLayer),
  );

const textOf = (messages: readonly Message.Message[]): string =>
  messages
    .flatMap((message) => message.blocks)
    .filter(ContentBlock.is('text'))
    .map((block) => block.text)
    .join('');

const toolResultsOf = (messages: readonly Message.Message[]) =>
  messages.flatMap((message) => message.blocks).filter(ContentBlock.is('toolResult'));

// Dimension D (harness / turn loop): deterministic developer code driven by a scripted model.
describe('AiRequest loop (scripted model)', () => {
  it.effect(
    'completes in one turn when the model emits no tool calls',
    Effect.fnUntraced(
      function* () {
        const request = new AiRequest.Request();
        const messages = yield* request.run({ prompt: 'Say hi.', history: [] });

        expect(textOf(messages)).toContain('Hi there.');
        expect(request.toolCalls).toEqual(0);
      },
      Effect.provide(testLayer([{ parts: [text('Hi there.')] }])),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'executes a tool call, feeds the result back, then stops',
    Effect.fnUntraced(
      function* () {
        const request = new AiRequest.Request();
        const toolkit = yield* OpaqueToolkit.fromContext(TestToolkit);
        const messages = yield* request.run({ toolkit, prompt: 'Echo hello.', history: [] });

        expect(toolResultsOf(messages)).toHaveLength(1);
        expect(textOf(messages)).toContain('Echoed the value.');
        expect(request.toolCalls).toEqual(1);
      },
      Effect.provide(
        testLayer([{ parts: [toolCall('Echo', { value: 'hello' })] }, { parts: [text('Echoed the value.')] }]),
      ),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'iterates until the model stops, feeding each tool result back',
    Effect.fnUntraced(
      function* () {
        const request = new AiRequest.Request();
        const toolkit = yield* OpaqueToolkit.fromContext(TestToolkit);
        const messages = yield* request.run({ toolkit, prompt: 'Echo twice.', history: [] });

        expect(toolResultsOf(messages)).toHaveLength(2);
        expect(textOf(messages)).toContain('All done.');
        expect(request.toolCalls).toEqual(2);
      },
      Effect.provide(
        testLayer([
          { parts: [toolCall('Echo', { value: 'first' })] },
          { parts: [toolCall('Echo', { value: 'second' })] },
          { parts: [text('All done.')] },
        ]),
      ),
      TestHelpers.provideTestContext,
    ),
  );
});
