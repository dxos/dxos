//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import * as Process from '@dxos/compute/Process';
import { EffectEx } from '@dxos/effect';
import type { ProcessProtocol } from '@dxos/protocols';

import * as ProcessManager from './ProcessManager';
import type * as RemoteProcessManager from './RemoteProcessManager';
import * as RemoteProcessManagerAdapter from './RemoteProcessManagerAdapter';

const TEST_KEY = 'dxos.org/process/echo-test';

/** Input/output codecs are the only part of the definition the remote path uses. */
const EchoProcess = Process.make(
  {
    key: TEST_KEY,
    input: Schema.String,
    output: Schema.String,
    services: [],
  },
  () => Effect.succeed({}),
);

/**
 * In-memory stand-in for a remote host: echoes each input back as an output and tracks state, so the
 * client half (adapter + handle + cursor reads) can be exercised without EDGE.
 */
const makeFakeHost = (): RemoteProcessManager.Control & { readonly inputs: unknown[] } => {
  const inputs: unknown[] = [];
  const events: ProcessProtocol.ProcessEvent[] = [];
  let state: ProcessProtocol.ProcessState = 'IDLE';
  let seq = 0;

  const info = (): ProcessProtocol.ProcessInfo => ({
    pid: 'pid-1',
    parentPid: null,
    key: TEST_KEY,
    params: { name: 'test', annotations: {} },
    environment: {},
    state,
    alarmDueAt: null,
    error: null,
    startedAt: 0,
    metrics: { wallTime: 0, inputCount: inputs.length, outputCount: events.length },
  });

  return {
    inputs,
    spawn: () => Effect.sync(info),
    list: () => Effect.sync(() => [info()]),
    status: () => Effect.sync(info),
    submitInput: (_pid, input) =>
      Effect.sync(() => {
        inputs.push(input);
        events.push({ _tag: 'output', seq: seq++, data: `echo:${String(input)}` });
      }),
    terminate: () =>
      Effect.sync(() => {
        state = 'TERMINATED';
      }),
    readEvents: (_pid, cursor) =>
      Effect.sync(() => ({ events: events.slice(cursor), cursor: events.length, truncated: false, info: info() })),
    makeRpcClient: () => Effect.die('not used'),
  };
};

const run = <A>(effect: Effect.Effect<A, never, ProcessManager.Service>, control: RemoteProcessManager.Control) =>
  EffectEx.runPromise(
    effect.pipe(
      Effect.provide(RemoteProcessManagerAdapter.layer(control)),
      Effect.provide(Layer.succeed(Registry.AtomRegistry, Registry.make())),
    ),
  );

describe('RemoteProcessManagerAdapter', () => {
  test('spawns by key and reports the host state', async ({ expect }) => {
    const host = makeFakeHost();
    const result = await run(
      Effect.gen(function* () {
        const manager = yield* ProcessManager.Service;
        const handle = yield* manager.spawn(EchoProcess, { name: 'test' });
        const listed = yield* manager.list({ key: TEST_KEY });
        return { pid: handle.pid, state: handle.status.state, listed: listed.length };
      }),
      host,
    );
    expect(result).toEqual({ pid: 'pid-1', state: Process.State.IDLE, listed: 1 });
  });

  test('encodes inputs with the definition schema and streams outputs back', async ({ expect }) => {
    const host = makeFakeHost();
    const outputs = await run(
      Effect.gen(function* () {
        const manager = yield* ProcessManager.Service;
        const handle = yield* manager.spawn(EchoProcess);
        yield* handle.submitInput('hello');
        // An IDLE process may still receive more inputs, so its output stream stays open (same as
        // the local handle's) — take the one output rather than waiting for the stream to end.
        return yield* Stream.runCollect(handle.subscribeOutputs().pipe(Stream.take(1)));
      }),
      host,
    );
    expect(host.inputs).toEqual(['hello']);
    expect(outputs).toEqual(['echo:hello']);
  });

  test('terminate is reflected in the handle status', async ({ expect }) => {
    const host = makeFakeHost();
    const state = await run(
      Effect.gen(function* () {
        const manager = yield* ProcessManager.Service;
        const handle = yield* manager.spawn(EchoProcess);
        yield* handle.terminate();
        return handle.status.state;
      }),
      host,
    );
    expect(state).toEqual(Process.State.TERMINATED);
  });

  test('runUntilSettled returns once the host reports a settled state', async ({ expect }) => {
    const host = makeFakeHost();
    await run(
      Effect.gen(function* () {
        const manager = yield* ProcessManager.Service;
        const handle = yield* manager.spawn(EchoProcess);
        yield* handle.submitInput('hello');
        yield* handle.runUntilSettled();
      }),
      host,
    );
    expect(host.inputs).toEqual(['hello']);
  });
});
