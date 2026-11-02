//
// Copyright 2026 DXOS.org
//

/**
 * Areas on the map, from Composer: a Research opened on an existing apartment session in Warsaw shows the results
 * on a map beside the cards, pins coloured by score; hovering a card's location shows where it is; the rating model
 * reads the drawn areas as a term with its formula; a circle drawn around a point re-ranks the cards and is saved,
 * then deleted again so the session's areas are left as they were.
 *
 * @mdl packages/plugins/plugin-lighthouse/PLUGIN.mdl test QA-4
 * @app composer-app via `DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:serve -- --port 5173`,
 *   against a lighthouse daemon on http://127.0.0.1:4319 holding the session LIGHTHOUSE_GEO_RUN (default
 *   web-20261028-110009, with the areas "Around Mokotów" and "Mokotów"). The setup steps are research.mjs's. Set
 *   LIGHTHOUSE_SCREENS to a directory to save composer-geo-*.png there.
 *
 *   node .agents/skills/autocue/scripts/driver.mjs --port 7333 --url http://localhost:5173 --out /tmp/demo
 *   C '{"op":"run","file":"packages/plugins/plugin-lighthouse/autocue/geo.mjs"}'
 */

import { join } from 'node:path';

import { steps as research } from './research.mjs';

const SUBTITLE = 'from plugin-lighthouse/PLUGIN.mdl QA-4';
const RUN = process.env.LIGHTHOUSE_GEO_RUN ?? 'web-20261028-110009';
const NAME = 'Warsaw apartments';
const SCREENS = process.env.LIGHTHOUSE_SCREENS;

const BEAT = 2_500;

const PLANK = '[data-testid="deck.plank"]';
const MAP = `${PLANK} [data-testid="lighthouse.map"]`;
const CANVAS = `${MAP} [data-testid="lighthouse.map.canvas"]`;
const AREA = `${MAP} [data-testid="lighthouse.map.area"]`;
const RESULT = `${PLANK} [data-testid="lighthouse.result"]`;
const MODEL = '[data-testid="lighthouse.model"]';

/** How many chips the session had when the flow opened it; the drawn circle is deleted back to this. */
let areasBefore = 0;

const caption = (demo, step, text) =>
  demo.caption({ value: `Step ${step} — ${text}`, subtitle: SUBTITLE, position: 'top' });

const visible = (locator, timeout = 1_500) =>
  locator
    .first()
    .waitFor({ state: 'visible', timeout })
    .then(
      () => true,
      () => false,
    );

const shot = async (page, name) => {
  if (SCREENS) {
    await page.screenshot({ path: join(SCREENS, `composer-geo-${name}.png`) });
  }
};

const view = (label) => `${PLANK} [role="radio"][aria-label="${label}"]`;

export const steps = [
  ...research.filter((step) => step.setup),
  {
    name: 'Open Composer',
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Areas on the map', subtitle: 'Apartments in Warsaw, ranked by where they are' });
      await caption(demo, 1, 'Open Composer on the space');
      await demo.click({ selector: '[data-testid="treeItem.heading"]:text-is("Home")', label: 'Home' });
      await page.locator('[data-testid="spacePlugin.createObject"]').first().waitFor({ timeout: 15_000 });
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Create a Research on the existing Warsaw apartments session',
    run: async ({ demo, page }) => {
      await caption(demo, 2, 'Open the Warsaw apartment search started in lighthouse');
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
    },
  },
  {
    name: 'The results on the map, with the drawn areas',
    run: async ({ demo, page }) => {
      // A session with drawn areas opens on the map.
      await page.locator(RESULT).first().waitFor({ timeout: 90_000 });
      if (!(await visible(page.locator(MAP), 5_000))) {
        await demo.click({ selector: view('Map'), label: 'Map' });
      }
      await page
        .locator(`${CANVAS} [data-testid="lighthouse.map.pin"], ${CANVAS} [data-testid="lighthouse.map.cluster"]`)
        .first()
        .waitFor({ timeout: 30_000 });
      areasBefore = await page.locator(AREA).count();
      // Tiles.
      await page.waitForTimeout(3_000);
      await caption(demo, 3, 'Pins coloured by score, the areas drawn earlier, cards outside them dimmed');
      await demo.sleep({ ms: BEAT * 2 });
      await shot(page, 'map');
    },
  },
  {
    name: 'Hover a card’s location',
    run: async ({ demo, page }) => {
      await caption(demo, 4, 'Hover a card’s location: where it is, how precisely, and links to the maps');
      const row = page.locator(`${RESULT} [data-testid="lighthouse.card.location"]`).first();
      await row.scrollIntoViewIfNeeded();
      await demo.hover({ selector: `${RESULT} [data-testid="lighthouse.card.location"] >> nth=0`, label: 'Location' });
      await page.locator('[data-testid="lighthouse.geo.popover"]').first().waitFor({ timeout: 10_000 });
      await page.waitForTimeout(2_000);
      await demo.sleep({ ms: BEAT * 2 });
      await shot(page, 'popover');
      await page.keyboard.press('Escape');
      await page.mouse.move(5, 5);
    },
  },
  {
    name: 'The areas in the rating model',
    run: async ({ demo, page }) => {
      await caption(
        demo,
        5,
        'The rating model: the areas as a term with its formula, each area a chip to switch or delete',
      );
      await demo.click({ selector: `${PLANK} [aria-label="Rating model"]`, label: 'Rating model' });
      await page.locator(MODEL).first().waitFor({ timeout: 10_000 });
      // Each drawn area is its own chip under its term or requirement.
      await page.locator(`${MODEL} [data-testid="lighthouse.model.area"]`).nth(1).waitFor({ timeout: 10_000 });
      const edit = page.locator('[data-testid="lighthouse.model.areas.edit"]').first();
      if (await visible(edit, 3_000)) {
        await edit.evaluate((element) => element.scrollIntoView({ block: 'center' }));
      }
      await demo.sleep({ ms: BEAT * 2 });
      await shot(page, 'model');
      await demo.click({ selector: `${PLANK} [aria-label="Rating model"]`, label: 'Close the model' });
    },
  },
  {
    name: 'Draw a circle near a point',
    run: async ({ demo, page }) => {
      await caption(demo, 6, 'Near a point: press the centre and drag out the radius; the cards re-rank');
      await page.locator(MAP).first().scrollIntoViewIfNeeded();
      await demo.click({ selector: `${MAP} [data-testid="lighthouse.map.circle"]`, label: 'Near a point' });
      const box = await page.locator(CANVAS).first().boundingBox();
      if (!box) {
        throw new Error('no map canvas');
      }
      const x = box.x + box.width * 0.45;
      const y = box.y + box.height * 0.55;
      await page.mouse.move(x, y);
      await page.mouse.down();
      for (let i = 1; i <= 12; i++) {
        await page.mouse.move(x + i * 6, y + i * 2);
        await page.waitForTimeout(40);
      }
      await page.mouse.up();
      await page.waitForFunction(([sel, n]) => document.querySelectorAll(sel).length > n, [AREA, areasBefore], {
        timeout: 10_000,
      });
      // The debounced save goes through /v1.
      await page.waitForTimeout(1_500);
      await demo.sleep({ ms: BEAT * 2 });
      await shot(page, 'circle');
    },
  },
  {
    name: 'Delete the circle again',
    run: async ({ demo, page }) => {
      await caption(demo, 7, 'Delete the circle: the session keeps only the areas it had');
      const last = page.locator(AREA).nth(areasBefore);
      await last.locator('[data-testid="lighthouse.map.area.delete"]').click();
      await page.waitForFunction(([sel, n]) => document.querySelectorAll(sel).length === n, [AREA, areasBefore], {
        timeout: 10_000,
      });
      await page.waitForTimeout(1_500);
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Open a pinned result',
    run: async ({ demo, page }) => {
      await caption(demo, 8, 'Open a result: the companion shows its location too');
      await page.locator(RESULT).first().click();
      await page.locator('[data-testid="lighthouse.detail.location"]').first().waitFor({ timeout: 20_000 });
      await demo.sleep({ ms: BEAT * 2 });
      await shot(page, 'detail');
    },
  },
];
