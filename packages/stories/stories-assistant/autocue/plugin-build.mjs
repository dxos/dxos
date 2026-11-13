//
// Copyright 2026 DXOS.org
//

import { spawn } from 'node:child_process';
import { openSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * A scripted agent builds the World Clock plugin on this machine through three subagents, each in a column of its own:
 * one click on "Build." and the agent reads the Composer Plugin project's tasks, has a planner write the plan, then has
 * one subagent draw the architecture while another writes the code with Dev Shell's real harness. The reader keeps
 * talking meanwhile; each column closes once its subagent reports, and the agent typechecks the plugin, checks its dev
 * server and offers it, with the plan and the diagram, in its own column.
 *
 * @title Build a plugin with subagents
 * @mdl packages/plugins/plugin-dev-shell/PLUGIN.mdl test QA-3
 * @app storybook via `DX_STORIES=stories/stories-assistant moon run storybook-react:serve` on :9009,
 *   story `stories-stories-assistant-pluginbuild--manual` in isolation mode; the plugin's own Vite dev server on
 *   :3967, which the setup step starts
 */

const CHIP = '[data-testid="chat.suggestion"]';
const TASKS_TOGGLE = '[data-testid="assistant.toggle-tasks"]';

/** The Composer app directory, where the template's dev server command runs. */
const COMPOSER_APP = fileURLToPath(new URL('../../../apps/composer-app/', import.meta.url));

const MANIFEST = 'http://localhost:3967/manifest.json';

const answers = (url) =>
  fetch(url, { signal: AbortSignal.timeout(2_000) }).then(
    (response) => response.ok,
    () => false,
  );

/** Starts the plugin's dev server unless one already answers; detached, so it outlives the take. */
const ensureDevServer = async () => {
  if (await answers(MANIFEST)) {
    return;
  }
  const log = openSync(join(tmpdir(), 'autocue-plugin-build.vite.log'), 'w');
  const vite = join(COMPOSER_APP, 'node_modules/vite/bin/vite.js');
  spawn(process.execPath, [vite, 'temp/plugins/world-clock'], {
    cwd: COMPOSER_APP,
    detached: true,
    stdio: ['ignore', log, log],
  }).unref();
  for (let attempt = 0; attempt < 60 && !(await answers(MANIFEST)); attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
};

const COLUMN = '[data-testid="chat-plane.column"]';
const AGENT = `${COLUMN} >> nth=0`;

/** Waits until exactly `count` columns are open. */
const waitForCount = async (page, count, timeout) =>
  page.waitForFunction(([selector, count]) => document.querySelectorAll(selector).length === count, [COLUMN, count], {
    timeout,
  });

export const steps = [
  {
    name: 'Open the story',
    setup: true,
    run: async ({ page }) => {
      await ensureDevServer();
      await page.locator(CHIP).first().waitFor({ state: 'visible', timeout: 120_000 });
    },
  },
  {
    name: 'Start the build',
    narration: 'One click hands the agent the project: it reads its five tasks and splits the work.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Ask the agent to build', subtitle: 'Dev Shell PLUGIN.mdl QA-3' });
      await demo.click({ selector: `${CHIP}:has-text("Build.")`, label: 'Build.' });
      await page.getByText('Reading my checklist').first().waitFor({ state: 'visible', timeout: 30_000 });
    },
  },
  {
    name: 'Watch the plan',
    narration: 'A planner opens in a column of its own: it reads the guide on this machine and writes the plan.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'A subagent plans', subtitle: 'its own column, its own memory' });
      await waitForCount(page, 2, 60_000);
      await page.getByText('The plan is written').first().waitFor({ state: 'visible', timeout: 60_000 });
      await demo.sleep({ ms: 2_000 });
    },
  },
  {
    name: 'Watch the diagram and the code in parallel',
    narration: 'Then two subagents at once: one draws the architecture, the other writes the plugin on this machine.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Draw and code in parallel', subtitle: 'two columns side by side' });
      await page.locator(`${COLUMN}:has-text("Diagram ·")`).first().waitFor({ state: 'visible', timeout: 60_000 });
      await page.locator(`${COLUMN}:has-text("Code ·")`).first().waitFor({ state: 'visible', timeout: 30_000 });
      await demo.sleep({ ms: 4_000 });
    },
  },
  {
    name: 'Keep talking',
    narration: 'The reader keeps talking while they work, and the checklist shows where the build stands.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Keep talking', subtitle: 'the agent answers while they work' });
      // The agent's composer, with its checklist and chips, shows while its column is the selected one.
      await demo.click({ selector: AGENT, label: 'Agent' });
      await demo.click({ selector: TASKS_TOGGLE, label: 'Tasks' });
      await page.getByText('Write the plugin in TypeScript', { exact: true }).first().waitFor({ timeout: 15_000 });
      await demo.sleep({ ms: 2_500 });
      await demo.click({ selector: TASKS_TOGGLE, label: 'Tasks' });
      await demo.click({ selector: `${CHIP}:has-text("local time")`, label: 'Suggestion' });
      await page
        .getByText(/until you add a clock/)
        .first()
        .waitFor({ state: 'visible', timeout: 90_000 });
      await demo.sleep({ ms: 2_000 });
      // Selecting the middle column centres it, which brings all three back on screen.
      if (await page.locator(`${COLUMN}:has-text("Diagram ·")`).first().isVisible()) {
        await demo.click({ selector: `${COLUMN}:has-text("Diagram ·") >> nth=0`, label: 'Diagram' });
        await demo.sleep({ ms: 3_000 });
      }
    },
  },
  {
    name: 'Read the result',
    narration:
      'Each column closes as its subagent reports; the agent checks the plugin and offers it with the plan and the diagram.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Back in the main column', subtitle: 'typechecked, served, ready to load' });
      await page
        .getByText(/World Clock is ready/)
        .first()
        .waitFor({ state: 'visible', timeout: 180_000 });
      await waitForCount(page, 1, 60_000);
      await page
        .getByText(/World Clock is ready/)
        .last()
        .scrollIntoViewIfNeeded();
      await demo.sleep({ ms: 6_000 });
      await demo.click({ selector: TASKS_TOGGLE, label: 'Tasks' });
      await demo.sleep({ ms: 4_000 });
    },
  },
];
