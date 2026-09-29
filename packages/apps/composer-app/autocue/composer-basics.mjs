//
// Copyright 2026 DXOS.org
//

/**
 * A tour of Composer's basics in the default space: comment on the README, write a new document linked
 * from it, enable Maps and Canvas, draw a diagram, fill a table with the assistant while editing a sheet,
 * and plot the table's rows on a map that turns into a globe.
 *
 * @mdl packages/apps/composer-app/spec/APP.mdl test QA-11
 * @app composer-app bundled dev build, served by `vite preview` on :4173, talking to EDGE preview
 *
 * Built and served from `packages/apps/composer-app`; the assistant needs EDGE preview:
 *
 *   export DX_EDGE_BASE_URL=https://preview.dxos.network/ DX_ENVIRONMENT=dev DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true
 *   moon run composer-app:bundle
 *   pnpm exec vite preview --configLoader native --port 4173 --strictPort
 *
 * Record on a fresh profile (`--profile <empty dir>`): the take starts on the Home page of the default
 * space a new identity is given, with the onboarding README in it.
 */

/** The Assistant's remote model; the delegated turns in this repo's demos are tuned against it. */
const MODEL = 'DeepSeek V4 Pro';

/** A beat for the viewer after a visible change. */
const BEAT = 1_000;

/** The heading the comment is anchored to, near the bottom of the README. */
const COMMENT_ANCHOR = 'What Composer stands for';
const COMMENT = 'Need to describe Composer';

/** The document the new section links to, created from the link. */
const DOCUMENT = 'About Composer';

/** Two paragraphs typed into the new document. */
const DESCRIPTION = [
  'Composer is a local-first workspace for the objects you work with every day: documents, tables, ' +
    'sheets, diagrams and maps live side by side in a space, stored on your device and shared in real ' +
    'time with the people you invite.',
  'Everything in Composer is a plugin. Plugins add the types of objects a space can hold and the ' +
    'surfaces that show them, so a table, a map and an assistant can all work on the same data.',
];

/** Plugins off by default that the tour turns on, by id and display name. */
const PLUGINS = [
  { id: 'org.dxos.plugin.map', name: 'Maps' },
  { id: 'org.dxos.plugin.canvas', name: 'Canvas' },
];

/** The diagram: four labelled boxes, laid out as fractions of the canvas, and the links between them. */
const DIAGRAM = {
  nodes: [
    { label: 'Space', x: 0.22, y: 0.3 },
    { label: 'Object', x: 0.68, y: 0.3 },
    { label: 'Plugin', x: 0.22, y: 0.72 },
    { label: 'Surface', x: 0.68, y: 0.72 },
  ],
  links: [
    ['Space', 'Object'],
    ['Plugin', 'Surface'],
    ['Surface', 'Object'],
    ['Plugin', 'Object'],
  ],
};

/** The table the assistant fills, and the location column the map plots. */
const TABLE = 'Cloudflare data centers';
const LOCATION = { property: 'location', label: 'Location', format: 'Geopoint' };

/** What the assistant is asked; the coordinate order is the Geopoint format's, which the map reads. */
const PROMPT =
  'Add 10 rows to this table for major Cloudflare data centers around the world: the city as the Title, ' +
  'the country as the Description, and the Location as [longitude, latitude].';
const ROWS = 10;

/** The table plank's grid. */
const TABLE_GRID = '[data-testid="deck.plank"] .dx-grid';

/** The map of the table's rows. */
const MAP = 'Data center map';

/** A header row and five rows typed into the sheet. */
const SHEET = [
  ['Region', 'Requests (M)'],
  ['North America', '120'],
  ['Europe', '95'],
  ['Asia', '88'],
  ['South America', '32'],
  ['Africa', '14'],
];

/** A sheet or table cell, by zero-based column and row. */
const CELL = (col, row) => `.dx-grid [data-dx-grid-plane="grid"] [aria-colindex="${col}"][aria-rowindex="${row}"]`;

/** Press, move in steps a viewer can follow, release. */
const drag = async (page, from, to) => {
  await page.mouse.move(from.x, from.y, { steps: 8 });
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 10 });
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(300);
};

/** The markdown editor of the plank on screen. */
const EDITOR = '[data-testid="composer.markdownRoot"] .cm-content';

/** Selects `text` in the most recently mounted editor, in one evaluate so the offset cannot go stale. */
const selectText = (page, text) =>
  page.evaluate(async (text) => {
    const deadline = performance.now() + 15_000;
    for (;;) {
      const view = globalThis.composer?.editorView;
      const pos = view?.state.doc.toString().indexOf(text) ?? -1;
      if (view && pos >= 0) {
        view.dispatch({ selection: { anchor: pos, head: pos + text.length }, scrollIntoView: true });
        view.focus();
        return;
      }
      if (performance.now() > deadline) {
        throw new Error(`text not found in the editor: ${text}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }, text);

/** Puts the cursor at the start of the line holding `text`, and focuses the editor for typing. */
const placeCursor = (page, text) =>
  page.evaluate((text) => {
    const view = globalThis.composer?.editorView;
    const pos = view?.state.doc.toString().indexOf(text) ?? -1;
    if (!view || pos < 0) {
      throw new Error(`text not found in the editor: ${text}`);
    }
    view.dispatch({ selection: { anchor: pos }, scrollIntoView: true });
    view.focus();
  }, text);

/** Types as a person would, a character at a time. */
const typeSlowly = (page, text, delay = 40) => page.keyboard.type(text, { delay });

/** Scrolls the editor down in visible steps, for a viewer, until `text` is on screen. */
const scrollTo = async (page, text) => {
  const editor = page.locator(EDITOR).first();
  const box = await editor.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 300));
  for (let step = 0; step < 30; step++) {
    if (await page.getByText(text, { exact: true }).first().isVisible()) {
      const target = await page.getByText(text, { exact: true }).first().boundingBox();
      const viewport = page.viewportSize();
      if (target && target.y < viewport.height * 0.6) {
        return;
      }
    }
    await page.mouse.wheel(0, 240);
    await page.waitForTimeout(120);
  }
};

export const steps = [
  {
    name: 'Prep (off camera): dismiss notices, pick the model, close the help panel',
    setup: true,
    run: async ({ demo, page }) => {
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

      // A chat runs on the settings' default model, not the chat picker's, so set it here.
      const model = page.locator('role=combobox[name="Remote language model"]').first();
      for (let attempt = 0; attempt < 3; attempt++) {
        await demo.click({ selector: '[data-testid="treeView.appSettings"]', hud: false });
        if (
          await model.waitFor({ state: 'visible', timeout: 5_000 }).then(
            () => true,
            () => false,
          )
        ) {
          break;
        }
      }
      await demo.click({ selector: 'role=combobox[name="Remote language model"]', hud: false });
      await demo.click({ selector: `role=option[name="${MODEL}"]`, hud: false });
      await page.locator('role=combobox[name="Remote language model"]', { hasText: MODEL }).waitFor();

      // Back to the space's Home, with the help companion closed so the take has the full width.
      await demo.click({ selector: '[data-testid="spacePlugin.space"] >> nth=0', hud: false });
      await demo.click({ selector: '[data-testid="spacePlugin.spaceHome"]', hud: false });
      await page.locator('[data-testid="deck.plank"][data-attendable-id$="/home"]').first().waitFor();
      const close = page.locator('button:has-text("Close companion")').first();
      if (await close.isVisible().catch(() => false)) {
        await close.click();
      }
    },
  },
  {
    name: 'Open the README',
    run: async ({ demo, page }) => {
      // From Home's Recent list: the take starts on Home, and the README is its first recent object.
      await demo.click({
        selector: '[data-testid="deck.plank"][data-attendable-id$="/home"] [role="button"]:has-text("README") >> nth=0',
        label: 'README',
      });
      await page.locator(EDITOR).first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Scroll near the bottom and add a comment',
    run: async ({ demo, page }) => {
      await scrollTo(page, COMMENT_ANCHOR);
      await page.waitForTimeout(BEAT / 2);
      await selectText(page, COMMENT_ANCHOR);
      const add = page.locator('[data-testid="deck.plank"] [data-testid="comments.comment.add"]').first();
      await add.waitFor({ state: 'visible' });
      await page.waitForFunction((element) => !element.disabled, await add.elementHandle(), { timeout: 10_000 });
      await demo.click({
        selector: '[data-testid="deck.plank"] [data-testid="comments.comment.add"] >> nth=0',
        label: 'Comment',
      });
      const input = page.locator(
        '[data-testid=thread][aria-current="location"] [data-testid="thread.reply"] [role="textbox"]',
      );
      await input.first().waitFor({ state: 'visible', timeout: 10_000 });
      await demo.type({
        selector:
          '[data-testid=thread][aria-current="location"] [data-testid="thread.reply"] [role="textbox"] >> nth=0',
        value: COMMENT,
        label: 'Comment',
      });
      await demo.press({ key: 'Enter' });
      await page.getByTestId('cm-comment').first().waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Add a Composer section and link a new document from it',
    run: async ({ demo, page }) => {
      // Above the last section, leaving a blank line before it.
      await placeCursor(page, '## Need help?');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowUp');
      await typeSlowly(page, '## Composer\n\nComposer is described in ');

      // `@` links an object; its menu can create one, named by what was typed.
      await page.keyboard.type('@');
      await page.getByPlaceholder('Search or create…').waitFor({ state: 'visible', timeout: 10_000 });
      await typeSlowly(page, DOCUMENT);
      await page.waitForTimeout(BEAT / 2);
      await demo.click({ selector: 'li:has-text("Add object") >> nth=0', label: 'Add object' });
      // A document has no form, so picking the type creates it, named after what was typed.
      await demo.click({
        selector: '[data-testid="create-object-form.type.org.dxos.type.document"]',
        label: 'Document',
      });
      await page.locator(`${EDITOR} :text("${DOCUMENT}")`).first().waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Open the new document',
    run: async ({ demo, page }) => {
      // A link opens a preview card; its menu opens the object in the deck.
      await demo.click({ selector: `${EDITOR} dx-anchor:has-text("${DOCUMENT}") >> nth=0`, label: DOCUMENT });
      await demo.click({ selector: '[role="dialog"] button:has-text("Actions") >> nth=0', label: 'Actions' });
      await demo.click({ selector: 'role=menuitem[name="Open"]', label: 'Open' });
      await page
        .locator('[data-testid="deck.plank"]', { hasText: DOCUMENT })
        .first()
        .waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Describe Composer in a couple of paragraphs',
    run: async ({ demo, page }) => {
      await demo.click({ selector: `${EDITOR} >> nth=0`, label: 'Editor' });
      await typeSlowly(page, DESCRIPTION.join('\n\n'), 15);
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Enable Maps and Canvas in the plugin registry',
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="treeView.pluginRegistry"]', label: 'Plugins' });
      const filter = 'input[placeholder="Filter…"]';
      await page.locator(filter).first().waitFor({ state: 'visible', timeout: 10_000 });
      for (const { id, name } of PLUGINS) {
        await demo.fill({ selector: filter, value: '', hud: false });
        await demo.type({ selector: filter, value: name, label: 'Filter' });
        const toggle = `input[id="${id}-input"]`;
        await page.locator(toggle).waitFor({ state: 'visible', timeout: 10_000 });
        await page.waitForTimeout(BEAT / 2);
        if (!(await page.locator(toggle).isChecked())) {
          await demo.click({ selector: toggle, label: `Enable ${name}` });
        }
        await page.waitForFunction((id) => composer.plugins().some((plugin) => plugin.id === id && plugin.active), id, {
          timeout: 30_000,
        });
        await page.waitForTimeout(BEAT);
      }
      await demo.fill({ selector: filter, value: '', hud: false });
    },
  },
  {
    name: 'Draw a diagram of spaces, objects, plugins and surfaces',
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="spacePlugin.space"] >> nth=0', label: 'My Space' });
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"] >> nth=0', label: 'Add to space' });
      await demo.click({ selector: '[data-testid="create-object-form.type.org.dxos.type.drawing"]', label: 'Drawing' });
      await demo.click({ selector: '[role="dialog"] [role="option"]:has-text("Canvas")', label: 'Canvas' });
      await demo.click({ selector: '[role="dialog"] [data-testid="save-button"]', label: 'Create' });
      const view = page.getByTestId('scene-view');
      await view.waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT);

      const box = await view.boundingBox();
      const at = ({ x, y }) => ({ x: box.x + box.width * x, y: box.y + box.height * y });
      const size = { width: 150, height: 70 };
      const centres = {};
      for (const node of DIAGRAM.nodes) {
        const centre = at(node);
        centres[node.label] = centre;
        // Tools from the palette rather than their shortcuts: the viewer sees the pick, and a click needs no focus.
        await demo.click({ selector: '[data-testid="palette-R"]', label: 'Rectangle' });
        await drag(
          page,
          { x: centre.x - size.width / 2, y: centre.y - size.height / 2 },
          { x: centre.x + size.width / 2, y: centre.y + size.height / 2 },
        );
        // Drawing leaves the rectangle tool on; with the select tool a double-click edits the label.
        await demo.click({ selector: '[data-testid="palette-V"]', hud: false });
        await page.mouse.dblclick(centre.x, centre.y);
        await page.getByTestId('part-editor').waitFor({ state: 'visible', timeout: 5_000 });
        await typeSlowly(page, node.label, 60);
        await page.keyboard.press('Enter');
        await page.getByTestId('part-editor').waitFor({ state: 'detached', timeout: 5_000 });
        await page.waitForTimeout(BEAT / 2);
      }
      for (const [from, to] of DIAGRAM.links) {
        await demo.click({ selector: '[data-testid="palette-O"]', label: 'Smart line' });
        await drag(page, centres[from], centres[to]);
        await page.waitForTimeout(BEAT / 2);
      }
      // Back to the select tool, with nothing selected, for the finished picture.
      await demo.click({ selector: '[data-testid="palette-V"]', label: 'Select' });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Create a table with a location column',
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"] >> nth=0', label: 'Add to space' });
      await demo.click({ selector: '[data-testid="create-object-form.type.org.dxos.type.table"]', label: 'Table' });
      await demo.type({ selector: '[role="dialog"] input[placeholder="Name"]', value: TABLE, label: 'Name' });
      // No type picked: the table gets a new type of its own.
      await demo.click({ selector: '[role="dialog"] [data-testid="save-button"]', label: 'Create' });
      const add = '[data-testid="table-new-column-button"]';
      await page.locator(add).first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT);

      await demo.click({ selector: `${add} >> nth=0`, label: 'New column' });
      await demo.fill({
        selector: 'input[placeholder="Property name"], input[value^="prop_"] >> nth=0',
        value: LOCATION.property,
        hud: false,
      });
      await demo.type({ selector: 'input[placeholder="Property label"]', value: LOCATION.label, label: 'Label' });
      await demo.click({ selector: 'role=combobox >> text=Format', label: 'Format' });
      await demo.click({ selector: `role=option[name="${LOCATION.format}"]`, label: LOCATION.format });
      await demo.click({ selector: 'button:has-text("Save") >> nth=-1', label: 'Save' });
      await page
        .locator('.dx-grid [data-dx-grid-plane="frozenRowsStart"]', { hasText: LOCATION.label })
        .first()
        .waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Ask the assistant to fill the table',
    run: async ({ demo, page }) => {
      // The comments companion opened on the README stays open for the next plank.
      if (
        !(await page
          .locator('[data-testid="deck.companion"]')
          .first()
          .isVisible()
          .catch(() => false))
      ) {
        await demo.click({
          selector: '[data-testid="deck.plank"] [data-testid="plankHeading.companion"] >> nth=0',
          label: 'Companion',
        });
      }
      const tab = '[data-testid="deck.companion"] >> role=tab[name="Assistant"]';
      await page.locator(tab).first().waitFor({ state: 'visible', timeout: 15_000 });
      await demo.click({ selector: tab, label: 'Assistant' });
      const prompt = '[data-testid="deck.companion"] [data-testid="assistant.prompt"] .cm-content';
      await page.locator(prompt).first().waitFor({ state: 'visible', timeout: 15_000 });
      await demo.click({ selector: `${prompt} >> nth=0`, hud: false });
      await typeSlowly(page, PROMPT, 15);
      await page.waitForTimeout(BEAT / 2);
      await page.keyboard.press('Enter');
      // Started: the chat shows it is working before the take moves on.
      await page
        .locator('[data-testid="deck.companion"] [data-testid="assistant.chat-status"]')
        .first()
        .waitFor({ state: 'visible', timeout: 30_000 });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Create a sheet and enter five rows',
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"] >> nth=0', label: 'Add to space' });
      await demo.click({ selector: '[data-testid="create-object-form.type.org.dxos.type.sheet"]', label: 'Sheet' });
      await page.locator(CELL(0, 0)).first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT);
      for (const [row, values] of SHEET.entries()) {
        await demo.click({ selector: `${CELL(0, row)} >> nth=0`, hud: false });
        for (const [col, value] of values.entries()) {
          await typeSlowly(page, value, 30);
          // The grid ignores a commit that follows the typing too closely.
          await page.waitForTimeout(500);
          await page.keyboard.press(col < values.length - 1 ? 'Tab' : 'Enter');
          await page.waitForTimeout(200);
        }
      }
      await page.waitForTimeout(BEAT);
    },
  },

  {
    name: 'Return to the table and wait for the assistant',
    run: async ({ demo, page }) => {
      // The table sits under its type in the Database section; the type's own row has the same name.
      await demo.click({
        selector: `[data-testid="deck.sidebar"] [data-testid="treeItem.heading"] span:text-is("${TABLE}") >> nth=1`,
        label: TABLE,
      });
      // The grid renders empty cells ahead of the data, so count the cells that hold text in each column.
      await page.waitForFunction(
        ({ grid, columns, count }) => {
          const headers = [
            ...document.querySelectorAll(`${grid} [data-dx-grid-plane="frozenRowsStart"] [aria-colindex]`),
          ];
          return columns.every((label) => {
            const index = headers.find((header) => header.textContent?.trim() === label)?.getAttribute('aria-colindex');
            const cells = document.querySelectorAll(`${grid} [data-dx-grid-plane="grid"] [aria-colindex="${index}"]`);
            return index != null && [...cells].filter((cell) => cell.textContent?.trim()).length >= count;
          });
        },
        { grid: TABLE_GRID, columns: ['Title', LOCATION.label], count: ROWS },
        { timeout: 5 * 60_000 },
      );
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: "Map the table's rows",
    run: async ({ demo, page }) => {
      const close = page.locator('button:has-text("Close companion")').first();
      if (await close.isVisible().catch(() => false)) {
        await demo.click({ selector: 'button:has-text("Close companion") >> nth=0', label: 'Close companion' });
      }
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"] >> nth=0', label: 'Add to space' });
      await demo.click({ selector: '[data-testid="create-object-form.type.org.dxos.type.map"]', label: 'Map' });
      await demo.type({ selector: '[role="dialog"] input[placeholder="Name"]', value: MAP, label: 'Name' });
      await demo.click({ selector: '[role="dialog"] [role="combobox"] >> nth=0', label: 'Pin type' });
      await demo.click({ selector: `role=option[name="${TABLE}"]`, label: TABLE });
      await demo.click({ selector: '[role="dialog"] [role="combobox"] >> nth=1', label: 'Location property' });
      await demo.click({ selector: `role=option[name="${LOCATION.property}"]`, label: LOCATION.label });
      await demo.click({ selector: '[role="dialog"] [data-testid="save-button"]', label: 'Create' });
      await page.locator('.leaflet-marker-icon').first().waitFor({ state: 'visible', timeout: 20_000 });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Toggle from the map to the globe',
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="deck.plank"] button:has-text("Toggle") >> nth=0', label: 'Globe' });
      await page.locator('[data-testid="deck.plank"] canvas').first().waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(BEAT * 3);
    },
  },
];
