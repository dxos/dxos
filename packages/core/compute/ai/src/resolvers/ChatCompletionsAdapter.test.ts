//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';
import * as Tool from 'effect/unstable/ai/Tool';
import * as Toolkit from 'effect/unstable/ai/Toolkit';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientResponse from 'effect/unstable/http/HttpClientResponse';
import { expect } from 'vitest';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import * as AiParser from '../AiParser';
import * as ChatCompletionsAdapter from './ChatCompletionsAdapter';

type ProviderConfig = {
  name: string;
  endpoint: string;
  apiFormat: ChatCompletionsAdapter.ApiFormat;
  model: string;
};

const providers: ProviderConfig[] = [
  {
    name: 'Ollama',
    endpoint: 'http://localhost:11434',
    apiFormat: 'ollama',
    model: 'llama3.2:1b',
  },
  {
    name: 'LM Studio',
    endpoint: 'http://localhost:1234',
    apiFormat: 'openai',
    model: 'llama-3.2-3b-instruct',
  },
];

/**
 * Create a test layer for a provider.
 */
const createLayer = (config: ProviderConfig) => {
  const clientLayer = ChatCompletionsAdapter.clientLayer({
    baseUrl: config.endpoint,
    apiFormat: config.apiFormat,
  }).pipe(Layer.provide(FetchHttpClient.layer));
  return ChatCompletionsAdapter.layer(config.model).pipe(Layer.provide(clientLayer));
};

describe('ChatCompletionsLanguageModel', () => {
  for (const provider of providers) {
    describe(provider.name, () => {
      it.effect(
        'generateText',
        Effect.fn(
          function* (_) {
            const response = yield* LanguageModel.generateText({
              prompt: 'What is 2 + 2? Reply with just the number.',
            });

            log.info('response', { text: response.text, usage: response.usage });
          },
          Effect.provide(Layer.provide(createLayer(provider), Layer.empty)),
        ),
        { tags: ['manual'] },
      );

      it.effect(
        'streamText',
        Effect.fn(
          function* (_) {
            const parts = yield* LanguageModel.streamText({
              prompt: 'Count from 1 to 5, one number per line.',
            }).pipe(Stream.runCollect);

            log.info('parts', { count: parts.length });

            // Check we received streaming parts.
            const textDeltas = parts.filter((p) => p.type === 'text-delta');
            log.info('textDeltas', { count: textDeltas.length });

            // Collect all text.
            const fullText = textDeltas.map((p) => (p as { delta: string }).delta).join('');
            log.info('fullText', { fullText });
          },
          Effect.provide(Layer.provide(createLayer(provider), Layer.empty)),
        ),
        { tags: ['manual'] },
      );
    });
  }
});

/**
 * Captures the request body the adapter sends, so the wire shape can be asserted without a live
 * server (the suites above are `manual` and need one).
 */
const captureRequestBody = (
  apiFormat: ChatCompletionsAdapter.ApiFormat,
  capture: (body: any) => void,
  provider?: string,
) => {
  const stub = HttpClient.make((request) =>
    Effect.gen(function* () {
      // The adapter encodes its JSON body to bytes; every other variant means the request was not
      // built the way this stub assumes, so fail loudly rather than capture nothing.
      const body = request.body;
      invariant(body._tag === 'Uint8Array', `unexpected request body: ${body._tag}`);
      capture(JSON.parse(new TextDecoder().decode(body.body)));
      const response =
        apiFormat === 'ollama'
          ? { model: 'test', created_at: '', message: { role: 'assistant', content: 'ok' }, done: true }
          : {
              id: 'test',
              object: 'chat.completion',
              created: 0,
              model: 'test',
              choices: [{ index: 0, message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' }],
            };
      return HttpClientResponse.fromWeb(
        request,
        new Response(JSON.stringify(response), { status: 200, headers: { 'content-type': 'application/json' } }),
      );
    }),
  );

  const clientLayer = ChatCompletionsAdapter.clientLayer({ baseUrl: 'http://test', apiFormat, provider }).pipe(
    Layer.provide(Layer.succeed(HttpClient.HttpClient, stub)),
  );
  return ChatCompletionsAdapter.layer('test-model').pipe(Layer.provide(clientLayer));
};

/** A turn whose tool call the model reasoned about first, as a thinking model produces it. */
const promptWithReasonedToolCall = [
  { role: 'user' as const, content: [{ type: 'text' as const, text: 'look it up' }] },
  {
    role: 'assistant' as const,
    content: [
      { type: 'reasoning' as const, text: 'The id looks like an EID.' },
      { type: 'tool-call' as const, id: 'call_1', name: 'lookup', params: { eid: 'abc' } },
    ],
  },
  {
    role: 'tool' as const,
    content: [{ type: 'tool-result' as const, id: 'call_1', name: 'lookup', isFailure: false, result: 'found' }],
  },
];

/** A turn that already carries a tool call, so the request includes an assistant `tool_calls` entry. */
const promptWithToolCall = [
  { role: 'user' as const, content: [{ type: 'text' as const, text: 'look it up' }] },
  {
    role: 'assistant' as const,
    content: [{ type: 'tool-call' as const, id: 'call_1', name: 'lookup', params: { eid: 'abc' } }],
  },
  {
    role: 'tool' as const,
    content: [
      { type: 'tool-result' as const, id: 'call_1', name: 'lookup', isFailure: true, result: 'Invalid EID: abc' },
    ],
  },
];

describe('tool call encoding', () => {
  // Ollama decodes `arguments` into a map and rejects a JSON string with 400.
  it.effect(
    'Ollama receives tool call arguments as an object',
    Effect.fn(function* (_) {
      let body: any;
      yield* LanguageModel.generateText({ prompt: promptWithToolCall }).pipe(
        Effect.provide(captureRequestBody('ollama', (captured) => (body = captured))),
      );

      const args = body.messages.find((message: any) => message.role === 'assistant').tool_calls[0].function.arguments;
      expect(args).toEqual({ eid: 'abc' });
    }),
  );

  // DeepSeek's thinking mode rejects a request whose tool-calling turns come back without the
  // reasoning they were produced with ("The `reasoning_content` in the thinking mode must be
  // passed back to the API"); an OpenAI-format server that never produced any is not sent one.
  it.effect(
    'DeepSeek receives an assistant turn with its reasoning_content; other servers do not',
    Effect.fn(function* (_) {
      let deepseek: any;
      yield* LanguageModel.generateText({ prompt: promptWithReasonedToolCall }).pipe(
        Effect.provide(captureRequestBody('openai', (captured) => (deepseek = captured), 'deepseek')),
      );
      let openai: any;
      yield* LanguageModel.generateText({ prompt: promptWithReasonedToolCall }).pipe(
        Effect.provide(captureRequestBody('openai', (captured) => (openai = captured))),
      );

      const assistantOf = (body: any) => body.messages.find((message: any) => message.role === 'assistant');
      expect(assistantOf(deepseek).reasoning_content).toBe('The id looks like an EID.');
      expect(assistantOf(deepseek).tool_calls).toHaveLength(1);
      expect(assistantOf(openai)).not.toHaveProperty('reasoning_content');
    }),
  );

  // OpenAI specifies the same field as a JSON-encoded string.
  it.effect(
    'OpenAI receives tool call arguments as a JSON string',
    Effect.fn(function* (_) {
      let body: any;
      yield* LanguageModel.generateText({ prompt: promptWithToolCall }).pipe(
        Effect.provide(captureRequestBody('openai', (captured) => (body = captured))),
      );

      const args = body.messages.find((message: any) => message.role === 'assistant').tool_calls[0].function.arguments;
      expect(args).toBe(JSON.stringify({ eid: 'abc' }));
    }),
  );
});

/** Serves a canned SSE stream, so a provider's terminating sequence can be asserted offline. */
const serveSseStream = (lines: readonly string[]) => {
  const stub = HttpClient.make((request) =>
    Effect.succeed(
      HttpClientResponse.fromWeb(
        request,
        new Response(lines.join('\n'), { status: 200, headers: { 'content-type': 'text/event-stream' } }),
      ),
    ),
  );

  const clientLayer = ChatCompletionsAdapter.clientLayer({
    baseUrl: 'http://test',
    apiFormat: 'openai',
    streamUsage: true,
  }).pipe(Layer.provide(Layer.succeed(HttpClient.HttpClient, stub)));
  return ChatCompletionsAdapter.layer('test-model').pipe(Layer.provide(clientLayer));
};

const chunk = (payload: Record<string, unknown>): string =>
  `data: ${JSON.stringify({ id: 'test', object: 'chat.completion.chunk', created: 0, model: 'test-model', ...payload })}`;

const delta = (content: string, finishReason: string | null = null) =>
  chunk({ choices: [{ index: 0, delta: { content }, finish_reason: finishReason }] });

describe('streamed finish part', () => {
  // OpenAI-format streams end with a `data: [DONE]` sentinel after the `finish_reason` chunk, so
  // emitting a finish per `done` produced a second one carrying no usage.
  it.effect(
    'is emitted exactly once despite the [DONE] sentinel',
    Effect.fn(function* (_) {
      const parts = yield* LanguageModel.streamText({ prompt: 'hi' }).pipe(
        Stream.runCollect,
        Effect.provide(
          serveSseStream([
            delta('ok'),
            '',
            chunk({
              choices: [{ index: 0, delta: { content: '' }, finish_reason: 'stop' }],
              usage: { prompt_tokens: 7, completion_tokens: 3, total_tokens: 10 },
            }),
            '',
            'data: [DONE]',
            '',
          ]),
        ),
      );

      const finishes = parts.filter((part) => part.type === 'finish');
      expect(finishes).toHaveLength(1);
      expect(finishes[0].usage.inputTokens.total).toBe(7);
      expect(finishes[0].usage.outputTokens.total).toBe(3);
    }),
  );

  // With `stream_options.include_usage`, OpenAI reports usage in a trailing chunk whose `choices`
  // is empty — after the chunk that carried `finish_reason`.
  it.effect(
    'takes usage from a trailing usage-only chunk',
    Effect.fn(function* (_) {
      const parts = yield* LanguageModel.streamText({ prompt: 'hi' }).pipe(
        Stream.runCollect,
        Effect.provide(
          serveSseStream([
            delta('ok'),
            '',
            delta('', 'stop'),
            '',
            chunk({ choices: [], usage: { prompt_tokens: 11, completion_tokens: 5, total_tokens: 16 } }),
            '',
            'data: [DONE]',
            '',
          ]),
        ),
      );

      const finishes = parts.filter((part) => part.type === 'finish');
      expect(finishes).toHaveLength(1);
      expect(finishes[0].reason).toBe('stop');
      expect(finishes[0].usage.inputTokens.total).toBe(11);
      expect(finishes[0].usage.outputTokens.total).toBe(5);
    }),
  );

  // A stream cut off before any `finish_reason` reports no finish, rather than a synthetic one.
  it.effect(
    'is omitted when the stream never finishes',
    Effect.fn(function* (_) {
      const parts = yield* LanguageModel.streamText({ prompt: 'hi' }).pipe(
        Stream.runCollect,
        Effect.provide(serveSseStream([delta('partial'), ''])),
      );

      expect(parts.filter((part) => part.type === 'finish')).toHaveLength(0);
    }),
  );
});

const toolCallDelta = (
  index: number,
  fields: { id?: string; name?: string; arguments?: string },
  finishReason: string | null = null,
) =>
  chunk({
    choices: [
      {
        index: 0,
        delta: {
          tool_calls: [
            { index, id: fields.id, type: 'function', function: { name: fields.name, arguments: fields.arguments } },
          ],
        },
        finish_reason: finishReason,
      },
    ],
  });

const ParallelToolkit = Toolkit.make(
  Tool.make('alpha', { description: 'alpha', parameters: Schema.Struct({ x: Schema.Number }), success: Schema.String }),
  Tool.make('beta', { description: 'beta', parameters: Schema.Struct({ y: Schema.Number }), success: Schema.String }),
);

const ParallelToolkitLayer = ParallelToolkit.toLayer({
  alpha: Effect.fn(function* () {
    return 'alpha';
  }),
  beta: Effect.fn(function* () {
    return 'beta';
  }),
});

describe('streamed parallel tool calls', () => {
  // Recorded from a model emitting two tool calls in one turn. Ending each call only at
  // `finish_reason` left the first open while the second started, which the parser rejects.
  it.effect(
    'each call is closed before the next one starts',
    Effect.fn(function* (_) {
      const parts = yield* LanguageModel.streamText({ prompt: 'hi', toolkit: ParallelToolkit }).pipe(
        Stream.runCollect,
        Effect.provide(ParallelToolkitLayer),
        Effect.provide(
          serveSseStream([
            toolCallDelta(0, { id: 'call_a', name: 'alpha', arguments: '' }),
            '',
            toolCallDelta(0, { arguments: '{"x":1}' }),
            '',
            toolCallDelta(1, { id: 'call_b', name: 'beta', arguments: '' }),
            '',
            toolCallDelta(1, { arguments: '{"y":2}' }),
            '',
            chunk({ choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] }),
            '',
            'data: [DONE]',
            '',
          ]),
        ),
      );

      const paramParts = parts.filter((part) => part.type.startsWith('tool-params-'));
      expect(paramParts.map((part) => [part.type, (part as any).id])).toEqual([
        ['tool-params-start', 'call_a'],
        ['tool-params-delta', 'call_a'],
        ['tool-params-end', 'call_a'],
        ['tool-params-start', 'call_b'],
        ['tool-params-delta', 'call_b'],
        ['tool-params-end', 'call_b'],
      ]);

      const calls = parts.filter((part) => part.type === 'tool-call');
      expect(calls.map((part) => [part.id, part.name, part.params])).toEqual([
        ['call_a', 'alpha', { x: 1 }],
        ['call_b', 'beta', { y: 2 }],
      ]);
    }),
  );
  // Two calls can share one network chunk, so the flush has to happen inside the per-chunk loop
  // rather than between chunks.
  it.effect(
    'closes the previous call when both arrive in one chunk',
    Effect.fn(function* (_) {
      const parts = yield* LanguageModel.streamText({ prompt: 'hi', toolkit: ParallelToolkit }).pipe(
        Stream.runCollect,
        Effect.provide(ParallelToolkitLayer),
        Effect.provide(
          serveSseStream([
            chunk({
              choices: [
                {
                  index: 0,
                  delta: {
                    tool_calls: [
                      { index: 0, id: 'call_a', type: 'function', function: { name: 'alpha', arguments: '{"x":1}' } },
                      { index: 1, id: 'call_b', type: 'function', function: { name: 'beta', arguments: '{"y":2}' } },
                    ],
                  },
                  finish_reason: null,
                },
              ],
            }),
            '',
            chunk({ choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] }),
            '',
            'data: [DONE]',
            '',
          ]),
        ),
      );

      expect(parts.filter((part) => part.type.startsWith('tool-params-')).map((part) => part.type)).toEqual([
        'tool-params-start',
        'tool-params-delta',
        'tool-params-end',
        'tool-params-start',
        'tool-params-delta',
        'tool-params-end',
      ]);
    }),
  );

  // DeepSeek's thinking mode streams `reasoning_content` before the calls; the recorded crash came
  // from exactly this shape, so the reasoning block must close and both calls stay well-formed.
  it.effect(
    'survives reasoning deltas preceding the calls (DeepSeek thinking mode)',
    Effect.fn(function* (_) {
      const parts = yield* LanguageModel.streamText({ prompt: 'hi', toolkit: ParallelToolkit }).pipe(
        Stream.runCollect,
        Effect.provide(ParallelToolkitLayer),
        Effect.provide(
          serveSseStream([
            chunk({ choices: [{ index: 0, delta: { reasoning_content: 'I need both' }, finish_reason: null }] }),
            '',
            chunk({ choices: [{ index: 0, delta: { reasoning_content: ' values.' }, finish_reason: null }] }),
            '',
            toolCallDelta(0, { id: 'call_a', name: 'alpha', arguments: '' }),
            '',
            toolCallDelta(0, { arguments: '{"x":1}' }),
            '',
            toolCallDelta(1, { id: 'call_b', name: 'beta', arguments: '' }),
            '',
            toolCallDelta(1, { arguments: '{"y":2}' }),
            '',
            chunk({ choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] }),
            '',
            'data: [DONE]',
            '',
          ]),
        ),
      );

      expect(parts.map((part) => part.type)).toEqual([
        'reasoning-start',
        'reasoning-delta',
        'reasoning-delta',
        'reasoning-end',
        'tool-params-start',
        'tool-params-delta',
        'tool-params-end',
        'tool-call',
        'tool-params-start',
        'tool-params-delta',
        'tool-params-end',
        'tool-call',
        // The toolkit's handlers run inside `streamText`, so each call is followed by its result.
        'tool-result',
        'tool-result',
        'finish',
      ]);
    }),
  );

  // The end-to-end shape the app saw: adapter parts straight into the parser, which used to abort
  // the whole turn with `invariant violation [!block]`.
  it.effect(
    'the parser turns the stream into one block per tool call',
    Effect.fn(function* (_) {
      const blocks = yield* LanguageModel.streamText({ prompt: 'hi', toolkit: ParallelToolkit }).pipe(
        AiParser.parseResponse(),
        Stream.runCollect,
        Effect.provide(ParallelToolkitLayer),
        Effect.provide(
          serveSseStream([
            toolCallDelta(0, { id: 'call_a', name: 'alpha', arguments: '{"x":1}' }),
            '',
            toolCallDelta(1, { id: 'call_b', name: 'beta', arguments: '{"y":2}' }),
            '',
            chunk({ choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] }),
            '',
            'data: [DONE]',
            '',
          ]),
        ),
      );

      expect(blocks.filter((block) => block._tag === 'toolCall')).toEqual([
        { _tag: 'toolCall', toolCallId: 'call_a', name: 'alpha', input: '{"x":1}', providerExecuted: false },
        { _tag: 'toolCall', toolCallId: 'call_b', name: 'beta', input: '{"y":2}', providerExecuted: false },
      ]);
    }),
  );
});
