//
// Copyright 2026 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { Capability, CapabilityManager } from '@dxos/app-framework';
import { Operation, OperationHandlerSet, Routine, Trigger } from '@dxos/compute';
import { Database, DXN, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';

import { RoutineOperation } from '../types';
import { makeRoutine } from '../util';
import RunRoutineHandler from './run-routine';

/** Captures the input each run receives so the test can assert on it after the invocation. */
const received: unknown[] = [];

/** Trigger ids the monitor was asked to invoke — the seam a `remote` trigger must reach instead of running here. */
const monitorInvocations: string[] = [];

/** Stands in for the aggregate monitor, whose real implementation routes `remote` triggers to EDGE over HTTP. */
const TestMonitor = Layer.succeed(Trigger.TriggerMonitorService, {
  triggers: Atom.make<readonly Trigger.State[]>([]),
  localDispatcherEnabled: false,
  invokeTrigger: ({ trigger }) => Effect.sync(() => void monitorInvocations.push(trigger.id)),
});

/**
 * Stand-in for a connector's sync operation: like `InboxOperation.GoogleMailSync` it destructures a
 * required input, so a run that supplies none throws before the handler body.
 */
const TestRunnable = Operation.make({
  meta: { key: DXN.make('org.dxos.test.runnable'), name: 'Test Runnable' },
  input: Schema.Struct({ label: Schema.Any }),
  output: Schema.Void,
});

const TestLayer = AssistantTestLayer({
  operationHandlers: OperationHandlerSet.make(
    RunRoutineHandler,
    TestRunnable.pipe(
      Operation.withHandler(({ label }) => {
        received.push(label);
        return Effect.void;
      }),
    ),
  ),
  types: [Routine.Routine, Trigger.Trigger, Operation.PersistentOperation],
  disableLlmMemoization: true,
  // `RunRoutine` declares `Capability.Service`; an empty manager discharges it (the handler never reads it).
  extraServices: Layer.mergeAll(
    Layer.succeed(Capability.Service, CapabilityManager.make({ registry: Registry.make() })),
    TestMonitor,
  ),
});

describe('RunRoutine', () => {
  it.effect(
    'passes the trigger input to the runnable',
    Effect.fnUntraced(
      function* ({ expect }) {
        received.length = 0;
        const { routine } = yield* addRoutine({ label: 'from-trigger' });

        yield* Operation.invoke(RoutineOperation.RunRoutine, { routine: Ref.make(routine) });

        expect(received).toEqual(['from-trigger']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'resolves an event template against the synthetic run event',
    Effect.fnUntraced(
      function* ({ expect }) {
        received.length = 0;
        const { routine } = yield* addRoutine({ label: '{{event.tick}}' });

        yield* Operation.invoke(RoutineOperation.RunRoutine, { routine: Ref.make(routine) });

        expect(received).toHaveLength(1);
        expect(received[0]).toBeTypeOf('number');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'routes a remote trigger to the monitor instead of running the runnable locally',
    Effect.fnUntraced(
      function* ({ expect }) {
        received.length = 0;
        monitorInvocations.length = 0;
        const { routine, trigger } = yield* addRoutine({ label: 'on-edge' }, true);

        yield* Operation.invoke(RoutineOperation.RunRoutine, { routine: Ref.make(routine) });

        // The monitor sends it to the EDGE dispatcher; nothing runs in this process.
        expect(monitorInvocations).toEqual([trigger.id]);
        expect(received).toEqual([]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'runs a local trigger in-process without touching the monitor',
    Effect.fnUntraced(
      function* ({ expect }) {
        received.length = 0;
        monitorInvocations.length = 0;
        const { routine } = yield* addRoutine({ label: 'on-client' });

        yield* Operation.invoke(RoutineOperation.RunRoutine, { routine: Ref.make(routine) });

        expect(received).toEqual(['on-client']);
        expect(monitorInvocations).toEqual([]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

/**
 * A routine whose action is `TestRunnable`, with the runnable's input carried on its timer trigger.
 * Returns the trigger alongside so assertions can name its id without re-deriving it from the ref.
 */
const addRoutine = Effect.fnUntraced(function* (input: Record<string, unknown>, remote?: boolean) {
  const operation = yield* Database.add(Operation.serialize(TestRunnable));
  const trigger = Trigger.make({ enabled: true, remote, spec: Trigger.specTimer('*/10 * * * *'), input });
  const routine = makeRoutine({
    name: 'Test',
    spec: { kind: 'runnable', runnable: Ref.make(operation) },
    trigger,
  });
  yield* Database.add(routine);
  yield* Database.flush();
  return { routine, trigger };
});
