//
// Copyright 2026 DXOS.org
//

import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Re-imported with the driver's cache-busting query, which reaches only the file it loads, so an edit to the
// browser flow is picked up by the next `run` too.
const { steps: browserSteps } = await import(`./composer-plugin.mjs${new URL(import.meta.url).search}`);

/**
 * The Composer Plugin demo in the native desktop app: the same take as `composer-plugin.mjs`, but the agent
 * builds World Clock in a local sandbox with the Sandbox skill — the desktop app has no vite server, so no
 * Computer shell — and the plugin loads from the URL Publish Files returns.
 *
 * @mdl packages/plugins/plugin-computer/PLUGIN.mdl test QA-3
 * @app composer-app desktop release build (`cargo build --release --features tauri/custom-protocol` in src-tauri,
 *   frontend bundled with DX_ENVIRONMENT=dev against EDGE preview), driven by `driver.mjs --target tauri`
 *
 *   export DX_EDGE_BASE_URL=https://preview.dxos.network/ DX_ENVIRONMENT=dev DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true VITE_DX_STORAGE=memory
 *   moon run composer-app:bundle && moon run composer-app:stage-sandbox-helper
 *   (cd packages/apps/composer-app/src-tauri && cargo build --release --features tauri/custom-protocol)
 *   node .agents/skills/autocue/scripts/driver.mjs --target tauri --out /tmp/demo
 *
 * The first four steps are off-camera prep; the rest are the browser flow's. On Linux the app keeps its database in
 * memory (`VITE_DX_STORAGE=memory`), so every launch starts from a new identity and only localStorage settings persist.
 */

/** The same marker the browser flow keeps; cleared here so a replay tells this take's project apart. */
const TAKE_PROJECT = join(tmpdir(), 'autocue-composer-plugin.project');

/** Named by the template's desktop instructions (`SANDBOX_NAME` in `src/templates/composer-plugin.ts`). */
const SANDBOX_NAME = 'World Clock';

const LEFTOVER_PROJECTS = ['World Clock', 'Clock Plugin', 'Composer Plugin'];

const CLOCK_TYPE = 'org.example.type.worldClock';

const SPACE_TAB = '[data-testid="spacePlugin.space"]';

/** Local storage key of plugin-sandbox's settings (its plugin key, see `capabilities/settings.ts`). */
const SANDBOX_SETTINGS = 'org.dxos.plugin.sandbox';

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
    // The Backend setting is a localStorage-backed atom read at activation, so it is written and the app
    // reloaded, rather than clicked through the settings form.
    name: 'Prep (off camera): run sandboxes on this computer',
    setup: true,
    done: ({ page }) =>
      page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').backend === 'local', SANDBOX_SETTINGS),
    run: async ({ page, demo }) => {
      const local = await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) ?? '{}').backend === 'local',
        SANDBOX_SETTINGS,
      );
      if (local) {
        return;
      }
      await page.evaluate(
        (key) =>
          localStorage.setItem(
            key,
            JSON.stringify({ ...JSON.parse(localStorage.getItem(key) ?? '{}'), backend: 'local' }),
          ),
        SANDBOX_SETTINGS,
      );
      await page.goto(new URL(page.url()).origin);
      // A Linux desktop build keeps its database in memory (`VITE_DX_STORAGE=memory`), so the reload boots a new
      // identity while the persisted layout still names the last one's workspace: open the new first space.
      await page.locator(SPACE_TAB).first().waitFor({ state: 'visible', timeout: 180_000 });
      if (!(await page.locator('[data-testid="deck.plank"]').first().isVisible())) {
        await demo.click({ selector: `${SPACE_TAB} >> nth=0`, hud: false });
      }
      await page.locator('[data-testid="deck.plank"]').first().waitFor({ state: 'visible', timeout: 60_000 });
      await page.waitForTimeout(5_000);
    },
  },
  ...browserSteps.slice(1, 2),
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
  // Enabling Coding (Dev) — it contributes the template — the model and the notices are the browser flow's.
  // Its uninstall of an earlier take's plugin keys off the browser build folder, which the desktop take never
  // writes, so it always runs: replay this flow from before "Load the plugin", never after it.
  ...browserSteps.slice(2),
];
