//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as AiError from 'effect/ai/AiError';
import * as Tool from 'effect/ai/Tool';
import * as Toolkit from 'effect/ai/Toolkit';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { OpaqueToolkit } from '@dxos/ai';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { AiRequest, ToolExecutionServices } from '@dxos/assistant';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { ContentBlock, Message } from '@dxos/types';

import { AssistantTestLayer } from '../testing/index.ts';

const { reasoning, text, toolCall, scriptedAiService } = ScriptedLanguageModel;

EntityId.dangerouslyDisableRandomness();

// A minimal echo tool: the deterministic developer code the loop invokes when the (scripted) model
// emits a tool call. Its handler runs for real, so a genuine tool-call -> result -> continue cycle is
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
const testLayer = (turns: ScriptedLanguageModel.Script) =>
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

  // Seen live through the EDGE provider: the model thought, then called a tool the toolkit lacks. The provider closes
  // the call with a `tool-call` part, which fails to decode and drops the batch it arrived in (the call's params
  // included), so the turn ended on the thought alone. The call must instead reach the loop and be answered.
  it.effect(
    'answers a call to an unknown tool that the provider closes with a tool-call part, and keeps going',
    Effect.fnUntraced(
      function* (_) {
        const request = new AiRequest.Request();
        const toolkit = yield* OpaqueToolkit.fromContext(TestToolkit);
        const messages = yield* request.run({ toolkit, prompt: 'Create the tasks.', history: [] });

        const result = messages
          .flatMap((message) => message.blocks)
          .filter(ContentBlock.is('toolResult'))
          .find((block) => block.name === 'tasks-create');
        expect(result?.error).toContain('tasks-create');
        expect(textOf(messages)).toContain('Understood, I will use Echo.');
      },
      Effect.provide(
        testLayer([
          {
            parts: [reasoning('The user wants tasks; I will create them.'), toolCall('tasks-create', { title: 'A' })],
            emitToolCalls: true,
          },
          { parts: [text('Understood, I will use Echo.')] },
        ]),
      ),
      TestHelpers.provideTestContext,
    ),
  );

  // A call to a declared tool with parameters its schema rejects takes the same path, and must also be answered.
  it.effect(
    'answers a call whose parameters the tool rejects when the provider closes it with a tool-call part',
    Effect.fnUntraced(
      function* (_) {
        const request = new AiRequest.Request();
        const toolkit = yield* OpaqueToolkit.fromContext(TestToolkit);
        const messages = yield* request.run({ toolkit, prompt: 'Echo something.', history: [] });

        const result = messages
          .flatMap((message) => message.blocks)
          .filter(ContentBlock.is('toolResult'))
          .find((block) => block.name === 'Echo');
        expect(result?.error).toBeDefined();
        expect(textOf(messages)).toContain('Retried.');
      },
      Effect.provide(
        testLayer([
          { parts: [reasoning('Echo it.'), toolCall('Echo', { wrong: 1 })], emitToolCalls: true },
          { parts: [text('Retried.')] },
        ]),
      ),
      TestHelpers.provideTestContext,
    ),
  );

  /** Every request the scripted model received in the test below, which asserts on what the model was shown. */
  const seen: ScriptedLanguageModel.ScriptedRequest[] = [];

  // Seen live: a chat switched to code mode kept its earlier turns' calls to `space-query-objects`, and the model
  // read them as a tool it could still call. A call to a tool the turn does not offer reaches it as text instead.
  it.effect(
    'shows history calls to tools the turn does not offer as text, not as calls',
    Effect.fnUntraced(
      function* (_) {
        const request = new AiRequest.Request();
        const toolkit = yield* OpaqueToolkit.fromContext(TestToolkit);
        yield* request.run({ toolkit, prompt: 'And now?', history: retiredHistory() });

        const called = seen.flatMap(({ prompt }) =>
          prompt.content.flatMap((message) =>
            message.role === 'assistant'
              ? message.content.flatMap((part) => (part.type === 'tool-call' ? [part.name] : []))
              : [],
          ),
        );
        expect(called).not.toContain('space-query-objects');
        const text = seen.map((request) => request.text).join('\n');
        expect(text).toContain('[Earlier call to `space-query-objects`, which is not a tool you can call now.');
        expect(text).toContain('[Result of the earlier `space-query-objects` call: [{"id":"a"}]]');
      },
      Effect.provide(
        testLayer((request) => {
          seen.push(request);
          return { parts: [text('Using Echo from here.')] };
        }),
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

/** An earlier turn's call to a tool no longer in the toolkit, and its result. */
const retiredHistory = (): Message.Message[] => [
  Message.make({ sender: { role: 'user' }, blocks: [{ _tag: 'text', text: 'Find the tasks.' }] }),
  Message.make({
    sender: { role: 'assistant' },
    blocks: [
      {
        _tag: 'toolCall',
        toolCallId: 'toolu_old',
        name: 'space-query-objects',
        input: '{"typename":"task"}',
        providerExecuted: false,
      },
    ],
  }),
  Message.make({
    sender: { role: 'tool' },
    blocks: [
      {
        _tag: 'toolResult',
        toolCallId: 'toolu_old',
        name: 'space-query-objects',
        result: '[{"id":"a"}]',
        providerExecuted: false,
      },
    ],
  }),
  Message.make({ sender: { role: 'assistant' }, blocks: [{ _tag: 'text', text: 'Found one task.' }] }),
];

/**
 * The failure the Anthropic adapter raises while decoding a response that calls a tool the toolkit
 * does not contain - the shape reproduced here, since the provider raises it before any tool call
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
