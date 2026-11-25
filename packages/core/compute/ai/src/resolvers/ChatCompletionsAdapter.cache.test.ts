//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Tool from 'effect/ai/Tool';
import * as Toolkit from 'effect/ai/Toolkit';
import * as Effect from 'effect/Effect';
import * as HttpClient from 'effect/http/HttpClient';
import * as HttpClientResponse from 'effect/http/HttpClientResponse';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { type ContentBlock, Message } from '@dxos/types';

import * as AiPreprocessor from '../AiPreprocessor.ts';
import * as ChatCompletionsAdapter from './ChatCompletionsAdapter.ts';

// DeepSeek caches automatically on the request's leading tokens, so these tests check the JSON body on the wire.

/** One message of a captured request body, as much of it as these tests read. */
type WireMessage = {
  readonly role: string;
  readonly content?: string | null;
  readonly reasoning_content?: string;
  readonly tool_calls?: readonly { readonly function: { readonly name: string; readonly arguments: string } }[];
};

/** A captured request body: the conversation plus everything sent ahead of it. */
type WireBody = {
  readonly messages: readonly WireMessage[];
  readonly tools?: readonly { readonly function: { readonly name: string } }[];
  readonly [key: string]: unknown;
};

const SYSTEM = 'You are a coding agent.';

const CacheToolkit = Toolkit.make(
  Tool.make('eval', {
    description: 'Evaluates code.',
    parameters: Schema.Struct({ code: Schema.String }),
    success: Schema.String,
  }),
  Tool.make('query', {
    description: 'Queries the space.',
    parameters: Schema.Struct({ type: Schema.String, limit: Schema.optional(Schema.Number) }),
    success: Schema.String,
  }),
);

const CacheToolkitLayer = CacheToolkit.toLayer({
  eval: Effect.fn(function* () {
    return 'evaluated';
  }),
  query: Effect.fn(function* () {
    return 'queried';
  }),
});

/** A DeepSeek model whose every request body is recorded into `bodies`, answered with a plain reply. */
const recordingDeepSeek = (
  bodies: WireBody[],
  { thinking = true, usage }: { thinking?: boolean; usage?: Record<string, number> } = {},
) => {
  const stub = HttpClient.make((request) =>
    Effect.gen(function* () {
      const body = request.body;
      invariant(body._tag === 'Uint8Array', `unexpected request body: ${body._tag}`);
      bodies.push(JSON.parse(new TextDecoder().decode(body.body)));
      const response = {
        id: 'test',
        object: 'chat.completion',
        created: 0,
        model: 'deepseek-v4-flash',
        choices: [{ index: 0, message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' }],
        ...(usage ? { usage } : {}),
      };
      return HttpClientResponse.fromWeb(
        request,
        new Response(JSON.stringify(response), { status: 200, headers: { 'content-type': 'application/json' } }),
      );
    }),
  );
  const clientLayer = ChatCompletionsAdapter.clientLayer({
    baseUrl: 'http://test',
    apiFormat: 'openai',
    provider: 'deepseek',
  }).pipe(Layer.provide(Layer.succeed(HttpClient.HttpClient, stub)));
  // The body `DeepSeekResolver` configures for a thinking request.
  return ChatCompletionsAdapter.layer('deepseek-v4-flash', {
    body: { thinking: { type: thinking ? 'enabled' : 'disabled' } },
  }).pipe(Layer.provide(clientLayer), Layer.merge(CacheToolkitLayer));
};

let clock = Date.UTC(2026, 0, 1);

const makeMessage = (role: 'user' | 'assistant' | 'tool', blocks: ContentBlock.Any[]): Message.Message => {
  clock += 1_000;
  return Obj.make(Message.Message, { created: new Date(clock).toISOString(), sender: { role }, blocks });
};

const userPrompt = (text: string) => makeMessage('user', [{ _tag: 'text', text }]);

/** A model call that reasoned, called a tool with `input` as the model wrote it, and the tool's answer. */
const toolStep = (
  id: string,
  { input = `{"code":"${id}"}`, name = 'eval' }: { input?: string; name?: string } = {},
) => [
  makeMessage('assistant', [
    { _tag: 'reasoning', reasoningText: `Reasoning before ${id}.` },
    { _tag: 'toolCall', toolCallId: id, name, input, providerExecuted: false },
  ]),
  makeMessage('tool', [
    { _tag: 'toolResult', toolCallId: id, name, result: `"result of ${id}"`, providerExecuted: false },
  ]),
];

const reply = (text: string) => makeMessage('assistant', [{ _tag: 'text', text }]);

/** Sends `history` the way `AiRequest.runAgentTurn` encodes a model call. */
const send = (history: readonly Message.Message[], cacheControl: AiPreprocessor.CacheControl = 'ephemeral') =>
  Effect.gen(function* () {
    const prompt = yield* AiPreprocessor.preprocessPrompt(history, {
      system: SYSTEM,
      cacheControl,
      fullTurns: 5,
      tools: Object.keys(CacheToolkit.tools),
    });
    yield* LanguageModel.generateText({ prompt, toolkit: CacheToolkit, disableToolCallResolution: true });
  });

const messageBytes = (body: WireBody): string[] => body.messages.map((message) => JSON.stringify(message));

/** The body without its messages, as bytes: everything a provider may render ahead of the conversation. */
const headerBytes = ({ messages: _messages, ...rest }: WireBody): string => JSON.stringify(rest);

/** Records the body of one request per history, in order. */
const record = (histories: readonly (readonly Message.Message[])[], options?: { thinking?: boolean }) =>
  Effect.gen(function* () {
    const bodies: WireBody[] = [];
    yield* Effect.forEach(histories, (history) => send(history), { discard: true }).pipe(
      Effect.provide(recordingDeepSeek(bodies, options)),
    );
    return bodies;
  });

/** The successive histories of one turn: the prompt, then after each tool step. */
const toolLoop = (earlier: readonly Message.Message[], steps: readonly (readonly Message.Message[])[]) =>
  steps.reduce<Message.Message[][]>(
    (histories, step) => [...histories, [...histories[histories.length - 1], ...step]],
    [[...earlier, userPrompt('Fix the failing test.')]],
  );

describe('DeepSeek prompt cache: request prefix', () => {
  it.effect(
    'every request of a tool loop starts with every message of the request before it',
    Effect.fn(function* ({ expect }) {
      const earlier = [userPrompt('Hello.'), reply('Hi.')];
      const bodies = yield* record(toolLoop(earlier, [toolStep('a'), toolStep('b'), toolStep('c')]));
      expect(bodies).toHaveLength(4);
      for (let index = 1; index < bodies.length; index++) {
        const previous = messageBytes(bodies[index - 1]);
        const next = messageBytes(bodies[index]);
        expect(next.length).toBeGreaterThan(previous.length);
        expect(next.slice(0, previous.length)).toEqual(previous);
      }
    }),
  );

  it.effect(
    'the request header — model, thinking, tools and tool choice — is byte-identical across requests',
    Effect.fn(function* ({ expect }) {
      const bodies = yield* record(toolLoop([], [toolStep('a'), toolStep('b')]));
      const headers = bodies.map(headerBytes);
      expect(new Set(headers).size).toBe(1);
      expect(bodies[0]).toMatchObject({ model: 'deepseek-v4-flash', thinking: { type: 'enabled' } });
    }),
  );

  it.effect(
    'tools are sent in the toolkit order, whatever history called them in',
    Effect.fn(function* ({ expect }) {
      const bodies = yield* record([
        [userPrompt('Look.'), ...toolStep('q', { name: 'query', input: '{"type":"task"}' })],
        [userPrompt('Look.'), ...toolStep('e'), ...toolStep('q', { name: 'query', input: '{"type":"task"}' })],
      ]);
      const names = bodies.map((body) => (body.tools ?? []).map((tool) => tool.function.name));
      expect(names).toEqual([
        ['eval', 'query'],
        ['eval', 'query'],
      ]);
    }),
  );

  it.effect(
    'the system prompt is the first message of every request',
    Effect.fn(function* ({ expect }) {
      const bodies = yield* record(toolLoop([], [toolStep('a')]));
      for (const body of bodies) {
        expect(body.messages[0]).toEqual({ role: 'system', content: SYSTEM });
      }
    }),
  );

  it.effect(
    "Anthropic's cache marker does not reach DeepSeek's request",
    Effect.fn(function* ({ expect }) {
      // The breakpoint is an Anthropic option; sent on, it would make the marked message differ between requests.
      const history = [userPrompt('Look.'), ...toolStep('a')];
      const bodies: WireBody[] = [];
      yield* Effect.all([send(history, 'ephemeral'), send(history, 'no-cache')]).pipe(
        Effect.provide(recordingDeepSeek(bodies)),
      );
      expect(JSON.stringify(bodies[0])).toBe(JSON.stringify(bodies[1]));
      expect(JSON.stringify(bodies[0])).not.toContain('cache');
    }),
  );
});

describe('DeepSeek prompt cache: reasoning replay', () => {
  it.effect(
    "a tool-calling turn's reasoning_content is replayed byte-identically in every later request",
    Effect.fn(function* ({ expect }) {
      const bodies = yield* record(toolLoop([], [toolStep('a'), toolStep('b'), toolStep('c')]));
      const firstCall = (body: WireBody) =>
        body.messages.find((message) => message.role === 'assistant' && 'tool_calls' in message);
      const replayed = bodies.slice(1).map((body) => JSON.stringify(firstCall(body)));
      expect(new Set(replayed).size).toBe(1);
      expect(firstCall(bodies[1])).toMatchObject({ reasoning_content: 'Reasoning before a.' });
    }),
  );

  it.effect(
    'a tool-calling turn without reasoning carries an empty reasoning_content from the first request on',
    Effect.fn(function* ({ expect }) {
      // Present-but-empty from the start, so the field is never added later to a message already in the cache.
      const step = [
        makeMessage('assistant', [
          { _tag: 'toolCall', toolCallId: 'a', name: 'eval', input: '{"code":"a"}', providerExecuted: false },
        ]),
        makeMessage('tool', [
          { _tag: 'toolResult', toolCallId: 'a', name: 'eval', result: '"ok"', providerExecuted: false },
        ]),
      ];
      const bodies = yield* record(toolLoop([], [step, toolStep('b')]));
      const calls = bodies
        .slice(1)
        .map((body) => body.messages.find((message) => message.role === 'assistant' && 'tool_calls' in message));
      for (const call of calls) {
        expect(call).toHaveProperty('reasoning_content', '');
      }
    }),
  );

  it.effect(
    "a finished turn's reply keeps the same shape in every later request",
    Effect.fn(function* ({ expect }) {
      // Reasoning on a text-only reply is replayed too; what matters is that its bytes do not change once sent.
      const finished = [
        userPrompt('Explain.'),
        makeMessage('assistant', [
          { _tag: 'reasoning', reasoningText: 'Short answer.' },
          { _tag: 'text', text: 'Because.' },
        ]),
      ];
      const bodies = yield* record([
        [...finished, userPrompt('More.')],
        [...finished, userPrompt('More.'), ...toolStep('a')],
      ]);
      const explained = bodies.map((body) => JSON.stringify(body.messages[2]));
      expect(explained[0]).toBe(explained[1]);
      expect(JSON.parse(explained[0])).toMatchObject({ role: 'assistant', content: 'Because.' });
    }),
  );
});

describe('DeepSeek prompt cache: tool arguments', () => {
  it.effect(
    'tool-call arguments encode to the same string in every request',
    Effect.fn(function* ({ expect }) {
      // Arguments are parsed into the prompt and serialized again per request; the result must not drift.
      const input = '{ "type": "task",  "limit": 10 }';
      const step = toolStep('q', { name: 'query', input });
      const bodies = yield* record([
        [userPrompt('Look.'), ...step],
        [userPrompt('Look.'), ...step, ...toolStep('e')],
        [userPrompt('Look.'), ...step, ...toolStep('e'), ...toolStep('f')],
      ]);
      const args = bodies.map((body) => {
        const call = body.messages.find((message) => message.role === 'assistant');
        return call?.tool_calls?.[0]?.function.arguments ?? '';
      });
      expect(new Set(args).size).toBe(1);
      // Key order is the model's own, so re-encoding cannot reorder it between requests.
      const [encoded] = args;
      expect(JSON.parse(encoded)).toEqual({ type: 'task', limit: 10 });
      expect(Object.keys(JSON.parse(encoded))).toEqual(['type', 'limit']);
    }),
  );

  it.effect(
    'tool results are sent as the same string in every request',
    Effect.fn(function* ({ expect }) {
      const bodies = yield* record(toolLoop([], [toolStep('a'), toolStep('b'), toolStep('c')]));
      const results = bodies.slice(1).map((body) => {
        const result = body.messages.find((message) => message.role === 'tool');
        return JSON.stringify(result);
      });
      expect(new Set(results).size).toBe(1);
    }),
  );
});

describe('DeepSeek prompt cache: across turns', () => {
  it.effect(
    'a new prompt after a finished turn extends the last request of that turn',
    Effect.fn(function* ({ expect }) {
      const turn = [userPrompt('Fix it.'), ...toolStep('a')];
      const bodies = yield* record([turn, [...turn, reply('Fixed.'), userPrompt('Thanks, now the docs.')]]);
      const previous = messageBytes(bodies[0]);
      expect(messageBytes(bodies[1]).slice(0, previous.length)).toEqual(previous);
    }),
  );

  it.effect(
    'thinking off sends the same messages as thinking on, apart from the header',
    Effect.fn(function* ({ expect }) {
      // `thinking` lives in the header, not on messages, so toggling it does not rewrite the conversation's bytes.
      const history = [userPrompt('Look.'), ...toolStep('a')];
      const [on] = yield* record([history], { thinking: true });
      const [off] = yield* record([history], { thinking: false });
      expect(messageBytes(off)).toEqual(messageBytes(on));
      expect(headerBytes(off)).not.toBe(headerBytes(on));
    }),
  );
});

describe('DeepSeek prompt cache: usage', () => {
  it.effect(
    'a response reports the prompt tokens DeepSeek read from its prefix cache',
    Effect.fn(function* ({ expect }) {
      // The hit count is the only signal that a request reused the cache; `AiParser` records it on the turn's stats.
      const usage = {
        prompt_tokens: 2_048,
        completion_tokens: 12,
        total_tokens: 2_060,
        prompt_cache_hit_tokens: 1_984,
        prompt_cache_miss_tokens: 64,
      };
      const response = yield* LanguageModel.generateText({ prompt: 'hi' }).pipe(
        Effect.provide(recordingDeepSeek([], { usage })),
      );
      expect(response.usage.inputTokens).toMatchObject({ total: 2_048, cacheRead: 1_984, uncached: 64 });
    }),
  );
});
