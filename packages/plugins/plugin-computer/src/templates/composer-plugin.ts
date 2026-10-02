//
// Copyright 2026 DXOS.org
//

import { PLUGIN_DEV_SERVER_PORT } from '@dxos/app-framework';
import type * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import {
  GUIDE,
  IDS,
  PARENT_INSTRUCTIONS,
  type Variant,
  makeComposerPlugin,
  readGuide,
  writePlugin,
} from '@dxos/plugin-projects/Templates';
import { isTauri } from '@dxos/util';

import { SKILL_KEY } from '../skills/computer-skill.ts';

/** Where the run writes the plugin, under the Composer app's gitignored `temp/`. */
export const FOLDER = 'world-clock';

/** The dev manifest `composerPlugin` serves, and the URL Plugins → Dev Server loads by default. */
export const MANIFEST_URL = `http://localhost:${PLUGIN_DEV_SERVER_PORT}/manifest.json`;

/** The plugin's entry as the dev server compiles it on request. */
const ENTRY_URL = `http://localhost:${PLUGIN_DEV_SERVER_PORT}/src/plugin.tsx`;

/** Run by the reader from the Composer app directory: the Computer shell kills scripts that outlive its timeout. */
const DEV_SERVER_COMMAND = `node_modules/.bin/vite temp/plugins/${FOLDER}`;

// Loading the plugin is the reader's click, not a task, so a chat can run the plan end to end on its own.
const COMPUTER: Variant = {
  skill: SKILL_KEY,
  instructions: `${PARENT_INSTRUCTIONS}

Use the Computer skill's shell. It runs on the machine serving this app, and every command starts \
in the Composer app directory, so run the commands in the tasks exactly as written, without \`cd\`. \
Write files with a quoted bash heredoc.

The plugin's own Vite dev server serves \`temp/plugins/${FOLDER}\` at ${MANIFEST_URL}, and I run it. \
Never start it or build the plugin yourself, and never \`pnpm exec\`: \`vite build\` and \`pnpm exec\` rebuild \
Composer itself, and the app you are running in goes blank.

${IDS}`,
  steps: [
    readGuide(`It is \`../../../${GUIDE}\`.`),
    writePlugin(
      `temp/plugins/${FOLDER}`,
      "Leave `composerPlugin`'s dev port at its default, and set no build `outDir`: the dev server serves the source.",
    ),
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
  ],
};

/**
 * The browser version of plugin-projects' "Composer Plugin" template, which the desktop app offers itself: here
 * the agent writes the plugin with the Computer skill's shell, which only a vite server carries, so this plugin
 * contributes it, and the reader loads it from the plugin's dev server through Plugins → Dev Server.
 */
export const composerPlugin: ProjectCapabilities.Template | undefined = isTauri()
  ? undefined
  : makeComposerPlugin(COMPUTER);
