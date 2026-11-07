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
import * as ScriptRunner from '@dxos/compute/ScriptRunner';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trace from '@dxos/compute/Trace';
import { DXN } from '@dxos/echo';
import { SpaceId } from '@dxos/keys';

import * as ProcessManager from './ProcessManager.ts';
import * as ProcessOperationInvoker from './ProcessOperationInvoker.ts';
import * as RemoteProcessManager from './RemoteProcessManager.ts';
import * as RemoteTraceMonitor from './RemoteTraceMonitor.ts';
import * as UnifiedProcessManager from './UnifiedProcessManager.ts';

const KEY = DXN.make('com.example.operation.script');

const Greet = Operation.makeScript({
  meta: { key: KEY, name: 'Greet' },
  source: Operation.inlineScript("print('hello')", Operation.ScriptDialects.Effect),
});

const NESTED_KEY = DXN.make('com.example.operation.fromScript');

/** The live process tree as the nested operation saw it, captured while both processes are running. */
let treeFromInside: readonly Process.Process[] = [];

/** Runs inside a script's process, so a test can see what a script may do from there. */
const FromScript = Operation.make({
  meta: { key: NESTED_KEY, name: 'FromScript' },
  input: Schema.Void,
  output: Schema.String,
  services: [Process.ManagerService],
}).pipe(
  Operation.withHandler(() =>
    Effect.gen(function* () {
      // Read from inside: a finished process leaves the tree, so the parenting is only observable
      // while the nested call is still running.
      const manager = yield* Process.ManagerService;
      treeFromInside = yield* manager.processTree;
      return 'ran';
    }),
  ),
);

/** Every request the backend was handed. */
const runs: Operation.ScriptRequest[] = [];

/**
 * Stands in for a real backend: it echoes the snippet rather than evaluating it, which keeps these
 * assertions about how a runtime runs a script operation rather than about any one sandbox.
 */
const echoRunner: Operation.ScriptRunner = {
  run: (request) =>
    Effect.sync(() => {
      runs.push(request);
      return Operation.isInlineScript(request.source)
        ? { output: `${request.source.dialect}:${request.source.code}` }
        : { output: 'object' };
    }),
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
          return { output: `delegated:${output}` };
        }).pipe(Effect.provide(runtime.context), Effect.orDie),
};

const failingRunner: Operation.ScriptRunner = {
  run: () => Effect.fail(new Operation.ScriptError({ message: 'no backend here' })),
};

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
  it.effect(
    'a client invokes one like any other operation',
    Effect.fnUntraced(
      function* () {
        runs.length = 0;
        const result = yield* Operation.invoke(Greet, { name: 'world' }, { on: 'local' });
        expect(result.output).toBe("effect:print('hello')");
        // The operation's own source and input reach the backend, so the same request would run in
        // another runtime unchanged.
        expect(runs).toHaveLength(1);
        expect(runs[0]?.source).toEqual(Greet.source);
        expect(runs[0]?.input).toEqual({ name: 'world' });
      },
      (effect) => Effect.provide(effect, testLayer(echoRunner)),
    ),
  );

  it.effect(
    "the run is a process in the manager's own tree, under the operation's key",
    Effect.fnUntraced(
      function* () {
        runs.length = 0;
        yield* Operation.invoke(Greet, undefined, { on: 'local' });
        const manager = yield* Process.ManagerService;
        const tree = yield* manager.processTree;
        expect(tree.some((process) => process.key === DXN.getName(KEY))).toBe(true);
      },
      (effect) => Effect.provide(effect, testLayer(echoRunner)),
    ),
  );

  it.effect(
    'a script can invoke operations from inside its process',
    Effect.fnUntraced(
      function* () {
        treeFromInside = [];
        const result = yield* Operation.invoke(Greet, undefined, { on: 'local' });
        expect(result.output).toBe('delegated:ran');
        // Seen from inside the nested call: the script's own process is still live, so the work was
        // delegated from within it — a script spawns work the way a handler does, with the script's
        // process as the parent and its guard in scope.
        expect(treeFromInside.some((process) => process.key === DXN.getName(KEY))).toBe(true);
      },
      (effect) => Effect.provide(effect, testLayer(delegatingRunner)),
    ),
  );

  it.effect(
    'a runtime with no backend for the script fails the call rather than answering',
    Effect.fnUntraced(
      function* () {
        const exit = yield* Operation.invoke(Greet, undefined, { on: 'local' }).pipe(Effect.exit);
        expect(exit._tag).toBe('Failure');
      },
      (effect) => Effect.provide(effect, testLayer(failingRunner)),
    ),
  );

  it.effect(
    'an edge invocation needs an operation host, and says so when there is none',
    Effect.fnUntraced(
      function* () {
        const exit = yield* Operation.invoke(Greet, undefined, { on: 'edge', spaceId: SpaceId.random() }).pipe(
          Effect.exit,
        );
        expect(exit._tag).toBe('Failure');
      },
      (effect) => Effect.provide(effect, testLayer(echoRunner)),
    ),
  );
});
