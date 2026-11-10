//
// Copyright 2026 DXOS.org
//

/**
 * A live call fills a meeting's transcript: the CallTranscription story joins a RealtimeKit meeting on the dev EDGE,
 * turns transcription on, and each segment RealtimeKit transcribes from the speaker's microphone lands in the
 * meeting's Transcript tab.
 *
 * @title Transcribe a live call into its meeting
 * @mdl packages/plugins/plugin-meeting/PLUGIN.mdl test QA-4
 * @app storybook-react, narrowed to plugin-meeting, on :9009, against the dev EDGE
 *
 *   DX_STORIES=plugins/plugin-meeting VITE_DX_DISABLE_ANIMATIONS=true moon run storybook-react:serve
 *   MEETING_TRACK=$PWD/temp/meeting-live/speaker.webm node .agents/skills/autocue/scripts/driver.mjs --port 7333 \
 *     --out /tmp/demo \
 *     --url 'http://localhost:9009/iframe.html?id=plugins-plugin-meeting-stories-calltranscription--default&viewMode=story' \
 *     --chromium-args --autoplay-policy=no-user-gesture-required,--force-webrtc-ip-handling-policy=disable_non_proxied_udp
 *
 * The microphone is `fake-media.mjs` playing `MEETING_TRACK`, a VP8/VP9 + Opus WebM that opens on 3 s of silence. The
 * take used the Transcription story's hosted London clip:
 *
 *   curl -sS -o london.m4a https://media.dxos.network/audio-london.m4a
 *   ffmpeg -f lavfi -i color=c=0x1f2937:s=1280x720:r=25 -f lavfi -t 3 -i anullsrc=r=48000:cl=mono -i london.m4a \
 *     -filter_complex "[2:a]aresample=48000,aformat=channel_layouts=mono[s];[1:a][s]concat=n=2:v=0:a=1[a]" \
 *     -map 0:v -map "[a]" -t 75 -c:v libvpx -b:v 150k -c:a libopus -b:a 64k speaker.webm
 *
 * Setup binds the story's new identity to a dev test account, because calls-service serves only identities with an
 * account; dev Hub accepts a `test+*@dxos.org` email in place of an invitation code. The WebRTC flag sends media over
 * TCP through the proxy, for a sandbox with no UDP egress.
 */

import { installFakeMedia } from '../../../../.agents/skills/autocue/scripts/fake-media.mjs';

const SUBTITLE = 'from plugin-meeting/PLUGIN.mdl QA-4';
const TRACK = process.env.MEETING_TRACK ?? 'temp/meeting-live/speaker.webm';
const LEAD_IN = 3;
const SPEAKER = 'Alice';
const HUB = 'https://dev.dxos.network/hub/';
const START_CALL = 'button:has-text("Start call"):not([disabled])';
const LEAVE_CALL = 'button:has-text("Leave call")';
const UNMUTE = 'button[aria-label="Unmute"]';
/** The story toolbar's toggle carries its label as text; the call toolbar's twin is icon-only. */
const START_TRANSCRIPTION = 'button:has-text("Start transcription")';
const STOP_TRANSCRIPTION = 'button:has-text("Stop transcription")';
const TRANSCRIPT_TAB = 'button[aria-label="Transcript"]';
/** Each transcript row starts with its offset into the meeting. */
const ROW_TIME = /^\d\d:\d\d:\d\d$/;

/** A beat for the viewer after a visible change. */
const BEAT = 1_500;

const caption = (demo, step, text) => demo.caption({ value: `Step ${step} — ${text}`, subtitle: SUBTITLE });

const rows = (page) => page.getByText(ROW_TIME).count();

/** Binds the page's identity to a dev test account, so the calls-service proxy accepts it. */
const bindAccount = async (page) => {
  const handle = await page.waitForFunction(() => globalThis.__DXOS__?.client?.halo.identity.get()?.did, null, {
    timeout: 60_000,
  });
  const identityDid = await handle.jsonValue();
  const response = await fetch(new URL('account/invitation-code/redeem', HUB), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `test+meeting-${Date.now()}@dxos.org`, identityDid }),
  });
  if (!response.ok) {
    throw new Error(`binding ${identityDid} to a test account failed: ${response.status}`);
  }
};

export const steps = [
  {
    name: 'Prep (off camera): fake microphone, the story, an account and a name for its identity',
    setup: true,
    run: async ({ demo, page }) => {
      // Init scripts apply from the next navigation, so install the microphone before loading the story.
      await installFakeMedia(page.context(), { file: TRACK, name: 'speaker', leadIn: LEAD_IN });
      await demo.goto({});
      await page.locator(START_CALL).waitFor({ timeout: 120_000 });
      await bindAccount(page);
      await page.evaluate((displayName) => globalThis.__DXOS__.client.halo.updateProfile({ displayName }), SPEAKER);
      await page.waitForTimeout(500);
      await demo.cut();
    },
  },
  {
    name: 'Start the call',
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Live meeting transcript', subtitle: 'A call transcribed by RealtimeKit' });
      await caption(demo, 1, 'Click Start call: join a RealtimeKit meeting');
      await demo.click({ selector: START_CALL, label: 'Start call' });
      await page.locator(LEAVE_CALL).waitFor({ timeout: 60_000 });
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Unmute',
    run: async ({ demo }) => {
      await caption(demo, 2, "Click Unmute in the call's toolbar");
      await demo.click({ selector: UNMUTE, label: 'Unmute' });
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Start transcription',
    run: async ({ demo, page }) => {
      await caption(demo, 3, 'Click Start transcription, then open Transcript');
      await demo.click({ selector: START_TRANSCRIPTION, label: 'Start transcription' });
      await page.locator(STOP_TRANSCRIPTION).waitFor({ timeout: 10_000 });
      await demo.click({ selector: TRANSCRIPT_TAB, label: 'Transcript' });
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Read the transcript',
    run: async ({ demo, page }) => {
      await caption(demo, 4, `${SPEAKER} speaks: her words land in the meeting`);
      await page.evaluate(() => globalThis.__fakeMedia.start());
      for (let waited = 0; waited < 60_000 && (await rows(page)) < 5; waited += 500) {
        await page.waitForTimeout(500);
      }
      if ((await rows(page)) < 5) {
        throw new Error(`transcript stopped at ${await rows(page)} rows`);
      }
      await demo.sleep({ ms: 3 * BEAT });
      await demo.clearCaption();
    },
  },
];
