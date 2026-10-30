//
// Copyright 2026 DXOS.org
//

/**
 * A spec is the feature map the sidebar lists; a feature nests by owning a spec of its own, which the map zooms into.
 *
 * @mdl packages/plugins/plugin-projects/PLUGIN.mdl test QA-6
 * @app storybook-react, narrowed to plugin-projects, on :9009
 *
 *   DX_STORIES=plugins/plugin-projects VITE_DX_DISABLE_ANIMATIONS=true moon run storybook-react:serve-nodeps
 *   node .agents/skills/autocue/scripts/driver.mjs --port 7333 --url http://localhost:9009 --out /tmp/demo
 */

const STORYBOOK = 'http://localhost:9009';
const SUBTITLE = 'from plugin-projects/PLUGIN.mdl QA-6';
const MAP = `${STORYBOOK}/iframe.html?id=plugins-plugin-projects-containers-specfeatures--canvas&viewMode=story`;

/** A beat for the viewer after a visible change. */
const BEAT = 1_500;

const NODE = '[data-testid="feature-canvas-node"]';

const caption = (demo, step, text) =>
  demo.caption({ value: `Step ${step} — ${text}`, subtitle: SUBTITLE, position: 'top' });

/** The canvas box holding the named feature's card; its frame takes the presses that select and zoom. */
const node = (name) => `[data-node-id]:has(${NODE}:has-text("${name}"))`;

const waitForCount = (page, count) =>
  page.waitForFunction(
    ([selector, expected]) => document.querySelectorAll(selector).length === expected,
    [NODE, count],
    { timeout: 15_000 },
  );

/** The first canvas `+` the pointer can reach: the outer ring's can sit under the toolbar or past the viewport. */
const reachableAdd = async (page) => {
  const index = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="feature-canvas.add"]')].findIndex((button) => {
      const { x, y, width, height } = button.getBoundingClientRect();
      return button.contains(document.elementFromPoint(x + width / 2, y + height / 2));
    }),
  );
  if (index === -1) {
    throw new Error('no reachable add button');
  }
  return `[data-testid="feature-canvas.add"] >> nth=${index}`;
};

export const steps = [
  {
    name: 'Prep (off camera): warm the story',
    setup: true,
    run: async ({ page }) => {
      await page.goto(MAP);
      await waitForCount(page, 8);
    },
  },
  {
    name: "Open a spec's feature map",
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Specs', subtitle: 'Feature maps that nest through features' });
      await caption(demo, 1, 'Open the spec');
      await waitForCount(page, 8);
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Select a feature',
    run: async ({ demo, page }) => {
      await caption(demo, 2, 'Click the "Provider sync" card');
      await demo.click({ selector: node('Provider sync'), label: 'Provider sync' });
      await page.getByTestId('feature-companion').waitFor({ state: 'visible', timeout: 10_000 });
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: "Zoom into the feature's own spec",
    run: async ({ demo, page }) => {
      await caption(demo, 3, 'Double-click it to open the spec that breaks it down');
      const box = await page.locator(node('Provider sync')).first().boundingBox();
      await demo.hover({ selector: node('Provider sync'), label: 'Provider sync' });
      await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
      await waitForCount(page, 2);
      await page.getByTestId('feature-map.trail').waitFor({ state: 'visible' });
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Add a subfeature',
    run: async ({ demo, page }) => {
      await caption(demo, 4, 'Click the + in an empty cell, then New feature');
      await demo.click({ selector: await reachableAdd(page), label: 'Add a feature here' });
      await demo.click({ selector: '[data-testid="feature-map.new-feature"]', label: 'New feature' });
      await waitForCount(page, 3);
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Zoom back out',
    run: async ({ demo, page }) => {
      await caption(demo, 5, 'Click "All features" in the trail');
      await demo.click({ selector: '[data-testid="feature-map.trail"] button >> nth=0', label: 'All features' });
      await waitForCount(page, 8);
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'View the map by status',
    narration: 'Specs, features and their breakdowns are ECHO objects, so agents edit the same map people do.',
    run: async ({ demo, page }) => {
      await caption(demo, 6, 'Click the Kanban toggle');
      await demo.click({ selector: '[data-testid="projectsPlugin.featureMap.kanban"]', label: 'Kanban' });
      await page.getByTestId('board-column').first().waitFor({ state: 'visible', timeout: 10_000 });
      await demo.sleep({ ms: 6_000 });
    },
  },
];
