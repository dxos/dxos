//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
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
  extraServices: Layer.succeed(Capability.Service, CapabilityManager.make({ registry: Registry.make() })),
});

/** A routine whose action is `TestRunnable`, with the runnable's input carried on its timer trigger. */
const addRoutine = Effect.fnUntraced(function* (input: Record<string, unknown>) {
  const operation = yield* Database.add(Operation.serialize(TestRunnable));
  const routine = makeRoutine({
    name: 'Test',
    spec: { kind: 'runnable', runnable: Ref.make(operation) },
    trigger: Trigger.make({ enabled: true, spec: Trigger.specTimer('*/10 * * * *'), input }),
  });
  yield* Database.add(routine);
  yield* Database.flush();
  return routine;
});

describe('RunRoutine', () => {
  it.effect(
    'passes the trigger input to the runnable',
    Effect.fnUntraced(
      function* ({ expect }) {
        received.length = 0;
        const routine = yield* addRoutine({ label: 'from-trigger' });

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
        const routine = yield* addRoutine({ label: '{{event.tick}}' });

        yield* Operation.invoke(RoutineOperation.RunRoutine, { routine: Ref.make(routine) });

        expect(received).toHaveLength(1);
        expect(received[0]).toBeTypeOf('number');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
