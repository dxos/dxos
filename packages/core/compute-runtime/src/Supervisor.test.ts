//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import * as KeyValueStore from '@effect/platform/KeyValueStore';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

import { Operation, OperationHandlerSet, Process, ServiceResolver, Trace } from '@dxos/compute';
import { Database, DXN } from '@dxos/echo';
import { Organization } from '@dxos/types';

import * as ProcessManager from './ProcessManager';
import * as Supervisor from './Supervisor';
import { TestDatabaseLayer } from './testing';

//
// Child operation the supervisor delegates to: multiplies its input by ten.
//

const Multiply = Operation.make({
  meta: { key: DXN.make('org.dxos.test.supervisor.multiply'), name: 'Multiply' },
  input: Schema.Number,
  output: Schema.Number,
});

const Failing = Operation.make({
  meta: { key: DXN.make('org.dxos.test.supervisor.failing'), name: 'Failing' },
  input: Schema.Number,
  output: Schema.Number,
});

/**
 * Sentinel output the supervisor submits when a delegated child fails, so a failure is
 * observable through the same output stream as a success.
 */
const FAILURE_SENTINEL = -1;

const handlers = OperationHandlerSet.make(
  Multiply.pipe(
    Operation.withHandler(
      Effect.fn(function* (input) {
        return input * 10;
      }),
    ),
  ),
  Failing.pipe(
    Operation.withHandler(
      Effect.fn(function* () {
        return yield* Effect.die('child failed');
      }),
    ),
  ),
);

/**
 * Supervisor process: on each input it delegates a child operation (linked + non-blocking) —
 * {@link Failing} for input `0`, otherwise {@link Multiply} — and on the child's exit it reads
 * the result and submits it (or {@link FAILURE_SENTINEL} when the child failed).
 */
const makeSupervisor = () =>
  Process.make(
    {
      key: 'test.supervisor',
      input: Schema.Number,
      output: Schema.Number,
      services: [ProcessManager.ProcessOperationInvoker.Service],
    },
    (ctx) =>
      Effect.succeed({
        onSpawn: () => Effect.void,
        onInput: (input: number) =>
          Effect.gen(function* () {
            yield* Supervisor.delegate(input === 0 ? Failing : Multiply, input);
          }),
        onAlarm: () => Effect.void,
        onChildEvent: (event) =>
          Effect.gen(function* () {
            const exit = yield* Supervisor.collectResult<number>(event.pid);
            ctx.submitOutput(Exit.isSuccess(exit) ? exit.value : FAILURE_SENTINEL);
          }),
      }),
  );

const TestLayer = ProcessManager.ProcessOperationInvoker.layer.pipe(
  Layer.provideMerge(ProcessManager.layer({ idGenerator: ProcessManager.SequentialIdGenerator })),
  Layer.provide(ServiceResolver.layerRequirements(Database.Service)),
  Layer.provide(TestDatabaseLayer({ types: [Organization.Organization] })),
  Layer.provide(KeyValueStore.layerMemory),
  Layer.provide(OperationHandlerSet.provide(handlers)),
  Layer.provideMerge(Registry.layer),
  Layer.provide(Trace.layerNoop),
);

describe('Supervisor', () => {
  it.effect(
    'delegates a child and emits the collected result on child exit',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const handle = yield* manager.spawn(makeSupervisor());

      const outputs: number[] = [];
      yield* handle.subscribeOutputs().pipe(
        Stream.runForEach((output) => Effect.sync(() => outputs.push(output))),
        Effect.fork,
      );

      yield* handle.submitInput(5);

      yield* Effect.promise(() => expect.poll(() => outputs).toEqual([50]));
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'surfaces a failed child as a failed Exit without crashing the supervisor',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const handle = yield* manager.spawn(makeSupervisor());

      const outputs: number[] = [];
      yield* handle.subscribeOutputs().pipe(
        Stream.runForEach((output) => Effect.sync(() => outputs.push(output))),
        Effect.fork,
      );

      yield* handle.submitInput(0);

      yield* Effect.promise(() => expect.poll(() => outputs).toEqual([FAILURE_SENTINEL]));
      // Supervisor stays alive (does not fail) and keeps serving inputs.
      expect(handle.status.state).not.toEqual(Process.State.FAILED);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'handles multiple concurrent delegations, emitting one result per child',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const handle = yield* manager.spawn(makeSupervisor());

      const outputs: number[] = [];
      yield* handle.subscribeOutputs().pipe(
        Stream.runForEach((output) => Effect.sync(() => outputs.push(output))),
        Effect.fork,
      );

      // Two inputs in flight before either child has reported back.
      yield* handle.submitInput(5);
      yield* handle.submitInput(7);

      yield* Effect.promise(() => expect.poll(() => [...outputs].sort((a, b) => a - b)).toEqual([50, 70]));
    }, Effect.provide(TestLayer)),
  );
});
