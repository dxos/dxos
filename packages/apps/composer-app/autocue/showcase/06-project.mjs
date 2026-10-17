//
// Copyright 2026 DXOS.org
//

/**
 * Showcase scene 6: an agent wrote a plugin. Starts from a World Clock project an agent has already finished:
 * open its tasks (all done), open one to see the agent's work, then open the plugin's Clocks page and flip the
 * map to a globe.
 *
 * @mdl packages/apps/composer-app/spec/APP.mdl test QA-13
 * @app composer-app bundled dev build against EDGE preview (launch config `composer-showcase`, :4183), on a
 *   profile where `plugin-computer/autocue/composer-plugin.mjs` has run to the end (its dev server on :3967 must
 *   still be up), or against EDGE dev after `plugin-projects/autocue/composer-plugin-registry.mjs`, which builds
 *   the plugin in a Cloudflare Sandbox and installs it from the private registry.
 */

const { prep } = await import(`./01-home.mjs${new URL(import.meta.url).search}`);

/** A beat for the viewer after a visible change. */
const BEAT = 1_200;

const PROJECT = 'World Clock';
const SIDEBAR = '[data-testid="deck.sidebar"]';
const PROJECT_ROW = `${SIDEBAR} [data-part="branch-control"]:has(> [data-testid="treeItem.heading"]:text-is("${PROJECT}"))`;
const TASK_ROW = '[data-testid="deck.plank"] [data-testid="taskList.item"]';

export const steps = [
  prep,
  {
    name: 'Setup (off camera): the finished project and its plugin are here',
    setup: true,
    run: async ({ page }) => {
      await page.locator(PROJECT_ROW).first().waitFor({ state: 'attached', timeout: 15_000 });
      await page.waitForFunction(
        () => composer.plugins().some((plugin) => plugin.id === 'org.example.plugin.worldClock' && plugin.active),
        undefined,
        { timeout: 30_000 },
      );
    },
  },
  {
    name: 'Open the project',
    narration: 'Projects go further. Describe a plugin, and an agent plans the work, writes the code and tests it.',
    run: async ({ demo, page }) => {
      await demo.click({ selector: `${PROJECT_ROW} >> [data-testid="treeItem.heading"] >> nth=0`, label: PROJECT });
      await demo.click({ selector: '[data-testid="projectsPlugin.tab.tasks"] >> nth=0', label: 'Tasks' });
      await page.locator(TASK_ROW).first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Look over the finished tasks',
    narration: 'It runs in a sandbox at the edge, and every step it took is recorded on the project.',
    run: async ({ demo, page }) => {
      const count = Math.min(await page.locator(TASK_ROW).count(), 3);
      for (let index = 0; index < count; index++) {
        await demo.click({
          selector: `${TASK_ROW} >> nth=${index} >> [data-testid="taskList.item.title"]`,
          label: 'Task',
        });
        await page.waitForTimeout(BEAT);
      }
    },
  },
  {
    name: 'Open the plugin it built',
    narration: 'Here it is, installed: a world clock that wasn’t part of Composer this morning.',
    run: async ({ demo, page }) => {
      await prep.run({ page });
      await page.locator(`${SIDEBAR} >> text="Clocks"`).first().waitFor({ state: 'visible', timeout: 15_000 });
      await demo.click({ selector: `${SIDEBAR} >> text="Clocks"`, label: 'Clocks' });
      await page.getByTestId('worldClock.clock').first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT);
      await demo.click({ selector: '[data-testid="worldMap.toggle"]', label: 'Globe' });
      await page.waitForTimeout(BEAT * 3);
    },
  },
];
