//
// Copyright 2026 DXOS.org
//

/**
 * Research in the sidebar: a top-level Research section in the space's AI group lists the space's Research newest
 * first; its + starts a new one with the keyboard in the goal; the section opens as the session list with each one's
 * status, pages and cost.
 *
 * @mdl packages/plugins/plugin-lighthouse/PLUGIN.mdl test QA-7
 * @app composer-app via `DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:serve -- --port 5173`,
 *   against a lighthouse daemon on http://127.0.0.1:4319 holding LIGHTHOUSE_SIDEBAR_RUN (default
 *   web-20261028-110009). The setup steps are research.mjs's. Set LIGHTHOUSE_SCREENS to save composer-sidebar*.png.
 *   Nothing is run: the Research opened on an existing session only reads it, and the new one is not started.
 *
 *   node .agents/skills/autocue/scripts/driver.mjs --port 7333 --url http://localhost:5173 --out /tmp/demo
 *   C '{"op":"run","file":"packages/plugins/plugin-lighthouse/autocue/sidebar.mjs"}'
 */

import { join } from 'node:path';

import { steps as research } from './research.mjs';

const SUBTITLE = 'from plugin-lighthouse/PLUGIN.mdl QA-7';
const RUN = process.env.LIGHTHOUSE_SIDEBAR_RUN ?? 'web-20261028-110009';
const SCREENS = process.env.LIGHTHOUSE_SCREENS;
const GOAL = 'Quiet cafés with fast wifi in Lisbon, open past 8 pm';

const SECTION = '[data-testid="org.dxos.type.lighthouse.Research.section"]';
const PLANK = '[data-testid="deck.plank"]';
const LIST = '[data-testid="lighthouse.research-list"]';
const ROW = `${LIST} [data-testid="lighthouse.research-list.row"]`;

const BEAT = 2_000;

const caption = (demo, step, text) =>
  demo.caption({ value: `Step ${step} — ${text}`, subtitle: SUBTITLE, position: 'top' });

const shot = async (page, name) => {
  if (SCREENS) {
    await page.screenshot({ path: join(SCREENS, `${name}.png`) });
  }
};

export const steps = [
  ...research.filter((step) => step.setup),
  {
    name: 'setup: a Research on an existing session, so the list has a status to show',
    setup: true,
    run: async ({ page }) => {
      await page.locator('[data-testid="treeItem.heading"]:text-is("Home")').first().click();
      await page.locator('[data-testid="spacePlugin.createObject"]').first().click();
      await page.locator('[data-testid="create-object-form.type.org.dxos.type.lighthouse.Research"]').click();
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input').first().waitFor({ timeout: 10_000 });
      await dialog.locator('input').nth(0).fill('Warsaw apartments');
      await dialog.locator('input').nth(1).fill(RUN);
      await dialog.locator('[data-testid="save-button"]').click();
      await dialog.waitFor({ state: 'hidden', timeout: 15_000 });
      await page.locator(`${PLANK} [data-testid="lighthouse.result"]`).first().waitFor({ timeout: 90_000 });
    },
  },
  {
    name: 'Research is its own section in the sidebar',
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Research in the sidebar', subtitle: 'Like sessions: a list, and + to start one' });
      await caption(demo, 1, 'Research has its own section, beside Chats');
      await page.locator(SECTION).first().waitFor({ timeout: 20_000 });
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Press + to start a new Research',
    run: async ({ demo, page }) => {
      await caption(demo, 2, '+ starts a new Research, the keyboard already in its goal');
      const section = page.locator(SECTION).first();
      await section.hover();
      const add = page.locator('[aria-label="Add research"]').first();
      await add.waitFor({ timeout: 5_000 });
      await add.click();
      await page.waitForFunction(() => document.activeElement?.closest('[data-testid="deck.plank"]') !== null, null, {
        timeout: 15_000,
      });
      // The plank settles (the new object's node is exposed in the tree) before a person would start typing.
      await page.waitForTimeout(1_500);
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      if (!['TEXTAREA', 'INPUT'].includes(focused ?? '')) {
        throw new Error(`goal not focused: ${focused}`);
      }
      await page.keyboard.type(GOAL, { delay: 25 });
      await page.waitForTimeout(1_000);
      const typed = await page.evaluate(() => document.activeElement?.value);
      if (typed !== GOAL) {
        throw new Error(`goal reads ${typed}`);
      }
      await demo.sleep({ ms: BEAT });
      await shot(page, 'composer-sidebar-new');
    },
  },
  {
    name: 'Open Research in the Database: the session list with status',
    run: async ({ demo, page }) => {
      await caption(demo, 3, 'Every Research, newest first, with status, pages and cost');
      const heading = '[data-testid="treeItem.heading"]:text-is("Research")';
      // The Research type's node under the Database comes after the section's own heading.
      if ((await page.locator(heading).count()) < 2) {
        await page.locator('[data-testid="treeItem.heading"]:text-is("Database")').first().click();
        await page.locator(heading).nth(1).waitFor({ timeout: 10_000 });
      }
      await page.locator(heading).last().click();
      await page.locator(ROW).first().waitFor({ timeout: 20_000 });
      await page
        .waitForFunction(
          (sel) => document.querySelector(`${sel}[data-state="reported"], ${sel}[data-state="idle"]`),
          ROW,
          { timeout: 20_000 },
        )
        .catch(() => {});
      // Back in the sidebar, the section shows the same Research (opened, if it is collapsed).
      const section = page.locator(SECTION).first();
      if ((await section.getAttribute('aria-expanded')) === 'false') {
        await section.click();
      }
      await page.waitForTimeout(1_500);
      await demo.sleep({ ms: BEAT * 2 });
      await shot(page, 'composer-sidebar');
    },
  },
];
