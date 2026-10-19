//
// Copyright 2026 DXOS.org
//

/**
 * Create a canvas drawing, draw and label shapes, connect them, and nest a detail scene inside a frame.
 *
 * @mdl packages/plugins/plugin-canvas/PLUGIN.mdl test QA-1
 * @app composer-app bundled dev build, served by `vite preview` on :4173
 *
 *   export DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true
 *   moon run composer-app:bundle
 *   pnpm exec vite preview --configLoader native --port 4173 --strictPort
 *
 * Record on a fresh profile; produce the cut with the Composer intro and a narrated voice-over:
 *
 *   node .agents/skills/autocue/scripts/trim-static.mjs --in <out>/session.webm --out canvas.webm \
 *     --ident composer --voiceover steps --mp4 --screenshot
 */

/** A beat for the viewer after a visible change. */
const BEAT = 1_200;

const PLUGIN = { id: 'org.dxos.plugin.canvas', name: 'Canvas' };

/** The top-level diagram: labelled shapes laid out as fractions of the canvas, by palette tool. */
const NODES = [
  { label: 'Browser', tool: 'R', x: 0.2, y: 0.3 },
  { label: 'Agent', tool: 'E', x: 0.2, y: 0.72 },
  { label: 'Space', tool: 'R', x: 0.5, y: 0.5 },
];

/** The frame that holds a nested scene, and what is drawn inside it. */
const FRAME = { label: 'Storage', x: 0.78, y: 0.5, width: 300, height: 200 };
const INNER = [
  { label: 'Objects', tool: 'R', x: 0.35, y: 0.5 },
  { label: 'Sync', tool: 'E', x: 0.68, y: 0.5 },
];

const LINKS = [
  ['Browser', 'Space'],
  ['Agent', 'Space'],
  ['Space', FRAME.label],
];

const SIZE = { width: 150, height: 70 };

/** Press, move in steps a viewer can follow, release. */
const drag = async (page, from, to) => {
  await page.mouse.move(from.x, from.y, { steps: 8 });
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 10 });
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(300);
};

/** Types as a person would, a character at a time. */
const typeSlowly = (page, text, delay = 70) => page.keyboard.type(text, { delay });

/** The scene view on screen, and a mapper from canvas fractions to page coordinates. */
const sceneAt = async (page) => {
  const view = page.getByTestId('scene-view').last();
  await view.waitFor({ state: 'visible', timeout: 15_000 });
  const box = await view.boundingBox();
  return ({ x, y }) => ({ x: box.x + box.width * x, y: box.y + box.height * y });
};

/** Draws a shape with a palette tool, then labels it with a double-click. */
const drawShape = async ({ demo, page }, centre, { tool, label, width = SIZE.width, height = SIZE.height }) => {
  // Tools from the palette rather than their shortcuts: the viewer sees the pick, and a click needs no focus.
  await demo.click({ selector: `[data-testid="palette-${tool}"] >> nth=-1`, label: tool });
  await drag(
    page,
    { x: centre.x - width / 2, y: centre.y - height / 2 },
    { x: centre.x + width / 2, y: centre.y + height / 2 },
  );
  // Drawing leaves the tool on; with the select tool a double-click edits the label.
  await demo.click({ selector: '[data-testid="palette-V"] >> nth=-1', hud: false });
  await page.mouse.dblclick(centre.x, centre.y);
  await page.getByTestId('part-editor').waitFor({ state: 'visible', timeout: 5_000 });
  await typeSlowly(page, label);
  await page.keyboard.press('Enter');
  await page.getByTestId('part-editor').waitFor({ state: 'detached', timeout: 5_000 });
  await page.waitForTimeout(BEAT / 3);
};

/** Draws a frame, which holds a scene of its own, and names it in the Properties panel. */
const drawFrame = async ({ demo, page }, centre, { label, width, height }) => {
  await demo.click({ selector: '[data-testid="palette-F"] >> nth=-1', label: 'Frame' });
  await drag(
    page,
    { x: centre.x - width / 2, y: centre.y - height / 2 },
    { x: centre.x + width / 2, y: centre.y + height / 2 },
  );
  // A double-click on a frame opens its scene, so the name goes in through the panel instead.
  await demo.click({ selector: '[data-testid="palette-V"] >> nth=-1', hud: false });
  await page.mouse.click(centre.x, centre.y + height / 4);
  const input = '[data-testid="properties"] input[data-testid="label"]';
  await page.locator(input).waitFor({ state: 'visible', timeout: 5_000 });
  await demo.click({ selector: input, label: 'Label' });
  await typeSlowly(page, label);
  await page.keyboard.press('Enter');
  await page
    .locator(`[data-testid="scene-view"] [data-node-id^="frame"]:has-text("${label}")`)
    .first()
    .waitFor({ timeout: 5_000 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(BEAT / 3);
};

/** Page coordinates of the centre of each top-level node (not one drawn inside a frame), by its label. */
const centres = (page) =>
  page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('[data-testid="scene-view"] [data-node-id]')]
        .filter((element) => !element.parentElement.closest('[data-node-id]'))
        .map((element) => {
          const rect = element.getBoundingClientRect();
          const title = element.querySelector('[data-part="label"]')?.textContent ?? element.textContent;
          return [title.trim(), { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }];
        }),
    ),
  );

/** Whether the scene on screen already has a node labelled `label`, so a retried step does not draw it twice. */
const drawn = async (page, label) => Object.keys(await centres(page)).some((text) => text.startsWith(label));

/** The centre of the node whose text starts with `label`; a frame's text runs on into its scene's summary. */
const centreOf = (points, label) => {
  const key = Object.keys(points).find((text) => text.startsWith(label));
  if (!key) {
    throw new Error(`no node labelled ${label}: ${Object.keys(points).join(', ')}`);
  }
  return points[key];
};

export const steps = [
  {
    name: 'Prep (off camera): dismiss notices, enable Canvas, close the help panel',
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
      const home = page.locator('[data-testid="deck.plank"][data-attendable-id$="/home"]').first();
      await home.waitFor({ timeout: 15_000 }).catch(() => {});

      const active = () =>
        page.evaluate((id) => composer.plugins().some((plugin) => plugin.id === id && plugin.active), PLUGIN.id);
      if (!(await active())) {
        await demo.click({ selector: '[data-testid="treeView.pluginRegistry"]', hud: false });
        const filter = 'input[placeholder="Filter…"]';
        await page.locator(filter).first().waitFor({ state: 'visible', timeout: 10_000 });
        await demo.fill({ selector: filter, value: PLUGIN.name, hud: false });
        const input = `input[role="switch"][aria-label="${PLUGIN.name}"]`;
        const toggle = `[data-scope="switch"][data-part="root"]:has(${input})`;
        await page.locator(toggle).waitFor({ state: 'visible', timeout: 10_000 });
        if (!(await page.locator(input).isChecked())) {
          await demo.click({ selector: toggle, hud: false });
        }
        await page.waitForFunction(
          (id) => composer.plugins().some((plugin) => plugin.id === id && plugin.active),
          PLUGIN.id,
          { timeout: 30_000 },
        );
        await demo.fill({ selector: filter, value: '', hud: false });
      }
      // The registry replaces the navtree; the space's rail button brings it back, then Home.
      if (!(await home.isVisible().catch(() => false))) {
        await demo.click({ selector: '[data-testid="spacePlugin.space"] >> nth=0', hud: false });
        await demo.click({ selector: '[data-testid="spacePlugin.spaceHome"] >> nth=0', hud: false });
        await home.waitFor({ timeout: 10_000 });
      }
      const close = page.locator('role=button[name="Close companion"]').first();
      if (await close.isVisible().catch(() => false)) {
        await close.click();
      }
    },
  },
  {
    name: 'Create a canvas drawing',
    narration: 'Add a drawing to your space and pick the Canvas variant.',
    done: async ({ page }) => (await page.getByTestId('scene-view').count()) > 0,
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"] >> nth=0', label: 'Add to space' });
      await demo.click({ selector: '[data-testid="create-object-form.type.org.dxos.type.drawing"]', label: 'Drawing' });
      await demo.click({ selector: '[role="dialog"] [role="option"]:has-text("Canvas")', label: 'Canvas' });
      await demo.click({ selector: '[role="dialog"] [data-testid="save-button"]', label: 'Create' });
      await sceneAt(page);
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Draw and label shapes',
    narration: 'Draw shapes from the palette and double-click to label them.',
    done: async ({ page }) => {
      for (const { label } of [...NODES, FRAME]) {
        if (!(await drawn(page, label))) {
          return false;
        }
      }
      return true;
    },
    run: async (context) => {
      const at = await sceneAt(context.page);
      for (const node of NODES) {
        if (!(await drawn(context.page, node.label))) {
          await drawShape(context, at(node), node);
        }
      }
      if (!(await drawn(context.page, FRAME.label))) {
        await drawFrame(context, at(FRAME), FRAME);
      }
      await context.page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Connect the shapes',
    narration: 'Smart lines connect them and reroute as shapes move.',
    run: async ({ demo, page }) => {
      const points = await centres(page);
      for (const [from, to] of LINKS) {
        await demo.click({ selector: '[data-testid="palette-O"] >> nth=-1', label: 'Smart line' });
        await drag(page, centreOf(points, from), centreOf(points, to));
        await page.waitForTimeout(BEAT / 3);
      }
      await demo.click({ selector: '[data-testid="palette-V"] >> nth=-1', label: 'Select' });
      // Move a shape so the lines visibly follow.
      const moved = centreOf(await centres(page), 'Agent');
      await drag(page, moved, { x: moved.x + 60, y: moved.y + 40 });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Open the frame and draw inside it',
    narration: 'A frame holds a whole scene of its own. Open it to zoom in and add detail.',
    run: async (context) => {
      const { demo, page } = context;
      const frame = page.locator(`[data-testid="scene-view"] [data-node-id]:has-text("${FRAME.label}")`).first();
      await frame.hover();
      await demo.click({
        selector: `[data-testid="scene-view"] [data-node-id]:has-text("${FRAME.label}") [data-testid="portal-open"] >> nth=0`,
        label: 'Open scene',
      });
      await page.getByTestId('toolbar-up').first().waitFor({ state: 'visible' });
      await page.waitForFunction(() => !document.querySelector('[data-testid="toolbar-up"]')?.disabled, null, {
        timeout: 10_000,
      });
      await page.waitForTimeout(BEAT);
      const at = await sceneAt(page);
      for (const node of INNER) {
        if (!(await drawn(page, node.label))) {
          await drawShape(context, at(node), node);
        }
      }
      const points = await centres(page);
      await demo.click({ selector: '[data-testid="palette-O"] >> nth=-1', label: 'Smart line' });
      await drag(page, centreOf(points, INNER[0].label), centreOf(points, INNER[1].label));
      await demo.click({ selector: '[data-testid="palette-V"] >> nth=-1', hud: false });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: "Zoom back out and show the frame's contents",
    narration: 'Back at the top, the frame can show its nested scene live.',
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="toolbar-up"] >> nth=0', label: 'Up' });
      await page.waitForFunction(() => document.querySelector('[data-testid="toolbar-up"]')?.disabled, null, {
        timeout: 10_000,
      });
      await page.waitForTimeout(BEAT);
      const frame = centreOf(await centres(page), FRAME.label);
      await page.mouse.click(frame.x, frame.y + FRAME.height / 4);
      const toggle = '[data-testid="properties"] label:has-text("Show contents")';
      await page.locator(toggle).waitFor({ state: 'visible', timeout: 5_000 });
      await demo.click({ selector: `${toggle} >> nth=0`, label: 'Show contents' });
      await page
        .locator(`[data-testid="scene-view"] [data-node-id^="frame"] [data-node-id]:has-text("${INNER[0].label}")`)
        .first()
        .waitFor({ state: 'visible', timeout: 10_000 });
      // Focus is in the panel, so deselect by clicking empty canvas rather than with Escape.
      const at = await sceneAt(page);
      const empty = at({ x: 0.5, y: 0.12 });
      await page.mouse.click(empty.x, empty.y);
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Close on the finished diagram',
    narration: 'Every shape is an object in your space, so AI agents can draw right alongside you.',
    run: async ({ page }) => {
      await page.waitForTimeout(BEAT * 9);
    },
  },
];
