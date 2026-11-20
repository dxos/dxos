//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Skill from '@dxos/compute/Skill';
import { Database, Ref } from '@dxos/echo';
import * as MarkdownSkill from '@dxos/plugin-markdown/MarkdownSkill';
import * as Sheet from '@dxos/plugin-sheet/Sheet';
import { Text } from '@dxos/schema';
import { Outline } from '@dxos/types';

import { type TasksResult } from './tasks.ts';

export type ProjectInput = { tasks: TasksResult };

export type ProjectResult = { project: Project.Project; instructions: Instructions.Instructions };

/**
 * Bound to every chat the project delegates, so no task depends on the agent enabling a skill. Brain and Presenter are
 * named by key because plugin-debug does not depend on their plugins; a key with no plugin behind it binds nothing.
 */
const SKILL_KEYS = ['org.dxos.skill.brain', Sheet.SKILL_KEY, 'org.dxos.skill.presenter', MarkdownSkill.key] as const;

/** How every task is worked; each line is a step an agent otherwise loses a turn rediscovering, or gets wrong. */
const INSTRUCTIONS = `This project reports what sixty days of the Cloudflare Developers Discord say. The space's memory \
holds the facts a crawl of its product channels extracted: who asked what, what members use, what went wrong. Read it \
with the Brain skill (\`org.dxos.skill.brain\`); answer from the memory only, never from what you know about \
Cloudflare.

Each task asks one question and names the artifact its answer goes in. For each task:
1. Query the memory with SPARQL until the counts are complete. Survey first (the predicates and their counts), then \
read in windows of at most 50 rows; a result with a \`note\` is truncated.
2. Make the artifact the task names. Name it by what it shows ("Workers draws the most questions"), not by the task.
3. File it on this project and on the task in one call: Add project artifact with \`project\`, \`object\` and \`task\`.
4. Set the task to review, with one sentence in its log on what the artifact shows.

A sheet holds the data the chart is drawn from: a header row with the series names, the category (or the week) in \
the first column and one numeric column per series. Draw the chart with Add Chart over that range and \`header: true\`.

Report in aggregate. Describe people by their role, never by name or account, and leave out anything personal. A \
negated fact (factuality ending in "-") is something the source said is not so. A count of two or three is too small \
to carry a finding: say so in the artifact rather than drawing a trend from it.

Work only the tasks you are given, in order, and stop when each is in review.`;

/** The work-stream. It adopts the task set the tasks partial built, and starts with no artifacts: they are the output. */
export const ProjectPartial: SampleSpace.Partial<ProjectResult, ProjectInput> = SampleSpace.partial('project', {
  // `Project.make` builds an outline for the project, and the instructions' prose is stored as a Text, so both are
  // declared though neither is created here directly.
  schemas: [Project.Project, Instructions.Instructions, Outline.Outline, Text.Text],
  run: ({ tasks }: ProjectInput) =>
    Effect.gen(function* () {
      const instructions = yield* Database.add(
        Instructions.make({
          name: 'Cloudflare community',
          text: INSTRUCTIONS,
          skills: SKILL_KEYS.map((key) => Ref.fromURI(Skill.registryURI(key))),
          objects: [Ref.make(tasks.taskSet)],
        }),
      );

      const project = yield* Database.add(
        Project.make({
          name: 'Cloudflare community',
          description:
            'Findings from sixty days of the Cloudflare Developers Discord, read from the space memory: one sheet, brief or deck per task.',
          status: 'active',
          instructions: Ref.make(instructions),
          taskSet: Ref.make(tasks.taskSet),
        }),
      );

      return { project, instructions };
    }),
});
