//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (10s): Write an outline of a launch plan.
 *
 * @mdl packages/plugins/plugin-tasks/PLUGIN.mdl test QA-3
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `tools/autocue/showcase/overnight.mjs`; rules in tools/autocue/showcase/docs/SHOWCASE.md.
 */

import { SHORT_MS, create, editor, showcase, type } from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = SHORT_MS;

export const steps = showcase({
  name: 'tasks',
  caption: 'Write an outline of a launch plan.',
  plugins: ['tasks'],
  ms: CLIP_MS,
  setup: ({ page }) => create(page, 'outline'),
  clip: async ({ page }) => {
    await editor(page).click();
    await type(page, 'Launch plan\n', 45);
    await page.keyboard.press('Tab');
    await type(page, 'Write the announcement\nRecord the demo\nShip the release\n', 45);
  },
});
