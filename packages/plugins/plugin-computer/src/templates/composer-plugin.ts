//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Skill from '@dxos/compute/Skill';
import { Obj, Ref } from '@dxos/echo';
import type * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import { scaffoldProject } from '@dxos/plugin-projects/templates';
import { SKILL_KEY as SANDBOX_SKILL_KEY } from '@dxos/plugin-sandbox/Sandbox';
import { Task, TaskSet } from '@dxos/types';
import { isTauri } from '@dxos/util';

import { SKILL_KEY } from '../skills/computer-skill.ts';

/** Where the run writes the plugin, under the Composer app's gitignored `temp/`. */
export const FOLDER = 'world-clock';

/** The built manifest, as `vite preview` serves the Composer app's `out/composer`. */
export const MANIFEST_URL = `http://localhost:4173/plugins/${FOLDER}/manifest.json`;

/** The sandbox the desktop variant builds in, named so the reader can find it in the navtree. */
export const SANDBOX_NAME = 'World Clock';

/**
 * The Composer source tree a desktop dev build was bundled from (composer-app's vite config sets it; local
 * sandboxes may read it). Absent in a browser build's runtime and in release builds.
 */
const SOURCE_ROOT: string | undefined = import.meta.env.VITE_DX_SOURCE_ROOT || undefined;

const PARENT_INSTRUCTIONS = `Build the Composer plugin described by the task list in TypeScript, compile it \
with the official tooling, and offer it to me to load into this running app. The parent task is the \
whole run: set it started when you begin and done when its last subtask is done. Work the subtasks in \
order and set each one's status as you finish it: the task list is how I follow this run.`;

const IDS = `Plugin, group, page and surface ids are camelCase: a hyphenated id is dropped without an error, \
and the plugin then loads with nothing to show.`;

type TaskSeed = Pick<Task.Task, 'title' | 'description' | 'estimate'>;

/** What differs between a run on the Computer shell and one in a desktop sandbox. */
export type Variant = {
  skill: string;
  instructions: string;
  steps: ReadonlyArray<TaskSeed>;
};

const PARENT: TaskSeed = {
  title: 'Build the World Clock plugin',
  description: 'From an empty folder to a plugin loaded into this app: the four subtasks, in order.',
  estimate: 'm',
};

const GUIDE = 'docs/src/content/docs/docs/composer/publishing-plugins.md';

const readGuide = (path: string): TaskSeed => ({
  title: 'Read the plugin guide',
  description: `Read the "Example: a plugin with its own navtree group" and "Example: data, a form and another plugin's surface" sections of \`${path}\`. Every file the plugin needs is in them; the rules list between them is where a first build goes wrong.`,
  estimate: 'xs',
});

const writePlugin = (folder: string, outDir: string, outDirReason: string): TaskSeed => ({
  title: 'Write the plugin in TypeScript',
  description: `Create \`dx.config.ts\`, \`vite.config.ts\`, \`tsconfig.json\` and \`src/plugin.tsx\` in \`${folder}/\`: a "World Clock" group in each space's navtree with a "Clocks" page under it. Define a \`Clock\` ECHO type holding its clocks, each a timezone and its position (from \`timezones\` in \`@dxos/react-ui-geo/data\`), one per space, stored on the first change; until then the page shows the reader's own timezone. The article shows plugin-map's \`World\` surface with a marker per clock and the Clock as its \`subject\`, and beneath it a single row of clock cards sorted west to east, each with a ghost delete button in its top-right corner (rendered after the card's text, or the text covers it) and showing the date, the time (24-hour, zero-padded, no AM/PM, ticking every second) and the timezone, then an empty card the same size as the clock cards with a large ghost plus button centered in it that opens a react-ui-form with a timezone select. Clicking a clock selects it with \`LayoutOperation.Select\`, which highlights its card and its pin on the map. Build the article from the guide's put-together example. Give each clock card \`data-testid="worldClock.clock"\`, the empty card \`data-testid="worldClock.new"\`, its plus button \`data-testid="worldClock.add"\` and each delete button \`data-testid="worldClock.delete"\`. Depend on \`org.dxos.plugin.map\` and tag it \`labs\` in \`dx.config.ts\`, as the guide does. Add to the navtree, never replace it: no workspace, no rail tab. Set the build \`outDir\` to \`'${outDir}'\` ${outDirReason}.`,
  estimate: 's',
});

// Loading the plugin is the reader's click on the prompt the last subtask emits, not a task, so a chat
// can run the plan end to end on its own.
const COMPUTER: Variant = {
  skill: SKILL_KEY,
  instructions: `${PARENT_INSTRUCTIONS}

Use the Computer skill's shell. It runs on the machine serving this app, and every command starts \
in the Composer app directory, which \`vite preview\` serves at http://localhost:4173 — so run the \
commands in the tasks exactly as written, without \`cd\`. Write files with a quoted bash heredoc.

Never run \`vite build\` without the \`temp/plugins/${FOLDER}\` argument, and never \`pnpm exec\`: both \
rebuild Composer itself, and the app you are running in goes blank.

${IDS}`,
  steps: [
    readGuide(`../../../${GUIDE}`),
    writePlugin(
      `temp/plugins/${FOLDER}`,
      `../../../out/composer/plugins/${FOLDER}`,
      'so the build lands where `vite preview` serves it',
    ),
    {
      title: 'Typecheck and build',
      description: `Run \`../../../node_modules/.bin/tsc -p temp/plugins/${FOLDER}/tsconfig.json\`, then \`node_modules/.bin/vite build temp/plugins/${FOLDER}\`, without \`cd\`. Then \`curl ${MANIFEST_URL}\`: a build that exited zero is not evidence that the app can fetch it.`,
      estimate: 'xs',
    },
    {
      title: 'Offer the plugin to load',
      description: `Emit a \`plugin-url-prompt\` surface carrying \`${MANIFEST_URL}\` and the name "World Clock". Do not load it yourself: loading runs new code in this app, so it is the reader's click.`,
      estimate: 'xs',
    },
  ],
};

/**
 * The desktop app has no vite server to carry the Computer shell, so the run happens in a local sandbox
 * instead: it reads the toolchain of the source tree the app was built from, writes only its own workspace,
 * and serves the build to the app through the Sandbox skill's Publish Files.
 */
export const desktopVariant = (sourceRoot: string): Variant => {
  const plugin = `plugins/${FOLDER}`;
  return {
    skill: SANDBOX_SKILL_KEY,
    instructions: `${PARENT_INSTRUCTIONS}

Use the Sandbox skill. Before the first subtask, create one sandbox named "${SANDBOX_NAME}" and run every command \
in it; it runs on this computer, and every command starts in its workspace, the only directory it can write. The \
Composer source tree this app was built from is readable at \`${sourceRoot}\`. Link its toolchain into the \
workspace once, with \`mkdir -p plugins && ln -sfn ${sourceRoot}/node_modules node_modules && ln -sfn \
${sourceRoot}/packages/apps/composer-app/node_modules plugins/node_modules\`, then run the commands in the tasks \
exactly as written, without \`cd\`. Write files with a quoted bash heredoc.

${IDS}`,
    steps: [
      readGuide(`${sourceRoot}/${GUIDE}`),
      writePlugin(plugin, 'dist', 'so the build lands in the folder the last subtask publishes'),
      {
        title: 'Typecheck and build',
        description: `Run \`node_modules/.bin/tsc -p ${plugin}/tsconfig.json\`, then \`plugins/node_modules/.bin/vite build --configLoader runner ${plugin}\`, without \`cd\`. Then \`cat ${plugin}/dist/manifest.json\`: a build that exited zero is not evidence that it wrote the manifest.`,
        estimate: 'xs',
      },
      {
        title: 'Offer the plugin to load',
        description: `Publish the sandbox's \`${plugin}/dist\` directory with Publish Files, then emit a \`plugin-url-prompt\` surface carrying the URL it returns followed by \`manifest.json\`, and the name "World Clock". Do not load it yourself: loading runs new code in this app, so it is the reader's click.`,
        estimate: 'xs',
      },
    ],
  };
};

/** The parent task and its four subtasks, each subtask depending on the one before it. */
const makeTasks = (steps: ReadonlyArray<TaskSeed>): Task.Task => {
  const subtasks = steps.map((step) => Task.make({ ...step, status: 'todo' }));
  for (const [index, task] of subtasks.entries()) {
    if (index > 0) {
      Obj.update(task, (task) => {
        task.dependsOn = [Ref.make(subtasks[index - 1])];
      });
    }
  }

  return Task.make({ ...PARENT, status: 'todo', subtasks: subtasks.map((task) => Ref.make(task)) });
};

/** The template for one variant; {@link composerPlugin} picks the one this runtime can run. */
export const makeComposerPlugin = (variant: Variant): ProjectCapabilities.Template => ({
  id: 'org.dxos.project.composerPlugin',
  label: 'Composer Plugin',
  icon: 'ph--puzzle-piece--regular',
  scaffold: ({ name }) =>
    Effect.sync(() => {
      const project = scaffoldProject({
        name: name ?? 'Composer Plugin',
        description:
          'A TypeScript plugin that adds a world clock page, a map with a row of clocks, under its own group in the navtree of every space, built on this machine and loaded into the running app.',
        text: variant.instructions,
        skills: [Ref.fromURI(Skill.registryURI(variant.skill))],
      });
      const taskSet = project.taskSet?.target;
      if (taskSet) {
        TaskSet.addTaskToSet(taskSet, makeTasks(variant.steps));
      }

      return project;
    }),
});

/**
 * "Composer Plugin" project template: a chat builds a TypeScript Composer plugin with the host's own
 * toolchain and offers it back as an inline load prompt. Contributed here because the Computer skill
 * is the only way its agent reaches that toolchain in a browser, so the template is offered only where it
 * can run; the desktop app, which has no Computer shell, runs it in a local sandbox instead.
 */
export const composerPlugin: ProjectCapabilities.Template = makeComposerPlugin(
  isTauri() && SOURCE_ROOT ? desktopVariant(SOURCE_ROOT) : COMPUTER,
);
