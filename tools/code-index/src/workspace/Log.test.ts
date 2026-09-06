//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Stream from 'effect/Stream';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as Events from './Events.ts';
import * as Fold from './Fold.ts';
import * as Log from './Log.ts';

describe('Log', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'code-index-log-'));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const withLog = <A, E>(body: (api: Log.Api) => Effect.Effect<A, E, never>): Promise<A> =>
    EffectEx.runPromise(Effect.flatMap(Log.Log, body).pipe(Effect.provide(Log.layer(dir)), Effect.scoped));

  test('a project is its events, in order', async () => {
    const entries = await withLog((api) =>
      Effect.gen(function* () {
        const project = yield* api.createProject({ id: 'ordered' });
        yield* api.append(project.id, new Events.UserMessage({ text: 'hello' }));
        yield* api.append(project.id, new Events.AssistantMessage({ text: 'hi' }));
        return yield* api.read(project.id);
      }),
    );

    expect(entries.map((entry) => [entry.seq, entry.event._tag])).toEqual([
      [1, 'UserMessage'],
      [2, 'AssistantMessage'],
    ]);
  });

  test('sequence numbers are dense under concurrent appends', async () => {
    // The gap this closes is a real one: two fibers reading the same `MAX(seq)` collide on the
    // primary key, so the append path is serialized and this is what proves it.
    const entries = await withLog((api) =>
      Effect.gen(function* () {
        const project = yield* api.createProject({ id: 'concurrent' });
        yield* Effect.forEach(
          Array.from({ length: 25 }, (_, index) => index),
          (index) => api.append(project.id, new Events.UserMessage({ text: `message ${index}` })),
          { concurrency: 'unbounded' },
        );
        return yield* api.read(project.id);
      }),
    );

    expect(entries.map((entry) => entry.seq)).toEqual(Array.from({ length: 25 }, (_, index) => index + 1));
  });

  test('a subscription replays history and then tails', async () => {
    const seen = await withLog((api) =>
      Effect.gen(function* () {
        const project = yield* api.createProject({ id: 'tailing' });
        yield* api.append(project.id, new Events.UserMessage({ text: 'before' }));

        // The stream is opened, then written to: an event appended while the history is being read
        // must arrive exactly once, which is the whole point of subscribing before replaying.
        const collector = yield* Effect.forkChild(Stream.runCollect(Stream.take(api.stream(project.id), 2)));
        yield* api.append(project.id, new Events.AssistantMessage({ text: 'after' }));
        return yield* Fiber.join(collector);
      }),
    );

    expect([...seen].map((entry) => entry.seq)).toEqual([1, 2]);
  });

  test('the fold recovers chat and canvas from the log alone', async () => {
    const state = await withLog((api) =>
      Effect.gen(function* () {
        const project = yield* api.createProject({ id: 'folded' });
        yield* api.append(project.id, new Events.UserMessage({ text: 'draw something' }));
        yield* api.append(project.id, new Events.ToolCall({ callId: 'pending', code: 'await display.text("x")' }));
        yield* api.append(project.id, new Events.Presented({ kind: 'mermaid', content: 'graph TD\n  a --> b' }));
        yield* api.append(project.id, new Events.ToolResult({ callId: '2', ok: true, output: 'done' }));
        yield* api.append(project.id, new Events.AssistantMessage({ text: 'there it is' }));
        return Fold.fold(yield* api.read(project.id));
      }),
    );

    expect(state.turns).toEqual([
      { role: 'user', text: 'draw something' },
      { role: 'assistant', text: 'there it is' },
    ]);
    expect(state.canvas).toEqual([{ seq: 3, kind: 'mermaid', title: undefined, content: 'graph TD\n  a --> b' }]);
    expect(state.calls).toEqual([
      { callId: 'pending', code: 'await display.text("x")', output: undefined, ok: undefined },
    ]);
  });

  test('clearing the canvas is an event, and the fold obeys it', async () => {
    const state = await withLog((api) =>
      Effect.gen(function* () {
        const project = yield* api.createProject({ id: 'cleared' });
        yield* api.append(project.id, new Events.Presented({ kind: 'text', content: 'stale' }));
        yield* api.append(project.id, new Events.CanvasCleared({}));
        yield* api.append(project.id, new Events.Presented({ kind: 'text', content: 'fresh' }));
        return Fold.fold(yield* api.read(project.id));
      }),
    );

    expect(state.canvas.map((panel) => panel.content)).toEqual(['fresh']);
  });

  test('the log survives reopening', async () => {
    await withLog((api) =>
      Effect.gen(function* () {
        const project = yield* api.createProject({ id: 'durable' });
        yield* api.append(project.id, new Events.TitleSet({ title: 'Layer census' }));
      }),
    );

    const state = await withLog((api) => Effect.map(api.read('durable'), (entries) => Fold.fold(entries)));
    expect(state.title).toEqual('Layer census');
  });

  test('storage is per-project and outlives a reopen', async () => {
    await withLog((api) =>
      Effect.gen(function* () {
        yield* api.createProject({ id: 'kv-a' });
        yield* api.createProject({ id: 'kv-b' });
        yield* api.setValue('kv-a', 'focus', JSON.stringify({ package: '@dxos/echo' }));
      }),
    );

    const [mine, theirs, keys] = await withLog((api) =>
      Effect.all([api.getValue('kv-a', 'focus'), api.getValue('kv-b', 'focus'), api.listKeys('kv-a')]),
    );

    expect(mine && JSON.parse(mine)).toEqual({ package: '@dxos/echo' });
    expect(theirs).toBeUndefined();
    expect(keys).toEqual(['focus']);
  });

  test('the last project is the one most recently written to', async () => {
    const last = await withLog((api) =>
      Effect.gen(function* () {
        yield* api.createProject({ id: 'older' });
        yield* api.createProject({ id: 'newer' });
        // `newer` was created last but `older` is the one with activity, and "last opened" is about
        // what the user did rather than when the project appeared.
        yield* api.append('older', new Events.UserMessage({ text: 'still working here' }));
        return yield* api.lastProject();
      }),
    );

    expect(last?.id).toEqual('older');
  });
});
