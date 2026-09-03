//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import * as Process from '@dxos/compute/Process';
import { Annotation } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { SpaceId } from '@dxos/keys';
import type { ProcessProtocol } from '@dxos/protocols';

import * as ProcessManager from './ProcessManager';
import * as ProcessMonitor from './ProcessMonitor';
import * as RemoteProcessManager from './RemoteProcessManager';
import * as RemoteProcessManagerAdapter from './RemoteProcessManagerAdapter';
import * as RemoteTraceMonitor from './RemoteTraceMonitor';

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
        // `runAndExit` takes the cursor before submitting, so it carries this call's outputs only,
        // and ends on IDLE — the local contract. Collecting it therefore terminates on its own.
        return yield* Stream.runCollect(handle.runAndExit({ inputs: ['hello'] }));
      }),
      host,
    );
    expect(host.inputs).toEqual(['hello']);
    expect(outputs).toEqual(['echo:hello']);
  });

  test('a subscription started after earlier turns does not replay them', async ({ expect }) => {
    const host = makeFakeHost();
    const outputs = await run(
      Effect.gen(function* () {
        const manager = yield* ProcessManager.Service;
        const handle = yield* manager.spawn(EchoProcess);
        // An earlier turn, whose output must not reach the subscription below.
        yield* handle.submitInput('old');
        return yield* Stream.runCollect(handle.runAndExit({ inputs: ['new'] }));
      }),
      host,
    );
    expect(host.inputs).toEqual(['old', 'new']);
    expect(outputs).toEqual(['echo:new']);
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

  test('runUntilSettled polls until the host reports a settled state', async ({ expect }) => {
    // RUNNING is neither idle nor terminal, so the handle has to poll; the host settles on the third
    // read.
    const host = makeFakeHost({ initialState: 'RUNNING', settleAfterStatusCalls: 3 });
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
    expect(host.statusCalls()).toEqual(3);
  });

  test('runAndExit fails when the host reports the process failed', async ({ expect }) => {
    const host = makeFakeHost({ stateAfterInput: 'FAILED' });
    const exit = await runExit(
      Effect.gen(function* () {
        const manager = yield* ProcessManager.Service;
        const handle = yield* manager.spawn(EchoProcess);
        return yield* Stream.runCollect(handle.runAndExit({ inputs: ['hello'] }));
      }),
      host,
    );
    // A failed process must not read as a successful stream completion, per the local contract.
    expect(Exit.isFailure(exit)).toBe(true);
  });

  test('runAndExit fails when the host reports the process terminated', async ({ expect }) => {
    const host = makeFakeHost({ stateAfterInput: 'TERMINATED' });
    const exit = await runExit(
      Effect.gen(function* () {
        const manager = yield* ProcessManager.Service;
        const handle = yield* manager.spawn(EchoProcess);
        return yield* Stream.runCollect(handle.runAndExit({ inputs: ['hello'] }));
      }),
      host,
    );
    expect(Exit.isFailure(exit)).toBe(true);
  });

  test('startup hydrates the monitor from processes the client did not spawn', async ({ expect }) => {
    // The host outlives the client, so a reattaching manager has to read the tree rather than wait
    // for its own next spawn.
    const host = makeFakeHost({ existing: true });
    const tree = await runWithMonitor(
      Effect.gen(function* () {
        const manager = yield* ProcessManager.Service;
        yield* manager.startup();
        const remote = yield* RemoteProcessManager.Service;
        return yield* remote.processTree;
      }),
      host,
    );
    expect(tree.map((info) => info.key)).toEqual([TEST_KEY]);
  });

  test('terminate drops the process from the monitor tree', async ({ expect }) => {
    const host = makeFakeHost();
    const tree = await runWithMonitor(
      Effect.gen(function* () {
        const manager = yield* ProcessManager.Service;
        const handle = yield* manager.spawn(EchoProcess);
        yield* handle.terminate();
        const remote = yield* RemoteProcessManager.Service;
        return yield* remote.processTree;
      }),
      host,
    );
    expect(tree).toEqual([]);
  });

  test('spawn rejects an annotation that JSON would change', async ({ expect }) => {
    for (const value of [new Date(0), new Map([['a', 1]]), Number.NaN, { nested: undefined }, () => 0]) {
      const exit = await runExit(
        Effect.gen(function* () {
          const manager = yield* ProcessManager.Service;
          return yield* manager.spawn(EchoProcess, { annotations: annotations(value) });
        }),
        makeFakeHost(),
      );
      // Each of these survives `JSON.stringify(JSON.parse(...))` unchanged while being something
      // other than what the caller passed, so a round-trip comparison would let it through.
      expect(Exit.isFailure(exit)).toBe(true);
    }
  });

  test('a spawn publishes into the remote manager tree the monitor reads', async ({ expect }) => {
    const host = makeFakeHost();
    // The adapter writes the atom belonging to `RemoteProcessManager.Service`, which is the remote
    // half of the aggregate `ProcessMonitor` — a private atom would leave a hosted process invisible
    // there. The merge itself is covered by the edge e2e, which has a real local manager too.
    const tree = await runWithMonitor(
      Effect.gen(function* () {
        const manager = yield* ProcessManager.Service;
        yield* manager.spawn(EchoProcess, { name: 'test' });
        const remote = yield* RemoteProcessManager.Service;
        const registry = yield* Registry.AtomRegistry;
        return registry.get(remote.processTreeAtom);
      }),
      host,
    );
    expect(tree.map((info) => info.key)).toEqual([TEST_KEY]);
  });

  test('spawn accepts an annotation that is already a JSON value', async ({ expect }) => {
    const exit = await runExit(
      Effect.gen(function* () {
        const manager = yield* ProcessManager.Service;
        return yield* manager.spawn(EchoProcess, {
          annotations: annotations({ list: [1, 'two', null], nested: { flag: true } }),
        });
      }),
      makeFakeHost(),
    );
    expect(Exit.isSuccess(exit)).toBe(true);
  });
});

/**
 * Binds the adapter under `ProcessManager.Service` so the tests can drive it through the
 * `ProcessManager.Manager` verbs it implements. A test injection only: in a real stack the adapter
 * belongs to `RemoteProcessManager.Service` (see the class doc), and the tag means local execution.
 */
const adapterLayer = (
  control: RemoteProcessManager.Control,
  processTreeAtom?: Atom.Writable<readonly Process.Info[]>,
) =>
  Layer.effect(
    ProcessManager.Service,
    Effect.gen(function* () {
      const registry = yield* Registry.AtomRegistry;
      return new RemoteProcessManagerAdapter.RemoteProcessManagerAdapter(
        control,
        TEST_SPACE,
        registry,
        processTreeAtom,
      );
    }),
  );

/**
 * The stack a real client assembles around the adapter: it publishes into the *remote* manager's
 * process-tree atom, which is the half of the aggregate monitor where hosted processes belong.
 */
const monitorStack = (control: RemoteProcessManager.Control) => {
  const registryInstance = Registry.make();
  const registry = Layer.succeed(Registry.AtomRegistry, registryInstance);
  const remoteAtom = Atom.make<readonly Process.Info[]>([]);
  registryInstance.mount(remoteAtom);
  // The EDGE manager as a client sees it: a tree atom plus the control surface the adapter drives.
  const remote = Layer.succeed(RemoteProcessManager.Service, {
    processTree: Effect.sync(() => registryInstance.get(remoteAtom)),
    processTreeAtom: remoteAtom,
    control,
  });
  const manager = adapterLayer(control, remoteAtom).pipe(Layer.provide(registry));
  return Layer.mergeAll(
    manager,
    remote,
    registry,
    ProcessMonitor.layer.pipe(
      Layer.provide(manager),
      Layer.provide(remote),
      Layer.provide(RemoteTraceMonitor.layerNoop),
      Layer.provide(registry),
    ),
  );
};

/** One annotation under a valid key, decoded rather than asserted since keys are branded. */
const annotations = (value: unknown): Annotation.Dictionary =>
  Schema.decodeUnknownSync(Annotation.Dictionary)({ 'example.com/test': value });

const TEST_KEY = 'dxos.org/process/echo-test';
// A real id: the adapter passes the space through untouched, but `Process.Info` decodes it as a
// branded `SpaceId`.
const TEST_SPACE = SpaceId.random();

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
const makeFakeHost = (
  options: {
    readonly initialState?: ProcessProtocol.ProcessState;
    readonly settleAfterStatusCalls?: number;
    /** State the host moves to once an input has been submitted. */
    readonly stateAfterInput?: ProcessProtocol.ProcessState;
    /** Host already has a process running, as it would after a client restart. */
    readonly existing?: boolean;
  } = {},
): RemoteProcessManager.Control & { readonly inputs: unknown[]; statusCalls: () => number } => {
  const inputs: unknown[] = [];
  const events: ProcessProtocol.ProcessEvent[] = [];
  let state: ProcessProtocol.ProcessState = options.initialState ?? 'IDLE';
  let statusCalls = 0;
  let seq = 0;
  let spawnedHere = false;
  let terminated = false;

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
    statusCalls: () => statusCalls,
    spawn: () =>
      Effect.sync(() => {
        spawnedHere = true;
        return info();
      }),
    list: () => Effect.sync(() => (terminated || !(spawnedHere || options.existing) ? [] : [info()])),
    status: () =>
      Effect.sync(() => {
        // Settles on the Nth read, so a predicate that returns too early — or a poll loop that never
        // runs — shows up as a wrong call count rather than passing anyway.
        if (options.settleAfterStatusCalls !== undefined && ++statusCalls >= options.settleAfterStatusCalls) {
          state = 'IDLE';
        }
        return info();
      }),
    submitInput: (_space, _pid, input) =>
      Effect.sync(() => {
        inputs.push(input);
        events.push({ _tag: 'output', seq: seq++, data: `echo:${String(input)}` });
        if (options.stateAfterInput !== undefined) {
          state = options.stateAfterInput;
        }
      }),
    terminate: () =>
      Effect.sync(() => {
        state = 'TERMINATED';
        terminated = true;
      }),
    readEvents: (_space, _pid, cursor) =>
      Effect.sync(() => ({ events: events.slice(cursor), cursor: events.length, truncated: false, info: info() })),
    makeRpcClient: () => Effect.die('not used'),
  };
};

const run = <A>(effect: Effect.Effect<A, never, ProcessManager.Service>, control: RemoteProcessManager.Control) =>
  EffectEx.runPromise(provide(effect, control));

/** Runs against the aggregate monitor as well as the manager, over one shared adapter. */
const runWithMonitor = <A>(
  effect: Effect.Effect<
    A,
    never,
    ProcessManager.Service | RemoteProcessManager.Service | Process.ProcessMonitorService | Registry.AtomRegistry
  >,
  control: RemoteProcessManager.Control,
) => EffectEx.runPromise(effect.pipe(Effect.provide(monitorStack(control))));

/** Runs to an `Exit`, so a defect the adapter raises can be asserted instead of failing the test. */
const runExit = <A>(effect: Effect.Effect<A, never, ProcessManager.Service>, control: RemoteProcessManager.Control) =>
  Effect.runPromiseExit(provide(effect, control));

const provide = <A>(effect: Effect.Effect<A, never, ProcessManager.Service>, control: RemoteProcessManager.Control) =>
  effect.pipe(
    Effect.provide(adapterLayer(control)),
    Effect.provide(Layer.succeed(Registry.AtomRegistry, Registry.make())),
  );
