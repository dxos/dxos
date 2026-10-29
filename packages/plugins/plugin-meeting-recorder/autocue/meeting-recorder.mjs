//
// Copyright 2026 DXOS.org
//

/**
 * Granola-style meeting notes: a Zoom call takes the microphone, Composer offers to take notes, the
 * meeting is transcribed live into a Meeting object, and when the call ends it is saved and summarized.
 *
 * @mdl packages/plugins/plugin-meeting-recorder/PLUGIN.mdl test QA-1
 * @app composer-app via `moon run composer-app:serve -- --port 4173` (vite dev, EDGE preview for
 *   transcription and the summary model)
 *
 * The browser cannot observe other apps, so the "Zoom took the microphone" and "Zoom released it" events
 * are invoked as `HandleDetection` - the operation the desktop app's native listener invokes for the same
 * change. Speech comes from a voice file played through Chromium's fake microphone:
 *
 *   node .agents/skills/autocue/scripts/driver.mjs --url http://localhost:4173 --out /tmp/demo \
 *     --chromium-args --use-fake-device-for-media-stream,--use-fake-ui-for-media-stream,--use-file-for-fake-audio-capture=/tmp/demo/standup.wav
 *
 * `standup.wav` is synthesized speech with pauses between sentences (16-bit mono), e.g. with ffmpeg's
 * `flite` source; the file loops, so it ends in ten seconds of silence.
 */

const RECORDER = 'org.dxos.plugin.meetingRecorder';
const MEETING = 'org.dxos.plugin.meeting';
const ZOOM = { id: 'us.zoom.xos', name: 'zoom.us' };
const HUB_URL = 'https://preview.dxos.network/hub/';

/** A beat for the viewer after a visible change. */
const BEAT = 1_200;

const NOTE = 'Agenda: desktop launch status';

/** Waits for `predicate` to hold in the page, polling. */
const waitForPage = (page, predicate, arg, timeout = 60_000) =>
  page.waitForFunction(predicate, arg, { timeout, polling: 500 });

/** Text of the meeting plank's article (transcript and summary render there). */
const PLANK = '[data-testid="deck.plank"]';

export const steps = [
  {
    name: 'Prep (off camera): dismiss notices and enable Meetings and Meeting Recorder',
    setup: true,
    done: ({ page }) =>
      page.evaluate(
        ([recorder, meeting]) =>
          composer.plugins().filter((plugin) => [recorder, meeting].includes(plugin.id) && plugin.enabled).length === 2,
        [RECORDER, MEETING],
      ),
    run: async ({ demo, page }) => {
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
        // The notice slides in; a click that loses that race leaves it open, which costs the take nothing.
        await notice
          .first()
          .click({ timeout: 10_000 })
          .catch(() => {});
      }

      // A fresh identity has no name, and the transcript's bylines would read as a DID.
      await demo.invoke({ key: 'org.dxos.operation.client.updateProfile', input: { displayName: 'Alex' }, hud: false });

      // EDGE's AI service (the summary) serves only identities bound to a hub account; `test+...@dxos.org`
      // addresses skip the access-code gate on non-production hubs, as the composer e2e suite does.
      const identity = await page.evaluate(() => {
        const current = globalThis.dxos.client.halo.identity.get();
        const hex = Array.from(current.identityKey.data, (byte) => byte.toString(16).padStart(2, '0')).join('');
        return { identityDid: current.did, identityKey: hex };
      });
      const { execFileSync } = await import('node:child_process');
      // curl, not fetch: it honours the sandbox's HTTPS proxy.
      // Not `-f`: a re-run binds an identity that already has an account, which the hub refuses.
      execFileSync('curl', [
        '-sS',
        '-X',
        'POST',
        '-H',
        'content-type: application/json',
        '-d',
        JSON.stringify({ ...identity, email: `test+qa-meeting-recorder-${Date.now()}@dxos.org` }),
        `${HUB_URL}account/invitation-code/redeem`,
      ]);
      // The client caches its EDGE credential from before the binding.
      await page.reload({ timeout: 120_000 });
      await page.locator('[data-testid="deck.plank"]').first().waitFor({ state: 'visible', timeout: 180_000 });

      // EDGE takes a few minutes to serve a newly bound identity, and a summary started before then never
      // finishes; warm the model up off camera until it answers.
      const spaceId = await page.evaluate(() => location.pathname.split('/')[2]);
      for (let attempt = 0; ; attempt++) {
        const answered = await page
          .evaluate(
            ([spaceId]) =>
              Promise.race([
                composer
                  .invoke('org.dxos.operation.transcription.summarize', { transcript: 'Alex: Hello.' }, { spaceId })
                  .then(() => true),
                new Promise((resolve) => setTimeout(() => resolve(false), 45_000)),
              ]),
            [spaceId],
          )
          .catch(() => false);
        if (answered) {
          // EDGE can refuse a newly bound identity's later model calls within one page load; start the
          // take on a fresh load so the meeting's summary is its first.
          await page.reload({ timeout: 120_000 });
          await page.locator('[data-testid="deck.plank"]').first().waitFor({ state: 'visible', timeout: 180_000 });
          break;
        }
        if (attempt >= 4) {
          // The take still shows detection and transcription; step 6 copes with a silent model.
          break;
        }
        await page.reload({ timeout: 120_000 });
        await page.locator('[data-testid="deck.plank"]').first().waitFor({ state: 'visible', timeout: 180_000 });
      }

      for (const name of ['Meetings', 'Meeting Recorder']) {
        await demo.click({ selector: '[data-testid="treeView.pluginRegistry"]', hud: false });
        await page.locator('input[placeholder="Filter..."]').first().waitFor({ state: 'visible', timeout: 30_000 });
        await demo.fill({ selector: 'input[placeholder="Filter..."]', value: name, hud: false });
        const toggle = page.locator(`input[role="switch"][aria-label="${name}"]`).first();
        await toggle.waitFor({ state: 'attached', timeout: 10_000 });
        // The input is visually hidden behind its styled track, so toggle it in the page.
        await toggle.evaluate((input) => {
          if (!input.checked) {
            input.click();
          }
        });
      }
      await waitForPage(
        page,
        ([recorder, meeting]) =>
          composer.plugins().filter((plugin) => [recorder, meeting].includes(plugin.id) && plugin.enabled).length === 2,
        [RECORDER, MEETING],
      );

      await demo.click({ selector: '[data-testid="spacePlugin.space"] >> nth=0', hud: false });
      // The navtree swaps back from the plugin list with a transition; wait it out rather than racing it.
      await page.locator('[data-testid="spacePlugin.spaceHome"]').first().click({ timeout: 15_000 });
      await page.locator('[data-testid="meetingRecorder.record"]').waitFor({ state: 'visible', timeout: 30_000 });
      await page.waitForTimeout(2_000);
      await demo.cut();
    },
  },
  {
    name: 'A meeting app takes the microphone',
    narration: 'A Zoom call starts, and Composer notices Zoom took the microphone.',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'A Zoom call starts - the desktop app sees Zoom take the microphone',
        subtitle: 'plugin-meeting-recorder/PLUGIN.mdl · QA-1 step 1',
      });
      await page.waitForTimeout(BEAT);
      await demo.invoke({
        key: 'org.dxos.operation.meetingRecorder.handleDetection',
        input: { type: 'micStarted', apps: [ZOOM] },
      });
      await page.locator('[data-testid="meetingRecorder.takeNotes"]').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Take notes',
    narration: 'One click creates a meeting and starts transcribing.',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'Take notes - a Meeting is created and opened, and transcription starts',
        subtitle: 'QA-1 step 2',
      });
      // The caption banner is pinned over the bottom of the page, where the prompt sits.
      await demo.clearCaption();
      await demo.click({
        selector: '[data-testid="org.dxos.plugin.meetingRecorder.detected"] button:has-text("Take notes")',
        label: 'Take notes',
      });
      await page.locator('[data-testid="meetingRecorder.stop"]').waitFor({ state: 'visible', timeout: 30_000 });
      await page.getByText('Zoom meeting ·').first().waitFor({ state: 'visible', timeout: 30_000 });
      const companion = page.locator('[data-testid="plankHeading.closeCompanion"]');
      if (await companion.isVisible()) {
        await companion.click();
      }
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Write a note while the meeting runs',
    narration: 'Your own notes sit next to the transcript.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Write a note while the meeting runs', subtitle: 'QA-1 step 3' });
      const editor = page.locator(`${PLANK} .cm-content`).first();
      await editor.click();
      await page.keyboard.type(`${NOTE}\n\n`, { delay: 45 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Speak',
    narration: 'Each sentence lands in the transcript as soon as the speaker pauses.',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'Speak - each utterance is transcribed when the speaker pauses',
        subtitle: 'QA-1 step 4 · a voice file plays through the microphone',
      });
      await demo.click({ selector: `${PLANK} button[aria-label="Transcript"]`, label: 'Transcript' });
      // The voice file's last sentence names the release day.
      await waitForPage(page, (plank) => document.querySelector(plank)?.textContent?.includes('Monday'), PLANK, 90_000);
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'The meeting ends',
    narration: 'When Zoom lets go of the microphone, the recording stops and the meeting is saved.',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'The call ends - Zoom releases the microphone and the recording stops',
        subtitle: 'QA-1 step 5',
      });
      await page.waitForTimeout(BEAT);
      await demo.invoke({
        key: 'org.dxos.operation.meetingRecorder.handleDetection',
        input: { type: 'micStopped', apps: [ZOOM] },
      });
      await page.locator('[data-testid="meetingRecorder.record"]').waitFor({ state: 'visible', timeout: 60_000 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Read the summary',
    narration: 'The meeting is saved with its transcript, and summarized from the transcript and your notes.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Read the summary', subtitle: 'QA-1 step 6 · written by the Meeting plugin' });
      await demo.click({ selector: `${PLANK} button[aria-label="Summary"]`, label: 'Summary' });
      const summarized = await waitForPage(
        page,
        (plank) => (document.querySelector(`${plank} .cm-content`)?.textContent?.length ?? 0) > 80,
        PLANK,
        60_000,
      ).then(
        () => true,
        () => false,
      );
      if (!summarized) {
        // EDGE's model endpoint intermittently refuses a fresh test identity (401) and the summary never
        // lands; end on the saved transcript rather than retrying on camera.
        await demo.caption({
          value: 'The meeting is saved with its transcript',
          subtitle: 'QA-1 step 6 · the summary model did not answer this take',
        });
        await demo.click({ selector: `${PLANK} button[aria-label="Transcript"]`, label: 'Transcript' });
      }
      await page.waitForTimeout(BEAT * 6);
    },
  },
];
