//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { PLUGIN_DEV_SERVER_PORT } from '@dxos/app-framework';
import * as Skill from '@dxos/compute/Skill';
import { Obj, Ref } from '@dxos/echo';
import type * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import { scaffoldProject } from '@dxos/plugin-projects/templates';
import { Task, TaskSet } from '@dxos/types';

import { SKILL_KEY } from '../skills/computer-skill.ts';

/** Where the run writes the plugin, under the Composer app's gitignored `temp/`. */
export const FOLDER = 'world-clock';

/** The dev manifest `composerPlugin` serves, and the URL Plugins → Dev Server loads by default. */
export const MANIFEST_URL = `http://localhost:${PLUGIN_DEV_SERVER_PORT}/manifest.json`;

/** The plugin's entry as the dev server compiles it on request. */
const ENTRY_URL = `http://localhost:${PLUGIN_DEV_SERVER_PORT}/src/plugin.tsx`;

/** Run by the reader from the Composer app directory: the Computer shell kills scripts that outlive its timeout. */
const DEV_SERVER_COMMAND = `node_modules/.bin/vite temp/plugins/${FOLDER} --strictPort`;

const INSTRUCTIONS = `Build the Composer plugin described by the task list in TypeScript, check it \
against its dev server, and offer it to me to load into this running app. The parent task is the \
whole run: set it started when you begin and done when its last subtask is done. Work the subtasks in \
order and set each one's status as you finish it: the task list is how I follow this run.

Use the Computer skill's shell. It runs on the machine serving this app, and every command starts \
in the Composer app directory, so run the commands in the tasks exactly as written, without \`cd\`. \
Write files with a quoted bash heredoc.

The plugin's own Vite dev server serves \`temp/plugins/${FOLDER}\` at ${MANIFEST_URL}, and I run it. \
Never start it or build the plugin yourself, and never \`pnpm exec\`: \`vite build\` and \`pnpm exec\` rebuild \
Composer itself, and the app you are running in goes blank.

Plugin, group, page and surface ids are camelCase: a hyphenated id is dropped without an error, \
and the plugin then loads with nothing to show.`;

type TaskSeed = Pick<Task.Task, 'title' | 'description' | 'estimate'>;

const PARENT: TaskSeed = {
  title: 'Build the World Clock plugin',
  description: 'From an empty folder to a plugin ready to load into this app: the four subtasks, in order.',
  estimate: 'm',
};

// Loading the plugin is the reader's click in Plugins settings, not a task, so a chat
// can run the plan end to end on its own.
const STEPS: ReadonlyArray<TaskSeed> = [
  {
    title: 'Read the plugin guide',
    description:
      'Read the "Example: a plugin with its own navtree group" and "Example: data, a form and another plugin\'s surface" sections of `../../../docs/src/content/docs/docs/composer/publishing-plugins.md`. Every file the plugin needs is in them; the rules list between them is where a first build goes wrong.',
    estimate: 'xs',
  },
  {
    title: 'Write the plugin in TypeScript',
    description: `Create \`dx.config.ts\`, \`vite.config.ts\`, \`tsconfig.json\` and \`src/plugin.tsx\` in \`temp/plugins/${FOLDER}/\`: a "World Clock" group in each space's navtree with a "Clocks" page under it. Define a \`Clock\` ECHO type holding its clocks, each a timezone and its position (from \`timezones\` in \`@dxos/react-ui-geo/data\`), one per space, stored on the first change; until then the page shows the reader's own timezone. The article shows plugin-map's \`World\` surface with a marker per clock and the Clock as its \`subject\`, and beneath it a single row of clock cards sorted west to east, each with a ghost delete button in its top-right corner (rendered after the card's text, or the text covers it) and showing the date, the time (24-hour, zero-padded, no AM/PM, ticking every second) and the timezone, then an empty card the same size as the clock cards with a large ghost plus button centered in it that opens a react-ui-form with a timezone select. Clicking a clock selects it with \`LayoutOperation.Select\`, which highlights its card and its pin on the map. Build the article from the guide's put-together example. Give each clock card \`data-testid="worldClock.clock"\`, the empty card \`data-testid="worldClock.new"\`, its plus button \`data-testid="worldClock.add"\` and each delete button \`data-testid="worldClock.delete"\`. Depend on \`org.dxos.plugin.map\` and tag it \`labs\` in \`dx.config.ts\`, as the guide does. Add to the navtree, never replace it: no workspace, no rail tab. Leave \`composerPlugin\`'s dev port at its default, and set no build \`outDir\`: the dev server serves the source.`,
    estimate: 's',
  },
  {
    title: 'Typecheck and check the dev server',
    description: `Run \`../../../node_modules/.bin/tsc -p temp/plugins/${FOLDER}/tsconfig.json\` without \`cd\`. Then \`curl -sf ${MANIFEST_URL}\`, and \`curl -s -o /dev/null -w '%{http_code}' ${ENTRY_URL}\`, which must print 200: the dev server compiles the entry on request, so a typecheck that passes is not evidence the app can import it. If the manifest does not answer, ask me to run \`${DEV_SERVER_COMMAND}\` from the Composer app directory, and wait.`,
    estimate: 'xs',
  },
  {
    title: 'Offer the plugin to load',
    description: `Tell me World Clock is ready and that I load it from Plugins settings: under Dev Server, whose Manifest URL defaults to ${MANIFEST_URL}, click Enable. Do not load it yourself: loading runs new code in this app, so it is the reader's click.`,
    estimate: 'xs',
  },
];

/** The parent task and its four subtasks, each subtask depending on the one before it. */
const makeTasks = (): Task.Task => {
  const subtasks = STEPS.map((step) => Task.make({ ...step, status: 'todo' }));
  for (const [index, task] of subtasks.entries()) {
    if (index > 0) {
      Obj.update(task, (task) => {
        task.dependsOn = [Ref.make(subtasks[index - 1])];
      });
    }
  }

  return Task.make({ ...PARENT, status: 'todo', subtasks: subtasks.map((task) => Ref.make(task)) });
};

/**
 * "Composer Plugin" project template: a chat writes a TypeScript Composer plugin with the host's own
 * toolchain, and the reader loads it from the plugin's dev server through Plugins → Dev Server.
 * Contributed here because the Computer skill is the only way its agent reaches that toolchain, so the
 * template is offered only where it can run.
 */
export const composerPlugin: ProjectCapabilities.Template = {
  id: 'org.dxos.project.composerPlugin',
  label: 'Composer Plugin',
  icon: 'ph--puzzle-piece--regular',
  scaffold: ({ name }) =>
    Effect.sync(() => {
      const project = scaffoldProject({
        name: name ?? 'Composer Plugin',
        description:
          'A TypeScript plugin that adds a world clock page, a map with a row of clocks, under its own group in the navtree of every space, built on this machine and loaded into the running app.',
        text: INSTRUCTIONS,
        skills: [Ref.fromURI(Skill.registryURI(SKILL_KEY))],
      });
      const taskSet = project.taskSet?.target;
      if (taskSet) {
        TaskSet.addTaskToSet(taskSet, makeTasks());
      }

      return project;
    }),
};
