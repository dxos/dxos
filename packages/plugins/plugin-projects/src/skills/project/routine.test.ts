//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import { AssistantTestLayerWithTriggers } from '@dxos/agent-runtime/testing';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { AgentHandlers, RunInstructions } from '@dxos/assistant-toolkit';
import { TriggerDispatcher } from '@dxos/compute-runtime';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import * as Routine from '@dxos/compute/Routine';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { invariant } from '@dxos/invariant';
import { EntityId } from '@dxos/keys';
import * as SpaceOperationHandlerSet from '@dxos/plugin-space/SpaceOperationHandlerSet';
import * as TasksOperationHandlerSet from '@dxos/plugin-tasks/TasksOperationHandlerSet';
import { Text } from '@dxos/schema';
import { Milestone, Outline, Task, TaskSet } from '@dxos/types';

import { ProjectOperationHandlerSet } from '#operations';

import * as ProjectSkill from './ProjectSkill';

const { text, toolCall } = ScriptedLanguageModel;

EntityId.dangerouslyDisableRandomness();

// The headless half of the project loop: a routine the project owns runs its instructions through
// the assistant, and the model's tool call lands in the project's own ledger. Scripted rather than
// live, so what is asserted is the wiring — trigger to `RunInstructions` to a real task verb — and
// not the model's judgement.

const TYPES = [
  Project.Project,
  Instructions.Instructions,
  Routine.Routine,
  Trigger.Trigger,
  Operation.PersistentOperation,
  Milestone.Milestone,
  Outline.Outline,
  Task.Task,
  TaskSet.TaskSet,
  Text.Text,
];

const scriptedTurns: ScriptedLanguageModel.ScriptedTurn[] = [];

const TestLayer = AssistantTestLayerWithTriggers({
  aiService: ScriptedLanguageModel.scriptedAiService(scriptedTurns),
  // Every verb the skill declares, so no tool the model may reach for fails to resolve.
  operationHandlers: [
    ProjectOperationHandlerSet.handlers,
    TasksOperationHandlerSet.handlers,
    SpaceOperationHandlerSet.handlers,
    AgentHandlers,
  ],
  types: TYPES,
  skills: [ProjectSkill.make()],
});

describe('running a project routine', () => {
  it.effect(
    "firing the routine's trigger runs its instructions and writes the project's ledger",
    Effect.fnUntraced(
      function* ({ expect }) {
        const { project, taskSet, trigger } = yield* seed();
        expect(taskSet.tasks).toHaveLength(0);

        // The routine declares no output, so it signals completion with an empty `completeJob`.
        scriptedTurns.push(
          { parts: [toolCall('tasks-create', { taskSet: Obj.getURI(taskSet), title: 'Nightly sweep' })] },
          { parts: [toolCall('completeJob', {})] },
          { parts: [text('Filed the sweep into the project.')] },
        );

        const dispatcher = yield* TriggerDispatcher;
        const { result } = yield* dispatcher.invokeTrigger({ trigger, event: { tick: 0 } });

        // The run has to finish, not merely reach the tool call: a routine that errors after writing
        // still leaves the ledger looking right.
        expect(Exit.isSuccess(result)).toBe(true);
        expect(taskSet.tasks.map((ref) => ref.target?.title)).toEqual(['Nightly sweep']);
        expect(Obj.getParent(taskSet)?.id).toBe(project.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

/**
 * A project owning a routine whose instructions run on a timer, wired the way `plugin-routine`'s
 * `makeRoutine` wires one: the trigger runs `RunInstructions` with the routine's instructions bound
 * as its input.
 */
const seed = () =>
  Effect.gen(function* () {
    const project = yield* Database.add(Project.make({ name: 'Voyage' }));
    yield* Database.flush();
    const taskSetRef = project.taskSet;
    invariant(taskSetRef, 'Expected the project to own a task set.');
    const taskSet = yield* Database.load(taskSetRef);

    const instructions = yield* Database.add(
      Instructions.make({
        name: 'Sweep',
        text: "Add a task titled 'Nightly sweep' to the project's task set.",
        skills: [Ref.make(ProjectSkill.make())],
      }),
    );

    const { db } = yield* Database.Service;
    const record = Operation.serialize(RunInstructions);
    db.registry.add([record]);

    const trigger = yield* Database.add(
      Trigger.make({
        runnable: Ref.make(record),
        enabled: true,
        spec: Trigger.specTimer('*/5 * * * *'),
        input: { instructions: Ref.make(instructions), input: {} },
      }),
    );
    const routine = yield* Database.add(
      Routine.make({
        name: 'Sweep',
        spec: { kind: 'instructions', instructions: Ref.make(instructions) },
        triggers: [Ref.make(trigger)],
      }),
    );
    Obj.setParent(instructions, routine);
    Obj.setParent(trigger, routine);
    Project.addRoutine(project, routine);
    yield* Database.flush();

    return { project, taskSet, routine, trigger };
  });
