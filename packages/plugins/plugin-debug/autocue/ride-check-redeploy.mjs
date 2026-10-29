//
// Copyright 2026 DXOS.org
//

/**
 * Ride Check, the edit loop: the live page, the change behind a feature card, a redeploy, and the same URL showing it.
 * The Composer half (the template, the feature map, the card edit) is `ride-check.mjs`; the cut splices this after it.
 *
 * @mdl packages/plugins/plugin-debug/PLUGIN.mdl test QA-10
 * @app the deployed Worker, plus the autocue terminal stage on :4180 in the checkout `ride-check/prepare.sh` built
 *
 *   CLOUDFLARE_API_TOKEN=... packages/plugins/plugin-debug/autocue/ride-check/prepare.sh /tmp/ride-check
 *   node .agents/skills/autocue/scripts/terminal/stage.mjs --port 4180 --cwd /tmp/ride-check --cols 96 --rows 24 \
 *     --init packages/plugins/plugin-debug/autocue/ride-check/stage-init.sh
 *   node .agents/skills/autocue/scripts/driver.mjs --port 7333 --url "$SITE" --out /tmp/ride-check-take \
 *     --ready '[data-testid="verdict.badge"]' --settle 800 --width 1440 --height 900 --log off
 *
 * Wellington is the place because the take needs calm wind with gusts over 30 km/h in daylight, so the verdict flips
 * from GO to MAYBE on the gust rule alone; check `/api/forecast` first and pick another place if it does not hold.
 */

const SITE = 'https://ride-check-demo.dxos.workers.dev/?lat=-41.2865&lon=174.7762&name=Wellington%20waterfront';
const STAGE = 'http://localhost:4180/';

/** A beat for the viewer after output lands. */
const BEAT = 1_600;

/** Keystroke delay: quick enough to keep the take short, slow enough to read. */
const TYPING = 34;

/** Types a command into the terminal and waits for the shell to print its next prompt. */
const sh = async (page, command, { timeout = 180_000, beat = BEAT } = {}) => {
  const before = await page.evaluate(() => window.stage.prompts);
  await page.locator('[data-testid="stage.terminal"] textarea').focus();
  await page.keyboard.type(command, { delay: TYPING });
  await page.waitForTimeout(250);
  await page.keyboard.press('Enter');
  await page.waitForFunction((count) => window.stage.prompts > count, before, { timeout });
  await page.waitForTimeout(beat);
};

const openSite = async (page) => {
  await page.goto(SITE, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="verdict.badge"]').waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForTimeout(800);
};

export const steps = [
  {
    name: 'Prep (off camera): open the live page',
    setup: true,
    run: async ({ page }) => {
      await openSite(page);
    },
  },
  {
    name: 'The live page',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'Ride Check is live',
        subtitle: 'ride-check-demo.dxos.workers.dev - DXOS UI on a Cloudflare Worker',
      });
      await page.waitForTimeout(2_500);
      await demo.hover({ selector: '[data-testid="verdict.badge"]' });
      await page.waitForTimeout(2_000);
      await demo.hover({ selector: '[data-testid="feature.hourly"]' });
      await page.waitForTimeout(2_000);
      await demo.hover({ selector: '[data-testid="feature.daylight"]' });
      await page.waitForTimeout(1_500);
    },
  },
  {
    name: 'The change behind the feature card',
    run: async ({ demo, page }) => {
      await page.goto(STAGE, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.stage?.prompts > 0, undefined, { timeout: 30_000 });
      await demo.caption({ value: 'Go / no-go gets a gust rule', subtitle: 'F-1.4: warn when gusts top 30 km/h' });
      await sh(page, 'git show HEAD -- src/worker', { beat: 5_000 });
    },
  },
  {
    name: 'Redeploy',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Redeploy', subtitle: 'Same Worker, same URL' });
      await sh(page, 'clear && npm run deploy', { beat: 2_500 });
    },
  },
  {
    name: 'Reload: the same URL shows the change',
    run: async ({ demo, page }) => {
      await openSite(page);
      await demo.caption({ value: 'Same URL, new rule', subtitle: 'Calm wind, but 40+ km/h gusts: GO becomes MAYBE' });
      await page.locator('[data-testid="verdict.gusts"]').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(1_500);
      await demo.hover({ selector: '[data-testid="verdict.gusts"]' });
      await page.waitForTimeout(4_000);
    },
  },
];
