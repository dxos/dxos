//
// Copyright 2026 DXOS.org
//

/**
 * Alice and Bob, each with their own identity, meet in one Meeting's call: both join, each sees and hears the other
 * over Cloudflare RealtimeKit, they talk, and RealtimeKit's transcript fills in beside the call. Recorded side by side.
 *
 * @mdl packages/plugins/plugin-meeting/PLUGIN.mdl test QA-3
 * @app composer-app bundle against an EDGE that serves `/calls/rooms/join` (dxos/edge#1387), served on 127.0.0.1:4173:
 *   `DX_ENVIRONMENT=dev DX_EDGE_BASE_URL=https://dev.dxos.network DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:bundle`,
 *   then `pnpm exec vite preview --configLoader native --host 127.0.0.1 --port 4173 --strictPort` in packages/apps/composer-app
 *
 * A flow for `pair.mjs`. Each person's camera and microphone play their own track (`fake-media.mjs`), made by
 * `two-peer-tracks.py`; `MEETING_TRACKS` names the directory. From the repo root:
 *
 *   uv run packages/plugins/plugin-meeting/autocue/two-peer-tracks.py --out temp/two-peer
 *   MEETING_TRACKS=temp/two-peer node .agents/skills/autocue/scripts/pair.mjs \
 *     --flow packages/plugins/plugin-meeting/autocue/two-peer-meeting.mjs --out temp/two-peer/take \
 *     --chromium-args --autoplay-policy=no-user-gesture-required,--force-webrtc-ip-handling-policy=disable_non_proxied_udp
 *
 * The WebRTC policy flag sends media over TCP through the proxy, for a sandbox with no UDP egress; RealtimeKit then
 * relays through TURN over TLS on 443.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { installFakeMedia } from '../../../../.agents/skills/autocue/scripts/fake-media.mjs';

const TRACKS = path.resolve(process.env.MEETING_TRACKS ?? 'temp/two-peer');
const TIMELINE = JSON.parse(readFileSync(path.join(TRACKS, 'timeline.json'), 'utf8'));

const SPACE = 'Launch sync';
const MEETING = 'Meetings plugin launch';
const CALLS = 'org.dxos.plugin.calls';
const MEETINGS = 'org.dxos.plugin.meeting';
const PLANK = '[data-testid="deck.plank"]';
const COMPANION = '[data-testid="deck.companion"]';
const SUBTITLE = 'plugin-meeting/PLUGIN.mdl · QA-3';
const TIMEOUT = 60_000;
/** A beat for the viewer after a visible change. */
const BEAT = 1_500;

/** The meeting's space and id, recorded by setup for the later steps. */
const state = {};

/** Gives each person their own camera and microphone, playing their track. */
export const preparePeer = async ({ name, context }) => {
  const id = name.toLowerCase();
  await installFakeMedia(context, { file: path.join(TRACKS, `${id}.webm`), name: id, leadIn: TIMELINE.leadIn });
};

const waitFor = async (predicate, { timeout = TIMEOUT, what }) => {
  const deadline = Date.now() + timeout;
  while (!(await predicate())) {
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for ${what}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
};

const currentWorkspace = (page) => page.getByTestId('navtree.workspace.visible');

/** Expands a navtree row unless it is already open; a row with no children yet keeps its caret disabled. */
const expandRow = async (peer, row) => {
  const toggle = row.locator('[data-part="branch-trigger"]').first();
  await toggle.waitFor({ state: 'attached', timeout: TIMEOUT });
  if ((await toggle.getAttribute('data-state')) === 'open') {
    return;
  }
  await row.hover();
  await waitFor(() => toggle.isEnabled(), { what: 'the row to become expandable' });
  await peer.click(toggle);
};

/** First-run chrome that would cover the content: the privacy notice and any open companion. */
const clearChrome = async ({ page }) => {
  const notice = page.getByTestId('org.dxos.plugin.observability.notice');
  if (await notice.isVisible().catch(() => false)) {
    await notice.getByTestId('toast.close').click();
  }
  const closeCompanion = page.getByTestId('plankHeading.closeCompanion').filter({ visible: true });
  for (let attempt = 0; attempt < 10 && (await closeCompanion.count()) > 0; attempt++) {
    await closeCompanion
      .first()
      .click({ timeout: 2_000 })
      .catch(() => {});
  }
  const sidebar = page.locator('[data-scope="main"][data-part="complementary-sidebar"]');
  if ((await sidebar.getAttribute('data-state').catch(() => null)) === 'expanded') {
    await sidebar.getByTestId('deck.toggleComplementarySidebar').click();
  }
};

/** Names shown on the tiles of a peer's call grid. */
const tileNames = (page) =>
  page.evaluate(
    (plank) =>
      [...document.querySelectorAll(`${plank} .dx-expand`)]
        .map((tile) => tile.textContent?.trim() ?? '')
        .filter(Boolean),
    PLANK,
  );

/** True once a tile showing `name` plays video with real frames. */
const playsVideoOf = (page, name) =>
  page.evaluate(
    ([plank, name]) =>
      [...document.querySelectorAll(`${plank} .dx-expand`)].some(
        (tile) =>
          tile.textContent?.includes(name) && [...tile.querySelectorAll('video')].some((video) => video.videoWidth > 0),
      ),
    [PLANK, name],
  );

export const steps = [
  {
    name: 'Both people boot with their own identity, named Alice and Bob',
    setup: true,
    run: async ({ peers }) => {
      await peers.alice.page.waitForTimeout(3_000);
      for (const [id, peer] of Object.entries(peers)) {
        await clearChrome(peer);
        await peer.page.evaluate(
          (ids) => composer.invoke('org.dxos.operation.registry.enablePlugins', { ids }),
          [CALLS, MEETINGS],
        );
        await peer.page.waitForFunction(
          (ids) =>
            composer.plugins().filter((plugin) => ids.includes(plugin.id) && plugin.enabled).length === ids.length,
          [CALLS, MEETINGS],
          { timeout: TIMEOUT },
        );
        await peer.page.evaluate(
          (displayName) => composer.invoke('org.dxos.operation.client.updateProfile', { displayName }),
          peer.name,
        );
      }
      const keys = await Promise.all(
        Object.values(peers).map(({ page }) =>
          page.evaluate(() => String(globalThis.dxos?.client?.halo.identity.get()?.identityKey ?? '')),
        ),
      );
      if (!keys[0] || keys[0] === keys[1]) {
        throw new Error(`expected two distinct identities, got ${keys.join(' / ')}`);
      }
    },
  },
  {
    name: `Alice creates "${SPACE}" and invites Bob`,
    setup: true,
    run: async ({ peers: { alice, bob } }) => {
      const { page } = alice;
      await alice.click(page.getByTestId('spacePlugin.addSpace'));
      await alice.click(page.getByTestId('spacePlugin.createSpace'));
      const save = page.getByTestId('create-space-dialog').getByTestId('save-button');
      await waitFor(() => save.isEnabled(), { what: 'the create-space form' });
      await alice.click(page.getByTestId('create-space-form').getByTestId('name'));
      await alice.type(SPACE, { delay: 5 });
      await alice.click(save);
      await page.getByTestId('create-space-form').waitFor({ state: 'detached', timeout: TIMEOUT });
      await page.getByText(SPACE).first().waitFor({ timeout: TIMEOUT });

      await expandRow(alice, currentWorkspace(page).getByTestId('spacePlugin.settings').first());
      await alice.click(
        currentWorkspace(page).getByTestId('spacePlugin.members').first().getByTestId('treeItem.heading').first(),
      );
      const invitationCode = alice.nextConsoleValue('invitationCode');
      const authCode = alice.nextConsoleValue('authCode');
      await alice.click(page.getByTestId('membersContainer.createInvitation.more'));
      await alice.click(page.getByTestId('membersContainer.inviteOne'));
      await alice.click(page.getByTestId('membersContainer.createInvitation'));

      await bob.click(bob.page.getByTestId('spacePlugin.addSpace'));
      await bob.click(bob.page.getByTestId('spacePlugin.joinSpace'));
      const input = bob.page.getByTestId('space-invitation-input');
      await bob.click(input);
      await input.fill(await invitationCode);
      await bob.page.keyboard.press('Enter');
      const pin = bob.page.locator("[data-testid='space-auth-code-input']:visible");
      await pin.waitFor({ timeout: TIMEOUT });
      await bob.click(pin.locator('input').first());
      await bob.type(await authCode, { delay: 20 });
      await bob.click(bob.page.getByTestId('space-invitation-authenticator-next'));

      state.spaceId = await page.evaluate(
        (name) =>
          dxos.client.spaces
            .get()
            .filter((space) => space.properties?.name === name)
            .at(-1)?.id,
        SPACE,
      );
      await waitFor(() => bob.page.evaluate((spaceId) => !!dxos.client.spaces.get(spaceId), state.spaceId), {
        what: "Bob to join Alice's space",
      });
    },
  },
  {
    name: `Alice creates the "${MEETING}" meeting; both open it`,
    setup: true,
    run: async ({ peers }) => {
      const { alice, bob } = peers;
      state.meetingId = await alice.page.evaluate(
        async ([spaceId, name]) => {
          const db = dxos.client.spaces.get(spaceId).db;
          const { object } = await composer.invoke('org.dxos.operation.meeting.create', { name, db }, { spaceId });
          return object.id;
        },
        [state.spaceId, MEETING],
      );
      await waitFor(
        () =>
          bob.page.evaluate(
            async ([spaceId, meetingId]) => {
              const space = dxos.client.spaces.get(spaceId);
              await space?.waitUntilReady?.();
              return !!(await space?.db
                .query(dxos.Filter.id(meetingId))
                .first()
                .catch(() => undefined));
            },
            [state.spaceId, state.meetingId],
          ),
        { what: 'the meeting to reach Bob', timeout: 120_000 },
      );
      for (const peer of [alice, bob]) {
        await peer.page.evaluate(
          (spaceId) => composer.invoke('org.dxos.operation.appToolkit.switchWorkspace', { subject: `root/${spaceId}` }),
          state.spaceId,
        );
        await peer.page.evaluate(
          ([spaceId, meetingId]) =>
            composer.invoke('org.dxos.operation.appToolkit.open', {
              subject: [`root/${spaceId}/system/database/org.dxos.type.meeting/${meetingId}`],
            }),
          [state.spaceId, state.meetingId],
        );
        await peer.page
          .locator(`${PLANK} button[aria-label="Call"]`)
          .first()
          .waitFor({ state: 'visible', timeout: TIMEOUT });
        await clearChrome(peer);
        // The active meeting is the one whose transcript the call writes.
        await peer.page.evaluate(
          async ([spaceId, meetingId]) => {
            const object = await dxos.client.spaces.get(spaceId).db.query(dxos.Filter.id(meetingId)).first();
            await composer.invoke('org.dxos.operation.meeting.setActive', { object });
          },
          [state.spaceId, state.meetingId],
        );
      }
      await alice.page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Alice and Bob open the call, turn their cameras on and unmute',
    subtitle: `${SUBTITLE} · step 1`,
    run: async ({ peers }) => {
      for (const peer of [peers.alice, peers.bob]) {
        await peer.click(`${PLANK} button[aria-label="Call"]`);
        await peer.click(`${PLANK} button[aria-label="Turn camera on"]`);
        await peer.click(`${PLANK} button[aria-label="Unmute"]`);
      }
    },
  },
  {
    name: 'Alice joins the call',
    subtitle: `${SUBTITLE} · step 2`,
    run: async ({ peers: { alice } }) => {
      await alice.click(`${PLANK} button:has-text("Join")`);
      await alice.page.locator(`${PLANK} button:has-text("Leave")`).first().waitFor({ timeout: TIMEOUT });
    },
  },
  {
    name: 'Bob joins; each sees and hears the other',
    subtitle: `${SUBTITLE} · step 3`,
    run: async ({ peers: { alice, bob } }) => {
      await bob.click(`${PLANK} button:has-text("Join")`);
      await bob.page.locator(`${PLANK} button:has-text("Leave")`).first().waitFor({ timeout: TIMEOUT });
      await waitFor(async () => (await playsVideoOf(alice.page, 'Bob')) && (await playsVideoOf(bob.page, 'Alice')), {
        what: `each to play the other's video (Alice sees ${await tileNames(alice.page)}; Bob sees ${await tileNames(bob.page)})`,
        timeout: 90_000,
      });
    },
  },
  {
    name: 'Alice starts transcription and opens the transcript',
    subtitle: `${SUBTITLE} · step 4`,
    run: async ({ peers: { alice, bob } }) => {
      await alice.click(alice.page.getByRole('button', { name: 'Start transcription' }).first());
      for (const peer of [alice, bob]) {
        const transcript = peer.page.locator(`${COMPANION} button[aria-label="Transcript"]`).first();
        if (!(await transcript.isVisible().catch(() => false))) {
          await peer.click('button[aria-label="Open companion side-by-side"]');
          await peer.click('[data-testid="deck.companion.tab.meeting"]');
        }
        await peer.click(transcript);
      }
    },
  },
  {
    name: 'They talk; the transcript fills in on both screens',
    subtitle: `${SUBTITLE} · step 5`,
    run: async ({ peers, caption }) => {
      // Both tracks start on one cue, so each person's lines land where the other expects them.
      await Promise.all(Object.values(peers).map(({ page }) => page.evaluate(() => globalThis.__fakeMedia.start())));
      const started = Date.now();
      for (const line of TIMELINE.lines) {
        const wait = started + line.start * 1_000 - Date.now();
        if (wait > 0) {
          await new Promise((resolve) => setTimeout(resolve, wait));
        }
        caption(line.text, line.speaker === 'alice' ? 'Alice' : 'Bob');
      }
      const last = TIMELINE.lines.at(-1);
      const end = started + (last.end + 4) * 1_000 - Date.now();
      if (end > 0) {
        await new Promise((resolve) => setTimeout(resolve, end));
      }
      await waitFor(
        () =>
          Promise.all(
            Object.values(peers).map(({ page }) =>
              page.evaluate(
                (companion) => /friday/i.test(document.querySelector(companion)?.textContent ?? ''),
                COMPANION,
              ),
            ),
          ).then((seen) => seen.every(Boolean)),
        { what: "Bob's line about Friday in both transcripts", timeout: 30_000 },
      );
    },
  },
  {
    name: 'Bob leaves; Alice is alone in the call',
    subtitle: `${SUBTITLE} · step 6`,
    run: async ({ peers: { alice, bob } }) => {
      await bob.click(`${PLANK} button:has-text("Leave")`);
      await bob.page.locator(`${PLANK} button:has-text("Join")`).first().waitFor({ timeout: TIMEOUT });
      await waitFor(async () => !(await tileNames(alice.page)).some((name) => name.includes('Bob')), {
        what: "Bob's tile to leave Alice's grid",
      });
      await alice.page.waitForTimeout(BEAT * 2);
    },
  },
];
