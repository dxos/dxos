//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Skill from '@dxos/compute/Skill';
import { Obj, Ref } from '@dxos/echo';
import type * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import { scaffoldProject } from '@dxos/plugin-projects/templates';
import { Task, TaskSet } from '@dxos/types';

import { Sandbox } from '#types';

/** Where the plugin is written in the container: its own disk, since `/workspace` is a bucket mount. */
export const PLUGIN_DIR = '/root/world-clock';

/** The port the built plugin is served on inside the container. */
export const PORT = 8080;

/** The `@dxos/*` packages the plugin imports, installed from pkg.pr.new at the host's own commit. */
const DXOS_PACKAGES = [
  'app-framework',
  'app-graph',
  'app-toolkit',
  'echo',
  'echo-react',
  'react-ui',
  'react-ui-form',
  'plugin-map',
];

/** Versions the host's import map shares, so the build types what actually runs. */
const PACKAGES = [
  'effect@4.0.0-rc.117',
  'react@~19.2.7',
  'react-dom@~19.2.7',
  '@types/react@~19.2.17',
  'vite@^8.2.1',
  '@vitejs/plugin-react@^6.0.5',
  'typescript@^7.0.2',
];

const GUIDE_PATH = 'docs/src/content/docs/docs/composer/publishing-plugins.md';

type TaskSeed = Pick<Task.Task, 'title' | 'description' | 'estimate'>;

const PARENT: TaskSeed = {
  title: 'Build the World Clock plugin',
  description: 'From an empty sandbox to a plugin loaded into this app: the six subtasks, in order.',
  estimate: 'm',
};

const makeInstructions = () => `Build the Composer plugin described by the task list in TypeScript, compile it \
with the official tooling, and offer it to me to load into this running app. The parent task is the \
whole run: set it started when you begin and done when its last subtask is done. Work the subtasks in \
order and set each one's status as you finish it: the task list is how I follow this run.

Use the Sandbox skill: every command runs in one sandbox, a container on EDGE, which you create first. \
Pass that sandbox to every call. Work in \`${PLUGIN_DIR}\`, never under \`/workspace\`, and pass \`cwd\` \
rather than \`cd\`. Write files with a quoted bash heredoc.

A command that runs for more than a minute (an install, a build) must be started with \
\`background: true\`, its output redirected to a log file, and a marker file written when it ends; then \
poll the marker and read the log with short commands. A long command held open loses its connection \
while it keeps running, and its output is lost with it.

Plugin, group, page and surface ids are camelCase: a hyphenated id is dropped without an error, \
and the plugin then loads with nothing to show.`;

const makeSteps = (ref: string): ReadonlyArray<TaskSeed> => {
  const dxos = DXOS_PACKAGES.map((name) => `https://pkg.pr.new/dxos/dxos/@dxos/${name}@${ref}`).join(' ');
  return [
    {
      title: 'Create the sandbox and install the toolchain',
      description: `Create a sandbox named "World Clock". In \`${PLUGIN_DIR}\`, write a \`package.json\` of \`{"name":"world-clock","version":"0.1.0","private":true,"type":"module"}\`, then run in the background \`npm install --no-audit --no-fund ${dxos} ${PACKAGES.join(' ')} > install.log 2>&1; echo $? > install.done\`. It takes five to ten minutes: poll \`install.done\` until it exists, and read \`install.log\` if it is not \`0\`. A 404 from pkg.pr.new means this app was built from a commit that was never published there: run the install again with \`@main\` in place of \`@${ref}\`, and fetch the guide at \`main\` too.`,
      estimate: 's',
    },
    {
      title: 'Read the plugin guide',
      description: `Fetch \`https://raw.githubusercontent.com/dxos/dxos/${ref}/${GUIDE_PATH}\` in the sandbox and read the "Example: a plugin with its own navtree group" and "Example: data, a form and another plugin's surface" sections. Every file the plugin needs is in them; the rules list between them is where a first build goes wrong.`,
      estimate: 'xs',
    },
    {
      title: 'Write the plugin in TypeScript',
      description: `Create \`dx.config.ts\`, \`vite.config.ts\`, \`tsconfig.json\` and \`src/plugin.tsx\` in \`${PLUGIN_DIR}\`: a "World Clock" group in each space's navtree with a "Clocks" page under it. Define a \`Clock\` ECHO type holding an array of timezones, one per space, stored on the first change; until then the page shows the reader's own timezone. The article shows a world map from plugin-map's \`World\` surface with the \`equirectangular\` projection and \`contain\` fit, and beneath it a single row of clock cards, each with a ghost delete button in its top-right corner (rendered after the card's text, or the text covers it) and showing the date, the time (24-hour, zero-padded, no AM/PM, ticking every second) and the timezone, then an empty card the same size as the clock cards with a large ghost plus button centered in it that opens a react-ui-form with a timezone select. Build the article from the guide's put-together example: the map fills the width, every card has one fixed size (opening the form moves nothing) and a visible border. Keep it simple: do not shade daylight or place the clocks on the map. Give each clock card \`data-testid="worldClock.clock"\`, the empty card \`data-testid="worldClock.new"\`, its plus button \`data-testid="worldClock.add"\` and each delete button \`data-testid="worldClock.delete"\`. Depend on \`org.dxos.plugin.map\` and tag it \`labs\` in \`dx.config.ts\`, as the guide does. Add to the navtree, never replace it: no workspace, no rail tab. Keep the build \`outDir\` at \`dist\`.`,
      estimate: 's',
    },
    {
      title: 'Typecheck and build',
      description: `Run \`./node_modules/.bin/tsc -p tsconfig.json\`, then \`./node_modules/.bin/vite build\`, both with \`cwd\` \`${PLUGIN_DIR}\`. The build writes \`dist/manifest.json\` and \`dist/index.mjs\`; list \`dist\` to confirm.`,
      estimate: 'xs',
    },
    {
      title: 'Serve and expose the plugin',
      description: `Start \`python3 -m http.server ${PORT} --directory ${PLUGIN_DIR}/dist\` with \`background: true\`, then expose port ${PORT} with ExposePort. The manifest URL is the returned URL followed by \`manifest.json\`. Fetch it from the sandbox with \`curl -fsS\`: a server that started is not evidence that the app can reach it.`,
      estimate: 'xs',
    },
    {
      title: 'Offer the plugin to load',
      description:
        'Emit a `plugin-url-prompt` surface carrying the manifest URL and the name "World Clock". Do not load it yourself: loading runs new code in this app, so it is the reader\'s click.',
      estimate: 'xs',
    },
  ];
};

/** The parent task and its subtasks, each subtask depending on the one before it. */
const makeTasks = (ref: string): Task.Task => {
  const subtasks = makeSteps(ref).map((step) => Task.make({ ...step, status: 'todo' }));
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
 * "Composer Plugin (Sandbox)" project template: a chat builds a TypeScript Composer plugin in an EDGE
 * sandbox, serves the build from the container on a port exposed at a public URL, and offers that URL
 * back as an inline load prompt — so it runs against any deployed Composer, not only one served locally.
 *
 * @param ref Commit the host was built from; its `@dxos/*` packages and the guide are fetched at it.
 */
export const makeComposerPluginTemplate = ({ ref }: { ref: string }): ProjectCapabilities.Template => ({
  id: 'org.dxos.project.composerPluginSandbox',
  label: 'Composer Plugin (Sandbox)',
  icon: 'ph--puzzle-piece--regular',
  scaffold: ({ name }) =>
    Effect.sync(() => {
      const project = scaffoldProject({
        name: name ?? 'Composer Plugin',
        description:
          'A TypeScript plugin that adds a world clock page, a map with a row of clocks, under its own group in the navtree of every space, built in an EDGE sandbox and loaded into the running app from the port it is served on.',
        text: makeInstructions(),
        skills: [Ref.fromURI(Skill.registryURI(Sandbox.SKILL_KEY))],
      });
      const taskSet = project.taskSet?.target;
      if (taskSet) {
        TaskSet.addTaskToSet(taskSet, makeTasks(ref));
      }

      return project;
    }),
});
