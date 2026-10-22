//
// Copyright 2026 DXOS.org
//

/**
 * The SimulatedCall story plays plugin-meeting's Fieldstone conversation: four tiles, each line captioned as it is
 * spoken, the speaking outline on whoever talks.
 *
 * @app storybook-react via `moon run storybook-react:serve` on :9009
 *
 * Make the tracks first (see `plugin-meeting/autocue/README.md`), then record:
 *
 *   MEETING_TRACKS=$PWD/temp/meeting/tracks node .agents/skills/autocue/scripts/driver.mjs --out temp/meeting/story --theme light --captions off \
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
/** `SIMULATED_STAND_IN=<participant id>` records the AgentStandIn story, where the agent takes that participant's seat. */
const STAND_IN = process.env.SIMULATED_STAND_IN;
const nameOf = (id) => (id === STAND_IN ? 'Composer' : CONVERSATION.participants[id].name);

const JOIN = 'button:has-text("Join"):not([disabled])';
/** The pin control on the stand-in's tile, which maximises it in the call. */
// Matched on the tile's own name label (two levels down), since outer containers hold every tile's name.
const PIN_STAND_IN = '.dx-expand.group:has(> div > div:text-is("Composer")) button[aria-label="Pin video"]';
/** The pin control on a screenshare's tile (marked by its broadcast icon), which maximises the shared screen. */
const PIN_SCREENSHARE = '.dx-expand.group:has([data-icon="ph--broadcast--regular"]) button[aria-label="Pin video"]';
/** Seconds the take holds on the maximised stand-in after the conversation ends. */
const FINAL_HOLD = 4_000;

/** `startedAt` is when the tracks started playing (wall clock). */
const state = {};

export const steps = [
  {
    name: 'Prep (off camera): load the story into its lobby',
    setup: true,
    run: async ({ demo, page }) => {
      // The tracks, the screen recordings and the timeline that names them; nothing plays until Join.
      await page.context().route(/\/simulated-call\/[^/]+\.(webm|json)$/, async (route) => {
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
      // The take opens on the lobby once every track has loaded and Join is enabled.
      await page.locator(JOIN).waitFor({ timeout: 60_000 });
      await page.waitForTimeout(500);
      await demo.cut();
    },
  },
  {
    name: 'Join the call',
    run: async ({ demo, page }) => {
      // A beat on the lobby, the local camera's preview and its join toolbar, before joining.
      await page.waitForTimeout(2_000);
      await demo.click({ selector: JOIN, label: 'Join' });
      for (const id of Object.keys(CONVERSATION.participants)) {
        await page.getByText(nameOf(id), { exact: true }).first().waitFor({ timeout: 30_000 });
      }
      // Every track starts on join; the furthest-along file player is the conversation's clock. Stream-backed
      // elements (the lobby's camera preview, the tiles) count time since they were attached, so they are skipped.
      const played = await page.waitForFunction(
        () => {
          const times = [...document.querySelectorAll('video')]
            .filter((video) => video.src)
            .map((video) => video.currentTime);
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
      // With a stand-in, its tile is maximised for its last line, so the take ends on the agent.
      const last = STAND_IN ? TIMELINE.lines.findLastIndex(({ speaker }) => speaker === STAND_IN) : -1;
      // With a stand-in, the shared screen is maximised through the app a beat after it appears.
      const share = STAND_IN ? TIMELINE.screenshares?.[0] : undefined;
      let shared = !share;
      for (const [index, line] of TIMELINE.lines.entries()) {
        const at = state.startedAt + line.start * 1_000 - (index === last ? 1_200 : 0);
        if (!shared && state.startedAt + (share.start + 1.5) * 1_000 < at) {
          await page.waitForTimeout(Math.max(0, state.startedAt + (share.start + 1.5) * 1_000 - Date.now()));
          await demo.click({ selector: PIN_SCREENSHARE, label: 'Expand the shared screen' });
          await page.mouse.move(10, 10);
          shared = true;
        }
        const wait = at - Date.now();
        if (wait > 0) {
          await page.waitForTimeout(wait);
        }
        if (index === last) {
          await demo.click({ selector: PIN_STAND_IN, label: 'Pin Composer' });
          await page.mouse.move(10, 10);
        }
        await demo.caption({ value: line.text, subtitle: nameOf(line.speaker) });
      }
      const wait = state.startedAt + (TIMELINE.lines.at(-1).end + 1) * 1_000 - Date.now();
      if (wait > 0) {
        await page.waitForTimeout(wait);
      }
      await demo.clearCaption();
      if (STAND_IN) {
        await page.waitForTimeout(FINAL_HOLD);
      }
    },
  },
];
