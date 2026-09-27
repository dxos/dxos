//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Obj, Ref } from '@dxos/echo';
import { EntityId } from '@dxos/echo/Key';
import { Task, TaskSet } from '@dxos/types';

import { FOLDER, MANIFEST_URL, daysAgo } from './util.ts';

//
// Four steps, flat and in order, all the agent's: loading the plugin is the reader's click on the
// prompt the last step emits, not a task, so a chat can run the plan end to end on its own.
//

type TaskSeed = {
  readonly title: string;
  readonly description: string;
  readonly estimate?: Task.Estimate;
};

const STEPS: ReadonlyArray<TaskSeed> = [
  {
    title: 'Read the plugin guide',
    description:
      'Read the "Example: a plugin with its own sidebar page" section of `../../../docs/src/content/docs/docs/composer/publishing-plugins.md`. Every file the plugin needs is in it; the rules list under it is where a first build goes wrong.',
    estimate: 'xs',
  },
  {
    title: 'Write the plugin in TypeScript',
    description: `Create \`dx.config.ts\`, \`vite.config.ts\`, \`tsconfig.json\` and \`src/plugin.tsx\` in \`temp/plugins/${FOLDER}/\`: a "Space Clock" workspace in the left rail with a "Clock" page whose article shows a large live clock that ticks every second. Set the build \`outDir\` to \`'../../../out/composer/plugins/${FOLDER}'\` so the build lands where \`vite preview\` serves it.`,
    estimate: 's',
  },
  {
    title: 'Typecheck and build',
    description: `Run \`../../../node_modules/.bin/tsc -p temp/plugins/${FOLDER}/tsconfig.json\`, then \`node_modules/.bin/vite build temp/plugins/${FOLDER}\`, without \`cd\`. Then \`curl ${MANIFEST_URL}\`: a build that exited zero is not evidence that the app can fetch it.`,
    estimate: 'xs',
  },
  {
    title: 'Offer the plugin to load',
    description: `Emit a \`plugin-url-prompt\` surface carrying \`${MANIFEST_URL}\` and the name "Space Clock". Do not load it yourself: loading runs new code in this app, so it is the reader's click.`,
    estimate: 'xs',
  },
];

export type TasksResult = { taskSet: TaskSet.TaskSet; tasks: Task.Task[] };

/** The four steps, each depending on the one before it. */
export const Tasks: SampleSpace.Phase<TasksResult> = SampleSpace.phase('tasks', {
  schemas: [TaskSet.TaskSet, Task.Task],
  run: Effect.fnUntraced(function* () {
    const taskSet = yield* Database.add(
      TaskSet.make({
        name: 'Composer Plugin',
        description: 'From an empty folder to a plugin loaded into this app.',
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
            description: 'Filed from the Composer plugin template.',
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
