//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (20s): Comment on the DXOS Architecture guide, ask @kai for a diagram, and embed a Canvas drawing inline.
 *
 * @mdl packages/plugins/plugin-markdown/autocue/AUTOCUE.mdl test QA-5
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `tools/autocue/showcase/overnight.mjs`; rules in tools/autocue/showcase/docs/SHOWCASE.md.
 */

import { LONG_MS, comment, fromTemplate, reveal, showcase } from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = LONG_MS;

export const steps = showcase({
  name: 'markdown',
  caption: 'Comment on the DXOS Architecture guide, ask @kai for a diagram, and embed a Canvas drawing inline.',
  plugins: ['markdown', 'canvas'],
  ms: CLIP_MS,
  setup: async ({ page }) => {
    await fromTemplate(page, 'DXOS Architecture');
    await reveal(page, ['Collections', 'Architecture']);
    // The collection lists the documents first, so the first Composer is the reading guide.
    await page.locator('[data-testid="treeItem.heading"]:text-is("Composer")').first().click();
    await page.waitForTimeout(2_500);
  },
  clip: async ({ page }) => {
    await comment(page, 'Open a box to drill into the diagram beneath it', 'This is the best way in.');
    await comment(
      page,
      'Composer is an app framework plus a set of plugins',
      '@kai add a markdown diagram of the plugin layers here',
    );
    // An inline Canvas drawing at the end of the guide, picked from the space's objects.
    await page.evaluate(() => {
      const view = globalThis.composer.editorView;
      view.dispatch({ selection: { anchor: view.state.doc.length }, scrollIntoView: true });
      view.focus();
    });
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('/', { delay: 80 });
    await page.locator(':text-is("Inline object")').first().click();
    await page.locator('[role="dialog"] :text-is("Data Stack")').first().click();
    await page.waitForTimeout(2_000);
    // The inline drawing shows its zoom bar while the pointer is over it.
    const embed = page.locator('[data-testid="deck.plank"] :text-is("Data Stack")').last();
    await embed.scrollIntoViewIfNeeded();
    await embed.hover();
    const zoom = page.locator('[data-testid="deck.plank"] [data-testid="toolbar-zoom-in"]').last();
    for (let step = 0; step < 4; step++) {
      await zoom.click({ force: true });
      await page.waitForTimeout(500);
    }
  },
});
