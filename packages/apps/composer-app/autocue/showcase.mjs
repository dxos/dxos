//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (20s): Walk the Bramble Coffee Roasters space: a project, its tasks, and the roastery handbook.
 *
 * @mdl packages/apps/composer-app/spec/APP.mdl test QA-15
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `tools/autocue/showcase/overnight.mjs`; rules in tools/autocue/showcase/docs/SHOWCASE.md.
 */

import { LONG_MS, fromTemplate, reveal, scroll, showcase } from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = LONG_MS;

export const steps = showcase({
  name: 'composer',
  caption: 'Walk the Bramble Coffee Roasters space: a project, its tasks, and the roastery handbook.',
  plugins: ['onboarding'],
  ms: CLIP_MS,
  setup: async ({ page }) => {
    // Created off camera: a new space opens its Help companion, which must not open and close on camera.
    await fromTemplate(page, 'Bramble Coffee Roasters', { waitFor: 'Projects' });
  },
  clip: async ({ page }) => {
    await reveal(page, ['Projects', 'Collections']);
    await page.waitForTimeout(1_000);
    await page.locator('[data-testid="treeItem.heading"]:text-is("Spring Blend Launch")').first().click();
    await page.waitForTimeout(3_000);
    await page.locator('[data-testid="projectsPlugin.tab.tasks"], [role="tab"]:has-text("Tasks")').first().click();
    await page.waitForTimeout(2_500);
    await page.locator('[data-testid="treeItem.heading"]:text-is("Roastery Handbook")').first().click();
    await page.waitForTimeout(2_500);
    await scroll(page, { notches: 25 });
  },
});
