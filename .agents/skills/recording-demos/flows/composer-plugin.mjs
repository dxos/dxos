//
// Copyright 2026 DXOS.org
//

/**
 * An agent works the four tasks of the Composer Plugin space template to build the Space Clock plugin,
 * then the reader loads it and opens its Clock page.
 *
 * @mdl none — walks plugin-debug's Composer Plugin space template (`packages/plugins/plugin-debug/src/samples/plugin`)
 * @app composer-app bundled dev build, served by `vite preview` on :4173, talking to EDGE preview
 *
 * Built and served from `packages/apps/composer-app`. Loading a plugin by URL needs the bundle's import
 * map, and the Computer shell only mounts in a vite server; EDGE production rejects the AI requests:
 *
 *   export DX_EDGE_BASE_URL=https://preview.dxos.network/ DX_ENVIRONMENT=dev DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true
 *   pnpm exec vite build --configLoader native
 *   pnpm exec vite preview --configLoader native --port 4173 --strictPort
 *
 * Remove `temp/plugins/space-clock` and `out/composer/plugins/space-clock` first, so the agent starts
 * from an empty folder. Step 1 is off-camera prep and persists in the profile.
 */

const TWENTY_MIN = 20 * 60_000;

/** The Assistant's remote model; Composer's default (Claude Sonnet 5) left the delegated chat silent. */
const MODEL = 'DeepSeek V4 Pro';

const NUDGE = 'Start working on the tasks.';

export const steps = [
  {
    // No `done`: every action here is idempotent, so a replay simply re-applies it.
    name: 'Prep (off camera): enable Coding (Dev), pick the model, dismiss notices',
    setup: true,
    run: async ({ demo, page }) => {
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

      await demo.click({ selector: '[data-testid="spacePlugin.space"]', hud: false });
    },
  },
  {
    name: 'Create a space from the Composer Plugin template',
    done: async ({ page }) =>
      (await page.locator('[data-testid="spacePlugin.space"]:has-text("Composer Plugin")').count()) > 0,
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="spacePlugin.addSpace"]', label: 'Menu' });
      await demo.click({ text: 'Create space', exact: true });
      const dialog = page.getByTestId('create-space-dialog');
      await dialog.waitFor({ state: 'visible', timeout: 10_000 });
      await demo.click({
        selector: '[data-testid="create-space-dialog"] [role="option"]:has-text("Composer Plugin")',
        label: 'Composer Plugin',
      });
      await demo.click({
        selector: '[data-testid="create-space-dialog"] [data-testid="save-button"]',
        label: 'Create',
      });
      await dialog.waitFor({ state: 'hidden', timeout: 30_000 });
    },
  },
  {
    name: 'Open the project and its tasks',
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="spacePlugin.spaceHome"]', label: 'Home' });
      await demo.click({
        selector: '[role="button"]:has(use[href="#ph--stack--regular"]):has-text("Composer Plugin")',
        label: 'Composer Plugin project',
      });
      await demo.click({ selector: '[data-testid="projectsPlugin.tab.tasks"]', label: 'Tasks' });
      await page.getByTestId('taskList.item').first().waitFor({ state: 'visible', timeout: 15_000 });
    },
  },
  {
    name: 'Select all four tasks and assign them to the agent',
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
    name: 'Load the plugin',
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="assistant.pluginUrlPrompt.load"]', label: 'Load' });
      await page.getByText('Space Clock').first().waitFor({ state: 'visible', timeout: 30_000 });
    },
  },
  {
    name: 'Open the Clock page',
    run: async ({ demo, page }) => {
      await demo.click({ text: 'Space Clock', exact: true });
      await demo.click({ text: 'Clock', exact: true });
      await page.waitForTimeout(3_000);
    },
  },
];
