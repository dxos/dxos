//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Obj, Ref } from '@dxos/echo';
import { EntityId } from '@dxos/echo/Key';
import { Task, TaskSet } from '@dxos/types';

import { daysAgo } from './util.ts';

//
// Three steps, flat and in order: the plan, not the work.
//
// The template seeds a partial spec and asks the agent to finish it, draw it and break the implementation into tasks of
// its own before it builds anything, so a reader watches the plan take shape before the Worker does. Everything is
// `todo`, and each step depends on the one before it, so a runner working ahead is visibly out of order.
//

export type TaskSeed = {
  readonly title: string;
  readonly description: string;
  readonly estimate?: Task.Estimate;
};

/** The spec task, on its own: the other two read what it writes. */
export const COMPLETE_SPEC: TaskSeed = {
  title: 'Complete the spec',
  description:
    "The Hello Worker spec in this space states the greeting endpoint (F-1) and only names the other features on the project's feature map. Write a `feat` block for each of them — Deploy without an account (F-2), Verified response (F-3), Claimed account (F-4) — with requirements a later task can be checked against, edit the spec in place through the Markdown skill's update, and append a `decision` to its Changelog saying what you added. State what the project's instructions know about wrangler and the claim; invent nothing beyond them.",
  estimate: 'xs',
};

/** The diagram step, on its own: the evals give an agent exactly this task. */
export const ARCHITECTURE: TaskSeed = {
  title: 'Draw the proposed architecture',
  description:
    "A diagram on the canvas, filed on the project, before any code: the sandbox where wrangler runs, the Worker it deploys, the temporary Cloudflare account that hosts it, and the request and JSON response between a client and the Worker URL. Write it in the Drawing skill's semantic diagram language (`node`, `edge`, `group`) and draw it, so the layout engine places every box and routes every arrow; never position the boxes by hand. Label each arrow in a few words, keep to what the spec describes, and draw again until the result reports no errors.",
  estimate: 'xs',
};

/** The planning step: the agent's own tasks are the implementation. */
export const PLAN: TaskSeed = {
  title: 'Plan the implementation as tasks',
  description:
    "Add one task per implementation step to this project's task set, in the order they run, each depending on the one before it, and link each to the feature it moves on the feature map. A step only the reader can do — a browser consent screen — is assigned to the reader. Then work the tasks in order, setting each one's status as you finish it, until the Worker answers.",
  estimate: 'xs',
};

const STEPS: ReadonlyArray<TaskSeed> = [COMPLETE_SPEC, ARCHITECTURE, PLAN];

export type TasksResult = { taskSet: TaskSet.TaskSet; tasks: Task.Task[] };

/** The three planning steps, each depending on the one before it. */
export const Tasks: SampleSpace.Partial<TasksResult> = SampleSpace.partial('tasks', {
  schemas: [TaskSet.TaskSet, Task.Task],
  run: () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(
        TaskSet.make({
          name: 'Hello Worker',
          description: 'From an empty sandbox to a URL that answers.',
        }),
      );

      const tasks = STEPS.map((step) =>
        Task.make({
          title: step.title,
          description: step.description,
          estimate: step.estimate,
          status: 'todo',
          // Task carries no due date; its dates are activity-log lines, so that is where they go.
          history: [
            {
              id: EntityId.random(),
              date: daysAgo(0),
              event: 'created' as const,
              description: 'Filed from the worker template.',
            },
          ],
        }),
      );
      yield* SampleSpace.children(taskSet, tasks, (taskSet, refs) => {
        taskSet.tasks = refs;
      });

      // The diagram draws the finished spec, and the plan breaks down what the diagram shows.
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
