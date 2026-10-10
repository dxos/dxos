//
// Copyright 2026 DXOS.org
//

/**
 * Showcase scene 3: the plugin gallery. Open Plugins, filter, and switch on two plugins that are off by default:
 * Maps, and Cloudflare (a connector to the Cloudflare API, a nod to what Composer runs on).
 *
 * @mdl packages/apps/composer-app/spec/APP.mdl test QA-13
 * @app composer-app bundled dev build against EDGE preview (launch config `composer-showcase`, :4183)
 */

const { prep } = await import(`./01-home.mjs${new URL(import.meta.url).search}`);

/** A beat for the viewer after a visible change. */
const BEAT = 1_200;

const FILTER = 'input[placeholder="Filter…"]';

/** Plugins the scene switches on, by id and the display name the registry filters on. */
const PLUGINS = [
  { id: 'org.dxos.plugin.map', name: 'Maps' },
  { id: 'org.dxos.plugin.cloudflare', name: 'Cloudflare' },
];

const isActive = (page, id) =>
  page.evaluate((id) => composer.plugins().some((plugin) => plugin.id === id && plugin.active), id);

const enable = async ({ demo, page }, { id, name }) => {
  await demo.fill({ selector: FILTER, value: '', hud: false });
  await demo.type({ selector: FILTER, value: name.toLowerCase(), label: 'Filter' });
  const toggle = `[data-scope="switch"][data-part="root"]:has(input[role="switch"][aria-label="${name}"])`;
  await page.locator(toggle).first().waitFor({ state: 'visible', timeout: 10_000 });
  await page.waitForTimeout(BEAT / 2);
  if (!(await isActive(page, id))) {
    await demo.click({ selector: `${toggle} >> nth=0`, label: `Enable ${name}` });
    await page.waitForFunction((id) => composer.plugins().some((plugin) => plugin.id === id && plugin.active), id, {
      timeout: 30_000,
    });
  }
  await page.waitForTimeout(BEAT);
};

export const steps = [
  prep,
  {
    name: 'Open the plugin gallery',
    narration: 'Everything you see is a plugin.',
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="treeView.pluginRegistry"]', label: 'Plugins' });
      await page.locator(FILTER).first().waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Switch on Maps',
    narration: 'Types, views, operations, even the agent’s skills are all contributed by plugins.',
    done: ({ page }) => isActive(page, PLUGINS[0].id),
    run: (context) => enable(context, PLUGINS[0]),
  },
  {
    name: 'Switch on Cloudflare',
    narration: 'Switch them on, swap them out, or write your own.',
    done: ({ page }) => isActive(page, PLUGINS[1].id),
    run: (context) => enable(context, PLUGINS[1]),
  },
];
