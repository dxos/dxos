//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Database, Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { Outline } from '@dxos/types';

import { type TasksResult } from './tasks';

export type ProjectInput = { tasks: TasksResult };

export type ProjectResult = { project: Project.Project; instructions: Instructions.Instructions };

const INSTRUCTIONS = `Deploy the Worker described by the task list, working the tasks in order and \
setting each one's status as you finish it: the task list is how I follow this run.

What the Worker does is the whole specification — one fetch handler, JSON out, a greeting and the \
current UTC time. There is no design stage and nothing to choose. If a step starts to look like \
architecture, it is the wrong step.

Write the code yourself in one sandbox, driving it through the Sandbox skill \
(\`org.dxos.skill.sandbox\`). The sandbox image ships a coding agent of its own; do not delegate to \
it — it has none of this space's context, and its output would land on a container filesystem \
rather than in this project.

The container is not durable, so file what has to outlive it — the Worker URL, the response body — \
as artifacts on this project in the turn you produce it, not at the end. The claim URL that the \
deploy prints is a bearer credential for the account: give it to me directly and file it nowhere.

This project needs no Cloudflare login and no API keys. If a step seems to need either, that is the \
wrong step.`;

/**
 * The work-stream. It adopts the task set the tasks phase built (`Project.make` would otherwise
 * create its own empty one), and starts with no artifacts: the URL and the response are what the
 * run produces, and seeding either would name something that does not exist.
 */
export const ProjectPhase: SampleSpace.Phase<ProjectResult, ProjectInput> = SampleSpace.phase('project', {
  // Neither `Outline.Outline` nor `Text.Text` is created here directly: `Project.make` builds an
  // outline for the project, and the instructions' prose is stored as a Text. A phase has to declare
  // every type it persists or the space cannot register it.
  schemas: [Project.Project, Instructions.Instructions, Outline.Outline, Text.Text],
  run: ({ tasks }: ProjectInput) =>
    Effect.gen(function* () {
      const instructions = yield* Database.add(
        Instructions.make({
          name: 'Hello Worker',
          description: 'Bindings for a chat working this project.',
          text: INSTRUCTIONS,
          objects: [Ref.make(tasks.taskSet)],
        }),
      );

      const project = yield* Database.add(
        Project.make({
          name: 'Hello Worker',
          description:
            'One Cloudflare Worker that answers with a greeting and the time, deployed from a sandbox with no Cloudflare account.',
          status: 'active',
          instructions: Ref.make(instructions),
          taskSet: Ref.make(tasks.taskSet),
        }),
      );

      return { project, instructions };
    }),
});
