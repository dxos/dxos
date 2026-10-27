//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (10s): Replay Morphy's Opera Game move by move.
 *
 * @mdl packages/plugins/plugin-chess/PLUGIN.mdl test QA-2
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `tools/autocue/showcase/overnight.mjs`; rules in tools/autocue/showcase/docs/SHOWCASE.md.
 */

import { SHORT_MS, create, showcase } from '../../../../tools/autocue/showcase/steps.mjs';

/** Morphy's Opera Game, 1858. */
const OPERA_GAME =
  '1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 ' +
  '10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#';

export const CLIP_MS = SHORT_MS;

export const steps = showcase({
  name: 'chess',
  caption: "Replay Morphy's Opera Game move by move.",
  plugins: ['game', 'chess'],
  ms: CLIP_MS,
  setup: async ({ page }) => {
    await create(page, 'game', {
      variant: 'Chess',
      before: async (page) => {
        await page.locator('[role="dialog"] button:has-text("Continue")').first().click();
        await page.locator('[role="dialog"] input[data-testid="pgn"]').fill(OPERA_GAME);
      },
      ready: '[data-location]',
    });
    await page.mouse.click(1270, 540);
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(800);
  },
  clip: async ({ page }) => {
    for (let i = 0; i < 26; i++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(360);
    }
  },
});
