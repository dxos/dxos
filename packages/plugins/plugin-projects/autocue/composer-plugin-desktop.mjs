//
// Copyright 2026 DXOS.org
//

import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Re-imported with the driver's cache-busting query, which reaches only the file it loads, so an edit to the
// browser flow is picked up by the next `run` too.
const { prepare, steps: browserSteps } = await import(
  `../../plugin-computer/autocue/composer-plugin.mjs${new URL(import.meta.url).search}`
);

/**
 * The Composer Plugin demo in the native desktop app: the same take as plugin-computer's browser flow, but the
 * template is plugin-projects' own, and the agent builds World Clock in a local sandbox that holds nothing but
 * the bun runtime the app ships. It fetches the guide from GitHub and the packages from pkg.pr.new and npm, all
 * pinned to the commit the app was built from, and the plugin loads from the URL Publish Files returns.
 *
 * @mdl packages/plugins/plugin-projects/PLUGIN.mdl test QA-1
 * @app composer-app desktop release build (`cargo build --release --features tauri/custom-protocol` in src-tauri),
 *   frontend bundled against EDGE preview from a commit pkg.pr.new has published, driven by
 *   `driver.mjs --target tauri`
 *
 *   export DX_EDGE_BASE_URL=https://preview.dxos.network/ DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true VITE_DX_STORAGE=memory
 *   export DX_PLUGIN_TOOLCHAIN_COMMIT=<a main commit>   # only for a build of an unpublished branch
 *   moon run composer-app:bundle && moon run composer-app:stage-sandbox-helper
 *   (cd packages/apps/composer-app/src-tauri && cargo build --release --features tauri/custom-protocol)
 *   node .agents/skills/autocue/scripts/driver.mjs --target tauri --out /tmp/demo
 *
 * The first three steps are off-camera prep; the rest are the browser flow's. On Linux the app keeps its database in
 * memory (`VITE_DX_STORAGE=memory`), so every launch starts from a new identity and only localStorage settings persist.
 */

/** The same marker the browser flow keeps; cleared here so a replay tells this take's project apart. */
const TAKE_PROJECT = join(tmpdir(), 'autocue-composer-plugin.project');

/** Named by the template's desktop instructions (`SANDBOX_NAME` in `src/templates/composer-plugin.ts`). */
const SANDBOX_NAME = 'World Clock';

const LEFTOVER_PROJECTS = ['World Clock', 'Clock Plugin', 'Composer Plugin'];

const CLOCK_TYPE = 'org.example.type.worldClock';

const SPACE_TAB = '[data-testid="spacePlugin.space"]';

/** Turns the Sandbox plugin on in the registry, which a release leaves off; a no-op once it is on. */
const enableSandbox = async ({ demo, page }) => {
  const filter = page.locator('input[placeholder="Filter…"]').first();
  for (let attempt = 0; attempt < 3; attempt++) {
    await demo.click({ selector: '[data-testid="treeView.pluginRegistry"]', hud: false });
    if (
      await filter.waitFor({ state: 'visible', timeout: 5_000 }).then(
        () => true,
        () => false,
      )
    ) {
      break;
    }
  }
  await demo.fill({ selector: 'input[placeholder="Filter…"]', value: 'Sandbox', hud: false });
  const toggle = page.locator('input[id="org.dxos.plugin.sandbox-input"]');
  await toggle.waitFor({ state: 'visible', timeout: 10_000 });
  if (!(await toggle.isChecked())) {
    await toggle.click();
  }
  await demo.fill({ selector: 'input[placeholder="Filter…"]', value: '', hud: false });
};

/** Whether this take's sandbox exists: once the agent has made it, the take is under way. */
const sandboxExists = ({ page }) =>
  page.evaluate(
    async ({ tab, name }) => {
      const spaceId = document.querySelector(tab)?.dataset.value?.split('/').pop();
      if (!spaceId || !globalThis.dxos?.spaces) {
        return false;
      }
      const sandboxes = await dxos
        .spaces(spaceId)
        .db.query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.sandbox')))
        .run();
      return sandboxes.some((sandbox) => sandbox.name === name);
    },
    { tab: SPACE_TAB, name: SANDBOX_NAME },
  );

export const steps = [
  {
    // Destructive, so replay-guarded, as in the browser flow; its build folders are the sandbox here.
    name: 'Prep (off camera): clear the last take',
    setup: true,
    done: sandboxExists,
    run: async ({ page }) => {
      await rm(TAKE_PROJECT, { force: true });
      await page.waitForFunction(
        (tab) => globalThis.composer?.invoke && globalThis.dxos?.spaces && document.querySelector(tab),
        SPACE_TAB,
        { timeout: 120_000 },
      );
      await page.evaluate(
        async ({ tab, names, CLOCK_TYPE, sandboxName }) => {
          const spaceId = document.querySelector(tab).dataset.value.split('/').pop();
          const query = (typename) =>
            dxos
              .spaces(spaceId)
              .db.query(dxos.Filter.type(dxos.DXN.make(typename)))
              .run();
          const projects = await query('org.dxos.type.project');
          const clocks = await query(CLOCK_TYPE);
          const sandboxes = await query('org.dxos.type.sandbox');
          const objects = [
            ...projects.filter((project) => names.includes(project.name)),
            ...clocks,
            ...sandboxes.filter((sandbox) => sandbox.name === sandboxName),
          ];
          if (objects.length > 0) {
            await composer.invoke('org.dxos.operation.space.removeObjects', { objects }, { spaceId });
          }
        },
        { tab: SPACE_TAB, names: LEFTOVER_PROJECTS, CLOCK_TYPE, sandboxName: SANDBOX_NAME },
      );
    },
  },
  {
    // A fresh identity (every launch, with the in-memory store) opens on the persisted layout of the last one;
    // the Sandbox plugin is off by default in a release, and its Backend is already Local in the desktop app.
    name: 'Prep (off camera): enable Sandbox, pick the model, dismiss notices',
    setup: true,
    run: async (context) => {
      await context.page.locator(SPACE_TAB).first().waitFor({ state: 'visible', timeout: 180_000 });
      await enableSandbox(context);
      await prepare(context, { codingDev: false });
    },
  },
  {
    // A fresh identity (every launch, with the in-memory store) raises the Privacy Notice a while after boot, and it
    // sits over the companion's prompt; the browser flow's profile dismissed it long ago.
    name: 'Prep (off camera): dismiss the privacy notice',
    setup: true,
    run: async ({ page, demo }) => {
      const close = '[data-testid="org.dxos.plugin.observability.notice"] button:has-text("Close")';
      if (
        await page
          .locator(close)
          .first()
          .waitFor({ state: 'visible', timeout: 60_000 })
          .then(
            () => true,
            () => false,
          )
      ) {
        await demo.click({ selector: `${close} >> nth=0`, hud: false });
      }
    },
  },
  // The browser flow's take. Its uninstall of an earlier take's plugin keys off the browser build folder, which the
  // desktop take never writes, so it always runs: replay this flow from before "Load the plugin", never after it.
  ...browserSteps.slice(2),
];
