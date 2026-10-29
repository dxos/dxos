//
// Copyright 2026 DXOS.org
//

/**
 * A feature on the map shows the DXN code cites it by and the tests and code that cite it; a feature with no key
 * offers to set one.
 *
 * @mdl packages/plugins/plugin-projects/spec/FEATURE-LINKS.mdl test QA-1
 * @app storybook-react, narrowed to plugin-projects, on :9009
 *
 *   DX_STORIES=plugins/plugin-projects VITE_DX_DISABLE_ANIMATIONS=true moon run storybook-react:serve-nodeps
 *   node .agents/skills/autocue/scripts/driver.mjs --port 7333 --url http://localhost:9009 --out /tmp/demo
 */

const STORYBOOK = 'http://localhost:9009';
const SUBTITLE = 'from plugin-projects/spec/FEATURE-LINKS.mdl';

/** A beat for the viewer after a visible change. */
const BEAT = 1_500;

const story = (id) => `${STORYBOOK}/iframe.html?id=${id}&viewMode=story`;
const CARDS = story('plugins-plugin-projects-containers-specfeatures--canvas');
const CODE_LINKS = story('plugins-plugin-projects-containers-featurearticle--code-links');
// The SetKey story's play function sets the key itself, so the take types into the story without one.
const WITHOUT_KEY = story('plugins-plugin-projects-containers-featurearticle--without-key');

// At the top: the article's relations, which the take is about, fill the bottom of the frame.
const caption = (demo, step, text) =>
  demo.caption({ value: `Step ${step} - ${text}`, subtitle: SUBTITLE, position: 'top' });

/** Opens a story and waits for `selector`, so a take never starts on a spinner. */
const open = async (page, url, selector) => {
  await page.goto(url);
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: 30_000 });
};

export const steps = [
  {
    name: 'Prep (off camera): warm the stories',
    setup: true,
    run: async ({ page }) => {
      await open(page, CODE_LINKS, '[data-testid="feature-card.link"]');
      await open(page, CARDS, '[data-testid="feature-canvas-node"]');
    },
  },
  {
    name: 'See which features are tested',
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Feature links', subtitle: 'dxn:<meta.key>#<mnemonic> and @feature tags' });
      await caption(demo, 1, "Open the spec's feature map as cards");
      // The canvas card is a summary; the test count is on the feature's own card, opened in the next step.
      await demo.hover({
        selector: '[data-testid="feature-canvas-node"]:has-text("Provider sync")',
        label: 'Provider sync',
      });
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Open a feature with a key',
    run: async ({ demo, page }) => {
      await open(page, CODE_LINKS, '[data-testid="feature-card.link"]');
      await caption(demo, 2, 'Open the "Provider sync" feature');
      await demo.hover({ selector: '[data-testid="feature-card.link"]', label: 'Feature DXN' });
      await demo.hover({ selector: '[data-testid="feature-card.copy-link"]', label: 'Copy feature link' });
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Read its code links',
    run: async ({ demo, page }) => {
      await caption(demo, 3, 'Scroll to the Code section');
      const rows = page.locator('[data-testid="feature-card.code"]');
      await rows.last().scrollIntoViewIfNeeded();
      await rows.nth(2).waitFor({ state: 'visible' });
      for (let index = 0; index < 3; index++) {
        await demo.hover({ selector: `[data-testid="feature-card.code"] >> nth=${index}` });
      }
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Open a code link',
    run: async ({ demo, page }) => {
      await caption(demo, 4, 'Point at the "Gmail sync" row: it opens gmail-sync.test.ts#L24 on GitHub');
      await demo.hover({ selector: '[data-testid="feature-card.code"] >> nth=0', label: 'Gmail sync' });
      const href = await page
        .locator('[data-testid="feature-card.code"]')
        .first()
        .evaluate((row) => row.closest('a')?.href);
      if (!href?.endsWith('gmail-sync.test.ts#L24')) {
        throw new Error(`Unexpected link: ${href}`);
      }
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Set a key on a feature without one',
    run: async ({ demo, page }) => {
      await open(page, WITHOUT_KEY, '[data-testid="feature-article.set-key"]');
      await caption(demo, 5, 'Open "OAuth tokens", type its key and press Enter');
      await demo.click({ selector: '[data-testid="feature-article.set-key"]', label: 'Key' });
      await demo.type({
        selector: '[data-testid="feature-article.set-key"]',
        value: 'org.dxos.plugin.connector.feature.oauthTokens',
      });
      await demo.press({ key: 'Enter' });
      await page.locator('[data-testid="feature-card.link"]').waitFor({ state: 'visible', timeout: 5_000 });
      await demo.hover({ selector: '[data-testid="feature-card.link"]', label: 'Feature DXN' });
      await demo.sleep({ ms: BEAT * 2 });
    },
  },
];
