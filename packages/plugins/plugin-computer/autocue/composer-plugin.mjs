//
// Copyright 2026 DXOS.org
//

import { rm } from 'node:fs/promises';

/**
 * An agent works the Composer Plugin project template's parent task and four subtasks to build the Space
 * Clock plugin, then the reader loads it, finds it in the registry, and opens its Clock page from the
 * navtree group it adds. Everything happens in the first space in the rail (My Space on a fresh profile).
 *
 * @mdl packages/plugins/plugin-computer/PLUGIN.mdl test QA-2
 * @app composer-app bundled dev build, served by `vite preview` on :4173, talking to EDGE preview
 *
 * Built and served from `packages/apps/composer-app`. Loading a plugin by URL needs the bundle's import
 * map, and the Computer shell only mounts in a vite server; EDGE production rejects the AI requests:
 *
 *   export DX_EDGE_BASE_URL=https://preview.dxos.network/ DX_ENVIRONMENT=dev DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true
 *   moon run composer-app:bundle
 *   pnpm exec vite preview --configLoader native --port 4173 --strictPort
 *
 * Step 1 is off-camera prep and persists in the profile. It also clears the last take: the Space Clock
 * plugin is uninstalled and its source and build folders are deleted, so the agent starts from nothing.
 */

const TWENTY_MIN = 20 * 60_000;

/** The Assistant's remote model; Composer's default (Claude Sonnet 5) left the delegated chat silent. */
const MODEL = 'DeepSeek V4 Pro';

const NUDGE = 'Start working on the tasks.';

/** The plugin the agent builds, as the template's tasks name it. */
const PLUGIN_NAME = 'Space Clock';

/** A beat for the viewer to read the registry card, which is the one shot that proves the load. */
const LINGER = 2_500;

/** The last take's source and build, relative to this file (`plugin-computer/autocue/`). */
const LEFTOVERS = [
  '../../../apps/composer-app/temp/plugins/space-clock/',
  '../../../../out/composer/plugins/space-clock/',
];

/** A plugin card in the registry list, by its display name. */
const card = (name) => `li[data-testid^="pluginList."]:has(span:text-is("${name}"))`;

/** The first space in the rail, where the take runs. */
const SPACE = '[data-testid="spacePlugin.space"] >> nth=0';

/** A narrow window collapses the navtree into an overlay; open it before clicking an item in it. */
const showSidebar = async ({ demo, page }, testId, label) => {
  if (!(await page.getByTestId(testId).first().isVisible())) {
    await demo.click({
      selector: 'button:visible:has-text("Open sidebar")',
      label: 'Open sidebar',
      hud: label !== undefined,
    });
  }
  await demo.click({ selector: `[data-testid="${testId}"]`, ...(label ? { label } : { hud: false }) });
};

/** Contributed by plugin-computer's `src/templates/composer-plugin.ts`. */
const TEMPLATE_ID = 'org.dxos.project.composerPlugin';

export const steps = [
  {
    // No `done`: every action here is idempotent, so a replay simply re-applies it.
    name: 'Prep (off camera): clear the last take, enable Coding (Dev), pick the model, dismiss notices',
    setup: true,
    run: async ({ demo, page }) => {
      for (const folder of LEFTOVERS) {
        await rm(new URL(folder, import.meta.url), { recursive: true, force: true });
      }

      // The toast mounts a few seconds after boot, so wait briefly for it rather than checking once.
      const notice = page.locator(
        '[data-testid="org.dxos.plugin.observability.notice"] button:not(:has-text("Settings"))',
      );
      if (
        await notice
          .first()
          .waitFor({ state: 'visible', timeout: 8_000 })
          .then(
            () => true,
            () => false,
          )
      ) {
        await notice.first().click();
      }
      // On a fresh profile the first click can land while the navtree is still settling; retry it.
      const filter = page.locator('input[placeholder="Filter…"]').first();
      for (let attempt = 0; attempt < 3; attempt++) {
        await demo.click({ selector: '[data-testid="treeView.pluginRegistry"]', hud: false });
        if (
          await filter.waitFor({ state: 'visible', timeout: 5_000 }).then(
            () => true,
            () => false,
          )
        ) {
          break;
        }
      }
      await demo.fill({ selector: 'input[placeholder="Filter…"]', value: 'Coding (Dev)', hud: false });
      const toggle = page.locator('input[id="org.dxos.plugin.computer-input"]');
      await toggle.waitFor({ state: 'visible', timeout: 10_000 });
      if (!(await toggle.isChecked())) {
        await toggle.click();
      }
      await demo.fill({ selector: 'input[placeholder="Filter…"]', value: '', hud: false });

      // A plugin loaded in an earlier take persists in the profile, enabled (Enabled) or not (Labs, by
      // its tag); uninstall it from its detail page.
      for (const category of ['installed', 'labs']) {
        const tab = page.getByTestId(`pluginRegistry.${category}`);
        if ((await tab.count()) === 0) {
          continue;
        }
        await showSidebar({ demo, page }, `pluginRegistry.${category}`);
        await page.waitForTimeout(500);
        if ((await page.locator(card(PLUGIN_NAME)).count()) > 0) {
          await demo.click({ selector: `${card(PLUGIN_NAME)} >> text=${PLUGIN_NAME}`, hud: false });
          await demo.click({ selector: 'button:has-text("Uninstall")', hud: false });
          await page.locator(card(PLUGIN_NAME)).waitFor({ state: 'detached', timeout: 10_000 });
        }
      }

      // A delegated chat runs on the settings' default model, not the chat picker's, so set it here.
      // The rail's settings button rather than ⌘, which the filter input swallows while it has focus.
      const model = page.locator('role=combobox[name="Remote language model"]').first();
      for (let attempt = 0; attempt < 3; attempt++) {
        await demo.click({ selector: '[data-testid="treeView.appSettings"]', hud: false });
        if (
          await model.waitFor({ state: 'visible', timeout: 5_000 }).then(
            () => true,
            () => false,
          )
        ) {
          break;
        }
      }
      await demo.click({ selector: 'role=combobox[name="Remote language model"]', hud: false });
      await demo.click({ selector: `role=option[name="${MODEL}"]`, hud: false });
      await page.locator('role=combobox[name="Remote language model"]', { hasText: MODEL }).waitFor();

      await demo.click({ selector: SPACE, hud: false });
    },
  },
  {
    name: 'Create a project from the Composer Plugin template',
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"] >> nth=0', label: 'Add to space' });
      await demo.click({ selector: '[data-testid="create-object-form.type.org.dxos.type.project"]', label: 'Project' });
      await demo.type({
        selector: '[data-testid="create-project-panel.template-input"]',
        value: 'Composer',
        label: 'Template',
      });
      await demo.click({ selector: `[role="option"][data-value="${TEMPLATE_ID}"]`, label: 'Composer Plugin' });
      await demo.click({ selector: '[role="dialog"] [data-testid="save-button"]', label: 'Create' });
      await page.getByTestId('projectsPlugin.tab.tasks').first().waitFor({ state: 'visible', timeout: 30_000 });
    },
  },
  {
    name: "Open the project's tasks",
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="projectsPlugin.tab.tasks"] >> nth=0', label: 'Tasks' });
      await page.getByTestId('taskList.item').nth(4).waitFor({ state: 'visible', timeout: 15_000 });
    },
  },
  {
    // Delegation sends only the ticked rows and the agent's checklist is flat, so tick the parent and every subtask.
    name: 'Select the parent task and its subtasks and assign them to the agent',
    run: async ({ demo, page }) => {
      const count = await page.getByTestId('taskList.item.checkbox').count();
      for (let index = 0; index < count; index++) {
        await demo.click({
          selector: `[data-testid="taskList.item"] >> nth=${index} >> [data-testid="taskList.item.checkbox"]`,
          label: 'Select task',
        });
      }
      await demo.click({
        selector: '[data-testid="projectsPlugin.delegateTasks"]',
        label: 'Assign selected tasks to agent',
      });
    },
  },
  {
    name: 'Open the agent session',
    run: async ({ demo, page }) => {
      // Assigning does not reliably bring the Assistant companion forward: the pane can be closed, or its
      // tab still mounting, so open the pane if needed and confirm the tab took rather than clicking once.
      await page.getByTestId('projectsPlugin.pipeline.chart').waitFor({ state: 'visible', timeout: 30_000 });
      const TAB = '[data-testid="deck.companion"] >> role=tab[name="Assistant"]';
      const tab = page.locator(TAB).first();
      const status = page.getByTestId('assistant.chat-status');
      const visible = (locator, timeout) =>
        locator.waitFor({ state: 'visible', timeout }).then(
          () => true,
          () => false,
        );
      for (let attempt = 0; attempt < 3; attempt++) {
        if (!(await visible(tab, 10_000))) {
          await demo.click({
            selector:
              '[data-testid="deck.plank"]:has([data-testid="projectsPlugin.pipeline.chart"]) [data-testid="plankHeading.companion"]',
            label: 'Open companion',
          });
          if (!(await visible(tab, 10_000))) {
            continue;
          }
        }
        if ((await tab.getAttribute('aria-selected')) !== 'true') {
          await demo.click({ selector: TAB, label: 'Assistant' });
        }
        if ((await tab.getAttribute('aria-selected')) === 'true' && (await visible(status, 15_000))) {
          return;
        }
      }
      throw new Error('the Assistant companion did not open after assigning the tasks');
    },
  },
  {
    // Showing the companion restarts the delegated agent, which drops its opening prompt (a known bug),
    // so the reader nudges it the way a person would.
    name: 'Ask the agent to start',
    run: async ({ demo, page }) => {
      const prompt = '[data-testid="deck.companion"] [data-testid="assistant.prompt"] .cm-content';
      await demo.type({ selector: prompt, value: NUDGE, label: 'Prompt' });
      await demo.press({ key: 'Enter' });
      await page.locator('[data-testid="deck.companion"]', { hasText: 'Generating' }).waitFor({ timeout: 60_000 });
    },
  },
  {
    name: 'Wait for the agent to offer the plugin',
    run: async ({ page }) => {
      await page.getByTestId('assistant.pluginUrlPrompt').waitFor({ state: 'visible', timeout: TWENTY_MIN });
    },
  },
  {
    // The prompt loads without enabling, so the plugin is turned on in the registry, on camera.
    name: 'Load the plugin',
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="assistant.pluginUrlPrompt.load"]', label: 'Load' });
      await page.waitForFunction((name) => composer.plugins().some((plugin) => plugin.name === name), PLUGIN_NAME, {
        timeout: 30_000,
      });
      await page.waitForTimeout(LINGER);
    },
  },
  {
    // The registry shot is the one that proves the load, so the side panels close first and the take
    // slows down: Labs after a beat, then the card, then the toggle.
    name: 'Enable the plugin in the registry',
    done: async ({ page }) =>
      page.evaluate((name) => composer.plugins().some((plugin) => plugin.name === name && plugin.enabled), PLUGIN_NAME),
    run: async ({ demo, page }) => {
      for (const label of ['Close companion', 'Close context sidebar']) {
        const button = page.locator(`button:has-text("${label}")`).first();
        if (await button.isVisible().catch(() => false)) {
          await demo.click({ selector: `button:has-text("${label}") >> nth=0`, label });
          await page.waitForTimeout(LINGER / 5);
        }
      }
      await demo.click({ selector: '[data-testid="treeView.pluginRegistry"]', label: 'Plugins' });
      await page.waitForTimeout(1_000);
      await showSidebar({ demo, page }, 'pluginRegistry.labs', 'Labs');
      const plugin = page.locator(card(PLUGIN_NAME));
      await plugin.waitFor({ state: 'visible', timeout: 10_000 });
      await plugin.scrollIntoViewIfNeeded();
      await demo.hover({ selector: card(PLUGIN_NAME), label: PLUGIN_NAME });
      await page.waitForTimeout(LINGER);
      const toggle = `${card(PLUGIN_NAME)} input[type="checkbox"]`;
      if (!(await page.locator(toggle).isChecked())) {
        await demo.click({ selector: toggle, label: 'Enable' });
      }
      await page.waitForFunction(
        (name) => composer.plugins().some((plugin) => plugin.name === name && plugin.active),
        PLUGIN_NAME,
        { timeout: 15_000 },
      );
      await page.waitForTimeout(LINGER);
    },
  },
  {
    name: 'Open the Clock page',
    run: async ({ demo, page }) => {
      await demo.click({ selector: SPACE, label: 'Space' });
      // The plugin adds a group to the space's navtree; the built-in groups must still be there beside it.
      const sidebar = page.getByTestId('deck.sidebar');
      await sidebar.getByText(PLUGIN_NAME, { exact: true }).first().waitFor({ state: 'visible', timeout: 15_000 });
      await sidebar.getByTestId('spacePlugin.collectionsSection').waitFor({ state: 'visible', timeout: 5_000 });
      await page.waitForTimeout(LINGER / 2);
      await demo.click({ selector: '[data-testid="deck.sidebar"] >> text="Clock"', label: 'Clock' });
      await page.locator('[data-testid="deck.plank"]', { hasText: 'Clock' }).first().waitFor({ state: 'visible' });
      await page.waitForTimeout(3_000);
    },
  },
];
