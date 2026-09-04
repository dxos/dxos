//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Database, Ref } from '@dxos/echo';

import { type DocsResult } from './docs';
import { type SkillResult } from './skill';
import { type TasksResult } from './tasks';

//
// The project that ties the plan, the brief and the skill together.
//

export type ProjectInput = { docs: DocsResult; tasks: TasksResult; skill: SkillResult };

export type ProjectResult = { project: Project.Project; instructions: Instructions.Instructions };

const INSTRUCTIONS = `Keep the Development skill enabled for the whole session — it carries how work \
is tracked, how agents are briefed and what counts as evidence, and it applies to every turn rather \
than to one task. Do not disable it to save context.

Build the chatroom app described in BRIEF.md by working the task tree in order. Deploy at the end of \
every stage and verify by fetching the URL. File what you write — the design, the deploy output, the \
URL — as artifacts on this project rather than leaving it in the chat.`;

/**
 * The work-stream. It adopts the task set the tasks phase built (`Project.make` would otherwise
 * create its own empty one) and carries the brief as an artifact.
 *
 * The skill reaches a chat through `instructions.skills`, which is the only binding path: a Skill
 * object sitting in the space is not enabled by proximity. Binding makes it available; the text
 * above is what keeps it on. No `repo` — the repository is created by
 * stage two, and seeding one would claim a repository that does not exist.
 */
export const ProjectPhase: SampleSpace.Phase<ProjectResult, ProjectInput> = SampleSpace.phase('project', {
  schemas: [Project.Project, Instructions.Instructions],
  run: ({ docs, tasks, skill }: ProjectInput) =>
    Effect.gen(function* () {
      const instructions = yield* Database.add(
        Instructions.make({
          name: 'Chatroom on Workers',
          description: 'Bindings for a chat working this project.',
          text: INSTRUCTIONS,
          skills: [Ref.make(skill.skill)],
          objects: [Ref.make(docs.brief), Ref.make(tasks.taskSet)],
        }),
      );

      const project = yield* Database.add(
        Project.make({
          name: 'Chatroom on Workers',
          description:
            'A chatroom served from one Cloudflare Worker: a Durable Object per room, a WebSocket for fan-out, one HTML page as the client.',
          status: 'active',
          instructions: Ref.make(instructions),
          taskSet: Ref.make(tasks.taskSet),
          artifacts: [Ref.make(docs.brief)],
        }),
      );

      return { project, instructions };
    }),
});
