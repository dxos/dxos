//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Database, Ref } from '@dxos/echo';

import { type DocsResult } from './docs';
import { type GameResult } from './game';
import { type SkillResult } from './skill';
import { type TasksResult } from './tasks';

//
// The project that ties the plan, the brief, the test position and the skill together.
//

export type ProjectInput = { docs: DocsResult; tasks: TasksResult; skill: SkillResult; game: GameResult };

export type ProjectResult = { project: Project.Project; instructions: Instructions.Instructions };

const INSTRUCTIONS = `Keep the Development skill enabled for the whole session — it carries how work \
is tracked, where the code is written and what counts as evidence, and it applies to every turn \
rather than to one task. Do not disable it to save context.

Build the MCP server described in BRIEF.md by working the task tree in order, and set each task's \
status as you finish it: the task list is how the reader follows this run.

Write the code yourself in one sandbox, driving it through the Sandbox skill. The sandbox image \
ships a coding agent of its own; do not delegate this project to it — it has none of this space's \
context, and its output would land on a container filesystem rather than in this project.

Deploy at the end of every stage and verify by fetching the URL. File what you produce — the \
design, the deploy and claim URLs, the tool responses — as artifacts on this project rather than \
leaving it in the chat.

This project needs no Anthropic key and no Cloudflare login. If a step seems to need either, that \
is the wrong step.`;

/**
 * The work-stream. It adopts the task set the tasks phase built (`Project.make` would otherwise
 * create its own empty one) and carries the brief as an artifact.
 *
 * The skill reaches a chat through `instructions.skills`, which is the only binding path: a Skill
 * object sitting in the space is not enabled by proximity. Binding makes it available; the text
 * above is what keeps it on. The Sandbox skill cannot be bound the same way — it is contributed by
 * a plugin under a key rather than stored here — so the text names it instead.
 *
 * No `repo` and no `McpServer`: the repository is created in stage five and the server record in
 * stage four, and seeding either would name a URL that does not exist.
 */
export const ProjectPhase: SampleSpace.Phase<ProjectResult, ProjectInput> = SampleSpace.phase('project', {
  schemas: [Project.Project, Instructions.Instructions],
  run: ({ docs, tasks, skill, game }: ProjectInput) =>
    Effect.gen(function* () {
      const instructions = yield* Database.add(
        Instructions.make({
          name: 'Chess MCP on Workers',
          description: 'Bindings for a chat working this project.',
          text: INSTRUCTIONS,
          skills: [Ref.make(skill.skill)],
          objects: [Ref.make(docs.brief), Ref.make(tasks.taskSet), Ref.make(game.game)],
        }),
      );

      const project = yield* Database.add(
        Project.make({
          name: 'Chess MCP on Workers',
          description:
            'A chess engine served from one Cloudflare Worker as an MCP server, registered against this space so any chat can ask it for a move.',
          status: 'active',
          instructions: Ref.make(instructions),
          taskSet: Ref.make(tasks.taskSet),
          artifacts: [Ref.make(docs.brief)],
        }),
      );

      return { project, instructions };
    }),
});
