//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as AiError from 'effect/unstable/ai/AiError';
import * as Tool from 'effect/unstable/ai/Tool';
import * as Toolkit from 'effect/unstable/ai/Toolkit';

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
    parameters: Schema.Struct({
      value: Schema.String.annotate({ description: 'The value to echo.' }),
    }),
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

// Dimension D (harness / turn loop): deterministic developer code driven by a scripted model.
describe('AiRequest loop (scripted model)', () => {
  it.effect(
    'completes in one turn when the model emits no tool calls',
    Effect.fnUntraced(
      function* (_) {
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
      function* (_) {
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
      function* (_) {
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

  // A skill can name a tool in its instructions whose handler this host never contributed: the name
  // reaches the model through the system prompt and never reaches the toolkit. The provider then
  // fails while decoding its own response, which used to kill the request and leave the reader with
  // no reply at all.
  it.effect(
    'reports an unresolvable tool call to the model and keeps going',
    Effect.fnUntraced(
      function* (_) {
        const request = new AiRequest.Request();
        const toolkit = yield* OpaqueToolkit.fromContext(TestToolkit);
        const messages = yield* request.run({ toolkit, prompt: 'Query the database.', history: [] });

        // The turn is reported, not fatal: the model gets another turn and the reader gets an answer.
        expect(textOf(messages)).toContain('Understood, I will use Echo.');
        const notice = messages
          .flatMap((message) => message.blocks)
          .filter(ContentBlock.is('text'))
          .find((block) => block.text.includes('space-query-objects'));
        expect(notice?.disposition).toEqual('synthetic');
        expect(notice?.text).toContain('Echo');
      },
      Effect.provide(
        testLayer([
          { fail: toolNotFound('space-query-objects', ['Echo']) },
          { parts: [text('Understood, I will use Echo.')] },
        ]),
      ),
      TestHelpers.provideTestContext,
    ),
  );

  // The report is bounded: a model that keeps calling the same absent tool must not spend the whole
  // budget being told it does not exist.
  it.effect(
    'fails once a request has spent its allowance of unresolvable tool calls',
    Effect.fnUntraced(
      function* (_) {
        const request = new AiRequest.Request();
        const toolkit = yield* OpaqueToolkit.fromContext(TestToolkit);
        const exit = yield* Effect.exit(request.run({ toolkit, prompt: 'Query the database.', history: [] }));

        expect(Exit.isFailure(exit)).toBe(true);
      },
      Effect.provide(
        testLayer([
          { fail: toolNotFound('space-query-objects', ['Echo']) },
          { fail: toolNotFound('space-query-objects', ['Echo']) },
          { fail: toolNotFound('space-query-objects', ['Echo']) },
        ]),
      ),
      TestHelpers.provideTestContext,
    ),
  );

  // The allowance is per run: a reused Request must not inherit a spent budget from an earlier run.
  it.effect(
    'resets the unresolvable-tool allowance between runs of the same request',
    Effect.fnUntraced(
      function* (_) {
        const request = new AiRequest.Request();
        const toolkit = yield* OpaqueToolkit.fromContext(TestToolkit);

        const first = yield* request.run({ toolkit, prompt: 'Query the database.', history: [] });
        expect(textOf(first)).toContain('First run recovered.');

        // The first run spent the whole allowance; without the reset this report would exceed it.
        const second = yield* request.run({ toolkit, prompt: 'Query it again.', history: [] });
        expect(textOf(second)).toContain('Second run recovered.');
      },
      Effect.provide(
        testLayer([
          { fail: toolNotFound('space-query-objects', ['Echo']) },
          { fail: toolNotFound('space-query-objects', ['Echo']) },
          { parts: [text('First run recovered.')] },
          { fail: toolNotFound('space-query-objects', ['Echo']) },
          { parts: [text('Second run recovered.')] },
        ]),
      ),
      TestHelpers.provideTestContext,
    ),
  );
});

/**
 * The failure the Anthropic adapter raises while decoding a response that calls a tool the toolkit
 * does not contain — the shape reproduced here, since the provider raises it before any tool call
 * reaches the loop and no scripted tool call can stand in for it.
 */
const toolNotFound = (toolName: string, availableTools: string[]): AiError.AiError =>
  new AiError.AiError({
    module: 'AnthropicLanguageModel',
    method: 'makeResponse',
    reason: new AiError.ToolNotFoundError({ toolName, availableTools }),
  });

const textOf = (messages: readonly Message.Message[]): string =>
  messages
    .flatMap((message) => message.blocks)
    .filter(ContentBlock.is('text'))
    .map((block) => block.text)
    .join('');

const toolResultsOf = (messages: readonly Message.Message[]) =>
  messages.flatMap((message) => message.blocks).filter(ContentBlock.is('toolResult'));
