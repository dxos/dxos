//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Prompt from 'effect/ai/Prompt';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { AiPreprocessor } from '@dxos/ai';
import { invariant } from '@dxos/invariant';
import { Actor, ContentBlock, Message } from '@dxos/types';

//
// Prompt-cache stability, replayed from real sessions. Providers cache a request by prefix in the
// order tools → system → messages, so a call is cache-safe only when everything the previous call
// sent reappears unchanged at the front of it. Each transcript under `testing/transcripts` is a
// real eval session (`assistant-evals`, `DX_EVAL_TRANSCRIPT_DIR`): its messages, and per model
// call the system prompt and tools that call went out with. The test rebuilds each call's prompt
// from the messages the way `AiRequest` does and fails on the first byte that moved.
//

const TRANSCRIPTS = path.join(import.meta.dirname, 'testing', 'transcripts');

const ToolSpec = Schema.Struct({
  name: Schema.String,
  description: Schema.optional(Schema.String),
  parameters: Schema.Unknown,
});

const Transcript = Schema.Struct({
  source: Schema.String,
  model: Schema.String,
  systems: Schema.Array(Schema.String),
  toolsets: Schema.Array(Schema.Array(ToolSpec)),
  requests: Schema.Array(Schema.Struct({ system: Schema.Number, tools: Schema.Number, messages: Schema.Number })),
  messages: Schema.Array(Schema.Unknown),
});

/** One request as the provider hashes it: the tool list, the system prompt, then each message. */
type Rendered = { readonly tools: string; readonly system: string; readonly messages: readonly string[] };

/** Where a request stopped extending the one before it, as a reader looks for it. */
type Break = { readonly call: number; readonly at: string; readonly before: string; readonly after: string };

/** The stored fields of a message; ECHO's own keys (`id`, `@type`, `@meta`, …) are dropped on decode. */
const StoredMessage = Schema.Struct({
  created: Schema.String,
  sender: Actor.Actor,
  blocks: Schema.Array(ContentBlock.Any),
  properties: Schema.optional(Schema.Record(Schema.String, Schema.Any)),
});

const toMessage = (json: unknown): Message.Message => Message.make(Schema.decodeUnknownSync(StoredMessage)(json));

/** A prompt message without its provider options: the cache marker moves every call by design. */
const renderMessage = (message: Prompt.Message): string => {
  const { options: _options, ...encoded } = Schema.encodeSync(Prompt.Message)(message);
  const content = Array.isArray(encoded.content)
    ? encoded.content.map((part) => {
        const { options: _partOptions, ...rest } = part;
        return rest;
      })
    : encoded.content;
  return JSON.stringify({ ...encoded, content });
};

const excerpt = (text: string | undefined, from: number): string =>
  text === undefined ? '(absent)' : text.slice(Math.max(0, from - 80), from + 160);

const firstDifference = (left: string, right: string): number => {
  let index = 0;
  while (index < left.length && left[index] === right[index]) {
    index++;
  }
  return index;
};

/** The first place `next` fails to extend `previous`, or undefined when it is a strict extension. */
const findBreak = (call: number, previous: Rendered, next: Rendered): Break | undefined => {
  if (previous.tools !== next.tools) {
    const at = firstDifference(previous.tools, next.tools);
    return { call, at: 'tools', before: excerpt(previous.tools, at), after: excerpt(next.tools, at) };
  }
  if (previous.system !== next.system) {
    const at = firstDifference(previous.system, next.system);
    return { call, at: 'system', before: excerpt(previous.system, at), after: excerpt(next.system, at) };
  }
  for (const [index, message] of previous.messages.entries()) {
    if (next.messages[index] !== message) {
      const at = firstDifference(message, next.messages[index] ?? '');
      return {
        call,
        at: `message ${index}`,
        before: excerpt(message, at),
        after: excerpt(next.messages[index], at),
      };
    }
  }
  return undefined;
};

/**
 * Where a model call can start: before an assistant reply, and at the end. A history cut anywhere
 * else ends mid-turn, and the preprocessor would pad the unanswered tool calls with placeholders.
 */
const callBoundaries = (messages: readonly Message.Message[]): number[] => [
  ...messages.flatMap((message, index) =>
    message.sender.role === 'assistant' && messages[index - 1]?.sender.role !== 'assistant' ? [index] : [],
  ),
  messages.length,
];

/**
 * Rebuilds every recorded call from the transcript's messages, taking the first call boundary whose
 * prompt has the message count the call was sent with, and returns each cache break in order.
 */
const replay = Effect.fnUntraced(function* (transcript: typeof Transcript.Type) {
  const messages = transcript.messages.map(toMessage);
  const breaks: Break[] = [];
  let previous: Rendered | undefined;
  const boundaries = callBoundaries(messages);
  let cursor = 0;
  for (const [call, request] of transcript.requests.entries()) {
    const system = transcript.systems[request.system];
    let prompt: Prompt.Prompt | undefined;
    for (; cursor < boundaries.length; cursor++) {
      const candidate = yield* AiPreprocessor.preprocessPrompt(messages.slice(0, boundaries[cursor]), {
        system,
        cacheControl: 'ephemeral',
      });
      if (candidate.content.filter((message) => message.role !== 'system').length === request.messages) {
        prompt = candidate;
        break;
      }
    }
    invariant(prompt, `call ${call}: no prefix of the transcript yields ${request.messages} prompt messages`);
    const next: Rendered = {
      tools: JSON.stringify(transcript.toolsets[request.tools]),
      system,
      messages: prompt.content.filter((message) => message.role !== 'system').map(renderMessage),
    };
    const found = previous && findBreak(call, previous, next);
    if (found) {
      breaks.push(found);
    }
    previous = next;
  }
  return breaks;
});

const transcripts = readdirSync(TRANSCRIPTS).filter((file) => file.endsWith('.json'));

describe('prompt cache', () => {
  it('has transcripts to replay', () => {
    expect(transcripts.length).toBeGreaterThan(0);
  });

  // The replay must see a break where one is, or a green run proves nothing.
  it.effect(
    'reports a system prompt or tool set that changes mid-session',
    Effect.fn(function* ({ expect }) {
      const transcript = Schema.decodeUnknownSync(Transcript)(
        JSON.parse(readFileSync(path.join(TRANSCRIPTS, transcripts[0]), 'utf8')),
      );
      const call = Math.floor(transcript.requests.length / 2);
      const withRequest = (patch: Partial<(typeof transcript.requests)[number]>) => ({
        ...transcript,
        systems: [...transcript.systems, `${transcript.systems[0]}\nCurrent time: 12:00.`],
        toolsets: [...transcript.toolsets, [...transcript.toolsets[0]].reverse()],
        requests: transcript.requests.map((request, index) => (index === call ? { ...request, ...patch } : request)),
      });

      const system = yield* replay(withRequest({ system: transcript.systems.length }));
      expect(system[0]).toMatchObject({ call, at: 'system' });

      const tools = yield* replay(withRequest({ tools: transcript.toolsets.length }));
      expect(tools[0]).toMatchObject({ call, at: 'tools' });
    }),
  );

  for (const file of transcripts) {
    it.effect(
      `${file}: every model call extends the one before it`,
      Effect.fn(function* ({ expect }) {
        const transcript = Schema.decodeUnknownSync(Transcript)(
          JSON.parse(readFileSync(path.join(TRANSCRIPTS, file), 'utf8')),
        );
        const breaks = yield* replay(transcript);
        expect(breaks).toEqual([]);
      }),
    );
  }
});
