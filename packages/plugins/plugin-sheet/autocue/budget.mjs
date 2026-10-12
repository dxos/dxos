//
// Copyright 2026 DXOS.org
//

/**
 * Create a sheet, enter a small budget, total it with SUM, and change a value to watch the totals recompute.
 *
 * @mdl packages/plugins/plugin-sheet/PLUGIN.mdl test QA-2
 * @app composer-app bundled dev build, served by `vite preview` on :4173
 *
 *   export DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true
 *   moon run composer-app:bundle
 *   pnpm exec vite preview --configLoader native --port 4173 --strictPort
 *
 * Record on a fresh profile; produce the cut with the Composer intro and a narrated voice-over:
 *
 *   node .agents/skills/autocue/scripts/trim-static.mjs --in <out>/session.webm --out sheet.webm \
 *     --ident composer --voiceover steps --mp4 --screenshot
 */

/** A beat for the viewer after a visible change. */
const BEAT = 1_200;

/** The header row and four rows of quarterly costs. */
const BUDGET = [
  ['Item', 'Q1', 'Q2'],
  ['Hosting', '120', '140'],
  ['Design', '80', '95'],
  ['Marketing', '60', '75'],
  ['Support', '40', '45'],
];

/** The totals row, under the budget. */
const TOTALS = ['Total', '=SUM(B2:B5)', '=SUM(C2:C5)'];
const TOTALS_ROW = BUDGET.length;

/** What the edited cell becomes, and the Q1 total that follows from it. */
const EDIT = { col: 1, row: 1, value: '200' };
const EDITED_TOTAL = '380';

/** A sheet cell, by zero-based column and row. */
const CELL = (col, row) => `.dx-grid [data-dx-grid-plane="grid"] [aria-colindex="${col}"][aria-rowindex="${row}"]`;

/** Types as a person would, a character at a time. */
const typeSlowly = (page, text, delay = 60) => page.keyboard.type(text, { delay });

/** Waits until the cell shows `text`. */
const waitForCell = (page, col, row, text) =>
  page.waitForFunction(
    ({ selector, text }) => document.querySelector(selector)?.textContent?.trim() === text,
    { selector: CELL(col, row), text },
    { timeout: 10_000 },
  );

/** Types a row of values from its first cell, moving right with Tab and ending with Enter. */
const enterRow = async (demo, page, row, values) => {
  await demo.click({ selector: `${CELL(0, row)} >> nth=0`, hud: false });
  for (const [col, value] of values.entries()) {
    await typeSlowly(page, value);
    // The grid ignores a commit that follows the typing too closely.
    await page.waitForTimeout(500);
    await page.keyboard.press(col < values.length - 1 ? 'Tab' : 'Enter');
    await page.waitForTimeout(200);
  }
};

export const steps = [
  {
    name: 'Prep (off camera): dismiss notices and close the help panel',
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
      // A fresh profile opens on the space's Home; clicking the space row would collapse its tree.
      await page.locator('[data-testid="deck.plank"][data-attendable-id$="/home"]').first().waitFor();
      const close = page.locator('role=button[name="Close companion"]').first();
      if (await close.isVisible().catch(() => false)) {
        await close.click();
      }
    },
  },
  {
    name: 'Create a sheet',
    narration: 'Add a sheet to your space.',
    done: async ({ page }) => (await page.locator(CELL(0, 0)).count()) > 0,
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"] >> nth=0', label: 'Add to space' });
      await demo.click({ selector: '[data-testid="create-object-form.type.org.dxos.type.sheet"]', label: 'Sheet' });
      await page.locator(CELL(0, 0)).first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Enter a header row and four rows of costs',
    narration: 'Type straight into the grid. Tab moves across and Enter moves down.',
    run: async ({ demo, page }) => {
      for (const [row, values] of BUDGET.entries()) {
        await enterRow(demo, page, row, values);
      }
      await waitForCell(page, 2, BUDGET.length - 1, BUDGET.at(-1).at(-1));
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Total each quarter with SUM',
    narration: 'Formulas use familiar functions like SUM, and the totals compute as you type.',
    run: async ({ demo, page }) => {
      await enterRow(demo, page, TOTALS_ROW, TOTALS);
      await waitForCell(page, 1, TOTALS_ROW, '300');
      await waitForCell(page, 2, TOTALS_ROW, '355');
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Change a cost and watch the total update',
    narration: 'Change any value and every formula that depends on it updates instantly.',
    run: async ({ demo, page }) => {
      await demo.click({ selector: `${CELL(EDIT.col, EDIT.row)} >> nth=0`, label: 'Hosting Q1' });
      await page.waitForTimeout(BEAT / 2);
      await typeSlowly(page, EDIT.value, 120);
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
      await waitForCell(page, EDIT.col, TOTALS_ROW, EDITED_TOTAL);
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Close on the finished sheet',
    narration:
      'Sheets work offline and sync when you reconnect, so teammates and AI agents can edit cells at the ' +
      'same time and every formula keeps up.',
    run: async ({ page }) => {
      await page.waitForTimeout(BEAT * 9);
    },
  },
];
