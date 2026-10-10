//
// Copyright 2026 DXOS.org
//

/**
 * Showcase scene 1: what Composer is. The space's Home page, then a sweep down the navtree across the objects
 * the space holds.
 *
 * @mdl packages/apps/composer-app/spec/APP.mdl test QA-13
 * @app composer-app bundled dev build against EDGE preview, served by `vite preview` (launch config
 *   `composer-showcase`, :4183)
 *
 *   export DX_EDGE_BASE_URL=https://preview.dxos.network/ DX_ENVIRONMENT=dev DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true
 *   moon run composer-app:bundle
 *
 * Record it last, on the showcase profile the other scenes have filled, so the sweep has objects to pass over.
 */

/** A beat for the viewer after a visible change. */
const BEAT = 1_200;

const HOME = '[data-testid="deck.plank"][data-attendable-id$="/home"]';

/** Dismisses first-run notices and lands on the space's Home with no companion open; safe to repeat. */
export const prep = {
  name: 'Prep (off camera): dismiss notices, open Home, close the companion',
  setup: true,
  run: async ({ page }) => {
    const notice = page.locator(
      '[data-testid="org.dxos.plugin.observability.notice"] button:not(:has-text("Settings"))',
    );
    if (
      await notice
        .first()
        .waitFor({ state: 'visible', timeout: 8_000 })
        .then(
          () => true,
          () => false,
        )
    ) {
      await notice.first().click();
    }
    if (
      !(await page
        .locator(HOME)
        .first()
        .isVisible()
        .catch(() => false))
    ) {
      // Another workspace (Plugins, Settings) replaces the navtree; the space's rail button brings it back.
      const home = page.locator('[data-testid="spacePlugin.spaceHome"]').first();
      if (!(await home.isVisible().catch(() => false))) {
        await page.locator('[data-testid="spacePlugin.space"]').first().click();
      }
      await home.click();
    }
    await page.locator(HOME).first().waitFor({ state: 'visible', timeout: 30_000 });
    // A project leaves its Trace panel open in the context sidebar, which narrows every plank after it.
    const context = page.locator('[data-testid="deck.toggleComplementarySidebar"][aria-label="Close context sidebar"]');
    if (
      await context
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await context
        .first()
        .click({ timeout: 2_000 })
        .catch(() => undefined);
    }
    // Best effort: a companion left open by a document or project setup can sit under an overlay.
    const close = page.locator('role=button[name="Close companion"]').first();
    if (await close.isVisible().catch(() => false)) {
      await close.click({ timeout: 2_000 }).catch(() => page.keyboard.press('Escape'));
    }
  },
};

export const steps = [
  prep,
  {
    name: 'Open on the space Home',
    narration:
      'Composer is an open-source super-app framework. Your documents, spreadsheets, boards, mail and AI agents ' +
      'live together in one workspace.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Composer', subtitle: 'the open-source super app' });
      await page.waitForTimeout(BEAT * 2);
      await demo.clearCaption();
    },
  },
  {
    name: 'Sweep the navtree',
    narration: 'And every byte of it belongs to you.',
    run: async ({ demo, page }) => {
      // Up to six objects, top to bottom; a hover is enough to draw the eye down the tree.
      const items = page.locator('[data-testid="spacePlugin.object"]');
      const count = Math.min(await items.count(), 6);
      for (let index = 0; index < count; index++) {
        await demo.hover({ selector: `[data-testid="spacePlugin.object"] >> nth=${index}` });
        await page.waitForTimeout(400);
      }
      await page.waitForTimeout(BEAT);
    },
  },
];
