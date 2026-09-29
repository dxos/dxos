//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import * as Skill from '@dxos/compute/Skill';
import { Obj, Ref } from '@dxos/echo';
import { Task, TaskSet } from '@dxos/types';
import { isTauri } from '@dxos/util';

import { type ProjectCapabilities } from '#types';

import { scaffoldProject } from './scaffold.ts';

/** Plain key rather than an import, so this plugin does not depend on plugin-sandbox (the `SkillsAnnotation` idiom). */
const SANDBOX_SKILL_KEY = 'org.dxos.skill.sandbox';

/** The sandbox the World Clock run builds in, named so the reader can find it in the navtree. */
const WORLD_CLOCK_SANDBOX = 'World Clock';

/**
 * What the app was built from, stamped by composer-app's vite config: the commit its `@dxos/*` packages
 * are published at on pkg.pr.new, and the versions of the libraries the host shares with a plugin.
 */
export const PluginToolchain = Schema.Struct({
  commit: Schema.String,
  versions: Schema.Record(Schema.String, Schema.String),
});

export interface PluginToolchain extends Schema.Schema.Type<typeof PluginToolchain> {}

/** The `@dxos/*` packages World Clock imports; everything else it builds with comes from npm. */
const DXOS_PACKAGES = [
  'app-framework',
  'app-graph',
  'app-toolkit',
  'echo',
  'echo-react',
  'react-ui',
  'react-ui-form',
  'react-ui-geo',
  'plugin-map',
];

/** The plugin guide, relative to the repository root. */
export const GUIDE = 'docs/src/content/docs/docs/composer/publishing-plugins.md';

/** pnpm checks `engines` against a node it cannot find under bun alone, and would skip rolldown's native binding. */
const NPMRC = 'node-version=24.11.1\n';

export const PARENT_INSTRUCTIONS = `Build the Composer plugin described by the task list in TypeScript, compile it \
with the official tooling, and offer it to me to load into this running app. The parent task is the \
whole run: set it started when you begin and done when its last subtask is done. Work the subtasks in \
order and set each one's status as you finish it: the task list is how I follow this run.`;

export const IDS = `Plugin, group, page and surface ids are camelCase: a hyphenated id is dropped without an error, \
and the plugin then loads with nothing to show.`;

export type TaskSeed = Pick<Task.Task, 'title' | 'description' | 'estimate'>;

/** What differs between a run on the Computer shell and one in a local sandbox. */
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

/** The guide's two examples hold every file the plugin needs. */
export const readGuide = (how: string): TaskSeed => ({
  title: 'Read the plugin guide',
  description: `${how} Read its "Example: a plugin with its own navtree group" and "Example: data, a form and another plugin's surface" sections. Every file the plugin needs is in them; the rules list between them is where a first build goes wrong.`,
  estimate: 'xs',
});

/** The plugin itself; `folder` is where its files go and `outDir` where its build lands. */
export const writePlugin = (folder: string, outDir: string, outDirReason: string, extra = ''): TaskSeed => ({
  title: 'Write the plugin in TypeScript',
  description: `Create \`dx.config.ts\`, \`vite.config.ts\`, \`tsconfig.json\` and \`src/plugin.tsx\` in \`${folder}/\`: a "World Clock" group in each space's navtree with a "Clocks" page under it. Define a \`Clock\` ECHO type holding its clocks, each a timezone and its position (from \`timezones\` in \`@dxos/react-ui-geo/data\`), one per space, stored on the first change; until then the page shows the reader's own timezone. The article shows plugin-map's \`World\` surface with a marker per clock and the Clock as its \`subject\`, and beneath it a single row of clock cards sorted west to east, each with a ghost delete button in its top-right corner (rendered after the card's text, or the text covers it) and showing the date, the time (24-hour, zero-padded, no AM/PM, ticking every second) and the timezone, then an empty card the same size as the clock cards with a large ghost plus button centered in it that opens a react-ui-form with a timezone select. Clicking a clock selects it with \`LayoutOperation.Select\`, which highlights its card and its pin on the map. Build the article from the guide's put-together example. Give each clock card \`data-testid="worldClock.clock"\`, the empty card \`data-testid="worldClock.new"\`, its plus button \`data-testid="worldClock.add"\` and each delete button \`data-testid="worldClock.delete"\`. Depend on \`org.dxos.plugin.map\` and tag it \`labs\` in \`dx.config.ts\`, as the guide does. Add to the navtree, never replace it: no workspace, no rail tab. Set the build \`outDir\` to \`'${outDir}'\` ${outDirReason}.${extra}`,
  estimate: 's',
});

/** The `package.json` that installs what the host was built from, so the plugin compiles against the API it runs on. */
export const packageJson = ({ commit, versions }: PluginToolchain): string =>
  JSON.stringify(
    {
      name: 'world-clock',
      version: '0.1.0',
      private: true,
      type: 'module',
      dependencies: {
        ...Object.fromEntries(
          DXOS_PACKAGES.map((name) => [`@dxos/${name}`, `https://pkg.pr.new/@dxos/${name}@${commit}`]),
        ),
        'effect': versions.effect,
        'react': versions.react,
        'react-dom': versions['react-dom'],
      },
      devDependencies: {
        '@types/react': versions['@types/react'],
        '@vitejs/plugin-react': versions['@vitejs/plugin-react'],
        'typescript': versions.typescript,
        'vite': versions.vite,
      },
    },
    null,
    2,
  );

/**
 * The desktop app runs the build in a local sandbox that holds nothing but the bun runtime the app ships:
 * the guide comes from GitHub and the packages from pkg.pr.new and npm, all pinned to what the app was built from.
 */
export const desktopVariant = (toolchain: PluginToolchain): Variant => ({
  skill: SANDBOX_SKILL_KEY,
  instructions: `${PARENT_INSTRUCTIONS}

Use the Sandbox skill. Before the first subtask, create one sandbox named "${WORLD_CLOCK_SANDBOX}" and run every command \
in it. It runs on this computer, every command starts in its workspace (the only directory it can write), and it \
holds nothing but \`bun\` and \`bunx\`: the tasks fetch everything else from GitHub, pkg.pr.new and npm. Run the \
commands in the tasks exactly as written, in the workspace, without \`cd\`. Write files with a quoted bash heredoc.

${IDS}`,
  steps: [
    readGuide(
      `Fetch it with \`curl -fsSL https://raw.githubusercontent.com/dxos/dxos/${toolchain.commit}/${GUIDE} -o guide.md\`: it is the guide for the version of Composer this app was built from.`,
    ),
    writePlugin(
      '.',
      'dist',
      'so the build lands in the folder the last subtask publishes',
      ` Beside them write this \`package.json\`, which pins every package to the build of this app, and an \`.npmrc\` holding \`${NPMRC.trim()}\`:\n\n\`\`\`json\n${packageJson(toolchain)}\n\`\`\``,
    ),
    {
      title: 'Install, typecheck and build',
      description:
        'Run `bunx @pnpm/exe@10 install` with a `timeout` of 900000 (it downloads a thousand packages), then `bun run --bun tsc -p tsconfig.json` (vite does not typecheck), then `bun run --bun vite build`. Then `cat dist/manifest.json`: a build that exited zero is not evidence that it wrote the manifest.',
      estimate: 'xs',
    },
    {
      title: 'Offer the plugin to load',
      description: `Publish the sandbox's \`dist\` directory with Publish Files, then emit a \`plugin-url-prompt\` surface carrying the URL it returns followed by \`manifest.json\`, and the name "World Clock". Do not load it yourself: loading runs new code in this app, so it is the reader's click.`,
      estimate: 'xs',
    },
  ],
});

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

/** The "Composer Plugin" template for one variant: a chat builds a TypeScript plugin and offers it back to load. */
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

const decodeToolchain = Schema.decodeUnknownOption(Schema.fromJsonString(PluginToolchain));

const readToolchain = (): PluginToolchain | undefined => {
  const stamped = import.meta.env?.VITE_DX_PLUGIN_TOOLCHAIN;
  return stamped ? Option.getOrUndefined(decodeToolchain(stamped)) : undefined;
};

/**
 * Offered in the desktop app, the one host with a local sandbox to build in, and only when the build stamped
 * the commit its packages are pinned to.
 */
export const composerPlugin = (): ProjectCapabilities.Template | undefined => {
  const toolchain = readToolchain();
  return isTauri() && toolchain ? makeComposerPlugin(desktopVariant(toolchain)) : undefined;
};
