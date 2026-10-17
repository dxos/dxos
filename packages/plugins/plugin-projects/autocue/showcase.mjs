//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (20s): Open the Chess MCP on Workers project and walk its task tree.
 *
 * @mdl packages/plugins/plugin-projects/PLUGIN.mdl test QA-5
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `tools/autocue/showcase/overnight.mjs`; rules in tools/autocue/showcase/SHOWCASE.md.
 */

import { LONG_MS, fromTemplate, reveal, scroll, showcase } from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = LONG_MS;

export const steps = showcase({
  name: 'projects',
  caption: 'Open the Chess MCP on Workers project and walk its task tree.',
  plugins: ['debug', 'projects'],
  ms: CLIP_MS,
  setup: async ({ page }) => {
    await fromTemplate(page, 'Chess MCP on Workers', { waitFor: 'Projects' });
    await reveal(page, ['Projects']);
  },
  clip: async ({ page }) => {
    await page.locator('[data-testid="treeItem.heading"]:text-is("Chess MCP on Workers")').first().click();
    await page.waitForTimeout(2_500);
    await page.locator('[data-testid="projectsPlugin.tab.tasks"], [role="tab"]:has-text("Tasks")').first().click();
    await page.waitForTimeout(2_000);
    await scroll(page, { notches: 20 });
  },
});
