//
// Copyright 2026 DXOS.org
//

/**
 * Search by image, from Composer: a Research opened on the Mizuno top hunt shows the photo the person gave and what
 * lighthouse read from it (its marks and printed text, with their crops; never a face), and cards say how much each
 * result looks like the photo. Attaching an image to a follow-up shows its thumbnail; the flow removes it again
 * without sending, so the session is left as it was.
 *
 * @mdl packages/plugins/plugin-lighthouse/PLUGIN.mdl test QA-6
 * @app composer-app via `DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:serve -- --port 5173`,
 *   against a lighthouse daemon on http://127.0.0.1:4319 holding the session LIGHTHOUSE_IMAGE_RUN (default
 *   image-mizuno-bkk-2). The setup steps are research.mjs's. Set LIGHTHOUSE_SCREENS to save composer-image-*.png;
 *   LIGHTHOUSE_IMAGE_FILE is the photo attached in the last step.
 *
 *   node .agents/skills/autocue/scripts/driver.mjs --port 7333 --url http://localhost:5173 --out /tmp/demo
 *   C '{"op":"run","file":"packages/plugins/plugin-lighthouse/autocue/image.mjs"}'
 */

import { homedir } from 'node:os';
import { join } from 'node:path';

import { steps as research } from './research.mjs';

const SUBTITLE = 'from plugin-lighthouse/PLUGIN.mdl QA-6';
const RUN = process.env.LIGHTHOUSE_IMAGE_RUN ?? 'image-mizuno-bkk-2';
const NAME = 'Mizuno top';
const SCREENS = process.env.LIGHTHOUSE_SCREENS;
const FILE =
  process.env.LIGHTHOUSE_IMAGE_FILE ??
  join(homedir(), 'Code/dmaretskyi/lighthouse/exports/inputs/mizuno-since-1906-top.webp');

const BEAT = 2_000;

const PLANK = '[data-testid="deck.plank"]';
const IMAGES = `${PLANK} [data-testid="lighthouse.input-images"]`;
const FEATURE = `${IMAGES} [data-testid="lighthouse.input-image.feature"]`;
const RESULT = `${PLANK} [data-testid="lighthouse.result"]`;

const caption = (demo, step, text) =>
  demo.caption({ value: `Step ${step} - ${text}`, subtitle: SUBTITLE, position: 'top' });

const shot = async (page, name) => {
  if (SCREENS) {
    await page.screenshot({ path: join(SCREENS, `composer-image-${name}.png`) });
  }
};

export const steps = [
  ...research.filter((step) => step.setup),
  {
    name: 'Open the Mizuno top hunt',
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Search by image', subtitle: 'Find this top in Bangkok' });
      await caption(demo, 1, 'Open the image search started from the CLI');
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
      await page.locator(RESULT).first().waitFor({ timeout: 90_000 });
    },
  },
  {
    name: 'The photo and what lighthouse read from it',
    run: async ({ demo, page }) => {
      await caption(demo, 2, 'The photo, and what lighthouse read from it: marks, printed text, their crops');
      const images = page.locator(IMAGES).first();
      await images.waitFor({ timeout: 30_000 });
      await images.evaluate((element) => element.scrollIntoView({ block: 'start' }));
      await page.locator(FEATURE).first().waitFor({ timeout: 30_000 });
      await page
        .waitForFunction(
          (sel) => [...document.querySelectorAll(`${sel} img`)].some((img) => img.complete && img.naturalWidth > 0),
          IMAGES,
          { timeout: 20_000 },
        )
        .catch(() => {});
      await page.waitForTimeout(1_500);
      await demo.sleep({ ms: BEAT * 2 });
      await shot(page, 'thread');
    },
  },
  {
    name: 'Cards say how much they look like the photo',
    run: async ({ demo, page }) => {
      await caption(demo, 3, 'Cards say how much each result looks like the photo');
      const match = page.locator(`${RESULT}:has-text("like your image")`).first();
      await match.waitFor({ timeout: 20_000 });
      await match.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1_500);
      await demo.sleep({ ms: BEAT * 2 });
      await shot(page, 'cards');
    },
  },
  {
    name: 'Attach a photo to a follow-up, then remove it',
    run: async ({ demo, page }) => {
      await caption(demo, 4, 'Attach, paste or drop up to four photos with a follow-up');
      await page.locator(`${PLANK} [data-testid="lighthouse.attach.input"]`).last().setInputFiles(FILE);
      const strip = page.locator(`${PLANK} [data-testid="lighthouse.attachments"]`).last();
      await strip.waitFor({ timeout: 10_000 });
      await page.waitForTimeout(1_000);
      await demo.sleep({ ms: BEAT });
      await shot(page, 'attach');
      // Not sent: the session is left as it was.
      await strip.locator('button').first().click();
      await strip.waitFor({ state: 'detached', timeout: 5_000 });
    },
  },
];
