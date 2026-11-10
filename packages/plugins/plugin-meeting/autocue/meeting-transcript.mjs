//
// Copyright 2026 DXOS.org
//

/**
 * A meeting's transcript with no call: a scripted source writes through the same TranscriptSink a call writes through,
 * and the meeting's Transcript tab renders each line under its speaker. Runs offline, with no EDGE.
 *
 * @title Fill a meeting's transcript
 * @mdl packages/plugins/plugin-meeting/PLUGIN.mdl test QA-3
 * @app storybook-react, narrowed to plugin-meeting, on :9009
 *
 *   DX_STORIES=plugins/plugin-meeting VITE_DX_DISABLE_ANIMATIONS=true moon run storybook-react:serve
 *   node .agents/skills/autocue/scripts/driver.mjs --port 7333 --out /tmp/demo \
 *     --url 'http://localhost:9009/iframe.html?id=plugins-plugin-meeting-stories-meetingtranscript--default&viewMode=story'
 */

const SUBTITLE = 'from plugin-meeting/PLUGIN.mdl QA-3';
const TRANSCRIPT_TAB = 'button[aria-label="Transcript"]';
const PLAY = 'button:has-text("Play script")';
const PAUSE = 'button:has-text("Pause script")';
const LINES = [
  'So I think we should ship the Munich release on Friday.',
  "Let's confirm the plan with the design team first.",
  'Agreed. We can review it together tomorrow morning.',
  "I'll send the agenda tonight.",
];

/** A beat for the viewer after a visible change. */
const BEAT = 1_500;

const caption = (demo, step, text) => demo.caption({ value: `Step ${step} — ${text}`, subtitle: SUBTITLE });

const shown = (page, text) => page.getByText(text, { exact: false });

export const steps = [
  {
    name: 'Prep (off camera): load the story until the meeting renders',
    setup: true,
    run: async ({ demo, page }) => {
      await demo.goto({});
      await page.locator(PLAY).waitFor({ timeout: 60_000 });
      await page.locator(TRANSCRIPT_TAB).first().waitFor({ timeout: 60_000 });
      await page.waitForTimeout(500);
      await demo.cut();
    },
  },
  {
    name: 'Open the transcript',
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Meeting transcript', subtitle: 'Written through the same sink a call uses' });
      await caption(demo, 1, "Open the meeting's Transcript tab");
      await demo.click({ selector: TRANSCRIPT_TAB, label: 'Transcript' });
      await demo.sleep({ ms: BEAT });
      if ((await shown(page, LINES[0]).count()) > 0) {
        throw new Error('the transcript was not empty');
      }
    },
  },
  {
    name: 'Play the script',
    run: async ({ demo, page }) => {
      await caption(demo, 2, 'Click Play script: Anna and Ben take turns, a line every 1.5 s');
      await demo.click({ selector: PLAY, label: 'Play script' });
      // Any order: a fresh feed hides its first append, which shows again when the script repeats (QA-3's note).
      await Promise.all(LINES.map((line) => shown(page, line).first().waitFor({ timeout: 20_000 })));
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Pause the script',
    run: async ({ demo, page }) => {
      await caption(demo, 3, 'Click Pause script: no further line appears');
      await demo.click({ selector: PAUSE, label: 'Pause script' });
      const paused = await shown(page, LINES[0]).count();
      await page.waitForTimeout(4_000);
      if ((await shown(page, LINES[0]).count()) !== paused) {
        throw new Error('lines kept appending after Pause script');
      }
      await demo.clearCaption();
    },
  },
];
