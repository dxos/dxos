//
// Copyright 2026 DXOS.org
//

/**
 * Alien Labs scopes the Cairn dashboard plugin on a four-person call: Astrid (the local user) joins a Meeting's
 * call after Lucía, Ben and Tomás have started, waves and is greeted; Lucía shares the Plugin metrics sheet, which Astrid
 * maximizes, and Astrid writes the action items into the meeting notes.
 *
 * @mdl packages/plugins/plugin-meeting/PLUGIN.mdl test QA-2
 * @app composer-app dev build (plugin-debug's Alien Labs template, Calls and Meetings on), via
 *   `DX_ENVIRONMENT=dev DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:serve -- --port 4173`
 *
 * The colleagues are plugin-calls' simulated participants and Astrid's camera and microphone are a video too, so
 * the take needs no camera and no EDGE. `README.md` beside this file covers making the tracks, recording this take
 * (light, no captions, autoplay allowed, `MEETING_TRACKS` naming the tracks) and laying the sound under it.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { installFakeMedia, serveMedia } from '../../../../.agents/skills/autocue/scripts/fake-media.mjs';

const TRACKS = process.env.MEETING_TRACKS ?? '/tmp/meeting/tracks';
const CONVERSATION = JSON.parse(
  readFileSync(new URL('./fieldstone-dashboard.conversation.json', import.meta.url), 'utf8'),
);
const TIMELINE = JSON.parse(readFileSync(path.join(TRACKS, 'timeline.json'), 'utf8'));

const LOCAL = 'astrid';
const COLLEAGUES = ['lucia', 'ben', 'tomas'];
const MEETING_NAME = 'Cairn dashboard plugin: scoping';
const TEMPLATE = 'Alien Labs';
const ACTION_ITEMS = ['Ben: share the sketch', 'Tomás: build the plank', 'Lucía: check it with Okapi'];

const CALLS = 'org.dxos.plugin.calls';
const MEETINGS = 'org.dxos.plugin.meeting';
/** Contributes the Alien Labs space template. */
const DEBUG = 'org.dxos.plugin.debug';
const PLANK = '[data-testid="deck.plank"]';
const COMPANION = '[data-testid="deck.companion"]';
/** The expand (pin) button on the tile a participant's screenshare plays in, marked by its broadcast icon. */
const SCREENSHARE_EXPAND = `${PLANK} .dx-expand:has([data-icon="ph--broadcast--regular"]) button[aria-label="Pin video"]`;
/** Seconds the shared screen shows in the grid before it is maximized. */
const SCREENSHARE_SETTLE = 1.5;

/** A beat for the viewer after a visible change. */
const BEAT = 1_500;
/** How long the finished task list stays on screen. */
const LINGER = 8_000;

const caption = (demo, value, subtitle = 'plugin-meeting/PLUGIN.mdl · QA-2') => demo.caption({ value, subtitle });

/** Waits for `predicate` to hold in the page, polling. */
const waitForPage = (page, predicate, arg, timeout = 60_000) =>
  page.waitForFunction(predicate, arg, { timeout, polling: 500 });

/** Resolves true once `locator` is visible, false after `timeout`. */
const appears = (locator, timeout) =>
  locator.waitFor({ state: 'visible', timeout }).then(
    () => true,
    () => false,
  );

/** The meeting's id and its space, recorded by setup for the later steps. */
const state = {};

export const steps = [
  {
    name: 'Prep (off camera): fake media, plugins, profile, the Alien Labs space and the meeting',
    setup: true,
    run: async ({ demo, page }) => {
      // Init scripts apply from the next navigation, so install them and reload before anything else.
      const context = page.context();
      await installFakeMedia(context, {
        file: path.join(TRACKS, `${LOCAL}.webm`),
        name: LOCAL,
        leadIn: TIMELINE.leadIn,
      });
      state.sources = {};
      for (const id of COLLEAGUES) {
        state.sources[id] = await serveMedia(context, { file: path.join(TRACKS, `${id}.webm`), name: id });
      }
      state.screens = {};
      for (const { speaker, start, file } of TIMELINE.screenshares ?? []) {
        state.screens[speaker] = {
          start,
          src: await serveMedia(context, { file: path.join(TRACKS, file), name: file }),
        };
      }
      await page.reload({ timeout: 120_000 });
      await page.locator(PLANK).first().waitFor({ state: 'visible', timeout: 180_000 });

      const notice = page.locator(
        '[data-testid="org.dxos.plugin.observability.notice"] button:not(:has-text("Settings"))',
      );
      if (await appears(notice.first(), 8_000)) {
        // The notice slides in; a click that loses that race leaves it open, which costs the take nothing.
        await notice
          .first()
          .click({ timeout: 10_000 })
          .catch(() => {});
      }

      await page.evaluate(
        (ids) => composer.invoke('org.dxos.operation.registry.enablePlugins', { ids }),
        [CALLS, MEETINGS, DEBUG],
      );
      await waitForPage(
        page,
        (ids) => composer.plugins().filter((plugin) => ids.includes(plugin.id) && plugin.enabled).length === ids.length,
        [CALLS, MEETINGS, DEBUG],
      );
      await demo.invoke({
        key: 'org.dxos.operation.client.updateProfile',
        input: { displayName: CONVERSATION.participants[LOCAL].name },
        hud: false,
      });

      // A dialog left open by an earlier attempt would swallow the first click.
      await page.keyboard.press('Escape');
      await demo.click({ selector: '[data-testid="spacePlugin.addSpace"]', hud: false });
      await demo.click({ selector: 'role=menuitem[name="Create space"]', hud: false });
      await demo.click({
        selector: `[data-testid="create-space-dialog"] [role="option"]:has-text("${TEMPLATE}")`,
        hud: false,
      });
      await demo.click({ selector: '[data-testid="create-space-dialog"] button:has-text("Create")', hud: false });
      // The template finishes by opening the space's Home, so a meeting opened before then is closed mid-take; its
      // last partial adds the Projects collection.
      await page
        .locator('[data-testid="deck.sidebar"] [data-part="branch-control"]:has(:text-is("Projects"))')
        .first()
        .waitFor({ state: 'visible', timeout: 180_000 });
      await page.waitForTimeout(BEAT * 2);
      // Creating the space does not move the page to it, so find it by name.
      await waitForPage(
        page,
        // A space still initializing throws on `properties`.
        (name) =>
          dxos.client.spaces.get().some((space) => {
            try {
              return space.properties?.name === name;
            } catch {
              return false;
            }
          }),
        TEMPLATE,
        120_000,
      );
      state.spaceId = await page.evaluate(
        // The newest, in case an earlier attempt in this profile created one too.
        (name) =>
          dxos.client.spaces
            .get()
            .filter((space) => {
              try {
                return space.properties?.name === name;
              } catch {
                return false;
              }
            })
            .at(-1).id,
        TEMPLATE,
      );

      // plugin-meeting has no create-object entry in the space's menu; the recorder plugin creates and opens a
      // meeting with the same two operations.
      state.meetingId = await page.evaluate(
        async ([spaceId, name]) => {
          const db = dxos.client.spaces.get(spaceId).db;
          const { object } = await composer.invoke('org.dxos.operation.meeting.create', { name, db }, { spaceId });
          return object.id;
        },
        [state.spaceId, MEETING_NAME],
      );
      await page.evaluate(
        (spaceId) => composer.invoke('org.dxos.operation.appToolkit.switchWorkspace', { subject: `root/${spaceId}` }),
        state.spaceId,
      );
      await page.evaluate(
        ([spaceId, meetingId]) =>
          composer.invoke('org.dxos.operation.appToolkit.open', {
            subject: [`root/${spaceId}/system/database/org.dxos.type.meeting/${meetingId}`],
          }),
        [state.spaceId, state.meetingId],
      );
      await page.locator(`${PLANK} button[aria-label="Call"]`).first().waitFor({ state: 'visible', timeout: 30_000 });
      const closeCompanion = page.locator('role=button[name="Close companion"]').first();
      if (await appears(closeCompanion, 4_000)) {
        await closeCompanion.click();
      }

      // The active meeting receives the simulated transcript.
      await page.evaluate(
        async ([spaceId, meetingId]) => {
          const db = dxos.client.spaces.get(spaceId).db;
          const object = await db.query(dxos.Filter.id(meetingId)).first();
          await composer.invoke('org.dxos.operation.meeting.setActive', { object });
        },
        [state.spaceId, state.meetingId],
      );
      await demo.invoke({
        key: 'org.dxos.operation.calls.setSimulatedParticipants',
        input: {
          participants: COLLEAGUES.map((id) => ({
            name: CONVERSATION.participants[id].name,
            src: state.sources[id],
            ...(state.screens[id] ? { screenshare: state.screens[id] } : {}),
          })),
          transcript: TIMELINE.lines.map(({ speaker, start, text }) => ({
            speaker: CONVERSATION.participants[speaker].name,
            start,
            text,
          })),
        },
        hud: false,
      });
      await page.waitForTimeout(BEAT);
      await demo.cut();
    },
  },
  {
    name: 'Join with camera and microphone on',
    narration: 'Astrid opens the meeting and joins its call. Lucía, Ben and Tomás are already there.',
    run: async ({ demo, page }) => {
      await caption(demo, 'Alien Labs scopes the Cairn dashboard plugin');
      await demo.click({ selector: `${PLANK} button[aria-label="Call"]`, label: 'Call' });
      await demo.click({ selector: `${PLANK} button[aria-label="Turn camera on"]`, label: 'Camera on' });
      await demo.click({ selector: `${PLANK} button[aria-label="Unmute"]`, label: 'Unmute' });
      await page.waitForTimeout(BEAT);

      await demo.click({ selector: `${PLANK} button:has-text("Join")`, label: 'Join' });
      // Astrid's own clip starts with the others', which start on join.
      await page.evaluate(() => globalThis.__fakeMedia.start());
      state.joinedAt = Date.now();
      for (const id of [LOCAL, ...COLLEAGUES]) {
        await page
          .locator(PLANK)
          .getByText(CONVERSATION.participants[id].name, { exact: true })
          .first()
          .waitFor({ timeout: 15_000 });
      }

      // The meeting companion exists only while its call is joined; lines spoken before it opens are already in the feed.
      await demo.click({ selector: 'button[aria-label="Open companion side-by-side"]', label: 'Companion' });
      await demo.click({ selector: '[data-testid="deck.companion.tab.meeting"]', label: 'Meeting' });
      await demo.click({ selector: `${COMPANION} button[aria-label="Transcript"]`, label: 'Transcript' });
    },
  },
  {
    name: 'The conversation runs',
    narration:
      'They talk it through. Whoever is speaking is outlined, the transcript fills in beside the call, and Lucía shares the Plugin metrics sheet.',
    run: async ({ demo, page }) => {
      // Each line is captioned as it is spoken, and each shared screen maximized once it appears, from the timeline
      // the tracks were cut to.
      const events = [
        ...TIMELINE.lines.map((line) => ({
          at: line.start,
          run: () => caption(demo, line.text, CONVERSATION.participants[line.speaker].name),
        })),
        ...(TIMELINE.screenshares ?? []).map(({ start }) => ({
          at: start + SCREENSHARE_SETTLE,
          run: () => demo.click({ selector: SCREENSHARE_EXPAND, label: 'Expand' }),
        })),
      ].sort((a, b) => a.at - b.at);
      for (const event of events) {
        const wait = state.joinedAt + event.at * 1_000 - Date.now();
        if (wait > 0) {
          await page.waitForTimeout(wait);
        }
        await event.run();
      }
      const wait = state.joinedAt + (TIMELINE.lines.at(-1).end + 0.5) * 1_000 - Date.now();
      if (wait > 0) {
        await page.waitForTimeout(wait);
      }
      await demo.clearCaption();
    },
  },
  {
    name: 'Write the action items',
    narration: 'Astrid writes the action items into the meeting notes.',
    run: async ({ demo, page }) => {
      await caption(demo, 'Astrid writes the action items into the meeting notes', 'QA-2 step 5');
      // The caption banner is pinned over the bottom of the page, where the editor's last line sits.
      await demo.clearCaption();
      // Notes open in the companion, so the call stays on screen beside them.
      await demo.click({ selector: `${COMPANION} button[aria-label="Notes"]`, label: 'Notes' });
      // The transcript tab keeps its own editor mounted but hidden.
      const editor = page.locator(`${COMPANION} .cm-content >> visible=true`).first();
      await editor.click();
      // The editor continues a task list on Enter, so only the first item takes the markdown prefix.
      await page.keyboard.type(`- [ ] ${ACTION_ITEMS.join('\n')}`, { delay: 40 });
      await waitForPage(
        page,
        ([companion, last]) =>
          [...document.querySelectorAll(`${companion} .cm-content`)].some((editor) =>
            editor.textContent?.includes(last),
          ),
        [COMPANION, ACTION_ITEMS.at(-1)],
        10_000,
      );
      // A held caption keeps the trimmer from cutting the pause on the finished list.
      await demo.caption({ value: 'Action items', subtitle: 'QA-2 step 5', hold: LINGER });
    },
  },
  {
    name: 'Leave',
    narration: 'And she leaves the call.',
    run: async ({ demo, page }) => {
      await demo.click({ selector: `${PLANK} button:has-text("Leave")`, label: 'Leave' });
      await page.locator(`${PLANK} button:has-text("Join")`).first().waitFor({ timeout: 15_000 });
      await page.waitForTimeout(BEAT);
    },
  },
];
