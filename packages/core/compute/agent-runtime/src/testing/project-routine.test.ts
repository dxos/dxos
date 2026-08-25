//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';

import { TriggerDispatcher } from '@dxos/compute-runtime';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Project from '@dxos/compute/Project';
import * as Routine from '@dxos/compute/Routine';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, DXN, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { invariant } from '@dxos/invariant';
import { Text } from '@dxos/schema';
import { Outline, Task, TaskSet } from '@dxos/types';

import { AssistantTestLayerWithTriggers } from './assistant-test-layer';

// A project's routine is the headless half of the project loop: the chat drives work a person is
// present for, the routine drives work that happens on a schedule. This asserts the whole path —
// ownership, the trigger's own input binding, and the run's effect on the project's ledger.
//
// It fires the trigger through `TriggerDispatcher` rather than plugin-routine's `RunRoutine`
// operation: plugin-routine sits above this package, so importing it back would cycle. The
// dispatcher is the path `RunRoutine` itself delegates to.

/** Stands in for a project pipeline: appends a task to the project's ledger, like the mailbox verbs. */
const AppendTask = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.appendTask'), name: 'Append Task' },
  services: [Database.Service],
  input: Schema.Struct({ project: Ref.Ref(Project.Project), title: Schema.String }),
  output: Schema.Struct({ title: Schema.String }),
});

const AppendTaskHandler = AppendTask.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ project: projectRef, title }) {
      const project = yield* Database.load(projectRef);
      const taskSet = project.taskSet;
      invariant(taskSet, 'Expected the project to own a task set.');
      const resolved = yield* Database.load(taskSet);
      const task = yield* Database.add(Task.make({ title, status: 'todo' }));
      Obj.update(resolved, (resolved) => {
        resolved.tasks = [...resolved.tasks, Ref.make(task)];
      });
      Obj.setParent(task, resolved);
      return { title };
    }),
  ),
);

const TYPES = [
  Project.Project,
  Instructions.Instructions,
  Routine.Routine,
  Trigger.Trigger,
  Operation.PersistentOperation,
  Outline.Outline,
  Task.Task,
  TaskSet.TaskSet,
  Text.Text,
];

const TestLayer = AssistantTestLayerWithTriggers({
  operationHandlers: OperationHandlerSet.make(AppendTaskHandler),
  types: TYPES,
  disableLlmMemoization: true,
});

describe('running a project routine', () => {
  it.effect(
    "firing the routine's trigger runs its action against the project",
    Effect.fnUntraced(
      function* ({ expect }) {
        const { project, trigger } = yield* seed();
        const taskSet = yield* loadTaskSet(project);
        expect(taskSet.tasks).toHaveLength(0);

        const dispatcher = yield* TriggerDispatcher;
        const { result } = yield* dispatcher.invokeTrigger({ trigger, event: { tick: 0 } });

        // The observable output: the run's own return value, and the ledger it wrote through.
        expect(result).toEqual(Exit.succeed({ title: 'Nightly sweep' }));
        expect(taskSet.tasks.map((ref) => ref.target?.title)).toEqual(['Nightly sweep']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'the scheduled path fires it too, once the cron comes due',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { project } = yield* seed();
        const taskSet = yield* loadTaskSet(project);

        const dispatcher = yield* TriggerDispatcher;
        // Nothing is due yet, so a sweep before the interval must not run the action.
        yield* dispatcher.invokeScheduledTriggers({ kinds: ['timer'] });
        expect(taskSet.tasks).toHaveLength(0);

        yield* dispatcher.advanceTime(Duration.minutes(10));
        yield* dispatcher.invokeScheduledTriggers({ kinds: ['timer'] });

        expect(taskSet.tasks.map((ref) => ref.target?.title)).toEqual(['Nightly sweep']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'a disabled trigger runs on neither path until it is enabled',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { project, trigger } = yield* seed({ enabled: false });
        const taskSet = yield* loadTaskSet(project);

        const dispatcher = yield* TriggerDispatcher;
        yield* dispatcher.advanceTime(Duration.minutes(10));
        yield* dispatcher.invokeScheduledTriggers({ kinds: ['timer'] });
        expect(taskSet.tasks).toHaveLength(0);

        // Disabled gates the manual path too, so a template's opt-in starter routine cannot be run
        // into a space by a caller that never enabled it. The refusal is a defect carried in the
        // invocation's own result, not a failure of the dispatch call.
        const { result: refused } = yield* dispatcher.invokeTrigger({ trigger, event: { tick: 0 } });
        expect(Exit.isFailure(refused)).toBe(true);
        expect(String(refused)).toContain('disabled trigger');
        expect(taskSet.tasks).toHaveLength(0);

        Obj.update(trigger, (trigger) => {
          trigger.enabled = true;
        });
        yield* Database.flush();
        yield* dispatcher.invokeTrigger({ trigger, event: { tick: 0 } });

        expect(taskSet.tasks.map((ref) => ref.target?.title)).toEqual(['Nightly sweep']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );
});

/**
 * A project owning a routine whose action appends to the project's ledger, on a 5-minute timer.
 * Mirrors what a domain template scaffolds: the trigger carries the runnable's input binding.
 */
const seed = ({ enabled = true }: { enabled?: boolean } = {}) =>
  Effect.gen(function* () {
    const project = yield* Database.add(Project.make({ name: 'Voyage' }));
    yield* Database.flush();

    const { db } = yield* Database.Service;
    const record = Operation.serialize(AppendTask);
    db.registry.add([record]);

    const trigger = yield* Database.add(
      Trigger.make({
        runnable: Ref.make(record),
        enabled,
        spec: Trigger.specTimer('*/5 * * * *'),
        input: { project: Ref.make(project), title: 'Nightly sweep' },
      }),
    );
    const routine = yield* Database.add(
      Routine.make({
        name: 'Sweep',
        spec: { kind: 'runnable', runnable: Ref.make(record) },
        triggers: [Ref.make(trigger)],
      }),
    );
    Obj.setParent(trigger, routine);
    Project.addRoutine(project, routine);
    yield* Database.flush();

    return { project, routine, trigger };
  });

const loadTaskSet = (project: Project.Project) =>
  Effect.gen(function* () {
    const taskSet = project.taskSet;
    invariant(taskSet, 'Expected the project to own a task set.');
    return yield* Database.load(taskSet);
  });
