//
// Copyright 2026 DXOS.org
//

/**
 * The Transcription story's `Live` variant plays an audio file and RealtimeKit transcribes it as it plays: the file's
 * track streams through the identity's one-person meeting on the preview EDGE, and each sentence RealtimeKit returns
 * appends as a message.
 *
 * @title Transcribe an audio file live
 * @mdl packages/plugins/plugin-transcription/PLUGIN.mdl test QA-4
 * @app storybook-react, narrowed to plugin-transcription, on :9009, against the preview EDGE
 *
 *   DX_STORIES=plugins/plugin-transcription VITE_DX_DISABLE_ANIMATIONS=true moon run storybook-react:serve
 *   node .agents/skills/autocue/scripts/driver.mjs --port 7333 --out /tmp/demo \
 *     --url 'http://localhost:9009/iframe.html?id=plugins-plugin-transcription-stories-transcription--live&viewMode=story' \
 *     --chromium-args --autoplay-policy=no-user-gesture-required,--force-webrtc-ip-handling-policy=disable_non_proxied_udp
 *
 * Setup binds the story's new identity to a test account, because calls-service serves only identities with an
 * account; preview's Hub accepts a `test+*@dxos.org` email in place of an invitation code. The WebRTC flag sends media over
 * TCP through the proxy, for a sandbox with no UDP egress.
 */

const SUBTITLE = 'from plugin-transcription/PLUGIN.mdl QA-4';
const HUB = 'https://preview.dxos.network/hub/';
const PLAY = 'button[aria-label="Play"]:not([disabled])';
const PAUSE = 'button[aria-label="Pause"]';
/** One rendered message per sentence; the byline names the sender. */
const MESSAGE = ':text-is("You")';

/** A beat for the viewer after a visible change. */
const BEAT = 1_500;

const caption = (demo, step, text) => demo.caption({ value: `Step ${step} — ${text}`, subtitle: SUBTITLE });

const count = (page) => page.locator(MESSAGE).count();

/** Binds the page's identity to a test account, so the calls-service proxy accepts it. */
const bindAccount = async (page) => {
  const handle = await page.waitForFunction(() => globalThis.__DXOS__?.client?.halo.identity.get()?.did, null, {
    timeout: 60_000,
  });
  const identityDid = await handle.jsonValue();
  const response = await fetch(new URL('account/invitation-code/redeem', HUB), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `test+transcription-${Date.now()}@dxos.org`, identityDid }),
  });
  if (!response.ok) {
    throw new Error(`binding ${identityDid} to a test account failed: ${response.status}`);
  }
};

export const steps = [
  {
    name: 'Prep (off camera): load the story and bind its identity to an account',
    setup: true,
    run: async ({ demo, page }) => {
      await demo.goto({});
      await page.locator(PLAY).waitFor({ timeout: 60_000 });
      await bindAccount(page);
      await page.waitForTimeout(500);
      await demo.cut();
    },
  },
  {
    name: 'Play the file',
    run: async ({ demo, page }) => {
      await demo.title({
        value: 'Live transcription',
        subtitle: 'An audio file, transcribed by RealtimeKit as it plays',
      });
      await caption(demo, 1, 'Click Play: the file streams to RealtimeKit');
      await demo.click({ selector: PLAY, label: 'Play' });
      await page.locator(PAUSE).waitFor({ timeout: 5_000 });
      // RealtimeKit returns a sentence once it is spoken, so the first one takes a sentence's length to arrive.
      await page.locator(MESSAGE).first().waitFor({ timeout: 45_000 });
    },
  },
  {
    name: 'Read the transcript',
    run: async ({ demo, page }) => {
      await caption(demo, 2, 'Each sentence appends as a message, in order');
      const start = await count(page);
      for (let waited = 0; waited < 60_000 && (await count(page)) < start + 4; waited += 500) {
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
      await page.waitForTimeout(6_000);
      const paused = await count(page);
      await page.waitForTimeout(4_000);
      if ((await count(page)) !== paused) {
        throw new Error('messages kept appending after Pause');
      }
      await demo.clearCaption();
    },
  },
];
