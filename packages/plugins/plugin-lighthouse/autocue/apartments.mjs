//
// Copyright 2026 DXOS.org
//

/**
 * Apartments in Warsaw from Composer: a Research with a live goal on the Standard budget; the agent searches otodom,
 * photo cards fill the masonry, a run row opens onto its calls and results, a listing opens in the companion with its
 * facts and where they came from, its move-in cost is read on demand, and a star and a vote keep it as a Finding.
 *
 * @mdl packages/plugins/plugin-lighthouse/PLUGIN.mdl test QA-2
 * @app composer-app via `DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:serve -- --port 5173`,
 *   against a lighthouse daemon on http://127.0.0.1:4319. The setup steps are research.mjs's: they enable the plugin
 *   and add the Lighthouse connection, reading the API token from the workspace's `api-token` file (never logged).
 *
 *   node .agents/skills/autocue/scripts/driver.mjs --port 7333 --url http://localhost:5173 --out /tmp/demo
 *   C '{"op":"run","file":"packages/plugins/plugin-lighthouse/autocue/apartments.mjs"}'
 *
 * Live: the run is a real lighthouse session (Standard: 10 min, $0.50, 40 pages) plus one quick read.
 */

import { steps as research } from './research.mjs';

const SUBTITLE = 'from plugin-lighthouse/PLUGIN.mdl QA-2';
const NAME = 'Warsaw apartments';
const GOAL =
  '2-room apartments for rent in central Warsaw (\u015Aródmie\u015Bcie, Wola, Mokotów) under 6000 PLN total with a balcony, near metro';

const BEAT = 2_500;

const PLANK = '[data-testid="deck.plank"]';
const RESULT = '[data-testid="lighthouse.result"]';
/** A result card whose photo has loaded. */
const PHOTO = `${RESULT}:has(img)`;
const DETAIL = '[data-testid="lighthouse.detail"]';

const caption = (demo, step, text) =>
  demo.caption({ value: `Step ${step} - ${text}`, subtitle: SUBTITLE, position: 'top' });

const visible = (locator, timeout = 1_500) =>
  locator
    .first()
    .waitFor({ state: 'visible', timeout })
    .then(
      () => true,
      () => false,
    );

/** Waits until at least `count` result cards show a loaded photo. */
const waitForPhotos = (page, count, timeout) =>
  page.waitForFunction(
    ([selector, expected]) =>
      [...document.querySelectorAll(selector)].filter((img) => img.complete && img.naturalWidth > 0).length >= expected,
    [`${RESULT} img`, count],
    { timeout },
  );

/** The index of the first result card with a loaded photo. */
const firstPhoto = (page) =>
  page.evaluate(
    (selector) =>
      [...document.querySelectorAll(selector)].findIndex((card) =>
        [...card.querySelectorAll('img')].some((img) => img.complete && img.naturalWidth > 0),
      ),
    RESULT,
  );

export const steps = [
  // Enable the plugin and connect lighthouse, as QA-1 does.
  ...research.filter((step) => step.setup),
  {
    name: 'Open Composer',
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Apartments in Warsaw', subtitle: 'A live search with Lighthouse in Composer' });
      await caption(demo, 1, 'Open Composer on the space');
      await demo.click({ selector: '[data-testid="treeItem.heading"]:text-is("Home")', label: 'Home' });
      await page.locator('[data-testid="spacePlugin.createObject"]').first().waitFor({ timeout: 15_000 });
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Create a Research with the goal and the Standard budget',
    run: async ({ demo, page }) => {
      await caption(demo, 2, 'Create a Research: say what you want, with every must-have');
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"]', label: 'Create' });
      await demo.click({
        selector: '[data-testid="create-object-form.type.org.dxos.type.lighthouse.Research"]',
        label: 'Research',
      });
      const dialog = page.locator('[role="dialog"]');
      if (await visible(dialog.locator('input'), 2_000)) {
        await demo.fill({ selector: '[role="dialog"] input', value: NAME });
        await demo.click({ selector: '[role="dialog"] [data-testid="save-button"]', label: 'Create' });
      }
      await page.locator(`${PLANK} textarea`).first().waitFor({ timeout: 20_000 });
      await demo.type({ selector: `${PLANK} textarea >> nth=0`, value: GOAL, delay: 22, label: 'Goal' });
      // The form saves on blur.
      await page.keyboard.press('Tab');
      await caption(demo, 2, 'Pick the Standard budget: 10 minutes, 50 cents, 40 pages');
      await demo.click({ selector: `${PLANK} [role="combobox"] >> nth=0`, label: 'Budget' });
      await demo.click({ selector: '[role="option"]:has-text("standard") >> nth=0', label: 'Standard' });
      await page.locator(`${PLANK} span:text-matches("10 min")`).first().waitFor({ timeout: 10_000 });
      await page.waitForFunction(
        (selector) => !document.querySelector(selector)?.hasAttribute('disabled'),
        '[data-testid="lighthouse.run"]',
        { timeout: 10_000 },
      );
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Run it',
    run: async ({ demo, page }) => {
      await caption(demo, 3, 'Run it: the agent starts a lighthouse session');
      await demo.click({ selector: '[data-testid="lighthouse.run"]', label: 'Run' });
      await page.locator('[data-testid="assistant.thread"]').first().waitFor({ timeout: 30_000 });
      await demo.speed({ factor: 3 });
      await page.locator('[data-testid="lighthouse.run-row"]').first().waitFor({ timeout: 90_000 });
      await demo.speed({ factor: 1 });
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Watch photo cards land',
    run: async ({ demo, page }) => {
      await caption(demo, 4, 'Listings land in the masonry, with their photos');
      await demo.speed({ factor: 3 });
      await page
        .locator(PHOTO)
        .first()
        .waitFor({ timeout: 5 * 60_000 });
      // Photos come from otodom's CDN and load lazily.
      await waitForPhotos(page, 4, 2 * 60_000);
      await page.waitForTimeout(6_000);
      await demo.speed({ factor: 1 });
      await demo.sleep({ ms: 4_000 });
    },
  },
  {
    name: 'Open a run row in the thread',
    run: async ({ demo, page }) => {
      const row = `[data-testid="lighthouse.run-row"]:has-text("result") >> nth=0`;
      if (!(await visible(page.locator(row), 5_000))) {
        return;
      }
      await page.locator(row).scrollIntoViewIfNeeded();
      await caption(demo, 5, 'Each batch of searches is one line: its calls, and what they found');
      await demo.click({ selector: row, label: 'Run row' });
      await demo.sleep({ ms: 5_000 });
      await demo.click({ selector: row, label: 'Close' });
    },
  },
  {
    name: 'Open a listing in the companion',
    run: async ({ demo, page }) => {
      const index = Math.max(0, await firstPhoto(page));
      await caption(demo, 6, 'Open a listing: its facts, and where each came from');
      await demo.click({ selector: `${RESULT} >> nth=${index}`, label: 'Listing' });
      await page.locator(DETAIL).first().waitFor({ timeout: 15_000 });
      await page.locator('[data-testid="lighthouse.facts"]').first().waitFor({ timeout: 15_000 });
      await demo.sleep({ ms: BEAT * 2 });
      const provenance = page.locator(`${DETAIL} :text("Where these facts came from")`).first();
      if (await visible(provenance, 2_000)) {
        await provenance.scrollIntoViewIfNeeded();
        await demo.sleep({ ms: BEAT });
      }
    },
  },
  {
    name: 'Read its move-in cost',
    run: async ({ demo, page }) => {
      const read = `${DETAIL} [data-testid="lighthouse.extend.move-in"]`;
      if (!(await visible(page.locator(read), 3_000))) {
        return;
      }
      await page.locator(read).first().scrollIntoViewIfNeeded();
      await caption(demo, 7, 'More about this: read the move-in cost on demand');
      await demo.click({ selector: `${read} >> nth=0`, label: 'Move-in cost' });
      await demo.speed({ factor: 3 });
      const section = page.locator(`${DETAIL} [data-testid="lighthouse.extension.move-in"]`).first();
      const landed = await section.waitFor({ timeout: 3 * 60_000 }).then(
        () => true,
        () => false,
      );
      await demo.speed({ factor: 1 });
      if (landed) {
        await section.scrollIntoViewIfNeeded();
        await caption(demo, 7, 'Deposit, fees and first payment, read from the listing');
        await demo.sleep({ ms: 5_000 });
      }
    },
  },
  {
    name: 'Star the listing, and thumbs-up another card',
    run: async ({ demo, page }) => {
      await caption(demo, 8, 'Star it to keep it; vote on another to steer the ranking');
      await page.locator(`${DETAIL} button[aria-pressed]`).first().scrollIntoViewIfNeeded();
      await demo.click({ selector: `${DETAIL} button[aria-pressed] >> nth=0`, label: 'Star' });
      await page.waitForFunction(
        (selector) =>
          document.querySelector(`${selector} button[aria-pressed]`)?.getAttribute('aria-pressed') === 'true',
        DETAIL,
        { timeout: 15_000 },
      );
      await demo.click({ selector: `${RESULT} >> nth=1 >> [data-testid="lighthouse.vote-up"]`, label: 'Good result' });
      await page.waitForFunction(
        (selector) =>
          document
            .querySelectorAll(selector)[1]
            ?.querySelector('[data-testid="lighthouse.vote-up"]')
            ?.getAttribute('aria-pressed') === 'true',
        RESULT,
        { timeout: 10_000 },
      );
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Show the kept Findings',
    run: async ({ demo, page }) => {
      await caption(demo, 9, 'Findings: what was kept, copied into the space');
      await demo.click({
        selector: `${PLANK} [role="radio"][aria-label="Findings"], ${PLANK} button[aria-label="Findings"]`,
        label: 'Findings',
      });
      await page.getByText('Kept · starred').first().waitFor({ timeout: 15_000 });
      await demo.sleep({ ms: 6_000 });
    },
  },
];
