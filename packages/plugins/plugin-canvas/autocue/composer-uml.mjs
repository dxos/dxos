//
// Copyright 2026 DXOS.org
//

/**
 * Draw an architecture diagram of composer-app on a canvas, with the plugins and the client each drawn as a
 * nested scene inside a frame, then show both scenes live from the top level.
 *
 * @mdl packages/plugins/plugin-canvas/PLUGIN.mdl test QA-2
 * @app composer-app bundled dev build, served by `vite preview` on :4173
 *
 *   export DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true
 *   moon run composer-app:bundle
 *   pnpm exec vite preview --configLoader native --port 4173 --strictPort
 *
 * Record on a fresh profile; produce the cut with the Composer intro and a narrated voice-over:
 *
 *   node .agents/skills/autocue/scripts/trim-static.mjs --in <out>/session.webm --out canvas-uml.webm \
 *     --ident composer --voiceover steps --mp4 --screenshot --name plugin-canvas-uml --duration 45-75
 *
 * Every node and link below is taken from the code; the source of each is noted beside it.
 */

/** A beat for the viewer after a visible change; short, since the diagram has many parts. */
const BEAT = 700;

const PLUGIN = { id: 'org.dxos.plugin.canvas', name: 'Canvas' };

// Drawn corners snap to the 64px major grid: sizes that are whole cells always draw at exactly that size,
// whereas a box under a cell tall can snap to zero height and draw nothing.
const SIZE = { width: 128, height: 64 };

/**
 * Top-level scene: shapes laid out as fractions of the canvas, by palette tool. Nothing starts within ~60px of
 * the left edge, where the palette's full-height column takes the press.
 */
const TOP = [
  // packages/apps/composer-app (the app shell: src/main.tsx).
  { label: 'Composer App', tool: 'R', x: 0.17, y: 0.12, width: 192 },
  // packages/sdk/app-framework (App, Plugin, Registry imported by src/main.tsx).
  { label: 'App Framework', tool: 'R', x: 0.17, y: 0.88, width: 192 },
  // packages/core/mesh/edge-client (the EDGE service the client syncs through; a dependency of plugin-client).
  { label: 'EDGE', tool: 'E', x: 0.78, y: 0.82 },
];

/** Frames that each hold a nested scene. */
const FRAMES = {
  // packages/plugins/* — the plugin set is assembled in packages/apps/composer-app/src/plugin-defs*.tsx.
  plugins: { label: 'Plugins', x: 0.47, y: 0.5, width: 384, height: 256 },
  // packages/sdk/client + packages/sdk/client-services (reached through @dxos/plugin-client).
  client: { label: 'Client', x: 0.78, y: 0.22, width: 384, height: 256 },
};

/** Dependency direction: `from` depends on `to`. */
const TOP_LINKS = [
  // composer-app/package.json: @dxos/plugin-* and @dxos/app-framework.
  ['Composer App', 'Plugins'],
  ['Composer App', 'App Framework'],
  // Every plugin package depends on @dxos/app-framework.
  ['Plugins', 'App Framework'],
  // plugin-client depends on @dxos/client and @dxos/client-services.
  ['Plugins', 'Client'],
  // client-services depends on @dxos/edge-client.
  ['Client', 'EDGE'],
];

/** The scene inside "Plugins". */
const PLUGIN_NODES = [
  // packages/plugins/plugin-sheet
  { label: 'Sheet', tool: 'R', x: 0.15, y: 0.2 },
  // packages/plugins/plugin-markdown
  { label: 'Markdown', tool: 'R', x: 0.5, y: 0.2 },
  // packages/plugins/plugin-table
  { label: 'Table', tool: 'R', x: 0.15, y: 0.5 },
  // packages/plugins/plugin-canvas
  { label: 'Canvas', tool: 'R', x: 0.15, y: 0.8 },
  // packages/plugins/plugin-illustrator
  { label: 'Illustrator', tool: 'R', x: 0.5, y: 0.8 },
  // packages/plugins/plugin-space
  { label: 'Space', tool: 'E', x: 0.85, y: 0.5 },
];
const PLUGIN_LINKS = [
  // plugin-sheet/package.json: @dxos/plugin-markdown.
  ['Sheet', 'Markdown'],
  // plugin-markdown/package.json: @dxos/plugin-space.
  ['Markdown', 'Space'],
  // plugin-table/package.json: @dxos/plugin-space.
  ['Table', 'Space'],
  // plugin-canvas/package.json: @dxos/plugin-illustrator (canvas is a drawing variant of it).
  ['Canvas', 'Illustrator'],
  // plugin-illustrator/package.json: @dxos/plugin-space.
  ['Illustrator', 'Space'],
];

/** The scene inside "Client". */
const CLIENT_NODES = [
  // packages/sdk/client-services (ServiceStack, Spaces, Identity, Replication).
  { label: 'Services', tool: 'R', x: 0.15, y: 0.5 },
  // packages/core/echo (echo-host, echo-client: the object database).
  { label: 'ECHO', tool: 'E', x: 0.5, y: 0.2 },
  // packages/core/halo (credentials, keyring: identity and devices).
  { label: 'HALO', tool: 'E', x: 0.5, y: 0.8 },
  // packages/core/mesh (teleport, network-manager, edge-client: peer networking).
  { label: 'MESH', tool: 'E', x: 0.85, y: 0.5 },
];
const CLIENT_LINKS = [
  // client-services/package.json: @dxos/echo-host, @dxos/echo-client.
  ['Services', 'ECHO'],
  // client-services/package.json: @dxos/credentials, @dxos/keyring.
  ['Services', 'HALO'],
  // client-services/package.json: @dxos/network-manager, @dxos/teleport.
  ['Services', 'MESH'],
  // echo-host/package.json: @dxos/teleport, @dxos/teleport-extension-automerge-replicator.
  ['ECHO', 'MESH'],
];

/** Press, move in steps a viewer can follow, release. */
const drag = async (page, from, to, steps = 8) => {
  await page.mouse.move(from.x, from.y, { steps: 4 });
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps });
  await page.mouse.move(to.x, to.y, { steps });
  await page.mouse.up();
  await page.waitForTimeout(150);
};

/** Types as a person would, a character at a time, but briskly. */
const typeQuickly = (page, text, delay = 25) => page.keyboard.type(text, { delay });

/** The scene view on screen, and a mapper from canvas fractions to page coordinates. */
const sceneAt = async (page) => {
  const view = page.getByTestId('scene-view').last();
  await view.waitFor({ state: 'visible', timeout: 15_000 });
  const box = await view.boundingBox();
  return ({ x, y }) => ({ x: box.x + box.width * x, y: box.y + box.height * y });
};

const tool = (key) => `[data-testid="palette-${key}"] >> nth=-1`;

/** The centre of the unlabelled top-level node nearest `point`: the box just drawn. */
const unlabelledNear = async (page, point) => {
  const candidates = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="scene-view"] [data-node-id]')]
      .filter((element) => !element.parentElement.closest('[data-node-id]') && !element.textContent.trim())
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      }),
  );
  const distance = (other) => Math.hypot(other.x - point.x, other.y - point.y);
  const nearest = candidates.sort((first, second) => distance(first) - distance(second))[0];
  if (!nearest || distance(nearest) > 80) {
    throw new Error(`no box drawn near ${Math.round(point.x)},${Math.round(point.y)}`);
  }
  return nearest;
};

/** Draws a shape with a palette tool, then labels it with a double-click. */
const drawShape = async ({ demo, page }, centre, { tool: key, label, width = SIZE.width, height = SIZE.height }) => {
  await demo.click({ selector: tool(key), label: key, cadence: 200, beat: 100 });
  await drag(
    page,
    { x: centre.x - width / 2, y: centre.y - height / 2 },
    { x: centre.x + width / 2, y: centre.y + height / 2 },
  );
  // Creating returns to the select tool; the box snaps to the grid, so it can sit off the gesture.
  const drawn = await unlabelledNear(page, centre);
  await page.mouse.dblclick(drawn.x, drawn.y);
  await page.getByTestId('part-editor').waitFor({ state: 'visible', timeout: 5_000 });
  await typeQuickly(page, label);
  await page.keyboard.press('Enter');
  await page.getByTestId('part-editor').waitFor({ state: 'detached', timeout: 5_000 });
};

/** The data-node-ids of the top-level frames. */
const frameIds = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="scene-view"] [data-node-id^="frame"]')]
      .filter((node) => !node.parentElement.closest('[data-node-id]'))
      .map((node) => node.getAttribute('data-node-id')),
  );

/**
 * Adds a frame from the toolbar's create menu, names it in the Properties panel (a double-click on a frame
 * opens its scene instead), then moves and resizes it into place. Not drawn with the Frame tool: a drawn frame
 * keeps the drag preview's child scene id, so every drawn frame would share one scene.
 */
const addFrame = async ({ demo, page }, centre, { label, width, height }) => {
  const before = await frameIds(page);
  await demo.click({ selector: '[data-testid="toolbar-create"] >> nth=-1', label: 'Add' });
  await demo.click({ selector: '[data-testid="create-frame"] >> nth=0', label: 'Frame' });
  let id;
  for (let attempt = 0; attempt < 30 && !id; attempt++) {
    await page.waitForTimeout(100);
    id = (await frameIds(page)).find((frameId) => !before.includes(frameId));
  }
  if (!id) {
    throw new Error('no frame added');
  }
  const frame = page.locator(`[data-testid="scene-view"] [data-node-id="${id}"]`);
  const rect = await frame.boundingBox();
  const input = '[data-testid="properties"] input[data-testid="label"]';
  await page.locator(input).waitFor({ state: 'visible', timeout: 5_000 });
  await demo.click({ selector: input, label: 'Label', cadence: 250 });
  await typeQuickly(page, label);
  await page.keyboard.press('Enter');
  await page
    .locator(`[data-testid="scene-view"] [data-node-id="${id}"]:has-text("${label}")`)
    .waitFor({ timeout: 5_000 });

  // Move its top-left onto the target's, pressing below the label and the open control.
  const topLeft = { x: centre.x - width / 2, y: centre.y - height / 2 };
  const press = { x: rect.x + rect.width / 2, y: rect.y + rect.height * 0.75 };
  await drag(page, press, { x: press.x + topLeft.x - rect.x, y: press.y + topLeft.y - rect.y }, 10);
  // Then pull the selected frame's bottom-right handle out to the target size.
  const moved = await frame.boundingBox();
  await drag(
    page,
    { x: moved.x + moved.width, y: moved.y + moved.height },
    { x: topLeft.x + width, y: topLeft.y + height },
    8,
  );
  await page.keyboard.press('Escape');
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

/** The centre of the node whose text starts with `label`; a frame's text runs on into its scene's summary. */
const centreOf = (points, label) => {
  const key = Object.keys(points).find((text) => text.startsWith(label));
  if (!key) {
    throw new Error(`no node labelled ${label}: ${Object.keys(points).join(', ')}`);
  }
  return points[key];
};

/** Connects each pair with the smart-line tool, which stays on between links, then returns to select. */
const connect = async ({ demo, page }, links) => {
  const points = await centres(page);
  await demo.click({ selector: tool('O'), label: 'Smart line', cadence: 200, beat: 100 });
  for (const [from, to] of links) {
    await drag(page, centreOf(points, from), centreOf(points, to), 6);
  }
  await demo.click({ selector: tool('V'), hud: false });
  await page.keyboard.press('Escape');
};

/** Opens the named frame's scene in place. */
const openFrame = async ({ demo, page }, label) => {
  await page.locator(`[data-testid="scene-view"] [data-node-id]:has-text("${label}")`).first().hover();
  await demo.click({
    selector: `[data-testid="scene-view"] [data-node-id]:has-text("${label}") [data-testid="portal-open"] >> nth=0`,
    label: 'Open scene',
  });
  await page.waitForFunction(() => !document.querySelector('[data-testid="toolbar-up"]')?.disabled, null, {
    timeout: 10_000,
  });
  await page.waitForTimeout(BEAT);
};

/** Back up to the top-level scene. */
const goUp = async ({ demo, page }) => {
  if (await page.evaluate(() => document.querySelector('[data-testid="toolbar-up"]')?.disabled)) {
    return;
  }
  await demo.click({ selector: '[data-testid="toolbar-up"] >> nth=0', label: 'Up' });
  await page.waitForFunction(() => document.querySelector('[data-testid="toolbar-up"]')?.disabled, null, {
    timeout: 10_000,
  });
  await page.waitForTimeout(BEAT);
};

/** Draws a nested scene's shapes and links. */
const drawScene = async (context, nodes, links) => {
  const at = await sceneAt(context.page);
  for (const node of nodes) {
    await drawShape(context, at(node), node);
  }
  await connect(context, links);
  await context.page.waitForTimeout(BEAT);
};

/** Selects a frame and turns on "Show contents", then waits for its nested scene to render inside it. */
const showContents = async ({ demo, page }, frame, inner) => {
  // Going up restores the parent's camera with an animation, so wait for the frame to stop moving.
  let centre = centreOf(await centres(page), frame.label);
  for (let attempt = 0; attempt < 20; attempt++) {
    await page.waitForTimeout(150);
    const next = centreOf(await centres(page), frame.label);
    const settled = Math.abs(next.x - centre.x) < 1 && Math.abs(next.y - centre.y) < 1;
    centre = next;
    if (settled) {
      break;
    }
  }
  await page.mouse.click(centre.x, centre.y + 40);
  const toggle = '[data-testid="properties"] label:has-text("Show contents")';
  await page.locator(toggle).waitFor({ state: 'visible', timeout: 5_000 });
  await demo.click({ selector: `${toggle} >> nth=0`, label: 'Show contents' });
  await page
    .locator(`[data-testid="scene-view"] [data-node-id^="frame"] [data-node-id]:has-text("${inner}")`)
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 });
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
    narration: "Let's map Composer's own architecture on a canvas.",
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
    name: 'Draw the top level: the app, its framework, EDGE, and two frames',
    narration:
      'The app, its framework and EDGE are shapes; Plugins and Client are frames that hold scenes of their own.',
    run: async (context) => {
      const at = await sceneAt(context.page);
      for (const node of TOP) {
        await drawShape(context, at(node), node);
      }
      await addFrame(context, at(FRAMES.plugins), FRAMES.plugins);
      await addFrame(context, at(FRAMES.client), FRAMES.client);
      await context.page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Connect the top level by dependency',
    narration: 'Smart lines follow the real package dependencies.',
    run: async (context) => {
      await connect(context, TOP_LINKS);
      await context.page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Open Plugins and draw the plugins inside it',
    narration: 'Inside Plugins, Sheet builds on Markdown, Canvas on Illustrator, and all of them on Space.',
    run: async (context) => {
      await openFrame(context, FRAMES.plugins.label);
      await drawScene(context, PLUGIN_NODES, PLUGIN_LINKS);
    },
  },
  {
    name: 'Open Client and draw its subsystems',
    narration: 'Inside Client, the services run ECHO for data, HALO for identity, and MESH for networking.',
    run: async (context) => {
      await goUp(context);
      await openFrame(context, FRAMES.client.label);
      await drawScene(context, CLIENT_NODES, CLIENT_LINKS);
    },
  },
  {
    name: 'Go up and show both nested scenes live',
    narration: 'Back at the top, each frame can show its nested scene live.',
    run: async (context) => {
      const { page } = context;
      await goUp(context);
      await showContents(context, FRAMES.plugins, PLUGIN_NODES[0].label);
      await showContents(context, FRAMES.client, CLIENT_NODES[0].label);
      // Focus is in the panel, so deselect by clicking empty canvas rather than with Escape.
      const at = await sceneAt(page);
      const empty = at({ x: 0.42, y: 0.08 });
      await page.mouse.click(empty.x, empty.y);
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Close on the whole diagram',
    narration: 'Every shape and link is an object in your space, so AI agents can draw and edit it alongside you.',
    run: async ({ page }) => {
      await page.waitForTimeout(11_000);
    },
  },
];
