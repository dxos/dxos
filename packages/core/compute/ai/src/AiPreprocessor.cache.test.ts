//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import type * as Prompt from 'effect/ai/Prompt';
import * as Effect from 'effect/Effect';
import type { ExpectStatic } from 'vitest';

import { Obj } from '@dxos/echo';
import { type ContentBlock, Message } from '@dxos/types';

import * as AiPreprocessor from './AiPreprocessor.ts';

// A provider's prompt cache reuses a request only up to its first changed byte, so consecutive model calls must
// extend each other except where history is rewritten on purpose (compaction, summary, retired tools).

const SYSTEM = 'You are a helpful assistant.';

/** The options a turn's model call is encoded with in `AiRequest`. */
const REQUEST_OPTIONS = { system: SYSTEM, cacheControl: 'no-cache', fullTurns: 5, tools: ['eval'] } as const;

let clock = Date.UTC(2026, 0, 1);

const makeMessage = (
  role: 'user' | 'assistant' | 'tool',
  blocks: ContentBlock.Any[],
  name?: string,
): Message.Message => {
  // Every message gets a fresh id and a later timestamp, so a test fails if either leaks into the prompt.
  clock += 1_000;
  return Obj.make(Message.Message, {
    created: new Date(clock).toISOString(),
    sender: name ? { role, name } : { role },
    blocks,
  });
};

const userPrompt = (text: string, name?: string) => makeMessage('user', [{ _tag: 'text', text }], name);

/** A model call that ends in an `eval` call, plus the tool message answering it. */
const toolStep = (id: string, { reasoning = true }: { reasoning?: boolean } = {}) => [
  makeMessage('assistant', [
    ...(reasoning ? [{ _tag: 'reasoning', reasoningText: `Thinking about ${id}.` } as const] : []),
    { _tag: 'toolCall', toolCallId: id, name: 'eval', input: `{"code":"${id}"}`, providerExecuted: false },
  ]),
  makeMessage('tool', [
    { _tag: 'toolResult', toolCallId: id, name: 'eval', result: `"result of ${id}"`, providerExecuted: false },
  ]),
];

const reply = (text: string) => makeMessage('assistant', [{ _tag: 'text', text }]);

/** One whole turn: a prompt, one tool step, and the reply. */
const turn = (index: number) => [
  userPrompt(`Request ${index}.`),
  ...toolStep(`call-${index}`),
  reply(`Reply ${index}.`),
];

/** Each message of the prompt as the bytes it contributes, without the cache marker. */
const serialize = (prompt: Prompt.Prompt): string[] =>
  prompt.content.map(({ options: _options, ...message }) => JSON.stringify(message));

/** How many leading messages two prompts share byte-for-byte. */
const commonPrefix = (before: readonly string[], after: readonly string[]): number => {
  let index = 0;
  while (index < before.length && index < after.length && before[index] === after[index]) {
    index++;
  }
  return index;
};

/** Asserts `after` starts with every message of `before`: the provider can read all of `before` from its cache. */
const expectExtends = (expect: ExpectStatic, before: Prompt.Prompt, after: Prompt.Prompt) => {
  const previous = serialize(before);
  const next = serialize(after);
  expect(next.length).toBeGreaterThan(previous.length);
  expect(next.slice(0, previous.length)).toEqual(previous);
};

const encode = (
  messages: readonly Message.Message[],
  options: Parameters<typeof AiPreprocessor.preprocessPrompt>[1] = REQUEST_OPTIONS,
) => AiPreprocessor.preprocessPrompt(messages, options);

describe('prompt cache: determinism', () => {
  it.effect(
    'the same history encodes to the same bytes every time',
    Effect.fn(function* ({ expect }) {
      const history = [...turn(1), ...turn(2), userPrompt('Request 3.'), ...toolStep('call-3')];
      const first = yield* encode(history);
      const second = yield* encode(history);
      expect(serialize(second)).toEqual(serialize(first));
    }),
  );

  it.effect(
    'encoding does not change the history it reads',
    Effect.fn(function* ({ expect }) {
      // Compaction, retirement and the cache marker rewrite copies; changed in place, the next call would see them twice.
      const history = [...turn(1), ...turn(2), ...turn(3), userPrompt('Request 4.'), ...toolStep('call-4')];
      const saved = JSON.stringify(history);
      yield* encode(history, { ...REQUEST_OPTIONS, cacheControl: 'ephemeral', fullTurns: 1, tools: [] });
      expect(JSON.stringify(history)).toBe(saved);
    }),
  );

  it.effect(
    'message ids and timestamps do not reach the prompt',
    Effect.fn(function* ({ expect }) {
      // Built twice, the histories differ only in each message's id and `created`, as a reloaded
      // conversation or a compaction's `Message.make` would.
      const first = yield* encode([...turn(1), userPrompt('Request 2.'), ...toolStep('call-2')]);
      const second = yield* encode([...turn(1), userPrompt('Request 2.'), ...toolStep('call-2')]);
      expect(serialize(second)).toEqual(serialize(first));
    }),
  );

  it.effect(
    'the order the offered tools are listed in does not change the prompt',
    Effect.fn(function* ({ expect }) {
      // `Object.keys` of a rebuilt toolkit need not keep its order from one model call to the next.
      const history = [
        userPrompt('Request 1.'),
        makeMessage('assistant', [
          { _tag: 'toolCall', toolCallId: 'a', name: 'query', input: '{}', providerExecuted: false },
          { _tag: 'toolCall', toolCallId: 'b', name: 'eval', input: '{}', providerExecuted: false },
          { _tag: 'toolCall', toolCallId: 'c', name: 'retired', input: '{}', providerExecuted: false },
        ]),
        makeMessage('tool', [
          { _tag: 'toolResult', toolCallId: 'a', name: 'query', result: '"a"', providerExecuted: false },
          { _tag: 'toolResult', toolCallId: 'b', name: 'eval', result: '"b"', providerExecuted: false },
          { _tag: 'toolResult', toolCallId: 'c', name: 'retired', result: '"c"', providerExecuted: false },
        ]),
      ];
      const first = yield* encode(history, { ...REQUEST_OPTIONS, tools: ['eval', 'query'] });
      const second = yield* encode(history, { ...REQUEST_OPTIONS, tools: ['query', 'eval'] });
      expect(serialize(second)).toEqual(serialize(first));
    }),
  );
});

describe('prompt cache: system prompt', () => {
  it.effect(
    'the system prompt is the first message and is identical in every call',
    Effect.fn(function* ({ expect }) {
      const early = yield* encode([userPrompt('Request 1.')]);
      const late = yield* encode([...turn(1), ...turn(2), userPrompt('Request 3.')]);
      expect(early.content[0]).toMatchObject({ role: 'system', content: SYSTEM });
      expect(serialize(late)[0]).toBe(serialize(early)[0]);
    }),
  );

  it.effect(
    'a changed system prompt invalidates the whole prefix',
    Effect.fn(function* ({ expect }) {
      // Why `AiSession` keeps the system prompt a turn started with and announces mid-turn binding changes as notices.
      const history = [...turn(1), userPrompt('Request 2.')];
      const before = serialize(yield* encode(history));
      const after = serialize(yield* encode(history, { ...REQUEST_OPTIONS, system: `${SYSTEM}\n\nA new skill.` }));
      expect(commonPrefix(before, after)).toBe(0);
    }),
  );
});

describe('prompt cache: append-only within a turn', () => {
  it.effect(
    'each model call of a tool loop extends the previous one',
    Effect.fn(function* ({ expect }) {
      const history: Message.Message[] = [...turn(1), userPrompt('Request 2.')];
      let previous = yield* encode(history);
      for (const id of ['step-1', 'step-2', 'step-3', 'step-4']) {
        history.push(...toolStep(id));
        const next = yield* encode(history);
        expectExtends(expect, previous, next);
        previous = next;
      }
    }),
  );

  it.effect(
    'a tool loop longer than the full-turn window still only appends',
    Effect.fn(function* ({ expect }) {
      // Tool steps do not start turns, so however many there are, nothing shifts out of the window.
      const history: Message.Message[] = [...turn(1), userPrompt('Request 2.')];
      let previous = yield* encode(history, { ...REQUEST_OPTIONS, fullTurns: 1 });
      for (let step = 0; step < 8; step++) {
        history.push(...toolStep(`step-${step}`));
        const next = yield* encode(history, { ...REQUEST_OPTIONS, fullTurns: 1 });
        expectExtends(expect, previous, next);
        previous = next;
      }
    }),
  );

  it.effect(
    'a synthetic notice mid-turn appends and does not move the full-turn window',
    Effect.fn(function* ({ expect }) {
      // Skills enabled mid-turn are announced this way instead of rewriting the system prompt; counted as a
      // turn start, the notice would compact the turn before it and rewrite the middle of the prompt.
      const options = { ...REQUEST_OPTIONS, fullTurns: 1 };
      const history: Message.Message[] = [...turn(1), userPrompt('Request 2.'), ...toolStep('step-1')];
      const before = yield* encode(history, options);
      history.push(
        makeMessage('user', [{ _tag: 'text', text: 'Skills enabled in this turn: …', disposition: 'synthetic' }]),
      );
      const withNotice = yield* encode(history, options);
      expectExtends(expect, before, withNotice);
      history.push(...toolStep('step-2'));
      expectExtends(expect, withNotice, yield* encode(history, options));
    }),
  );

  it.effect(
    'a reply after a tool loop extends the last model call of the loop',
    Effect.fn(function* ({ expect }) {
      const history: Message.Message[] = [userPrompt('Request 1.'), ...toolStep('step-1')];
      const lastCall = yield* encode(history);
      history.push(reply('Reply 1.'), userPrompt('Request 2.'));
      expectExtends(expect, lastCall, yield* encode(history));
    }),
  );

  it.effect(
    'named senders render the same attribution in every call',
    Effect.fn(function* ({ expect }) {
      const history: Message.Message[] = [userPrompt('Hi.', 'Alice'), reply('Hello Alice.')];
      const before = yield* encode(history);
      history.push(userPrompt('Me too.', 'Bob'));
      expectExtends(expect, before, yield* encode(history));
    }),
  );

  it.effect(
    'messages that render to nothing do not shift the prefix',
    Effect.fn(function* ({ expect }) {
      // An anchor block renders to no part, so its message is dropped; it must be dropped every time, not once.
      const anchor = makeMessage('user', [{ _tag: 'anchor', objectId: Obj.ID.random(), version: 1 }]);
      const history: Message.Message[] = [userPrompt('Request 1.'), anchor, reply('Reply 1.')];
      const before = yield* encode(history);
      history.push(userPrompt('Request 2.'));
      expectExtends(expect, before, yield* encode(history));
    }),
  );
});

describe('prompt cache: breakpoint', () => {
  const cacheControlOf = (message: Prompt.Message) => message.options?.anthropic?.cacheControl;

  it.effect(
    'ephemeral marks exactly the last message and changes nothing else',
    Effect.fn(function* ({ expect }) {
      const history = [...turn(1), userPrompt('Request 2.'), ...toolStep('step-1')];
      const marked = yield* encode(history, { ...REQUEST_OPTIONS, cacheControl: 'ephemeral' });
      const unmarked = yield* encode(history);

      const markers = marked.content.map(cacheControlOf);
      expect(markers.slice(0, -1).every((marker) => marker === undefined)).toBe(true);
      expect(markers.at(-1)).toEqual({ type: 'ephemeral', ttl: '5m' });
      expect(serialize(marked)).toEqual(serialize(unmarked));
    }),
  );

  it.effect(
    'no-cache marks no message',
    Effect.fn(function* ({ expect }) {
      const prompt = yield* encode([...turn(1), userPrompt('Request 2.')]);
      expect(prompt.content.map(cacheControlOf).every((marker) => marker === undefined)).toBe(true);
    }),
  );

  it.effect(
    'the message one call marks is unchanged in the next, so the next call reads what the last one wrote',
    Effect.fn(function* ({ expect }) {
      const options = { ...REQUEST_OPTIONS, cacheControl: 'ephemeral' } as const;
      const history: Message.Message[] = [...turn(1), userPrompt('Request 2.')];
      const first = yield* encode(history, options);
      history.push(...toolStep('step-1'));
      const second = yield* encode(history, options);

      const breakpoint = first.content.length - 1;
      expect(serialize(second)[breakpoint]).toBe(serialize(first)[breakpoint]);
      expect(cacheControlOf(second.content[breakpoint])).toBeUndefined();
      expect(cacheControlOf(second.content[second.content.length - 1])).toBeDefined();
    }),
  );
});

describe('prompt cache: compaction', () => {
  const FULL_TURNS = 3;
  const options = { ...REQUEST_OPTIONS, fullTurns: FULL_TURNS };
  const turns = (count: number) => Array.from({ length: count }, (_, index) => turn(index + 1)).flat();

  it.effect(
    'while every turn fits the window, a new turn only appends',
    Effect.fn(function* ({ expect }) {
      const before = yield* encode([...turns(FULL_TURNS - 1)], options);
      const after = yield* encode([...turns(FULL_TURNS - 1), userPrompt(`Request ${FULL_TURNS}.`)], options);
      expectExtends(expect, before, after);
    }),
  );

  it.effect(
    'a turn leaving the window rewrites the prompt from that turn on, and nothing before it',
    Effect.fn(function* ({ expect }) {
      // The window slides once per prompt: the cost of compaction is a cache miss from the turn that left it.
      const before = serialize(yield* encode([...turns(FULL_TURNS + 1)], options));
      const after = serialize(yield* encode([...turns(FULL_TURNS + 1), userPrompt('Next.')], options));

      // Turn 1 was already compacted; turn 2 is the one leaving the window now.
      const leaving = before.findIndex((message) => message.includes('Request 2.'));
      expect(leaving).toBeGreaterThan(0);
      expect(commonPrefix(before, after)).toBe(leaving + 1);
    }),
  );

  it.effect(
    'a compacted turn renders the same bytes in every later call',
    Effect.fn(function* ({ expect }) {
      // Compacted once, a turn must not be compacted differently later, or every call would miss from there.
      const compactedAt = (count: number) =>
        Effect.map(encode([...turns(count), userPrompt('Next.')], options), (prompt) => {
          const messages = serialize(prompt);
          const end = messages.findIndex((message) => message.includes('Request 2.'));
          return messages.slice(0, end);
        });
      const early = yield* compactedAt(FULL_TURNS + 1);
      expect(early.join('')).toContain('[Called `eval`. Input: {\\"code\\":\\"call-1\\"}]');
      expect(yield* compactedAt(FULL_TURNS + 3)).toEqual(early);
      expect(yield* compactedAt(FULL_TURNS + 6)).toEqual(early);
    }),
  );

  it.effect(
    'a compacted turn drops its reasoning and results, so they cannot change under the cache later',
    Effect.fn(function* ({ expect }) {
      const prompt = serialize(yield* encode([...turns(FULL_TURNS + 1), userPrompt('Next.')], options));
      const head = prompt
        .slice(
          0,
          prompt.findIndex((message) => message.includes('Request 3.')),
        )
        .join('');
      expect(head).not.toContain('Thinking about call-1.');
      expect(head).not.toContain('result of call-1');
    }),
  );
});

describe('prompt cache: summary', () => {
  const summary = (content: string) => makeMessage('assistant', [{ _tag: 'summary', content }]);

  it.effect(
    'after a summary, the prompt starts at the summary and later calls extend it',
    Effect.fn(function* ({ expect }) {
      const history: Message.Message[] = [...turn(1), ...turn(2), summary('Two requests were answered.')];
      history.push(userPrompt('Request 3.'));
      const before = yield* encode(history);
      expect(serialize(before).join('')).not.toContain('Request 1.');
      history.push(...toolStep('step-1'));
      expectExtends(expect, before, yield* encode(history));
    }),
  );

  it.effect(
    'history before the summary does not affect the prompt',
    Effect.fn(function* ({ expect }) {
      const after = [summary('Earlier work.'), userPrompt('Request 3.')];
      const shortHistory = yield* encode([...turn(1), ...after]);
      const longHistory = yield* encode([...turn(1), ...turn(2), ...turn(7), ...after]);
      expect(serialize(longHistory)).toEqual(serialize(shortHistory));
    }),
  );
});

describe('prompt cache: retired tools', () => {
  const history = () => [
    userPrompt('Request 1.'),
    makeMessage('assistant', [
      { _tag: 'toolCall', toolCallId: 'q', name: 'query', input: '{"type":"task"}', providerExecuted: false },
    ]),
    makeMessage('tool', [
      { _tag: 'toolResult', toolCallId: 'q', name: 'query', result: '["a"]', providerExecuted: false },
    ]),
    reply('Found one.'),
  ];

  it.effect(
    'a retired call renders the same text in every call while the toolkit stays the same',
    Effect.fn(function* ({ expect }) {
      const messages: Message.Message[] = history();
      const before = yield* encode(messages);
      expect(serialize(before).join('')).toContain('Earlier call to `query`');
      messages.push(userPrompt('Request 2.'));
      expectExtends(expect, before, yield* encode(messages));
    }),
  );

  it.effect(
    'dropping a tool from the toolkit rewrites history from its first call on',
    Effect.fn(function* ({ expect }) {
      // A changed toolkit is a known cache break: the call has to stop reading as one the model may repeat.
      const offered = serialize(yield* encode(history(), { ...REQUEST_OPTIONS, tools: ['eval', 'query'] }));
      const retired = serialize(yield* encode(history(), { ...REQUEST_OPTIONS, tools: ['eval'] }));
      const firstCall = offered.findIndex((message) => message.includes('"tool-call"'));
      expect(commonPrefix(offered, retired)).toBe(firstCall);
    }),
  );
});
