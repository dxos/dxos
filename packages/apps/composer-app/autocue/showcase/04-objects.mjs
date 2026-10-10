//
// Copyright 2026 DXOS.org
//

/**
 * Showcase scene 4: familiar SaaS objects over one ECHO graph. Create a table, add rows, then create a Kanban
 * board over the same type pivoted on status; drag a card to another column and the table row follows.
 *
 * @mdl packages/apps/composer-app/spec/APP.mdl test QA-13
 * @app composer-app bundled dev build against EDGE preview (launch config `composer-showcase`, :4183)
 */

const { prep } = await import(`./01-home.mjs${new URL(import.meta.url).search}`);

/** A beat for the viewer after a visible change. */
const BEAT = 1_200;

const TABLE = 'Launch';
const BOARD = 'Launch board';
const GRAPH = 'Launch graph';
const ROWS = ['Write the announcement', 'Record the demo', 'Ship the release'];

const PLANK = '[data-testid="deck.plank"]';
const GRID = `${PLANK} .dx-grid`;

/** A table cell, by zero-based column and row, in a grid plane. */
const CELL = (col, row, plane = 'grid') =>
  `${GRID} [data-dx-grid-plane="${plane}"] [aria-colindex="${col}"][aria-rowindex="${row}"]`;

/** Resolves once the cell editor holds focus; keys sent before it mounts are dropped. */
const cellEditorReady = (page) =>
  page.waitForFunction(() => document.activeElement?.closest('[data-testid="grid.cell-editor"]') != null, undefined, {
    timeout: 10_000,
  });

const columnIndex = (page, label) =>
  page.evaluate(
    ({ grid, label }) => {
      const headers = [...document.querySelectorAll(`${grid} [data-dx-grid-plane="frozenRowsStart"] [aria-colindex]`)];
      const index = headers.find((header) => header.textContent?.trim() === label)?.getAttribute('aria-colindex');
      return index == null ? -1 : Number(index);
    },
    { grid: GRID, label },
  );

/** The titles in the table's Title column, top to bottom. */
const titles = async (page) => {
  const title = await columnIndex(page, 'Title');
  if (title < 0) {
    return [];
  }
  return page
    .locator(`${GRID} [data-dx-grid-plane="grid"] [aria-colindex="${title}"]`)
    .evaluateAll((cells) => cells.map((cell) => cell.textContent?.trim() ?? ''));
};

/** The navtree row of the object named exactly `name`; a type node and "Launch board" both contain "Launch". */
const treeObject = async (page, name) => {
  const index = await page
    .locator('[data-testid="spacePlugin.object"]')
    .evaluateAll((rows, name) => rows.findIndex((row) => row.innerText.trim().split('\n')[0] === name), name);
  if (index < 0) {
    throw new Error(`no object named ${name} in the navtree`);
  }
  return `[data-testid="spacePlugin.object"] >> nth=${index}`;
};

/** The plank heading carries the object's name; an exact match tells the table from the board. */
const objectOpen = (page, name) =>
  page
    .locator(PLANK)
    .evaluateAll((planks, name) => planks.some((plank) => plank.innerText.trim().split('\n')[0] === name), name);

const openFromTree = async (demo, page, name) => {
  if (!(await objectOpen(page, name))) {
    await demo.click({ selector: await treeObject(page, name), label: name });
  }
};

/** Titles of the cards in the Done column. */
const doneTitles = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="board-column"]')]
      .filter(
        (column) => column.querySelector('[data-testid="mosaicBoard.columnTitle"]')?.textContent?.trim() === 'Done',
      )
      .flatMap((column) =>
        [...column.querySelectorAll('[data-testid="board-item"] input')].map((input) => input.value),
      ),
  );

/** A card's title is an input's value, which text selectors cannot see. */
const cardIndex = async (page, title) => {
  const index = await page
    .locator('[data-testid="board-item"]')
    .evaluateAll(
      (cards, title) =>
        cards.findIndex((card) => [...card.querySelectorAll('input')].some((input) => input.value === title)),
      title,
    );
  if (index < 0) {
    throw new Error(`no card titled ${title}`);
  }
  return index;
};

export const steps = [
  prep,
  {
    name: 'Create a table',
    narration: 'Here’s a table.',
    done: async ({ page }) => (await page.locator(`[role="treeitem"]:has-text("${TABLE}")`).count()) > 0,
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"] >> nth=0', label: 'Add to space' });
      await demo.click({ selector: '[data-testid="create-object-form.type.org.dxos.type.table"]', label: 'Table' });
      await demo.type({ selector: '[role="dialog"] input[placeholder="Name"]', value: TABLE, label: 'Name' });
      // No type picked: the table gets a new type of its own, with Title, Status and Description.
      await demo.click({ selector: '[role="dialog"] [data-testid="save-button"]', label: 'Create' });
      await page
        .locator('[data-testid="table-new-column-button"]')
        .first()
        .waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Add rows',
    narration: 'Each row is an object in your space.',
    done: async ({ page }) => {
      const present = await titles(page);
      return ROWS.every((row) => present.includes(row));
    },
    run: async ({ demo, page }) => {
      await openFromTree(demo, page, TABLE);
      await page.locator(GRID).first().waitFor({ state: 'visible', timeout: 15_000 });
      const title = await columnIndex(page, 'Title');
      for (const name of ROWS) {
        const present = await titles(page);
        if (present.includes(name)) {
          continue;
        }
        // An empty row left by an earlier attempt is filled rather than adding another.
        let row = present.indexOf('');
        if (row < 0) {
          row = present.length;
          await demo.click({ selector: `${CELL(0, 0, 'frozenRowsEnd')} >> nth=0`, label: 'Add row' });
        }
        await page.locator(CELL(title, row)).first().waitFor({ state: 'visible', timeout: 10_000 });
        await demo.click({ selector: `${CELL(title, row)} >> nth=0`, hud: false });
        await page.keyboard.press('Enter');
        await cellEditorReady(page);
        // The driver types into the focused cell editor and holds a beat once the text is in.
        await demo.type({ value: name, label: 'Title' });
        await page.keyboard.press('Tab');
        await page.waitForTimeout(300);
      }
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Create a kanban over the same records',
    narration: 'Add a kanban board over the same records. It’s not a copy: both are views over one graph.',
    done: async ({ page }) => (await page.locator(`[role="treeitem"]:has-text("${BOARD}")`).count()) > 0,
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"] >> nth=0', label: 'Add to space' });
      await demo.click({ selector: '[data-testid="create-object-form.type.org.dxos.type.kanban"]', label: 'Kanban' });
      const form = '[role="dialog"] [data-testid="create-object-form"]';
      await page.locator(form).first().waitFor({ state: 'visible', timeout: 10_000 });
      await demo.type({ selector: '[role="dialog"] input[placeholder="Name"]', value: BOARD, label: 'Name' });
      // The card type is the one the table created, named after it; the pivot is its Status column.
      await demo.click({ selector: '[role="dialog"] >> role=combobox >> nth=0', label: 'Card type' });
      await demo.click({ selector: `role=option[name="${TABLE}"] >> nth=0`, label: TABLE });
      await demo.click({ selector: '[role="dialog"] >> role=combobox >> nth=1', label: 'Pivot column' });
      await demo.click({ selector: 'role=option[name=/status/i] >> nth=0', label: 'Status' });
      await demo.click({ selector: '[role="dialog"] [data-testid="save-button"]', label: 'Create' });
      await page.locator('[data-testid="board-column"]').first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Graph the same records',
    narration: 'And Explorer, switched on a moment ago, draws the whole space as one graph of connected objects.',
    done: async ({ page }) => (await page.locator(`[role="treeitem"]:has-text("${GRAPH}")`).count()) > 0,
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"] >> nth=0', label: 'Add to space' });
      await demo.click({ selector: '[data-testid="create-object-form.type.org.dxos.type.graph"]', label: 'Explorer' });
      await page.locator('[role="dialog"] input[placeholder="Name"]').first().waitFor({ timeout: 10_000 });
      await demo.type({ selector: '[role="dialog"] input[placeholder="Name"]', value: GRAPH, label: 'Name' });
      await demo.click({ selector: '[role="dialog"] >> role=combobox >> nth=0', label: 'Type' });
      await demo.click({ selector: `role=option[name="${TABLE}"] >> nth=0`, label: TABLE });
      await demo.click({ selector: '[role="dialog"] [data-testid="save-button"]', label: 'Create' });
      await page.locator(`${PLANK} svg`).first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Drag a card to Done',
    narration: 'Move a card, and the table updates. Familiar SaaS tools, minus the silos.',
    run: async ({ demo, page }) => {
      await openFromTree(demo, page, BOARD);
      const column = (title) =>
        `[data-testid="board-column"]:has([data-testid="mosaicBoard.columnTitle"]:text-is("${title}"))`;
      await page.locator(column('Done')).first().waitFor({ state: 'visible', timeout: 15_000 });
      // A retry moves the next card still outside Done, so the take always shows a move.
      const done = await doneTitles(page);
      const title = ROWS.find((row) => !done.includes(row)) ?? ROWS[0];
      const card = await cardIndex(page, title);
      await demo.drag({
        from: `[data-testid="board-item"] >> nth=${card} >> [data-testid="mosaicBoard.cardDragHandle"]`,
        to: `${column('Done')} >> nth=0`,
        label: 'Move to Done',
      });
      await page.waitForFunction(
        (title) =>
          [...document.querySelectorAll('[data-testid="board-column"]')]
            .filter(
              (column) =>
                column.querySelector('[data-testid="mosaicBoard.columnTitle"]')?.textContent?.trim() === 'Done',
            )
            .some((column) =>
              [...column.querySelectorAll('[data-testid="board-item"] input')].some((input) => input.value === title),
            ),
        title,
        { timeout: 10_000 },
      );
      await page.waitForTimeout(BEAT);
      // Back to the table: the row's Status now reads done.
      await demo.click({ selector: await treeObject(page, TABLE), label: TABLE });
      await page.locator(GRID).first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT * 2);
    },
  },
];
