//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (20s): Create the Chess MCP on Workers space from its template, open its project and walk its task tree.
 *
 * @mdl packages/plugins/plugin-projects/PLUGIN.mdl test QA-5
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `packages/apps/composer-app/autocue/showcase/overnight.mjs`; rules in GridZoom/SHOWCASE.md.
 */

import { LONG_MS, fromTemplate, scroll, showcase } from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = LONG_MS;

export const steps = showcase({
  name: 'projects',
  caption: 'Create the Chess MCP on Workers space from its template, open its project and walk its task tree.',
  plugins: ['debug', 'projects'],
  ms: CLIP_MS,
  clip: async ({ page }) => {
    await fromTemplate(page, 'Chess MCP on Workers');
    await page.locator('[data-testid="treeItem.heading"]').nth(1).click();
    await page.waitForTimeout(2_500);
    await page.locator('[data-testid="projectsPlugin.tab.tasks"], [role="tab"]:has-text("Tasks")').first().click();
    await page.waitForTimeout(2_000);
    await scroll(page, { notches: 20 });
  },
});
