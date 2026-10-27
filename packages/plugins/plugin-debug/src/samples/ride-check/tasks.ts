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
// Three steps, flat and in order: draw it, ship it, check it. The spec is already written, so the run starts at the
// diagram and the reader sees a page within one task. Each step depends on the one before it.
//

export type TaskSeed = {
  readonly title: string;
  readonly description: string;
  readonly estimate?: Task.Estimate;
};

export const ARCHITECTURE: TaskSeed = {
  title: 'Draw the architecture',
  description:
    "A diagram on the canvas, filed on the project: the rider's browser, the Worker serving the page and `/api/forecast`, and Open-Meteo behind it, with the four feature cards the page shows grouped inside the page. Write it in the Drawing skill's semantic diagram language (`node`, `edge`, `group`) and let the layout engine place it; label each arrow in a few words.",
  estimate: 'xs',
};

export const BUILD: TaskSeed = {
  title: 'Build and deploy the Worker',
  description:
    'Build the page the spec describes with DXOS UI and deploy it as one Worker, following the recipe in the project instructions. This task already implements every feature on the map; set each feature, and each of its subfeatures, to operational once the live page shows it.',
  estimate: 's',
};

export const VERIFY: TaskSeed = {
  title: 'Check the live page against the spec',
  description:
    'Fetch the deployed URL and `/api/forecast`, check each scenario in the spec, and file the URL on the project. A feature whose card does not render goes to failing, with the reason in a comment.',
  estimate: 'xs',
};

const STEPS: ReadonlyArray<TaskSeed> = [ARCHITECTURE, BUILD, VERIFY];

export type TasksResult = { taskSet: TaskSet.TaskSet; tasks: Task.Task[] };

/** The three steps, each depending on the one before it. */
export const Tasks: SampleSpace.Partial<TasksResult> = SampleSpace.partial('tasks', {
  schemas: [TaskSet.TaskSet, Task.Task],
  run: () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(
        TaskSet.make({
          name: 'Ride Check',
          description: 'From a spec to a page a rider can open.',
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
              description: 'Filed from the Ride Check template.',
            },
          ],
        }),
      );
      yield* SampleSpace.children(taskSet, tasks, (taskSet, refs) => {
        taskSet.tasks = refs;
      });

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
