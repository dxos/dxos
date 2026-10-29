//
// Copyright 2026 DXOS.org
//

/**
 * Hot-reload a plugin without reloading the page: edits to plugin-space's app-graph builder (a capability with no
 * React in it), made in a terminal on screen, re-run that module and the navtree follows; edits to the plugin
 * definition re-create the plugin in place, dropping and restoring that module.
 *
 * @mdl packages/apps/composer-app/spec/APP.mdl test QA-16
 * @app composer-app dev server (the HMR path is dev only), with the terminal stage beside it:
 *
 *   DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:serve -- --port 4173
 *   node .agents/skills/autocue/scripts/terminal/stage.mjs --port 4180 --cwd packages/plugins/plugin-space \
 *     --cols 92 --rows 9
 *   node .agents/skills/autocue/scripts/driver.mjs --port 7333 --url http://localhost:4173 --out /tmp/hot-demo \
 *     --action-timeout 60000
 *
 * The take edits `EXTENSION` and `dx.config.ts` for real; restore them afterwards with
 * `git checkout -- packages/plugins/plugin-space`. Before recording, set the settings section's `label` in
 * `EXTENSION` to the plain string `'Settings · v1'`, so the take starts from `v1`.
 *
 * Cut: node .agents/skills/autocue/scripts/trim-static.mjs --in /tmp/hot-demo/session.webm --out hot-reload.webm \
 *   --duration off --max-static 1.5 --caption-hold 3 --mp4
 */

const BEAT = 1_500;
const TYPING = 32;
const TERMINAL = 'http://localhost:4180';

/** A helper of the app-graph builder module: the update stops at that module, which re-runs. */
const EXTENSION_DIR = 'packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions';
const EXTENSION = 'settings.ts';

/** The plugin definition, and the line that lists the app-graph builder module in it. */
const PLUGIN = 'packages/plugins/plugin-space/dx.config.ts';
const PLUGIN_FROM_EXTENSION = '../../../../dx.config.ts';
const MODULE_LINE = 'AppGraphBuilder,';

/** The navtree row the settings section extension contributes. */
const ROW = '[data-testid="spacePlugin.settings"]';

/** Floats the terminal stage over the bottom-right of the app; a full reload removes it, so it is re-added after. */
const showTerminal = async (page) => {
  await page.evaluate((url) => {
    if (document.getElementById('hot-terminal')) {
      return;
    }
    const frame = document.createElement('iframe');
    frame.id = 'hot-terminal';
    frame.src = url;
    frame.style.cssText =
      'position:fixed;right:24px;bottom:96px;width:860px;height:300px;border:0;z-index:2147483000;' +
      'background:transparent;color-scheme:normal;';
    document.body.appendChild(frame);
  }, TERMINAL);
  const frame = await waitForFrame(page);
  await frame.waitForFunction(() => document.body.dataset.ready === 'true', undefined, { timeout: 30_000 });
  // The stage draws a dotted page behind its window; over the app only the window should show.
  await frame.evaluate(() => {
    const style = document.createElement('style');
    style.textContent = 'html,body{background:transparent!important;background-image:none!important}';
    document.head.appendChild(style);
  });
  return frame;
};

const waitForFrame = async (page) => {
  for (let attempt = 0; attempt < 100; attempt++) {
    const frame = page.frames().find((candidate) => candidate.url().startsWith(TERMINAL));
    if (frame) {
      return frame;
    }
    await page.waitForTimeout(100);
  }
  throw new Error('terminal frame did not load');
};

/** Types a command into the terminal and returns the time Enter was pressed. */
const typeCommand = async (page, command) => {
  const frame = await waitForFrame(page);
  await frame.locator('[data-testid="stage.terminal"] textarea').focus();
  await page.keyboard.type(command, { delay: TYPING });
  await page.waitForTimeout(400);
  const pressed = Date.now();
  await page.keyboard.press('Enter');
  return pressed;
};

/** Runs `sed` on the extension and captions how long the edit took to reach the navtree. */
const hotEdit = async ({ demo, page }, { from, to, reached }) => {
  // The row is small; the cursor shows the viewer where to look.
  await demo.hover({ selector: ROW, label: 'Settings row' });
  const pressed = await typeCommand(page, `sed -i "s/${from}/${to}/" ${EXTENSION}`);
  await page.waitForFunction(reached, ROW, { polling: 'raf', timeout: 30_000 });
  const elapsed = Date.now() - pressed;
  if ((await page.evaluate(() => window.__hotDemoMarker)) !== true) {
    throw new Error('the page reloaded');
  }
  await demo.caption({
    value: `In the navtree ${elapsed} ms after Enter`,
    subtitle: 'Only the app-graph builder module re-ran: no page reload, nothing else restarted',
  });
  await page.waitForTimeout(BEAT * 2);
};

/** Captions how long a plugin-definition edit took to show, after checking the page did not reload. */
const reportPluginEdit = async ({ demo, page }, pressed, outcome) => {
  const elapsed = ((Date.now() - pressed) / 1000).toFixed(1);
  if ((await page.evaluate(() => window.__hotDemoMarker)) !== true) {
    throw new Error('the page reloaded');
  }
  await demo.caption({
    value: `${outcome} ${elapsed} s after Enter`,
    subtitle: 'The plugin was re-created in place: no page reload, its other modules kept running',
  });
  await page.waitForTimeout(BEAT * 2);
};

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
      await page.locator(ROW).first().waitFor();
      const close = page.locator('role=button[name="Close companion"]').first();
      if (await close.isVisible().catch(() => false)) {
        await close.click();
      }
    },
  },
  {
    name: 'Prep (off camera): float the terminal over the app',
    setup: true,
    run: async ({ page }) => {
      await showTerminal(page);
      // Short paths keep each command on one line; the stage's shell outlives a take, so start from an
      // empty screen.
      await typeCommand(page, `cd "$(git rev-parse --show-toplevel)/${EXTENSION_DIR}" && clear`);
      // Survives a hot update but not a reload: each edit asserts on it.
      await page.evaluate(() => {
        window.__hotDemoMarker = true;
      });
    },
  },
  {
    name: 'Show the running capability',
    narration: "This Settings row comes from plugin-space's app-graph builder, a capability with no React in it.",
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Hot-reloading a plugin capability', subtitle: 'Composer dev server', hold: 3_600 });
      await demo.caption({
        value: 'The "Settings · v1" row comes from plugin-space\'s app-graph builder',
        subtitle: 'A capability module, no React: it contributes navtree nodes',
      });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: "Edit the node's label",
    narration: 'Edit the extension in the terminal. Only that module re-runs, and the navtree follows.',
    run: async (context) => {
      await context.demo.caption({ value: "Change the node's label", subtitle: `${EXTENSION_DIR}/${EXTENSION}` });
      await hotEdit(context, {
        from: 'v1',
        to: 'v2',
        reached: (selector) => document.querySelector(selector)?.textContent?.includes('v2'),
      });
    },
  },
  {
    name: "Edit the node's icon colour",
    narration: 'Again, for the icon colour.',
    run: async (context) => {
      await context.demo.caption({ value: "Change the node's icon colour", subtitle: `${EXTENSION_DIR}/${EXTENSION}` });
      await hotEdit(context, {
        from: "iconHue: 'emerald'",
        to: "iconHue: 'rose'",
        reached: (selector) => document.querySelector(selector)?.closest('[role]')?.outerHTML.includes('rose'),
      });
    },
  },
  {
    name: 'Drop the module from the plugin',
    narration: 'Edit the plugin definition: drop the app-graph builder. The plugin is re-created in place.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Drop the app-graph builder from the plugin', subtitle: PLUGIN });
      await demo.hover({ selector: ROW, label: 'Settings row' });
      const pressed = await typeCommand(page, `sed -i "s|${MODULE_LINE}|// ${MODULE_LINE}|" ${PLUGIN_FROM_EXTENSION}`);
      await page.locator(ROW).first().waitFor({ state: 'detached', timeout: 30_000 });
      await reportPluginEdit({ demo, page }, pressed, 'The row is gone');
    },
  },
  {
    name: 'Restore the module',
    narration: 'Put it back, and the plugin is re-created with it again. The page never reloaded.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Put it back', subtitle: PLUGIN });
      const pressed = await typeCommand(page, `sed -i "s|// ${MODULE_LINE}|${MODULE_LINE}|" ${PLUGIN_FROM_EXTENSION}`);
      await page.locator(ROW).first().waitFor({ state: 'visible', timeout: 60_000 });
      await reportPluginEdit({ demo, page }, pressed, 'The row is back');
    },
  },
];
