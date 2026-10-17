//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (20s): Create the Bramble Coffee Roasters space from its template and walk its projects, documents and mail.
 *
 * @mdl packages/apps/composer-app/spec/APP.mdl test QA-14
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `tools/autocue/showcase/overnight.mjs`; rules in tools/autocue/showcase/SHOWCASE.md.
 */

import { LONG_MS, branch, fromTemplate, scroll, showcase } from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = LONG_MS;

export const steps = showcase({
  name: 'composer',
  caption: 'Create the Bramble Coffee Roasters space from its template and walk its projects, documents and mail.',
  plugins: ['onboarding'],
  ms: CLIP_MS,
  clip: async ({ page }) => {
    await fromTemplate(page, 'Bramble Coffee Roasters', { waitFor: 'Projects' });
    for (const label of ['Projects', 'Documents', 'Mail']) {
      const row = page.locator(branch(label)).first();
      if (await row.count()) {
        await row.locator('> *').first().click();
        await page.waitForTimeout(1_200);
      }
    }
    await page.locator('[data-testid="treeItem.heading"]').nth(4).click();
    await page.waitForTimeout(3_000);
    await scroll(page, { notches: 15 });
  },
});
