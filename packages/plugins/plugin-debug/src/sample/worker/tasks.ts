//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Obj, Ref } from '@dxos/echo';
import { Actor, Task, TaskSet } from '@dxos/types';

import { daysAgo } from './util';

//
// Five steps, flat and in order.
//
// Flat on purpose: the whole run is one afternoon's work, and a tree would imply stages that can be
// planned against each other. Everything is `todo` — this is a plan to run, not a project caught
// mid-flight — and each step depends on the one before it, so a runner working ahead is visibly out
// of order rather than merely early.
//

type TaskSeed = {
  readonly title: string;
  readonly description: string;
  readonly estimate?: Task.Estimate;
  /** Set where the step needs the reader's own hands — here, the one browser consent screen. */
  readonly assignee?: Actor.Actor;
};

/**
 * The reader, as an assignee. A template cannot know who they are, so the actor carries the role and
 * a label rather than a Person ref — enough for the row to say the step is not the agent's.
 */
const USER: Actor.Actor = { role: 'user', name: 'You' };

const STEPS: ReadonlyArray<TaskSeed> = [
  {
    title: 'Create a sandbox and install the toolchain',
    description:
      'One sandbox for the whole run — it keeps its filesystem between commands, so a second one pays for the toolchain again. The image ships Node 20 and every wrangler carrying `--temporary` needs Node 22, so unpack Node 22 into `/opt/node22`, then symlink `node` and (after `npm i -g wrangler`) `wrangler` into `/usr/local/bin` — npm puts its global prefix beside whichever node it runs under, so without the symlinks neither is on PATH in the next command. Creating the sandbox and running commands in it belong to the Sandbox skill.',
    estimate: 's',
  },
  {
    title: 'Write the Worker',
    description:
      "A TypeScript Worker whose fetch handler answers every request with JSON: a greeting and the current UTC time. No router, no dependencies, no build step beyond wrangler's own.",
    estimate: 'xs',
  },
  {
    title: 'Deploy it with no Cloudflare login',
    description:
      '`wrangler deploy --temporary` mints a temporary account and prints a Worker URL and a claim URL; plain `wrangler deploy` refuses non-interactively and demands a token, so the flag is not optional. File the Worker URL on the project. The claim URL is a bearer credential — hand it straight to me and file it nowhere.',
    estimate: 's',
  },
  {
    title: 'Fetch the deployed URL and check the response',
    description:
      'Fetch it and paste the body into the project. A deploy command that exited zero is not evidence that anything is serving.',
    estimate: 'xs',
  },
  {
    title: 'Claim the temporary Cloudflare account',
    description:
      'Yours to do: claiming signs the account into yours, which needs a browser the agent does not have. It comes after the last deploy — an agent with no login cannot update a claimed account, and `--temporary` would mint a second one under a different URL. Do it inside the hour; the account expires with the Worker on it.',
    estimate: 'xs',
    assignee: USER,
  },
];

export type TasksResult = { taskSet: TaskSet.TaskSet; tasks: Task.Task[] };

/** The five steps, each depending on the one before it. */
export const Tasks: SampleSpace.Phase<TasksResult> = SampleSpace.phase('tasks', {
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
          assignee: step.assignee,
          status: 'todo',
          // Task carries no due date; its dates are activity-log lines, so that is where they go.
          history: [{ date: daysAgo(0), event: 'created' as const, description: 'Filed from the worker template.' }],
        }),
      );
      yield* SampleSpace.children(taskSet, tasks, (taskSet, refs) => {
        taskSet.tasks = refs;
      });

      // Nothing can be deployed before it is written, and nothing claimed before it is deployed.
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
