//
// Copyright 2026 DXOS.org
//

/**
 * Hot-reload a plugin module: edits to the markdown surface module, made in a terminal on screen, re-run that
 * module in the running app in milliseconds; an edit outside a module body still reloads the page, for contrast.
 *
 * @mdl packages/plugins/plugin-markdown/autocue/AUTOCUE.mdl test QA-6
 * @app composer-app dev server (the HMR path is dev only), with the terminal stage beside it:
 *
 *   DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:serve -- --port 4173
 *   node .agents/skills/autocue/scripts/terminal/stage.mjs --port 4180 --cwd packages/plugins/plugin-markdown \
 *     --cols 92 --rows 9
 *   node .agents/skills/autocue/scripts/driver.mjs --port 7333 --url http://localhost:4173 --out /tmp/hot-demo
 *
 * The take edits `src/capabilities/react-surface.ts` and `src/plugin.tsx` for real; restore both afterwards with
 * `git checkout -- packages/plugins/plugin-markdown/src`. Before recording, give the document surface the banner
 * the take edits (see `BANNER` below), so the take starts from `v1`.
 *
 * Cut: node .agents/skills/autocue/scripts/trim-static.mjs --in /tmp/hot-demo/session.webm --out hot-reload.webm \
 *   --duration off --max-static 1.5 --caption-hold 3 --mp4
 */

const BEAT = 1_500;
const TYPING = 32;
const TITLE = 'Hot reload';
const TERMINAL = 'http://localhost:4180';
const SURFACE = 'src/capabilities/react-surface.ts';

/** The banner the off-camera prep adds to the document surface; the take edits its text. */
export const BANNER = '[data-testid="hot-banner"]';

const EDITOR = '[data-testid="composer.markdownRoot"] .cm-content';

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

const bannerReads = (page, text) =>
  page.waitForFunction(
    ({ selector, text }) => document.querySelector(selector)?.textContent?.includes(text),
    { selector: BANNER, text },
    { polling: 'raf', timeout: 30_000 },
  );

/** Runs `sed` on the surface module and captions how long the edit took to reach the screen. */
const hotEdit = async ({ demo, page }, from, to) => {
  const pressed = await typeCommand(page, `sed -i 's/${from}/${to}/' ${SURFACE}`);
  await bannerReads(page, to);
  const elapsed = Date.now() - pressed;
  const reloaded = (await page.evaluate(() => window.__hotDemoMarker)) !== true;
  if (reloaded) {
    throw new Error('the page reloaded');
  }
  await demo.caption({
    value: `On screen ${elapsed} ms after Enter`,
    subtitle: 'Only the markdown surface module re-ran: no page reload, the document stays open',
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
      await page.locator('[data-testid="deck.plank"]').first().waitFor();
      const close = page.locator('role=button[name="Close companion"]').first();
      if (await close.isVisible().catch(() => false)) {
        await close.click();
      }
    },
  },
  {
    name: 'Prep (off camera): open a markdown document',
    setup: true,
    done: async ({ page }) => (await page.locator(BANNER).count()) > 0,
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"] >> nth=0', hud: false });
      await demo.click({ selector: '[data-testid="create-object-form.type.org.dxos.type.document"]', hud: false });
      const form = page.getByTestId('create-object-form');
      if (await form.isVisible().catch(() => false)) {
        const name = form.getByTestId('name');
        if (await name.isVisible().catch(() => false)) {
          await name.click();
          await page.keyboard.type(TITLE);
        }
        await page.locator('[role="dialog"] [data-testid="save-button"]').click();
      }
      await page.locator(EDITOR).last().waitFor({ state: 'visible', timeout: 15_000 });
      await page.locator(EDITOR).last().click();
      await page.keyboard.type('Plugin modules hot-reload in the dev server.');
      await page.locator(BANNER).waitFor({ timeout: 15_000 });
    },
  },
  {
    name: 'Prep (off camera): float the terminal over the app',
    setup: true,
    run: async ({ page }) => {
      await showTerminal(page);
      // The stage's shell outlives a take, so start from an empty screen.
      await typeCommand(page, 'clear');
      // Survives HMR but not a reload: the take asserts on it.
      await page.evaluate(() => {
        window.__hotDemoMarker = true;
      });
    },
  },
  {
    name: 'Show the running module',
    narration: 'The banner above this document comes from the markdown plugin’s surface module.',
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Hot-reloading plugin modules', subtitle: 'Composer dev server', hold: 3_600 });
      await demo.caption({
        value: 'The banner comes from plugin-markdown’s surface module',
        subtitle: 'src/capabilities/react-surface.ts',
      });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Edit the surface module',
    narration: 'Edit the module in the terminal. It re-runs in place in under a second.',
    run: async (context) => {
      await context.demo.caption({ value: 'Edit the module from the terminal', subtitle: SURFACE });
      await hotEdit(context, 'v1', 'v2');
    },
  },
  {
    name: 'Edit it again',
    narration: 'Again: only that module re-runs, and the open document is untouched.',
    run: async (context) => {
      await context.demo.caption({ value: 'And again', subtitle: SURFACE });
      await hotEdit(context, 'v2', 'v3');
    },
  },
  {
    name: 'Edit the plugin definition',
    narration: 'An edit outside a module body, such as the plugin definition, still reloads the whole page.',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'For contrast: edit outside a module body',
        subtitle: 'src/plugin.tsx is not a hot boundary yet, so the page reloads',
      });
      const navigated = page.waitForEvent('framenavigated', {
        predicate: (frame) => frame === page.mainFrame(),
        timeout: 60_000,
      });
      const pressed = await typeCommand(page, `echo '// edited' >> src/plugin.tsx`);
      await navigated;
      await page.locator(BANNER).waitFor({ state: 'visible', timeout: 120_000 });
      await page.locator(EDITOR).last().waitFor({ state: 'visible', timeout: 120_000 });
      const elapsed = ((Date.now() - pressed) / 1000).toFixed(1);
      await showTerminal(page);
      await demo.caption({
        value: `Full page reload: ${elapsed} s until the document is back`,
        subtitle: 'What every plugin-module edit cost before this change',
      });
      await page.waitForTimeout(BEAT * 3);
    },
  },
];
