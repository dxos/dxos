//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as KeyValueStore from 'effect/persistence/KeyValueStore';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { expect } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Process from '@dxos/compute/Process';
import * as ScriptRunner from '@dxos/compute/ScriptRunner';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trace from '@dxos/compute/Trace';
import { DXN } from '@dxos/echo';
import { SpaceId } from '@dxos/keys';

import * as OperationProcess from './OperationProcess.ts';
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

/** Every request the backend was handed, so a test can see what crossed into it. */
const requests: ScriptRunner.Request[] = [];

/**
 * Stands in for a real backend: it echoes the snippet rather than evaluating it, which is what makes
 * these assertions about how a script operation is RUN rather than about any one sandbox.
 */
const echoRunner: ScriptRunner.Runner = {
  run: (request) =>
    Effect.sync(() => {
      requests.push(request);
      return Operation.isInlineScript(request.source)
        ? { output: `${request.source.dialect}:${request.source.code}` }
        : { output: 'object' };
    }),
};

const failingRunner: ScriptRunner.Runner = {
  run: () => Effect.fail(new ScriptRunner.RunnerError({ message: 'no backend here' })),
};

const testLayer = (runner: ScriptRunner.Runner) =>
  ProcessOperationInvoker.layer.pipe(
    Layer.provideMerge(UnifiedProcessManager.layer),
    Layer.provideMerge(ProcessManager.layer({ idGenerator: ProcessManager.SequentialIdGenerator })),
    Layer.provideMerge(RemoteProcessManager.layerNoop),
    Layer.provideMerge(RemoteTraceMonitor.layerNoop),
    Layer.provide(ServiceResolver.layerRequirements(ScriptRunner.Service)),
    Layer.provide(ScriptRunner.layer(runner)),
    Layer.provide(KeyValueStore.layerMemory),
    Layer.provideMerge(OperationHandlerSet.provide(OperationHandlerSet.make())),
    Layer.provideMerge(Registry.layer),
    Layer.provide(Trace.layerNoop),
  );

describe('script operations as processes', () => {
  it.effect(
    'the invoker runs a script operation through the process manager',
    Effect.fnUntraced(
      function* () {
        requests.length = 0;
        const invoker = yield* ProcessOperationInvoker.Service;
        const result = yield* invoker.invokeScript(Greet, { name: 'world' });
        expect(result.output).toBe("effect:print('hello')");
        // The operation's own source and input reach the backend, so the same request would run in
        // another runtime unchanged.
        expect(requests).toHaveLength(1);
        expect(requests[0]?.source).toEqual(Greet.source);
        expect(requests[0]?.input).toEqual({ name: 'world' });
      },
      (effect) => Effect.provide(effect, testLayer(echoRunner)),
    ),
  );

  it.effect(
    "the run is a process under the operation's own key, not a script process of its own",
    Effect.fnUntraced(
      function* () {
        expect(OperationProcess.makeScript(Greet).key).toBe(DXN.getName(KEY));
        const invoker = yield* ProcessOperationInvoker.Service;
        yield* invoker.invokeScript(Greet);
        const manager = yield* Process.ManagerService;
        const tree = yield* manager.processTree;
        expect(tree.some((process) => process.key === DXN.getName(KEY))).toBe(true);
      },
      (effect) => Effect.provide(effect, testLayer(echoRunner)),
    ),
  );

  it.effect(
    'a spawned script operation answers with its result like any other process',
    Effect.fnUntraced(
      function* () {
        const handle = yield* Process.spawn(OperationProcess.makeScript(Greet), undefined);
        const result: ScriptRunner.Result = yield* Process.awaitOutput(handle);
        expect(result.output).toBe("effect:print('hello')");
      },
      (effect) => Effect.provide(effect, testLayer(echoRunner)),
    ),
  );

  it.effect(
    'a deployment with no backend for the script terminates the process rather than answering',
    Effect.fnUntraced(
      function* () {
        const invoker = yield* ProcessOperationInvoker.Service;
        const exit = yield* invoker.invokeScript(Greet).pipe(Effect.exit);
        expect(exit._tag).toBe('Failure');
      },
      (effect) => Effect.provide(effect, testLayer(failingRunner)),
    ),
  );

  it.effect(
    'a remote location needs a remote manager that offers process control',
    Effect.fnUntraced(
      function* () {
        // `layerNoop` has no control, so the edge route dies rather than silently running locally —
        // the one behaviour a caller naming a location must be able to rely on.
        const invoker = yield* ProcessOperationInvoker.Service;
        const exit = yield* invoker
          .invokeScript(Greet, undefined, { on: 'edge', spaceId: SpaceId.random() })
          .pipe(Effect.exit);
        expect(exit._tag).toBe('Failure');
      },
      (effect) => Effect.provide(effect, testLayer(echoRunner)),
    ),
  );
});
