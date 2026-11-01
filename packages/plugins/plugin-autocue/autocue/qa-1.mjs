//
// Copyright 2026 DXOS.org
//

/**
 * Link a hosted autocue bundle into a space as a Demo, play it, and step through its chapters from the keyboard.
 *
 * @title Link a demo bundle and play it
 * @mdl packages/plugins/plugin-autocue/PLUGIN.mdl test QA-1
 * @app composer-app via `DX_DEV=true DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:serve -- --port 4173`
 *
 * Record headless, in light mode:
 *
 *   node .agents/skills/autocue/scripts/driver.mjs --url http://localhost:4173 --out /tmp/autocue-qa-1 \
 *     --theme light --width 1920 --height 1080
 */

/** A hosted bundle whose host allows the app's origin; QA-1's `$given.url`. */
const BUNDLE_URL = 'https://dx.pub/demo/2026-11-01-autocue-fixture-chess/';

/** The bundle's chapter start times, in seconds; read from its `autocue.json`. */
const CHAPTERS = [0.5, 4, 7.5, 11];

/** A beat for the viewer after a visible change. */
const BEAT = 1_200;

const visible = (locator, timeout = 1_500) =>
  locator
    .first()
    .waitFor({ state: 'visible', timeout })
    .then(
      () => true,
      () => false,
    );

const PLUGIN_ID = 'org.dxos.plugin.autocue';

const article = (page) => page.locator('[data-testid="deck.plank"]').last();

/** The playhead of the Demo's video. */
const playhead = (page) =>
  article(page)
    .locator('video')
    .first()
    .evaluate((video) => video.currentTime);

/** The index of the chapter the playhead is in. */
const chapterAt = (time) => CHAPTERS.findLastIndex((at) => time >= at - 0.05);

export const steps = [
  {
    name: 'Prep (off camera): dismiss notices, enable Demos, close the help panel',
    setup: true,
    done: ({ page }) =>
      page.evaluate((id) => composer.plugins().some((plugin) => plugin.id === id && plugin.active), PLUGIN_ID),
    run: async ({ page }) => {
      // Operations only resolve once the space has booted, which a cold first load can stretch.
      await page
        .locator('[data-testid="spacePlugin.createObject"]')
        .first()
        .waitFor({ state: 'visible', timeout: 120_000 });
      const notice = page.locator('[data-testid="toast.close"]');
      if (await visible(notice, 8_000)) {
        await notice.first().click();
      }
      // A labs plugin: default-on only under `isDev`, so enable it for any other build.
      await page.evaluate(
        (id) => composer.invoke('org.dxos.operation.registry.enablePlugins', { ids: [id] }),
        PLUGIN_ID,
      );
      await page.waitForFunction(
        (id) => composer.plugins().some((plugin) => plugin.id === id && plugin.active),
        PLUGIN_ID,
        { timeout: 20_000 },
      );
      const close = page.locator('role=button[name="Close companion"]');
      if (await visible(close, 1_000)) {
        await close.first().click();
      }
    },
  },
  {
    name: 'Create the demo',
    narration: 'Link a recorded demo into your space by its URL.',
    done: async ({ page }) => (await article(page).locator('video').count()) > 0,
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"] >> nth=0', label: 'Add to space' });
      await demo.click({
        selector: '[data-testid="create-object-form.type.org.dxos.type.autocueBundle"]',
        label: 'Demo',
      });
      await demo.type({ selector: '[role="dialog"] input[data-testid="name"]', value: 'QA Demo', label: 'Name' });
      await demo.type({ selector: '[role="dialog"] input[data-testid="url"]', value: BUNDLE_URL, label: 'URL' });
      await demo.click({ selector: '[role="dialog"] [data-testid="save-button"]', label: 'Save' });
      await article(page).locator('video').first().waitFor({ state: 'visible', timeout: 30_000 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Play it',
    narration: 'The demo plays in the article, with its chapters beside it.',
    run: async ({ demo, page }) => {
      await demo.click({ selector: 'role=button[name="Play"s] >> nth=0', label: 'Play' });
      await page.waitForFunction(
        () => {
          const video = [...document.querySelectorAll('[data-testid="deck.plank"] video')].at(-1);
          return video && !video.paused && video.currentTime > 0.5;
        },
        undefined,
        { timeout: 15_000 },
      );
      // Short, so the keys in the next step land well inside the first chapter.
      await page.waitForTimeout(BEAT / 2);
    },
  },
  {
    name: 'Step through the chapters',
    narration: 'Arrow keys step from chapter to chapter.',
    run: async ({ demo, page }) => {
      await demo.click({ selector: 'text="Chess (fixture)" >> nth=0', label: 'Focus the player' });
      const start = chapterAt(await playhead(page));
      await demo.press({ key: 'ArrowRight', label: '→', cadence: 0 });
      await page.waitForTimeout(300);
      await demo.press({ key: 'ArrowRight', label: '→', cadence: 0 });
      await page.waitForTimeout(300);
      const reached = chapterAt(await playhead(page));
      const expected = Math.min(start + 2, CHAPTERS.length - 1);
      if (reached !== expected) {
        throw new Error(`expected chapter ${expected + 1}, the playhead is in chapter ${reached + 1}`);
      }
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Keys stay in the article',
    narration: 'Outside the article the arrow keys belong to Composer again.',
    run: async ({ demo, page }) => {
      await demo.click({
        selector: '[data-testid="treeItem.heading"]:text-is("Collections") >> nth=0',
        label: 'Navtree',
      });
      const before = await playhead(page);
      await demo.press({ key: 'ArrowRight', label: '→' });
      await page.waitForTimeout(300);
      // The video keeps playing, so only a chapter-sized jump counts as the player taking the key.
      const moved = (await playhead(page)) - before;
      if (moved > 2) {
        throw new Error(`the playhead jumped ${moved.toFixed(1)}s on a key pressed outside the article`);
      }
      await page.waitForTimeout(BEAT * 2);
    },
  },
];
