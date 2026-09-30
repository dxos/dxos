//
// Copyright 2026 DXOS.org
//

import type * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import {
  GUIDE,
  IDS,
  PARENT_INSTRUCTIONS,
  type Variant,
  makeComposerPlugin,
  readGuide,
  writePlugin,
} from '@dxos/plugin-projects/templates';
import { isTauri } from '@dxos/util';

import { SKILL_KEY } from '../skills/computer-skill.ts';

/** Where the run writes the plugin, under the Composer app's gitignored `temp/`. */
export const FOLDER = 'world-clock';

/** The built manifest, as `vite preview` serves the Composer app's `out/composer`. */
export const MANIFEST_URL = `http://localhost:4173/plugins/${FOLDER}/manifest.json`;

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
    readGuide(`It is \`../../../${GUIDE}\`.`),
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
 * The browser version of plugin-projects' "Composer Plugin" template, which the desktop app offers itself: here
 * the agent builds with the Computer skill's shell, which only a vite server carries, so this plugin contributes it.
 */
export const composerPlugin: ProjectCapabilities.Template | undefined = isTauri()
  ? undefined
  : makeComposerPlugin(COMPUTER);
