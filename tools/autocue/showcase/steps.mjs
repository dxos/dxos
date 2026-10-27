//
// Copyright 2026 DXOS.org
//

/**
 * Shared steps and gestures for per-plugin showcase flows (`packages/{apps,plugins}/<pkg>/autocue/showcase.mjs`).
 * Each flow is a prep step, an off-camera setup step, and one `clip: <name>` step padded to a fixed length, so
 * `overnight.mjs` beside it can cut exactly that span out of the take. Recording rules: docs/SHOWCASE.md.
 */

/** A grid cell's clip. */
export const SHORT_MS = 10_000;

/** A tour cell's clip. */
export const LONG_MS = 20_000;

export const visible = (locator, timeout = 1_500) =>
  locator
    .first()
    .waitFor({ state: 'visible', timeout })
    .then(
      () => true,
      () => false,
    );

/** Types as a person would. */
export const type = (page, text, delay = 40) => page.keyboard.type(text, { delay });

/** A stepped drag, so canvases that arm on movement see one. */
export const drag = async (page, from, to, steps = 15) => {
  await page.mouse.move(from.x, from.y, { steps: 4 });
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps });
  await page.mouse.up();
};

/** Drags across the centre of the plank in a slow arc, as a person orbiting or panning would. */
export const orbit = async (page, { dx = 500, dy = 80, steps = 60, ms = 4_500, button = 'left' } = {}) => {
  // The plank sits right of the 350px sidebar.
  const { width, height } = page.viewportSize();
  const cx = 350 + (width - 400) / 2;
  const cy = height / 2;
  await page.mouse.move(cx - dx / 2, cy - dy / 2);
  await page.mouse.down({ button });
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(cx - dx / 2 + (dx * i) / steps, cy - dy / 2 + dy * Math.sin((Math.PI * i) / steps));
    await page.waitForTimeout(ms / steps);
  }
  await page.mouse.up({ button });
};

/** Scrolls the plank in small notches. */
export const scroll = async (page, { notches = 20, delta = 50, ms = 110 } = {}) => {
  const { width, height } = page.viewportSize();
  await page.mouse.move(350 + (width - 400) / 2, height / 2);
  for (let i = 0; i < notches; i++) {
    await page.mouse.wheel(0, delta);
    await page.waitForTimeout(ms);
  }
};

/** Opens the create dialog for a type (`org.dxos.type.<type>`), picks a variant, names it, and submits. */
export const create = async (page, type, { name, variant, before, ready, timeout = 30_000 } = {}) => {
  await page.keyboard.press('Escape');
  const from = page.url();
  const button = page.locator('[data-testid="spacePlugin.createObject"]');
  // Another workspace (the plugin registry) hides the space tree; the rail's space button brings it back.
  if (!(await visible(button, 1_000))) {
    await page.locator('[data-testid="spacePlugin.space"]').first().click();
  }
  await button.first().click({ timeout: 20_000 });
  await page.locator(`[data-testid="create-object-form.type.org.dxos.type.${type}"]`).first().click();
  await page.waitForTimeout(600);
  if (variant) {
    await page.locator(`[role="dialog"] [role="option"]:has-text("${variant}")`).first().click();
  }
  await before?.(page);
  const dialog = page.locator('[role="dialog"]');
  if (await visible(dialog, 800)) {
    if (name) {
      const input = dialog.locator('input').first();
      if (await visible(input, 500)) {
        await input.fill(name);
      }
    }
    const save = dialog.locator(
      '[data-testid="save-button"], button:has-text("Create"), button:has-text("Continue"), button:has-text("Save")',
    );
    if (await visible(save, 1_000)) {
      await save.first().click();
    }
  }
  // Creating an object navigates to it; a recording take runs slower than a fixed pause allows for.
  await page.waitForURL((url) => url.href !== from, { timeout });
  if (ready) {
    await page.locator(`[data-testid="deck.plank"] ${ready}`).last().waitFor({ timeout });
  }
  await page.waitForTimeout(1_500);
};

/** The editor in the open plank; the Home page's assistant prompt is a CodeMirror editor too. */
export const editor = (page) => page.locator('[data-testid="deck.plank"] .cm-content').last();

/** A navtree branch row by its own heading; a parent's text includes its children's, so the heading is matched. */
export const branch = (label) =>
  `[data-scope="tree-view"][data-part="branch-control"]:visible:has(> [data-testid="treeItem.heading"]:text-is("${label}"))`;

/** Opens a navtree item by its heading text. */
export const open = async (page, label, { timeout = 10_000 } = {}) => {
  await page.locator(`[data-testid="treeItem.heading"]:text-is("${label}")`).first().click({ timeout });
  await page.waitForTimeout(1_500);
};

/** Creates a space from a space template, by the template space's name, and waits for its tree to fill. */
export const fromTemplate = async (page, space, { waitFor, timeout = 60_000 } = {}) => {
  await page.locator('role=button[name="App menu"]').first().click();
  await page.locator('[data-testid="spacePlugin.createSpace"]').first().click();
  await page.locator(`[data-testid="create-space-dialog"] [role="option"]:has-text("${space}")`).first().click();
  await page.waitForTimeout(500);
  await page.locator('[data-testid="create-space-dialog"] button:has-text("Create")').first().click();
  await page.locator(`text="${space}" >> visible=true`).first().waitFor({ timeout });
  if (waitFor) {
    await page.locator(branch(waitFor)).first().waitFor({ timeout });
  }
  await closeCompanion(page);
  await page.waitForTimeout(1_500);
};

/**
 * Closes a companion (a new space's Help opens one) and waits for it to go. Call it only in an off-camera setup step:
 * a companion opening and closing on camera reads as a flicker.
 */
export const closeCompanion = async (page) => {
  const close = page.locator('[data-testid="plankHeading.closeCompanion"]');
  if (await visible(close, 6_000)) {
    await close.first().click();
    // A companion still open would start the clip mid-flicker, so let the take fail and be retried.
    await close.first().waitFor({ state: 'hidden', timeout: 5_000 });
  }
};

/** Expands navtree branches in order (e.g. `['Collections', 'Architecture']`) so the items under them show. */
export const reveal = async (page, branches) => {
  for (const label of branches) {
    const row = page.locator(`${branch(label)}[data-state="closed"]`).first();
    if (await visible(row, 3_000)) {
      await row.locator('> *').first().click();
      await page.waitForTimeout(800);
    }
  }
};

/**
 * The open plank's Leaflet map. react-leaflet keeps no global, so it is read from the map container's React context;
 * clips then move it with the map's own animations (`flyTo`) rather than simulated drags, which judder.
 */
export const leaflet = async (page) =>
  page.evaluate(() => {
    const element = [...document.querySelectorAll('[data-testid="deck.plank"] .leaflet-container')].pop();
    let fiber = element?.[Object.keys(element).find((key) => key.startsWith('__reactFiber'))];
    for (let depth = 0; fiber && depth < 200; depth++, fiber = fiber.return) {
      for (const value of [fiber.memoizedProps?.value, fiber.memoizedState?.memoizedState]) {
        const map = value?.map ?? value;
        if (map && typeof map.flyTo === 'function') {
          window.__showcaseMap = map;
          return true;
        }
      }
    }
    return false;
  });

/** Flies the open map to `[lat, lng]` at `zoom` over `seconds`, and waits for the flight to land. */
export const flyTo = async (page, center, zoom, seconds) => {
  await page.evaluate(
    ([center, zoom, seconds]) => window.__showcaseMap.flyTo(center, zoom, { duration: seconds }),
    [center, zoom, seconds],
  );
  await page.waitForTimeout(seconds * 1_000 + 300);
};

/** Dismisses notices, closes the companion, and enables the plugins the clip needs (`org.dxos.plugin.<id>`). */
export const prep = (plugins = []) => ({
  name: 'setup: dismiss notices, close the companion, enable plugins',
  setup: true,
  run: async ({ page }) => {
    const notice = page.locator('[data-testid="toast.close"]');
    if (await visible(notice, 8_000)) {
      await notice.first().click();
    }
    const close = page.locator('role=button[name="Close companion"]');
    if (await visible(close, 1_000)) {
      await close.first().click();
    }
    if (plugins.length > 0) {
      const ids = plugins.map((id) => (id.includes('.') ? id : `org.dxos.plugin.${id}`));
      // The operation invoker registers after boot; on a slow machine the first call can arrive before it.
      for (let attempt = 0; ; attempt++) {
        try {
          await page.evaluate((ids) => composer.invoke('org.dxos.operation.registry.enablePlugins', { ids }), ids);
          break;
        } catch (error) {
          if (attempt === 10 || !String(error).includes('CapabilityNotFoundError')) {
            throw error;
          }
          await page.waitForTimeout(2_000);
        }
      }
      await page.waitForTimeout(2_000);
    }
  },
});

/**
 * The steps of one showcase flow: prep, an off-camera `setup`, and the `clip: <name>` step, held to `ms` so the cut
 * is exactly that long. A clip that throws still fails the step, so the overnight report shows it. `caption` is the
 * line the dark demo shows (the driver draws it only with `--captions on`).
 */
export const showcase = ({ name, caption, plugins, setup, clip, ms = SHORT_MS }) => [
  prep(plugins),
  ...(setup ? [{ name: `setup: ${name}`, setup: true, run: setup }] : []),
  {
    name: `clip: ${name}`,
    narration: caption,
    run: async (ctx) => {
      const start = Date.now();
      if (caption) {
        await ctx.demo?.caption({ value: caption });
      }
      await clip(ctx);
      const rest = ms - (Date.now() - start);
      if (rest > 0) {
        await ctx.page.waitForTimeout(rest);
      }
    },
  },
];

/** Selects `text` in the open editor (one evaluate, so the offset cannot go stale) and scrolls it into view. */
export const selectText = (page, text) =>
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

/** Selects `text` in the open document and comments on it, as write-and-link does. */
export const comment = async (page, text, body) => {
  await selectText(page, text);
  const add = page.locator('[data-testid="deck.plank"] [data-testid="comments.comment.add"]').first();
  await add.waitFor({ state: 'visible' });
  await page.waitForFunction((element) => !element.disabled, await add.elementHandle(), { timeout: 10_000 });
  await add.click();
  // The new thread quotes the selection; an earlier thread can still be the current one.
  const thread = page.locator(`[data-testid=thread]:has-text(${JSON.stringify(text.slice(0, 24))})`).last();
  const reply = thread.locator('[data-testid="thread.reply"] [role="textbox"]');
  await reply.first().waitFor({ state: 'visible', timeout: 10_000 });
  await reply.first().click();
  await page.keyboard.type(body, { delay: 45 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1_200);
};
