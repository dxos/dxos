//
// Copyright 2026 DXOS.org
//

/**
 * The SimulatedCall story plays plugin-meeting's Fieldstone conversation: four tiles, each line captioned as it is
 * spoken, the speaking outline on whoever talks.
 *
 * @app storybook-react via `moon run storybook-react:serve` on :9009
 *
 * Make the tracks first (see `plugin-meeting/autocue/four-person-call.mjs`), then record:
 *
 *   MEETING_TRACKS=/tmp/meeting/tracks node .agents/skills/autocue/scripts/driver.mjs --out /tmp/meeting/story --theme light --captions off \
 *     --url 'http://localhost:9009/iframe.html?id=plugins-plugin-calls-components-simulatedcall--default&viewMode=story' \
 *     --chromium-args --autoplay-policy=no-user-gesture-required
 *
 * The recording has no sound; lay `<tracks>/conversation.wav` under it as `four-person-call.mjs` describes.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

const TRACKS = process.env.MEETING_TRACKS ?? '/tmp/meeting/tracks';
const CONVERSATION = JSON.parse(
  readFileSync(new URL('../../plugin-meeting/autocue/fieldstone-dashboard.conversation.json', import.meta.url), 'utf8'),
);
const TIMELINE = JSON.parse(readFileSync(path.join(TRACKS, 'timeline.json'), 'utf8'));

/** `release` lets the held track requests through; `startedAt` is when the tracks started playing (wall clock). */
const state = {};

export const steps = [
  {
    name: 'Prep (off camera): load the story with its tracks held back',
    setup: true,
    run: async ({ demo, page }) => {
      // The story joins once its tracks load, so holding them keeps the conversation for the take.
      const released = new Promise((resolve) => {
        state.release = resolve;
      });
      // The tracks, the screen recordings and the timeline that names them.
      await page.context().route(/\/simulated-call\/[^/]+\.(webm|json)$/, async (route) => {
        await released;
        const file = path.join(TRACKS, path.basename(new URL(route.request().url()).pathname));
        return route.fulfill({
          status: 200,
          body: readFileSync(file),
          headers: {
            'content-type': file.endsWith('.json') ? 'application/json' : 'video/webm',
            'accept-ranges': 'none',
          },
        });
      });
      await demo.goto({});
    },
  },
  {
    name: 'Join the call',
    run: async ({ demo, page }) => {
      state.release();
      for (const participant of Object.values(CONVERSATION.participants)) {
        await page.getByText(participant.name, { exact: true }).first().waitFor({ timeout: 30_000 });
      }
      // Every track starts on join; the furthest-along player is the conversation's clock.
      const played = await page.waitForFunction(
        () => {
          const times = [...document.querySelectorAll('video')].map((video) => video.currentTime);
          const latest = Math.max(0, ...times);
          return latest > 0 && latest;
        },
        undefined,
        { timeout: 30_000, polling: 100 },
      );
      state.startedAt = Date.now() - (await played.jsonValue()) * 1_000;
      await demo.caption({ value: 'Alien Labs scopes the Cairn dashboard plugin', subtitle: 'SimulatedCall' });
    },
  },
  {
    name: 'The conversation runs',
    run: async ({ demo, page }) => {
      for (const line of TIMELINE.lines) {
        const wait = state.startedAt + line.start * 1_000 - Date.now();
        if (wait > 0) {
          await page.waitForTimeout(wait);
        }
        await demo.caption({ value: line.text, subtitle: CONVERSATION.participants[line.speaker].name });
      }
      const wait = state.startedAt + (TIMELINE.lines.at(-1).end + 1) * 1_000 - Date.now();
      if (wait > 0) {
        await page.waitForTimeout(wait);
      }
      await demo.clearCaption();
    },
  },
];
