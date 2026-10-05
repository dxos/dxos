//
// Copyright 2026 DXOS.org
//

import * as AiError from 'effect/ai/AiError';
import * as LanguageModel from 'effect/ai/LanguageModel';
import type * as Response from 'effect/ai/Response';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as Agent from './Agent.ts';
import * as Log from './Log.ts';
import * as Sandbox from './Sandbox.ts';

/** A reply's parts as a provider streams them: each text block as start, word-sized deltas, end. */
const toStream = (reply: readonly Response.PartEncoded[]): Response.StreamPartEncoded[] =>
  reply.flatMap((part, index): Response.StreamPartEncoded[] => {
    const id = `part-${index}`;
    switch (part.type) {
      case 'text':
        return [
          { type: 'text-start', id },
          ...(part.text.match(/\S+\s*/g) ?? []).map((delta) => ({ type: 'text-delta' as const, id, delta })),
          { type: 'text-end', id },
        ];
      case 'reasoning':
        return [
          { type: 'reasoning-start', id },
          { type: 'reasoning-delta', id, delta: part.text },
          { type: 'reasoning-end', id },
        ];
      case 'tool-call':
        return [part];
      default:
        return [];
    }
  });

/** A model that answers each step with the next scripted reply, streamed, or with a failure. */
const scripted = (
  replies: readonly (Response.PartEncoded[] | AiError.AiError)[],
): { layer: Layer.Layer<LanguageModel.LanguageModel>; prompts: string[] } => {
  const prompts: string[] = [];
  let step = 0;
  const next = (options: { readonly prompt: { readonly content: unknown } }) => {
    prompts.push(JSON.stringify(options.prompt.content));
    return replies[Math.min(step++, replies.length - 1)];
  };
  const layer = Layer.effect(
    LanguageModel.LanguageModel,
    LanguageModel.make({
      generateText: (options) =>
        Effect.suspend(() => {
          const reply = next(options);
          return reply instanceof AiError.AiError ? Effect.fail(reply) : Effect.succeed(reply);
        }),
      streamText: (options) =>
        Stream.suspend(() => {
          const reply = next(options);
          return reply instanceof AiError.AiError ? Stream.fail(reply) : Stream.fromIterable(toStream(reply));
        }),
    }),
  );
  return { layer, prompts };
};

const unparseable = new AiError.AiError({
  module: 'test',
  method: 'generateText',
  reason: new AiError.InvalidOutputError({ description: "error parsing tool call: raw='{ code: `return 1` }'" }),
});

/** gpt-oss's other habit: a call to a tool it was never given. */
const unknownTool: Response.PartEncoded[] = [
  { type: 'reasoning', text: 'Let me look.' },
  { type: 'tool-call', id: 'call_1', name: 'python', params: { code: 'print(1)' }, providerExecuted: false },
];

const done: Response.PartEncoded[] = [{ type: 'text', text: 'Done.' }];

const exec = (id: string, code: string): Response.PartEncoded => ({
  type: 'tool-call',
  id,
  name: 'exec',
  params: { code },
  providerExecuted: false,
});

const sandbox = Layer.succeed(Sandbox.Sandbox, {
  run: () => Effect.succeed({ ok: true, output: '', presented: [] }),
});

describe('Agent', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'code-index-agent-'));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const run = (projectId: string, model: Layer.Layer<LanguageModel.LanguageModel>) =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const agent = yield* Agent.Agent;
        const log = yield* Log.Log;
        yield* log.createProject({ id: projectId });
        const outcome = yield* agent.turn({ projectId, text: 'show me app-framework' }).pipe(Effect.result);
        const events = (yield* log.read(projectId)).map((entry) => entry.event);
        return { outcome, events };
      }).pipe(
        Effect.provide(Agent.layer.pipe(Layer.provideMerge(Layer.mergeAll(sandbox, model, Log.layer(dir))))),
        Effect.scoped,
      ),
    );

  test('a malformed tool call is reported to the model and the turn carries on', async () => {
    const model = scripted([unparseable, unknownTool, done]);
    const { outcome, events } = await run('recovers', model.layer);

    expect(outcome._tag).toBe('Success');
    const tags = events.map((event) => event._tag);
    // The answer's deltas were compacted into it once it settled.
    expect(tags).toEqual(['UserMessage', 'StepRetried', 'StepRetried', 'AssistantMessage', 'TurnEnded']);
    // The retry is a correction: the model is told what was wrong with its last reply.
    expect(model.prompts[1]).toContain('error parsing tool call');
    expect(model.prompts[2]).toContain('not a valid `exec` call');
  });

  test('the turn fails, with the reason, once the model keeps getting it wrong', async () => {
    const model = scripted([unparseable]);
    const { outcome, events } = await run('gives-up', model.layer);

    expect(outcome._tag).toBe('Failure');
    expect(events.filter((event) => event._tag === 'StepRetried')).toHaveLength(Agent.MAX_MALFORMED);
    const failed = events.at(-1);
    expect(failed?._tag).toBe('TurnFailed');
    expect(failed?._tag === 'TurnFailed' && failed.message).toContain('error parsing tool call');
  });

  test('any other model failure still fails the turn at once', async () => {
    const model = scripted([
      new AiError.AiError({
        module: 'test',
        method: 'generateText',
        reason: new AiError.UnknownError({ description: 'HTTP 500: model not found' }),
      }),
    ]);
    const { outcome, events } = await run('fails', model.layer);

    expect(outcome._tag).toBe('Failure');
    expect(events.map((event) => event._tag)).toEqual(['UserMessage', 'TurnFailed']);
  });

  test('a turn streams its prose as deltas, settled in place around the runs it makes', async () => {
    const model = scripted([
      [{ type: 'text', text: 'Let me look it up.' }, exec('call_1', 'return 42;')],
      [{ type: 'text', text: 'The answer is 42.' }],
    ]);

    // Tails the log while the turn runs, as a browser does, to see the deltas before compaction.
    const seen = await EffectEx.runPromise(
      Effect.gen(function* () {
        const agent = yield* Agent.Agent;
        const log = yield* Log.Log;
        yield* log.createProject({ id: 'streams' });
        const tail = yield* log.stream('streams').pipe(
          Stream.takeUntil((entry) => entry.event._tag === 'TurnEnded'),
          Stream.runCollect,
          Effect.forkScoped,
        );
        yield* agent.turn({ projectId: 'streams', text: 'what is the answer?' });
        const live = (yield* Fiber.join(tail)).map((entry) => entry.event);
        const stored = (yield* log.read('streams')).map((entry) => entry.event);
        return { live, stored };
      }).pipe(
        Effect.provide(Agent.layer.pipe(Layer.provideMerge(Layer.mergeAll(sandbox, model.layer, Log.layer(dir))))),
        Effect.scoped,
      ),
    );

    const deltas = seen.live.flatMap((event) => (event._tag === 'AssistantDelta' ? [event.delta] : []));
    expect(deltas).toEqual(['Let ', 'me ', 'look ', 'it ', 'up.', 'The ', 'answer ', 'is ', '42.']);
    expect(seen.stored.map((event) => event._tag)).toEqual([
      'UserMessage',
      'AssistantMessage',
      'ToolCall',
      'ToolResult',
      'AssistantMessage',
      'TurnEnded',
    ]);
    // The second step's prompt carries the first step's call and its result back to the model.
    expect(model.prompts[1]).toContain('return 42;');
    expect(model.prompts[1]).toContain('tool-result');
  });
});
