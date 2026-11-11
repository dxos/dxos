//
// Copyright 2026 DXOS.org
//

/**
 * The Transcription story plays an audio file and streams its transcript into a message list as it plays. Storybook
 * has no EDGE, so the scripted transcriber stands in for RealtimeKit: the take shows the pipeline and the list.
 *
 * @title Transcribe an audio file
 * @mdl packages/plugins/plugin-transcription/PLUGIN.mdl test QA-3
 * @app storybook-react, narrowed to plugin-transcription, on :9009
 *
 *   DX_STORIES=plugins/plugin-transcription VITE_DX_DISABLE_ANIMATIONS=true moon run storybook-react:serve
 *   node .agents/skills/autocue/scripts/driver.mjs --port 7333 --out /tmp/demo \
 *     --url 'http://localhost:9009/iframe.html?id=plugins-plugin-transcription-stories-transcription--default&viewMode=story' \
 *     --chromium-args --autoplay-policy=no-user-gesture-required
 */

const SUBTITLE = 'from plugin-transcription/PLUGIN.mdl QA-3';
const PLAY = 'button[aria-label="Play"]:not([disabled])';
const PAUSE = 'button[aria-label="Pause"]';
/** One rendered message per committed block; the byline names the sender. */
const MESSAGE = ':text-is("You")';

/** A beat for the viewer after a visible change. */
const BEAT = 1_500;

const caption = (demo, step, text) => demo.caption({ value: `Step ${step} — ${text}`, subtitle: SUBTITLE });

const count = (page) => page.locator(MESSAGE).count();

export const steps = [
  {
    name: 'Prep (off camera): load the story until the file is decoded',
    setup: true,
    run: async ({ demo, page }) => {
      await demo.goto({});
      await page.locator(PLAY).waitFor({ timeout: 60_000 });
      await page.waitForTimeout(500);
      await demo.cut();
    },
  },
  {
    name: 'Play the file',
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Transcription', subtitle: 'An audio file, transcribed as it plays' });
      await caption(demo, 1, 'Click Play');
      await demo.click({ selector: PLAY, label: 'Play' });
      await page.locator(PAUSE).waitFor({ timeout: 5_000 });
      await page.locator(MESSAGE).first().waitFor({ timeout: 15_000 });
    },
  },
  {
    name: 'Read the transcript',
    run: async ({ demo, page }) => {
      await caption(demo, 2, 'Each committed block appends as a message, in order');
      const start = await count(page);
      // Several more blocks, one per scripted interval.
      for (let waited = 0; waited < 30_000 && (await count(page)) < start + 4; waited += 500) {
        await page.waitForTimeout(500);
      }
      if ((await count(page)) < start + 4) {
        throw new Error(`transcript stopped at ${await count(page)} messages`);
      }
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Pause',
    run: async ({ demo, page }) => {
      await caption(demo, 3, 'Click Pause: nothing more is appended');
      await demo.click({ selector: PAUSE, label: 'Pause' });
      // The block in flight may still land; after that, the list holds still.
      await page.waitForTimeout(2_000);
      const paused = await count(page);
      await page.waitForTimeout(3_000);
      if ((await count(page)) !== paused) {
        throw new Error('messages kept appending after Pause');
      }
      await demo.clearCaption();
    },
  },
];
