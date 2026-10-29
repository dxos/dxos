//
// Copyright 2026 DXOS.org
//

/**
 * Your own filters and sort, beside the agent's ranking, from Composer: the Filters panel derives its controls from
 * the results (ranges with a histogram, checkbox lists, toggles), cuts the cards, keeps unknowns and says how many,
 * sorts by any number, folds the picks into that sort, and comes back after the article is reopened.
 *
 * @mdl packages/plugins/plugin-lighthouse/PLUGIN.mdl test QA-5
 * @app composer-app via `DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:serve -- --port 5173`,
 *   against a lighthouse daemon on http://127.0.0.1:4319 with the /v1 view route, holding the Warsaw flats session
 *   LIGHTHOUSE_FILTERS_RUN (default web-20261028-110009). The setup steps are research.mjs's; one more clears the
 *   session's filters and sort through /v1 (the API token is read from the workspace's `api-token` file and never
 *   logged). The flow leaves the filters it sets in place. Set LIGHTHOUSE_SCREENS to save composer-filters-*.png.
 *
 *   node .agents/skills/autocue/scripts/driver.mjs --port 7333 --url http://localhost:5173 --out /tmp/demo
 *   C '{"op":"run","file":"packages/plugins/plugin-lighthouse/autocue/filters.mjs"}'
 */

import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { steps as research } from './research.mjs';

const SUBTITLE = 'from plugin-lighthouse/PLUGIN.mdl QA-5';
const RUN = process.env.LIGHTHOUSE_FILTERS_RUN ?? 'web-20261028-110009';
const NAME = 'Warsaw apartments';
const SCREENS = process.env.LIGHTHOUSE_SCREENS;
const DAEMON = process.env.LIGHTHOUSE_URL ?? 'http://127.0.0.1:4319';
const TOKEN_FILE =
  process.env.LIGHTHOUSE_TOKEN_FILE ?? join(homedir(), 'Code/dmaretskyi/lighthouse/.lighthouse/api-token');

const BEAT = 2_000;

const PLANK = '[data-testid="deck.plank"]';
const PANEL = `${PLANK} [data-testid="lighthouse.filters"]`;
const COUNT = `${PANEL} [data-testid="lighthouse.filters.count"]`;
const CHIPS = `${PLANK} [data-testid="lighthouse.filters.chips"]`;
const RESULT = `${PLANK} [data-testid="lighthouse.result"]`;
const TOTAL = 'sum:lh:monthlyPrice+lh:adminFee';
const ROOMS = 'schema:numberOfRooms';
const BALCONY = 'is:lh:amenity=balcony';
const f = (id, part) => `${PANEL} [data-testid="lighthouse.filter.${id}.${part}"]`;

const caption = (demo, step, text) =>
  demo.caption({ value: `Step ${step} - ${text}`, subtitle: SUBTITLE, position: 'top' });

const shot = async (page, name) => {
  if (SCREENS) {
    await page.screenshot({ path: join(SCREENS, `composer-filters-${name}.png`) });
  }
};

/** "42 of 123" -> 42. */
const kept = async (page, selector = COUNT) =>
  Number(((await page.locator(selector).first().textContent()) ?? '').trim().split(' of ')[0]);

const waitFewer = (page, before, selector = COUNT) =>
  page.waitForFunction(
    ([sel, n]) => Number(document.querySelector(sel)?.textContent?.trim().split(' of ')[0]) < n,
    [selector, before],
    { timeout: 10_000 },
  );

const settle = (page) => page.waitForTimeout(800);

export const steps = [
  ...research.filter((step) => step.setup),
  {
    name: "setup: clear the session's filters and sort",
    setup: true,
    run: async () => {
      const token = (await readFile(TOKEN_FILE, 'utf8')).trim();
      const response = await fetch(`${DAEMON}/v1/sessions/${encodeURIComponent(RUN)}/view`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', 'authorization': `Bearer ${token}` },
        body: '{}',
      });
      if (!response.ok) {
        throw new Error(`clearing the view failed: ${response.status}`);
      }
    },
  },
  {
    name: 'Open the Warsaw apartments session',
    run: async ({ demo, page }) => {
      await demo.title({ value: "Your filters, the agent's ranking", subtitle: 'Filters and sort on the results' });
      await caption(demo, 1, 'Open the Warsaw apartment search started in lighthouse');
      await demo.click({ selector: '[data-testid="treeItem.heading"]:text-is("Home")', label: 'Home' });
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"]', label: 'Create' });
      await demo.click({
        selector: '[data-testid="create-object-form.type.org.dxos.type.lighthouse.Research"]',
        label: 'Research',
      });
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input').first().waitFor({ timeout: 10_000 });
      await demo.fill({ selector: '[role="dialog"] input >> nth=0', value: NAME });
      await demo.type({ selector: '[role="dialog"] input >> nth=1', value: RUN, delay: 30, label: 'Existing session' });
      await demo.click({ selector: '[role="dialog"] [data-testid="save-button"]', label: 'Create' });
      await dialog.waitFor({ state: 'hidden', timeout: 15_000 });
      await page.locator(RESULT).nth(5).waitFor({ timeout: 90_000 });
      // The session opens on its map (it has drawn areas); the filters cut the cards below it either way.
      await page.waitForTimeout(2_000);
    },
  },
  {
    name: 'Press Filters on the toolbar',
    run: async ({ demo, page }) => {
      await caption(demo, 2, "Filters come from the results' own properties");
      await demo.click({ selector: `${PLANK} [aria-label="Filters"]`, label: 'Filters' });
      await page.locator(f(TOTAL, 'max')).waitFor({ timeout: 10_000 });
      await settle(page);
      await shot(page, 'panel');
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Total monthly cost at most 6000, rooms at least 2',
    run: async ({ demo, page }) => {
      const before = await kept(page);
      await caption(demo, 3, 'Rent + czynsz <= 6000, two rooms or more');
      await demo.fill({ selector: f(TOTAL, 'max'), value: '6000', label: 'at most 6000' });
      await page.locator(f(TOTAL, 'max')).press('Enter');
      await settle(page);
      await demo.fill({ selector: f(ROOMS, 'min'), value: '2', label: 'at least 2 rooms' });
      await page.locator(f(ROOMS, 'min')).press('Enter');
      await waitFewer(page, before);
      await settle(page);
      await shot(page, 'applied');
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Has a balcony, then known only and back',
    run: async ({ demo, page }) => {
      await caption(demo, 4, 'Has a balcony: listings that never said are kept, and counted');
      if (!(await page.locator(f(BALCONY, 'toggle')).count())) {
        await demo.click({ selector: `${PANEL} [data-testid="lighthouse.filters.more"]`, label: 'More filters' });
      }
      await page.locator(f(BALCONY, 'toggle')).first().scrollIntoViewIfNeeded();
      await demo.click({ selector: f(BALCONY, 'toggle'), label: 'Has a balcony' });
      await page.locator(f(BALCONY, 'unknown')).waitFor({ timeout: 5_000 });
      await settle(page);
      const withUnknown = await kept(page);
      await shot(page, 'unknown');
      await demo.click({ selector: f(BALCONY, 'unknown'), label: 'Known only' });
      await waitFewer(page, withUnknown);
      await settle(page);
      await demo.sleep({ ms: BEAT });
      await demo.click({ selector: f(BALCONY, 'unknown'), label: 'Keep unknowns' });
      await page.waitForFunction(
        ([sel, n]) => Number(document.querySelector(sel)?.textContent?.trim().split(' of ')[0]) === n,
        [COUNT, withUnknown],
        { timeout: 10_000 },
      );
    },
  },
  {
    name: 'Sort by floor area, highest first',
    run: async ({ demo, page }) => {
      await caption(demo, 5, 'Sort by floor area, biggest first; the picks join the sorted list');
      await demo.click({ selector: `${PANEL} [data-testid="lighthouse.filters.sort"]`, label: 'Sort' });
      await page.locator('[data-testid="lighthouse.filters.sort.option"]').first().waitFor({ timeout: 5_000 });
      await page
        .locator('[data-testid="lighthouse.filters.sort.option"]', { hasText: /Floor area.*highest first/ })
        .first()
        .click();
      await settle(page);
      const total = ((await page.locator(COUNT).first().textContent()) ?? '').trim();
      if (total !== '39 of 123') {
        throw new Error(`expected 39 of 123, saw ${total}`);
      }
      const areas = await page.evaluate(
        (sel) =>
          [...document.querySelectorAll(sel)]
            .slice(0, 4)
            .map((card) => Number(/([\d.]+) m²/.exec(card.textContent ?? '')?.[1] ?? Number.NaN)),
        RESULT,
      );
      if (!areas.every((area, i, all) => i === 0 || !(area > all[i - 1]))) {
        throw new Error(`cards not by area: ${areas}`);
      }
      await shot(page, 'sorted');
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Close the panel: the filters stay as chips',
    run: async ({ demo, page }) => {
      await caption(demo, 6, 'Active filters stay as chips, each saying what it does with unknowns');
      await demo.click({ selector: `${PANEL} [data-testid="lighthouse.filters.close"]`, label: 'Close' });
      await page.locator(CHIPS).waitFor({ timeout: 5_000 });
      await settle(page);
      await shot(page, 'chips');
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Reload: they were saved with the session',
    run: async ({ demo, page }) => {
      const before = ((await page.locator(`${CHIPS} [role="status"]`).first().textContent()) ?? '').trim();
      // The debounced PUT.
      await page.waitForTimeout(2_000);
      await page.reload();
      await page.locator(CHIPS).waitFor({ timeout: 120_000 });
      await page.waitForFunction(
        ([sel, text]) => document.querySelector(sel)?.textContent?.trim() === text,
        [`${CHIPS} [role="status"]`, before],
        { timeout: 30_000 },
      );
      await caption(demo, 7, `Saved with the session: ${before}`);
      await settle(page);
      await shot(page, 'reload');
      await demo.sleep({ ms: BEAT * 2 });
    },
  },
];
