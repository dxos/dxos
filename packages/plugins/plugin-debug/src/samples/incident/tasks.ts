//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Obj, Ref } from '@dxos/echo';
import { Task, TaskSet } from '@dxos/types';

import { daysAgo } from './util.ts';

//
// The retro as four pieces of work, in the order they depend on each other. Every one is `todo`:
// this space is a job to delegate, not a retro caught half-written.
//
// Each task names one deliverable and where it goes, so the check on a finished task is whether
// that thing exists in that place — not whether the chat said it did.
//

type TaskSeed = {
  readonly title: string;
  readonly description: string;
  readonly estimate?: Task.Estimate;
};

const STEPS: ReadonlyArray<TaskSeed> = [
  {
    title: 'Reconstruct the timeline',
    description:
      'One document on this project named "Timeline": what happened and when, from the status log. Where a note disagrees with the log, follow the log and record the disagreement.',
    estimate: 's',
  },
  {
    title: 'Write the retrospective',
    description:
      'One document on this project named "Retrospective": what broke, why it went undetected for as long as it did, and what would have prevented or caught it. Ground every claim in the log or a named note.',
    estimate: 'm',
  },
  {
    title: 'File the action items',
    description:
      'One task on this project per recommendation in the retrospective, each assigned to one of the people in the notes. Tasks, not a list in the document.',
    estimate: 's',
  },
  {
    title: 'Draft the customer notice',
    description:
      'One document on this project named "Customer notice": what happened and for how long, in plain language a customer can forward. No internal names, systems or people.',
    estimate: 's',
  },
];

export type TasksResult = { taskSet: TaskSet.TaskSet; tasks: Task.Task[] };

/** The four steps, each depending on the one before it. */
export const Tasks: SampleSpace.Phase<TasksResult> = SampleSpace.phase('tasks', {
  schemas: [TaskSet.TaskSet, Task.Task],
  run: () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(
        TaskSet.make({
          name: 'Incident 0516 retrospective',
          description: 'From the log and the notes to a filed retro.',
        }),
      );

      const tasks = STEPS.map((step) =>
        Task.make({
          title: step.title,
          description: step.description,
          estimate: step.estimate,
          status: 'todo',
          history: [{ date: daysAgo(0), event: 'created' as const, description: 'Filed from the incident template.' }],
        }),
      );
      yield* SampleSpace.children(taskSet, tasks, (taskSet, refs) => {
        taskSet.tasks = refs;
      });

      // The retro needs the timeline, the action items need the retro, the notice needs both.
      for (const [index, task] of tasks.entries()) {
        if (index > 0) {
          const previous = tasks[index - 1];
          Obj.update(task, (task) => {
            task.dependsOn = [Ref.make(previous)];
          });
        }
      }

      return { taskSet, tasks };
    }),
});
