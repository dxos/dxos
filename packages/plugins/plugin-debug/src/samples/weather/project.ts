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

import { type SkillResult } from './skill.ts';
import { type TasksResult } from './tasks.ts';

export type ProjectInput = { tasks: TasksResult; skill: SkillResult };

export type ProjectResult = { project: Project.Project; instructions: Instructions.Instructions };

const INSTRUCTIONS = `Build, deploy, configure and test the weather MCP server described by the task \
list, on your own and in one go: start the first task now, work them in order, and set each one's \
status as you finish it. Do not stop to ask — nothing in this project needs me.

The task descriptions are the whole specification: one Worker, one tool (\`get_weather\`), one \
upstream API. There is no design stage. If a step starts to look like architecture, it is the wrong step.

Write the code yourself in one sandbox, driving it through the Sandbox skill \
(\`org.dxos.skill.sandbox\`). Do not delegate to the coding agent in the sandbox image — it has none \
of this space's context.

The server is called from a browser, so it must answer CORS preflights and send CORS headers on \
every response — without them the tool silently never connects. Deploy with \`wrangler deploy --temporary\`. Do not claim the account and never file or repeat the \
claim URL. The container is not durable, so file the Worker URL and the tool's response on this \
project in the turn you produce them.

Configure the server by setting its URL on the Weather MCP skill's \`mcpServers\` with the Database \
skill; that skill is already bound here, so the tool is available on your next turn.

This project needs no Cloudflare login and no API keys. If a step seems to need either, that is the \
wrong step.`;

/**
 * The work-stream. It adopts the task set the tasks phase built and binds the Weather MCP skill
 * through `instructions.skills` — the only path a seeded skill reaches a chat by — so the run can
 * configure the server with one update and no enable step.
 */
export const ProjectPhase: SampleSpace.Phase<ProjectResult, ProjectInput> = SampleSpace.phase('project', {
  // `Project.make` builds an outline for the project and the instructions' prose is stored as a
  // Text; a phase has to declare every type it persists or the space cannot register it.
  schemas: [Project.Project, Instructions.Instructions, Outline.Outline, Text.Text],
  run: ({ tasks, skill }: ProjectInput) =>
    Effect.gen(function* () {
      const instructions = yield* Database.add(
        Instructions.make({
          name: 'Weather MCP',
          description: 'Bindings for a chat working this project.',
          text: INSTRUCTIONS,
          skills: [Ref.make(skill.skill)],
          objects: [Ref.make(tasks.taskSet)],
        }),
      );

      const project = yield* Database.add(
        Project.make({
          name: 'Weather MCP',
          description:
            'A one-tool MCP server over the Open-Meteo forecast, deployed as a temporary Cloudflare Worker and called from this chat.',
          status: 'active',
          instructions: Ref.make(instructions),
          taskSet: Ref.make(tasks.taskSet),
        }),
      );

      return { project, instructions };
    }),
});
