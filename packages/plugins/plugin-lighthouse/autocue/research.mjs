//
// Copyright 2026 DXOS.org
//

/**
 * Research a goal from Composer: create a Research, run it on a local lighthouse daemon, watch the thread and the
 * results stream in, open a result in the companion, star and vote, and show the kept Findings.
 *
 * @mdl packages/plugins/plugin-lighthouse/PLUGIN.mdl test QA-1
 * @app composer-app via `DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:serve -- --port 5173`,
 *   against a lighthouse daemon on http://127.0.0.1:4319. The setup step reads the API token from
 *   `$LIGHTHOUSE_WORKSPACE/api-token` (default `~/Code/dmaretskyi/lighthouse/.lighthouse`) and never logs it.
 *
 *   node .agents/skills/autocue/scripts/driver.mjs --port 7333 --url http://localhost:5173 --out /tmp/demo
 *   C '{"op":"run","file":"packages/plugins/plugin-lighthouse/autocue/research.mjs"}'
 */

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SUBTITLE = 'from plugin-lighthouse/PLUGIN.mdl QA-1';
const NAME = 'Board game cafés';
const GOAL = 'Board game cafés in Bangkok with a big game library';
const SERVER = process.env.LIGHTHOUSE_URL ?? 'http://127.0.0.1:4319';

/** A beat for the viewer after a visible change. */
const BEAT = 2_500;

/** A Quick session runs up to 5 minutes; results land within the first one or two. */
const RESULTS_TIMEOUT = 5 * 60_000;

const PLANK = '[data-testid="deck.plank"]';
const RESULT = '[data-testid="lighthouse.result"]';
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

/** The workspace's API token, a local test credential; read here so it never appears in a command or a log. */
const readToken = () => {
  const workspace = process.env.LIGHTHOUSE_WORKSPACE ?? join(homedir(), 'Code/dmaretskyi/lighthouse/.lighthouse');
  return readFileSync(join(workspace, 'api-token'), 'utf8').trim();
};

const heading = (page, label) => page.locator(`[data-testid="treeItem.heading"]:text-is("${label}")`).first();

/** Waits until at least `count` result cards are in the open Research's masonry. */
const waitForResults = (page, count, timeout) =>
  page.waitForFunction(
    ([selector, expected]) => document.querySelectorAll(selector).length >= expected,
    [RESULT, count],
    { timeout },
  );

export const steps = [
  {
    name: 'setup: dismiss notices, close the companion, enable Lighthouse',
    setup: true,
    run: async ({ page }) => {
      const notice = page.locator('[data-testid="toast.close"]');
      if (await visible(notice, 5_000)) {
        await notice.first().click();
      }
      const close = page.locator('[data-testid="plankHeading.closeCompanion"]');
      if (await visible(close, 1_000)) {
        await close.first().click();
      }
      // The operation invoker registers after boot; on a slow machine the first call can arrive before it.
      for (let attempt = 0; ; attempt++) {
        try {
          await page.evaluate(() =>
            composer.invoke('org.dxos.operation.registry.enablePlugins', { ids: ['org.dxos.plugin.lighthouse'] }),
          );
          break;
        } catch (err) {
          if (attempt > 10) {
            throw err;
          }
          await page.waitForTimeout(1_000);
        }
      }
    },
  },
  {
    // QA-1 `before`: Connect lighthouse.
    name: 'setup: In Settings -> Connections, add Lighthouse with the local URL and the API token',
    setup: true,
    run: async ({ page }) => {
      // A dialog left open (a create flow that stepped back) would cover the navtree.
      for (let i = 0; i < 3 && (await visible(page.locator('[role="dialog"]'), 300)); i++) {
        await page.keyboard.press('Escape');
      }
      if (!(await visible(heading(page, 'Connections'), 1_000))) {
        await heading(page, 'Settings').click();
      }
      await heading(page, 'Connections').click();
      await page.getByText('Add connection').first().waitFor({ timeout: 15_000 });
      if (await visible(page.locator(`${PLANK} :text-is("Lighthouse")`), 2_000)) {
        return;
      }
      await page.getByRole('button', { name: 'Connect', exact: true }).first().click();
      const dialog = page.locator('[role="dialog"]');
      await dialog.getByText('Lighthouse', { exact: true }).click();
      await dialog.getByRole('button', { name: 'Continue' }).click();
      await dialog.locator('input[type="text"]').first().fill(SERVER);
      await dialog.locator('input[type="password"]').first().fill(readToken());
      await dialog.getByRole('button', { name: 'Save' }).click();
      await dialog.waitFor({ state: 'hidden', timeout: 15_000 });
      await page.locator(`${PLANK} :text-is("Lighthouse")`).first().waitFor({ timeout: 15_000 });
    },
  },
  {
    name: 'Open Composer',
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Lighthouse in Composer', subtitle: 'Agent-driven web research, kept in a space' });
      await caption(demo, 1, 'Open Composer on the space');
      await demo.click({ selector: '[data-testid="treeItem.heading"]:text-is("Home")', label: 'Home' });
      await page.locator('[data-testid="spacePlugin.createObject"]').first().waitFor({ timeout: 15_000 });
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Create a Research with the goal "Board game cafés in Bangkok with a big game library" and Quick budget',
    run: async ({ demo, page }) => {
      await caption(demo, 2, 'Create a Research and write its goal');
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
      const goal = page.locator(`${PLANK} textarea`).first();
      await goal.waitFor({ timeout: 20_000 });
      await demo.type({ selector: `${PLANK} textarea >> nth=0`, value: GOAL, delay: 30, label: 'Goal' });
      // The form saves on blur.
      await page.keyboard.press('Tab');
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
      await caption(demo, 3, 'Run the research: the agent starts a lighthouse session');
      await demo.click({ selector: '[data-testid="lighthouse.run"]', label: 'Run' });
      await page.locator('[data-testid="assistant.thread"]').first().waitFor({ timeout: 30_000 });
      await page.getByText('Pages', { exact: false }).first().waitFor({ timeout: 30_000 });
      // The first run row: the agent says what it is doing and makes its first calls.
      await demo.speed({ factor: 2 });
      await page.locator('[data-testid="lighthouse.run-row"]').first().waitFor({ timeout: 60_000 });
      await demo.speed({ factor: 1 });
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Watch results land',
    run: async ({ demo, page }) => {
      await caption(demo, 4, 'Results land in the masonry as the agent extracts them');
      // The agent's searching is motion with little to read: the cut plays it fast, marked >>.
      await demo.speed({ factor: 3 });
      await waitForResults(page, 6, RESULTS_TIMEOUT);
      // A few more seconds of results landing, then normal speed to read the cards.
      await page.waitForTimeout(8_000);
      await demo.speed({ factor: 1 });
      await demo.sleep({ ms: 5_000 });
    },
  },
  {
    name: 'Open a result in the companion',
    run: async ({ demo, page }) => {
      await caption(demo, 5, 'Open a result: its facts, where they came from, and More about this');
      await demo.click({ selector: `${RESULT} >> nth=0`, label: 'Result' });
      await page.locator(DETAIL).first().waitFor({ timeout: 15_000 });
      await page.locator('[data-testid="lighthouse.facts"]').first().waitFor({ timeout: 15_000 });
      await demo.sleep({ ms: BEAT * 2 });
    },
  },
  {
    name: 'Star the result in the companion, and thumbs-up another card',
    run: async ({ demo, page }) => {
      await caption(demo, 6, 'Star it to keep it; vote on another to steer the ranking');
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
      await caption(demo, 7, 'Findings: what was kept, copied into the space');
      await demo.click({
        selector: `${PLANK} [role="radio"][aria-label="Findings"], ${PLANK} button[aria-label="Findings"]`,
        label: 'Findings',
      });
      await page.getByText('Kept · starred').first().waitFor({ timeout: 15_000 });
      await demo.sleep({ ms: 6_000 });
    },
  },
];
