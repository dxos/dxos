//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (10s): Present a document as slides and page through them.
 *
 * @mdl packages/plugins/plugin-presenter/PLUGIN.mdl test QA-2
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `tools/autocue/showcase/overnight.mjs`; rules in tools/autocue/showcase/docs/SHOWCASE.md.
 */

import { SHORT_MS, create, editor, showcase, type } from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = SHORT_MS;

export const steps = showcase({
  name: 'presenter',
  caption: 'Present a document as slides and page through them.',
  plugins: ['markdown', 'presenter'],
  ms: CLIP_MS,
  setup: async ({ page }) => {
    await create(page, 'document');
    await editor(page).click();
    await type(
      page,
      '# Composer\n\nLocal-first collaboration\n\n---\n\n# Spaces\n\nShared, encrypted, offline\n\n---\n\n# Agents\n\nWork alongside you\n\n---\n\n# Plugins\n\nExtend everything\n',
      3,
    );
    await page.keyboard.press('Shift+Meta+P');
    await page.waitForTimeout(2_500);
  },
  clip: async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(2_300);
      await page.keyboard.press('ArrowRight');
    }
  },
});
