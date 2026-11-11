//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as KeyValueStore from 'effect/persistence/KeyValueStore';
import * as Registry from 'effect/reactivity/AtomRegistry';
import * as Schema from 'effect/Schema';
import { expect } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Process from '@dxos/compute/Process';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trace from '@dxos/compute/Trace';
import { DXN } from '@dxos/echo';
import { SpaceId } from '@dxos/keys';

import * as ProcessManager from './ProcessManager.ts';
import * as ProcessOperationInvoker from './ProcessOperationInvoker.ts';
import * as RemoteProcessManager from './RemoteProcessManager.ts';
import * as RemoteTraceMonitor from './RemoteTraceMonitor.ts';
import * as ScriptRunner from './ScriptRunner.ts';
import * as UnifiedProcessManager from './UnifiedProcessManager.ts';

const KEY = DXN.make('com.example.operation.script');

const Greet = Operation.makeScript({
  meta: { key: KEY, name: 'Greet' },
  source: Operation.inlineScript("print('hello')", { dialect: Operation.ScriptDialects.Effect }),
});

const NESTED_KEY = DXN.make('com.example.operation.fromScript');

/**
 * Runs inside a script's process and answers with the keys of the live process tree as it sees them.
 * Read from inside, because a finished process leaves the tree: whether the script's own process is
 * there is only observable while the nested call is still running.
 */
const FromScript = Operation.make({
  meta: { key: NESTED_KEY, name: 'FromScript' },
  input: Schema.Void,
  output: Schema.String,
  services: [Process.ManagerService],
}).pipe(
  Operation.withHandler(() =>
    Effect.gen(function* () {
      const manager = yield* Process.ManagerService;
      const tree = yield* manager.processTree;
      return tree.map((process) => process.key).join(',');
    }),
  ),
);

/**
 * A backend that echoes the snippet rather than evaluating it, which keeps these assertions about how a
 * runtime runs a script operation rather than about any one sandbox. Made per test, with the requests
 * it was handed, so no test reads another's.
 */
const makeEchoRunner = () => {
  const requests: Operation.ScriptRequest[] = [];
  const runner: Operation.ScriptRunner = {
    run: (request) =>
      Effect.sync(() => {
        requests.push(request);
        return Operation.isInlineScript(request.source)
          ? { output: `${request.source.dialect}:${request.source.code}` }
          : { output: 'object' };
      }),
  };
  return { runner, requests };
};

/**
 * A backend whose script delegates work of its own, which is what the handed-over process is for: the
 * nested call runs with the script's own invoker, so it is a child of the script's process.
 */
const delegatingRunner: Operation.ScriptRunner = {
  run: (_request, runtime) =>
    runtime === undefined
      ? Effect.die('a script runtime was not handed over')
      : Effect.gen(function* () {
          const output = yield* Operation.invoke(FromScript);
          return { output };
        }).pipe(Effect.provide(runtime.context), Effect.orDie),
};

const failingRunner: Operation.ScriptRunner = {
  run: () => Effect.fail(new Operation.ScriptError({ message: 'no backend here' })),
};

/** The runtime under test, parameterized by the backend each test runs scripts with. */
const testLayer = (runner: Operation.ScriptRunner) =>
  ProcessOperationInvoker.layer.pipe(
    Layer.provideMerge(UnifiedProcessManager.layer),
    Layer.provideMerge(ProcessManager.layer({ idGenerator: ProcessManager.SequentialIdGenerator })),
    Layer.provideMerge(RemoteProcessManager.layerNoop),
    Layer.provideMerge(RemoteTraceMonitor.layerNoop),
    Layer.provide(ServiceResolver.layerRequirements(ScriptRunner.Service)),
    // The backend is a layer the runtime depends on; no caller names it.
    Layer.provide(ScriptRunner.layer(runner)),
    Layer.provide(KeyValueStore.layerMemory),
    Layer.provideMerge(OperationHandlerSet.provide(OperationHandlerSet.make(FromScript))),
    Layer.provideMerge(Registry.layer),
    Layer.provide(Trace.layerNoop),
  );

describe('script operations', () => {
  it.effect('a client invokes one like any other operation', () => {
    const echo = makeEchoRunner();
    return Effect.gen(function* () {
      const result = yield* Operation.invoke(Greet, { name: 'world' }, { on: 'local' });
      expect(result.output).toBe("effect:print('hello')");
      // The operation's own source and input reach the backend, so the same request would run in
      // another runtime unchanged.
      expect(echo.requests).toHaveLength(1);
      expect(echo.requests[0]?.source).toEqual(Greet.source);
      expect(echo.requests[0]?.input).toEqual({ name: 'world' });
    }).pipe(Effect.provide(testLayer(echo.runner)));
  });

  it.effect("the run is a process in the manager's own tree, under the operation's key", () => {
    const echo = makeEchoRunner();
    return Effect.gen(function* () {
      yield* Operation.invoke(Greet, undefined, { on: 'local' });
      const manager = yield* Process.ManagerService;
      const tree = yield* manager.processTree;
      expect(tree.some((process) => process.key === DXN.getName(KEY))).toBe(true);
    }).pipe(Effect.provide(testLayer(echo.runner)));
  });

  it.effect('the manager spawns a script operation as it is — no wrapper, the ordinary spawn', () => {
    const echo = makeEchoRunner();
    return Effect.gen(function* () {
      const handle = yield* Process.spawn(Greet, { name: 'spawned' });
      const result: Operation.ScriptResult = yield* Process.awaitOutput(handle);
      expect(result.output).toBe("effect:print('hello')");
      expect(handle.key).toBe(DXN.getName(KEY));
      expect(echo.requests[0]?.input).toEqual({ name: 'spawned' });
    }).pipe(Effect.provide(testLayer(echo.runner)));
  });

  it.effect('a script can invoke operations from inside its process', () =>
    Effect.gen(function* () {
      const result = yield* Operation.invoke(Greet, undefined, { on: 'local' });
      // Seen from inside the nested call: the script's own process is still live, so the work was
      // delegated from within it — a script spawns work the way a handler does, with the script's
      // process as the parent and its guard in scope.
      expect(result.output.split(',')).toContain(DXN.getName(KEY));
      expect(result.output.split(',')).toContain(DXN.getName(NESTED_KEY));
    }).pipe(Effect.provide(testLayer(delegatingRunner))),
  );

  it.effect('a runtime with no backend for the script fails the call rather than answering', () =>
    Effect.gen(function* () {
      const exit = yield* Operation.invoke(Greet, undefined, { on: 'local' }).pipe(Effect.exit);
      expect(exit._tag).toBe('Failure');
    }).pipe(Effect.provide(testLayer(failingRunner))),
  );

  it.effect('an edge invocation needs an operation host, and says so when there is none', () => {
    const echo = makeEchoRunner();
    return Effect.gen(function* () {
      const exit = yield* Operation.invoke(Greet, undefined, { on: 'edge', spaceId: SpaceId.random() }).pipe(
        Effect.exit,
      );
      expect(exit._tag).toBe('Failure');
    }).pipe(Effect.provide(testLayer(echo.runner)));
  });
});
