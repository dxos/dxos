//
// Copyright 2026 DXOS.org
//

/**
 * Create a table, add a typed number column, enter a few rows, and sort them by that column.
 *
 * @mdl packages/plugins/plugin-table/PLUGIN.mdl test QA-2
 * @app composer-app bundled dev build, served by `vite preview` on :4173
 *
 *   export DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true
 *   moon run composer-app:bundle
 *   pnpm exec vite preview --configLoader native --port 4173 --strictPort
 *
 * Record on a fresh profile; produce the cut with the Composer intro and a narrated voice-over:
 *
 *   node .agents/skills/autocue/scripts/trim-static.mjs --in <out>/session.webm --out table.webm \
 *     --ident composer --voiceover steps --mp4 --screenshot
 */

/** A beat for the viewer after a visible change. */
const BEAT = 1_200;

const TABLE = 'Reading list';
const RATING = { property: 'rating', label: 'Rating', format: 'Number' };

/** Title and rating of each row, entered in this order. */
const ROWS = [
  ['Dune', '4'],
  ['Neuromancer', '5'],
  ['Snow Crash', '3'],
  ['Foundation', '4.5'],
];

/** The table plank's grid. */
const GRID = '[data-testid="deck.plank"] .dx-grid';

/** A table cell, by zero-based column and row, in a grid plane. */
const CELL = (col, row, plane = 'grid') =>
  `${GRID} [data-dx-grid-plane="${plane}"] [aria-colindex="${col}"][aria-rowindex="${row}"]`;

/** Types as a person would, a character at a time. */
const typeSlowly = (page, text, delay = 60) => page.keyboard.type(text, { delay });

/** Resolves once the cell editor holds focus; keys sent before it mounts are dropped. */
const cellEditorReady = (page) =>
  page.waitForFunction(() => document.activeElement?.closest('[data-testid="grid.cell-editor"]') != null, undefined, {
    timeout: 10_000,
  });

/** The zero-based column index of the header labelled `label`. */
const columnIndex = (page, label) =>
  page.evaluate(
    ({ grid, label }) => {
      const headers = [...document.querySelectorAll(`${grid} [data-dx-grid-plane="frozenRowsStart"] [aria-colindex]`)];
      const index = headers.find((header) => header.textContent?.trim() === label)?.getAttribute('aria-colindex');
      return index == null ? -1 : Number(index);
    },
    { grid: GRID, label },
  );

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
    name: 'Create a table',
    narration: 'Create a table in your space.',
    done: async ({ page }) => (await page.locator('[data-testid="deck.plank"]', { hasText: TABLE }).count()) > 0,
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"] >> nth=0', label: 'Add to space' });
      await demo.click({ selector: '[data-testid="create-object-form.type.org.dxos.type.table"]', label: 'Table' });
      await demo.type({ selector: '[role="dialog"] input[placeholder="Name"]', value: TABLE, label: 'Name' });
      // No type picked: the table gets a new type of its own.
      await demo.click({ selector: '[role="dialog"] [data-testid="save-button"]', label: 'Create' });
      await page
        .locator('[data-testid="table-new-column-button"]')
        .first()
        .waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Add a typed number column',
    narration: 'Add a column and give it a type, here a number for the rating.',
    done: async ({ page }) => (await columnIndex(page, RATING.label)) >= 0,
    run: async ({ demo, page }) => {
      const add = '[data-testid="table-new-column-button"]';
      await demo.click({ selector: `${add} >> nth=0`, label: 'New column' });
      await demo.fill({
        selector: 'input[placeholder="Property name"], input[value^="prop_"] >> nth=0',
        value: RATING.property,
        hud: false,
      });
      await demo.type({ selector: 'input[placeholder="Property label"]', value: RATING.label, label: 'Label' });
      await demo.click({ selector: 'role=combobox >> text=Format', label: 'Format' });
      await demo.click({ selector: `role=option[name="${RATING.format}"]`, label: RATING.format });
      await demo.click({ selector: 'button:has-text("Save") >> nth=-1', label: 'Save' });
      await page
        .locator(`${GRID} [data-dx-grid-plane="frozenRowsStart"]`, { hasText: RATING.label })
        .first()
        .waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Add rows',
    narration: 'Add rows and type straight into the cells. Each row is an object in your space.',
    run: async ({ demo, page }) => {
      const title = await columnIndex(page, 'Title');
      const rating = await columnIndex(page, RATING.label);
      for (const [row, [name, score]] of ROWS.entries()) {
        await demo.click({ selector: `${CELL(0, 0, 'frozenRowsEnd')} >> nth=0`, label: 'Add row' });
        await page.locator(CELL(title, row)).first().waitFor({ state: 'visible', timeout: 10_000 });
        for (const [col, value] of [
          [title, name],
          [rating, score],
        ]) {
          await demo.click({ selector: `${CELL(col, row)} >> nth=0`, hud: false });
          await page.keyboard.press('Enter');
          await cellEditorReady(page);
          await typeSlowly(page, value);
          await page.waitForTimeout(300);
          // Enter on the last row would insert another row; Tab commits and stays on it.
          await page.keyboard.press('Tab');
          await page.waitForTimeout(300);
        }
      }
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Sort by rating',
    narration: 'Sort by any column. Highest rated first.',
    run: async ({ demo, page }) => {
      const rating = await columnIndex(page, RATING.label);
      await demo.click({
        selector: `${CELL(rating, 0, 'frozenRowsStart')} [data-testid="table-column-settings-button"] >> nth=0`,
        label: 'Column menu',
      });
      await demo.click({ selector: '[data-testid="column-sort-descending"] >> nth=0', label: 'Sort descending' });
      const title = await columnIndex(page, 'Title');
      await page.waitForFunction(
        ({ selector, top }) => document.querySelector(selector)?.textContent?.trim() === top,
        { selector: CELL(title, 0), top: 'Neuromancer' },
        { timeout: 10_000 },
      );
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Close on the sorted table',
    narration:
      'Every row is a typed object that teammates and AI agents can query and edit at the same time, ' +
      'and it all works offline.',
    run: async ({ page }) => {
      await page.waitForTimeout(BEAT * 9);
    },
  },
];
