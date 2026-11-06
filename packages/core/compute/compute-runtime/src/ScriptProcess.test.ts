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
import { SpaceId } from '@dxos/keys';

import * as ProcessManager from './ProcessManager.ts';
import * as RemoteProcessManager from './RemoteProcessManager.ts';
import * as RemoteTraceMonitor from './RemoteTraceMonitor.ts';
import * as ScriptProcess from './ScriptProcess.ts';
import * as UnifiedProcessManager from './UnifiedProcessManager.ts';

/** Every request this runner was handed, so a test can see what crossed into the backend. */
const requests: ScriptRunner.Request[] = [];

/**
 * Stands in for a real backend: it echoes the snippet rather than evaluating it, which is what makes
 * the assertions about ROUTING rather than about any one sandbox.
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
  UnifiedProcessManager.layer.pipe(
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

describe('ScriptProcess', () => {
  it.effect(
    'runs an inline snippet on the local runtime through the process manager',
    Effect.fnUntraced(
      function* () {
        requests.length = 0;
        const result = yield* ScriptProcess.runScript({
          source: Operation.inlineScript('print(1)', Operation.Dialects.Effect),
          spaceId: 'SPACE',
        });
        expect(result.output).toBe('effect:print(1)');
        // The request reaches the backend whole, options included: that is what lets the same request
        // run in another runtime unchanged.
        expect(requests).toHaveLength(1);
        expect(requests[0]?.spaceId).toBe('SPACE');
      },
      (effect) => Effect.provide(effect, testLayer(echoRunner)),
    ),
  );

  it.effect(
    'the run shows up as a process, under the key an EDGE host resolves',
    Effect.fnUntraced(
      function* () {
        expect(ScriptProcess.ScriptProcess.key).toBe(ScriptProcess.SCRIPT_PROCESS_KEY);
        yield* ScriptProcess.runScript({ source: Operation.inlineScript('print(1)', Operation.Dialects.Plain) });
        const manager = yield* Process.ManagerService;
        const tree = yield* manager.processTree;
        expect(tree.some((process) => process.key === ScriptProcess.SCRIPT_PROCESS_KEY)).toBe(true);
      },
      (effect) => Effect.provide(effect, testLayer(echoRunner)),
    ),
  );

  it.effect(
    'a runner exposed as a Runner routes every request through the manager',
    Effect.fnUntraced(
      function* () {
        requests.length = 0;
        const runner = yield* ScriptProcess.runner();
        const result = yield* runner.run({ source: Operation.inlineScript('print(2)', Operation.Dialects.Plain) });
        expect(result.output).toBe('plain:print(2)');
        expect(requests).toHaveLength(1);
      },
      (effect) => Effect.provide(effect, testLayer(echoRunner)),
    ),
  );

  it.effect(
    'a deployment with no backend for the script terminates the process rather than answering',
    Effect.fnUntraced(
      function* () {
        const exit = yield* ScriptProcess.runScript({
          source: Operation.inlineScript('print(1)', Operation.Dialects.Plain),
        }).pipe(Effect.exit);
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
        const exit = yield* ScriptProcess.runScript(
          { source: Operation.inlineScript('print(1)', Operation.Dialects.Plain) },
          { location: { kind: 'edge', space: SpaceId.random() } },
        ).pipe(Effect.exit);
        expect(exit._tag).toBe('Failure');
      },
      (effect) => Effect.provide(effect, testLayer(echoRunner)),
    ),
  );
});
