//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (20s): Open a task of the Chess MCP on Workers project, then tick it and send it to the agent.
 *
 * @mdl packages/plugins/plugin-projects/PLUGIN.mdl test QA-5
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `tools/autocue/showcase/overnight.mjs`; rules in tools/autocue/showcase/docs/SHOWCASE.md.
 */

import { LONG_MS, fromTemplate, reveal, showcase } from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = LONG_MS;

export const steps = showcase({
  name: 'projects',
  caption: 'Open a task of the Chess MCP on Workers project, then tick it and send it to the agent.',
  plugins: ['debug', 'projects'],
  ms: CLIP_MS,
  setup: async ({ page }) => {
    await fromTemplate(page, 'Chess MCP on Workers', { waitFor: 'Projects' });
    await reveal(page, ['Projects']);
    await page.locator('[data-testid="treeItem.heading"]:text-is("Chess MCP on Workers")').first().click();
    await page.waitForTimeout(2_000);
    await page.locator('[data-testid="projectsPlugin.tab.tasks"]').first().click();
    await page.waitForTimeout(1_500);
  },
  clip: async ({ page }) => {
    const row = page.locator('[data-testid="deck.plank"] [data-testid="taskList.item"]').first();
    // Selecting a task opens its properties.
    await row.locator('[data-testid="taskList.item.title"]').first().click();
    await page.waitForTimeout(4_000);
    await row.locator('[data-testid="taskList.item.checkbox"]').first().click();
    await page.waitForTimeout(1_200);
    // Sending the ticked task to the agent opens its Gantt panel.
    await page.locator('[data-testid="deck.plank"] [data-testid="projectsPlugin.delegateTasks"]').first().click();
    await page.waitForTimeout(5_000);
  },
});
