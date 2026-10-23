//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Obj, Ref } from '@dxos/echo';
import { EntityId } from '@dxos/echo/Key';
import { Task, TaskSet } from '@dxos/types';

import { type Config } from './config.ts';
import { daysAgo } from './util.ts';

//
// Three steps, flat and in order: the plan, not the work.
//
// The template seeds a partial spec and asks the agent to finish it, draw it and break the implementation into tasks of
// its own before it builds anything, so a reader watches the plan take shape before the plugin does. Everything is
// `todo`, and each step depends on the one before it, so a runner working ahead is visibly out of order.
//

export type TaskSeed = {
  readonly title: string;
  readonly description: string;
  readonly estimate?: Task.Estimate;
};

/** The spec task, on its own: the other two read what it writes. */
export const completeSpec = (config: Config): TaskSeed => ({
  title: 'Complete the spec',
  description: `The ${config.name} spec in this space states its first feature (F-1) and only names the others on the project's feature map. ${config.completeSpec} Write a \`feat\` block for each, with requirements a later task can be checked against, edit the spec in place through the Markdown skill's update, and append a \`decision\` to its Changelog saying what you added.`,
  estimate: 'xs',
});

/** The diagram step, on its own. */
export const architecture = (config: Config): TaskSeed => ({
  title: 'Draw the proposed architecture',
  description: `A diagram on the canvas, filed on the project, before any code: the sandbox on EDGE where the plugin is built, the plugin's build, the private plugin registry it is published to, and Composer, which lists it in Plugins → Registry, installs it and shows ${config.shows}. Write it in the Drawing skill's semantic diagram language (\`node\`, \`edge\`, \`group\`) and draw it, so the layout engine places every box and routes every arrow; never position the boxes by hand. Label each arrow in a few words, keep to what the spec describes, and draw again until the result reports no errors.`,
  estimate: 'xs',
});

/** The planning step: the agent's own tasks are the implementation. */
export const PLAN: TaskSeed = {
  title: 'Plan the implementation as tasks',
  description:
    "Add one task per implementation step to this project's task set, in the order they run, each depending on the one before it, and link each to the feature it moves on the feature map. Installing the published plugin is the reader's click in Plugins → Registry, so it is a task assigned to the reader. Then work the tasks in order, setting each one's status as you finish it, until the plugin is in the registry.",
  estimate: 'xs',
};

export type TasksResult = { taskSet: TaskSet.TaskSet; tasks: Task.Task[] };

/** The three planning steps, each depending on the one before it. */
export const makeTasks = (config: Config): SampleSpace.Partial<TasksResult> =>
  SampleSpace.partial('tasks', {
    schemas: [TaskSet.TaskSet, Task.Task],
    run: () =>
      Effect.gen(function* () {
        const taskSet = yield* Database.add(
          TaskSet.make({
            name: config.name,
            description: 'From an empty sandbox to a plugin in the private registry.',
          }),
        );

        const tasks = [completeSpec(config), architecture(config), PLAN].map((step) =>
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
                description: `Filed from the ${config.space.name} template.`,
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
