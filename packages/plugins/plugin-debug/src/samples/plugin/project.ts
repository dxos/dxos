//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Skill from '@dxos/compute/Skill';
import { Database, Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { Outline } from '@dxos/types';

import { type TasksResult } from './tasks.ts';
import { FOLDER } from './util.ts';

export type ProjectInput = { tasks: TasksResult };

export type ProjectResult = { project: Project.Project; instructions: Instructions.Instructions };

/** Contributed by plugin-computer: the shell on the machine serving this app. */
const COMPUTER_SKILL = 'org.dxos.skill.computer';

const INSTRUCTIONS = `Build the Composer plugin described by the task list in TypeScript, compile it \
with the official tooling, and offer it to me to load into this running app. Work the tasks in \
order and set each one's status as you finish it: the task list is how I follow this run.

Use the Computer skill's shell. It runs on the machine serving this app, and every command starts \
in the Composer app directory, which \`vite preview\` serves at http://localhost:4173 — so run the \
commands in the tasks exactly as written, without \`cd\`. Write files with a quoted bash heredoc.

Never run \`vite build\` without the \`temp/plugins/${FOLDER}\` argument, and never \`pnpm exec\`: both \
rebuild Composer itself, and the app you are running in goes blank.

Plugin, group, page and surface ids are camelCase: a hyphenated id is dropped without an error, \
and the plugin then loads with nothing to show.`;

/**
 * The work-stream. It adopts the task set the tasks phase built and binds the Computer skill by
 * registry URI — it is contributed by a plugin rather than stored here, and binding is how a
 * delegated chat gets its tools.
 */
export const ProjectPhase: SampleSpace.Phase<ProjectResult, ProjectInput> = SampleSpace.phase('project', {
  // `Project.make` builds an outline for the project and the instructions' prose is stored as a
  // Text; a phase has to declare every type it persists or the space cannot register it.
  schemas: [Project.Project, Instructions.Instructions, Outline.Outline, Text.Text],
  run: Effect.fnUntraced(function* ({ tasks }: ProjectInput) {
    const instructions = yield* Database.add(
      Instructions.make({
        name: 'Composer Plugin',
        description: 'Bindings for a chat working this project.',
        text: INSTRUCTIONS,
        skills: [Ref.fromURI(Skill.registryURI(COMPUTER_SKILL))],
        objects: [Ref.make(tasks.taskSet)],
      }),
    );

    const project = yield* Database.add(
      Project.make({
        name: 'Composer Plugin',
        description:
          'A TypeScript plugin that adds a live clock page under its own group in the navtree of every space, built on this machine and loaded into the running app.',
        status: 'active',
        instructions: Ref.make(instructions),
        taskSet: Ref.make(tasks.taskSet),
      }),
    );

    return { project, instructions };
  }),
});
