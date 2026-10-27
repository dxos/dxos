//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (10s): A diagram in a document grows as edges are typed.
 *
 * @mdl packages/plugins/plugin-mermaid/PLUGIN.mdl test QA-2
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `tools/autocue/showcase/overnight.mjs`; rules in tools/autocue/showcase/docs/SHOWCASE.md.
 */

import { SHORT_MS, create, editor, showcase } from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = SHORT_MS;

export const steps = showcase({
  name: 'mermaid',
  caption: 'A diagram in a document grows as edges are typed.',
  plugins: ['markdown', 'mermaid'],
  ms: CLIP_MS,
  setup: async ({ page }) => {
    await create(page, 'document');
    await editor(page).click();
    await page.keyboard.insertText('```mermaid\ngraph LR\n  Idea --> Draft\n```\n\nThe review loop.');
    await page.waitForTimeout(1_500);
  },
  clip: async ({ page }) => {
    for (const line of ['Draft --> Review', 'Review --> Publish', 'Review --> Draft', 'Publish --> Readers']) {
      await page.keyboard.press('Meta+Home');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('End');
      await page.keyboard.insertText(`\n  ${line}`);
      await page.keyboard.press('Meta+End');
      await page.waitForTimeout(1_800);
    }
  },
});
