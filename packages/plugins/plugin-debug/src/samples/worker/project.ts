//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Skill from '@dxos/compute/Skill';
import { Database, Ref } from '@dxos/echo';
import * as DrawingSkill from '@dxos/plugin-illustrator/DrawingSkill';
import * as MarkdownSkill from '@dxos/plugin-markdown/MarkdownSkill';
import { Text } from '@dxos/schema';
import { Outline } from '@dxos/types';

import { type TasksResult } from './tasks.ts';

export type ProjectInput = { tasks: TasksResult };

export type ProjectResult = { project: Project.Project; instructions: Instructions.Instructions };

/** Bound to every chat the project delegates, so the spec and diagram tasks never depend on the agent enabling them. */
const SKILL_KEYS = [MarkdownSkill.key, DrawingSkill.key] as const;

const INSTRUCTIONS = `Deploy the Worker this project's spec describes. The task list is how I follow this run: \
work it in order, setting each task's status as you finish it.

The spec (\`Hello Worker\`, in this space) states the greeting endpoint and only names the rest; the feature map \
lists every feature. Complete the spec first, editing it in place through the Markdown skill \
(\`org.dxos.skill.markdown\`). Then draw the plan as a diagram on the canvas through the Drawing skill \
(\`org.dxos.skill.drawing\`): state the boxes, arrows and groups in its semantic diagram language and let the \
layout engine place them, then file the drawing on this project. Then add the implementation tasks yourself, one \
per step, each linked to the feature it moves, and work them. If a step starts to look like architecture, it is \
the wrong step.

What the plan must account for:
- Write the code yourself in one sandbox, through the Sandbox skill (\`org.dxos.skill.sandbox\`). It keeps its \
filesystem between commands, so a second sandbox pays for node and wrangler again. The sandbox image ships a coding \
agent of its own; do not delegate to it - it has none of this space's context.
- \`wrangler deploy --temporary\` mints a temporary Cloudflare account and prints a Worker URL and a claim URL; \
plain \`wrangler deploy\` refuses non-interactively and demands a token. \`--temporary\` needs wrangler 4.102 or \
later, which needs Node 22, and the sandbox runs Node 20: install \`wrangler@latest\` explicitly and run it under \
\`npx --yes node@22 node_modules/wrangler/bin/wrangler.js\`.
- A deploy that exited zero is not evidence that anything is serving: fetch the URL and check the body.
- The claim URL is a bearer credential for the account: give it to me directly and file it nowhere. Claiming \
needs a browser, so that step is mine, and it comes after the last deploy - an agent with no login cannot update a \
claimed account. The account expires within the hour.

The container is not durable, so file what has to outlive it - the Worker URL, the response body - as artifacts on \
this project in the turn you produce it. This project needs no Cloudflare login and no API keys; if a step seems \
to need either, that is the wrong step.`;

/**
 * The work-stream. It adopts the task set the tasks partial built (`Project.make` would otherwise
 * create its own empty one), and starts with no artifacts: the URL and the response are what the
 * run produces, and seeding either would name something that does not exist. The instructions carry what the
 * agent's plan must know about wrangler and the claim, since the agent writes the implementation tasks itself.
 */
export const ProjectPartial: SampleSpace.Partial<ProjectResult, ProjectInput> = SampleSpace.partial('project', {
  // Neither `Outline.Outline` nor `Text.Text` is created here directly: `Project.make` builds an
  // outline for the project, and the instructions' prose is stored as a Text. A partial has to declare
  // every type it persists or the space cannot register it.
  schemas: [Project.Project, Instructions.Instructions, Outline.Outline, Text.Text],
  run: ({ tasks }: ProjectInput) =>
    Effect.gen(function* () {
      const instructions = yield* Database.add(
        Instructions.make({
          name: 'Hello Worker',
          text: INSTRUCTIONS,
          skills: SKILL_KEYS.map((key) => Ref.fromURI(Skill.registryURI(key))),
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
