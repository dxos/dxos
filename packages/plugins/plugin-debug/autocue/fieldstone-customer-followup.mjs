//
// Copyright 2026 DXOS.org
//

/**
 * Alien Labs vignette: a customer asks for one more thing. Astrid opens the Okapi postmortem thread,
 * reads Nadia's reply, checks who she is from her card, opens her contact and finds the follow-up
 * meeting on the calendar.
 *
 * @mdl packages/plugins/plugin-debug/PLUGIN.mdl test QA-4
 * @app composer-app bundled dev build, served by `vite preview` on :4187
 *
 * Built and served from `packages/apps/composer-app` (plugin-debug, which contributes the template, is on
 * in dev builds):
 *
 *   export DX_ENVIRONMENT=dev DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true
 *   moon run composer-app:bundle
 *   pnpm exec vite preview --configLoader native --port 4187 --strictPort
 *
 * Recorded light, at the driver's default viewport and resolution:
 *
 *   node .agents/skills/autocue/scripts/driver.mjs --url http://localhost:4187 --out <dir> --theme light
 *
 * Add `--scale 1` for a quick iteration take: the same layout at a quarter of the pixels, so it encodes
 * several times faster. Record the final take without it.
 *
 * Record on a fresh profile. Setup creates the space and expands the navtree off camera; the take
 * starts on the space's Home with every branch the vignette needs already open.
 */

const TEMPLATE = 'Alien Labs';
const THREAD = 'Okapi cache-corruption postmortem';
const CONTACT = 'Nadia Petrov';
/** Nadia's reply, by the start of its body. */
const REPLY = 'Read it twice';
const EVENT = 'Okapi alerting follow-up';
/** The reference date, the week the vignette is set in: Wednesday 14 October 2026, as [year, month, day]. */
const WEEK = [2026, 9, 14];

/** The grid cell's selector for `date`; `data-date` is local midnight as UTC, so match on the local date. */
const daySelector = async (page, [year, month, day]) => {
  const value = await page.evaluate(
    ([year, month, day]) =>
      [...document.querySelectorAll('[data-testid="deck.plank"] [data-date]')]
        .map((element) => element.getAttribute('data-date'))
        .find((iso) => {
          const date = new Date(iso);
          return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
        }),
    [year, month, day],
  );
  if (!value) {
    throw new Error('reference date not in the calendar grid');
  }
  return `[data-testid="deck.plank"] [data-date="${value}"]`;
};

/** A beat for the viewer after a visible change. */
const BEAT = 1_500;

/** A navtree node by its own label: a leaf item or a branch's control, never a branch that only contains it. */
const node = (label) =>
  `[data-testid="deck.sidebar"] :is([data-part="item"],[data-part="branch-control"]):has(:text-is("${label}")) >> nth=0`;

/** Expands a navtree branch if it is closed. */
const expand = async (page, label) => {
  const branch = page
    .locator(`[data-testid="deck.sidebar"] [role="treeitem"]:has(> [data-part="branch-control"] :text-is("${label}"))`)
    .first();
  await branch.waitFor({ state: 'attached', timeout: 15_000 });
  // A space that has just opened can re-render its tree under the first click, so retry until it holds;
  // each attempt waits for the state to settle, since a second click too soon closes it again.
  for (let attempt = 0; attempt < 3 && (await branch.getAttribute('aria-expanded')) !== 'true'; attempt++) {
    await branch.locator('[data-part="branch-indicator"]').first().click();
    await page
      .waitForFunction((element) => element.getAttribute('aria-expanded') === 'true', await branch.elementHandle(), {
        timeout: 3_000,
      })
      .catch(() => {});
  }
  if ((await branch.getAttribute('aria-expanded')) !== 'true') {
    throw new Error(`navtree branch did not open: ${label}`);
  }
};

/** Collapses a navtree branch if it is open. */
const collapse = async (page, label) => {
  const branch = page
    .locator(`[data-testid="deck.sidebar"] [role="treeitem"]:has(> [data-part="branch-control"] :text-is("${label}"))`)
    .first();
  // A reveal lands a beat after the navigation that caused it, so wait for it before closing.
  await page
    .waitForFunction(
      (label) =>
        [...document.querySelectorAll('[data-testid="deck.sidebar"] [role="treeitem"]')].some(
          (item) =>
            item.querySelector(':scope > [data-part="branch-control"]')?.textContent?.trim() === label &&
            item.getAttribute('aria-expanded') === 'true',
        ),
      label,
      { timeout: 2_000 },
    )
    .catch(() => {});
  if ((await branch.count()) > 0 && (await branch.getAttribute('aria-expanded')) === 'true') {
    await branch.locator('[data-part="branch-indicator"]').first().click();
  }
};

/** Closes the companion if one is open, so the take starts with the full width. */
const closeCompanion = async (page) => {
  const close = page.locator('role=button[name="Close companion"]').first();
  if (
    await close.waitFor({ state: 'visible', timeout: 4_000 }).then(
      () => true,
      () => false,
    )
  ) {
    await close.click();
  }
};

const caption = (demo, value) => demo.caption({ value, subtitle: 'Alien Labs' });

/** The companion's message card for `sender` whose body starts with `text`. */
const messageCard = (page, sender, text) =>
  page
    .locator('[data-testid="deck.companion"] [data-scope="card"][data-part="root"]', { hasText: sender })
    .filter({ hasText: text })
    .first();

export const steps = [
  {
    name: 'Prep (off camera): create the space and open the navtree',
    setup: true,
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
        await notice.first().click();
      }
      await demo.click({ selector: '[data-testid="spacePlugin.addSpace"]', hud: false });
      await demo.click({ selector: 'role=menuitem[name="Create space"]', hud: false });
      await demo.click({
        selector: `[data-testid="create-space-dialog"] [role="option"]:has-text("${TEMPLATE}")`,
        hud: false,
      });
      await demo.click({ selector: '[data-testid="create-space-dialog"] button:has-text("Create")', hud: false });
      await page.locator(node('Mailboxes')).waitFor({ state: 'visible', timeout: 60_000 });
      await closeCompanion(page);
      for (const branch of ['Mailboxes', 'Calendars']) {
        await expand(page, branch);
      }
      await page.waitForTimeout(BEAT);
      // Everything recorded so far is preparation; the take starts on the space as it now stands.
      await demo.cut();
    },
  },
  {
    name: 'Look at the week',
    narration:
      'Astrid runs engineering at Fieldstone. Her calendar: team rituals, one-on-ones, customers, and a follow-up with Okapi next week.',
    run: async ({ demo, page }) => {
      await caption(demo, "Astrid's calendar");
      await demo.click({ selector: node('Alien Labs'), label: 'Alien Labs calendar' });
      await page
        .locator('[data-testid="deck.plank"] [data-date]')
        .first()
        .waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT);
      // A short look ahead in the grid and back, enough to show it runs on past this month.
      const box = await page
        .locator(await daySelector(page, WEEK))
        .first()
        .boundingBox();
      await page.mouse.move(box.x, box.y + 200, { steps: 8 });
      for (const delta of [180, -180]) {
        for (let step = 0; step < 4; step++) {
          await page.mouse.wheel(0, delta);
          await page.waitForTimeout(90);
        }
        await page.waitForTimeout(BEAT / 2);
      }
      // A few days in turn: the Monday team sync, next week's Okapi follow-up, then today.
      for (const [day, label] of [
        [[2026, 9, 12], 'Monday'],
        [[2026, 9, 21], 'Next Wednesday'],
        [WEEK, 'Today'],
      ]) {
        await demo.click({ selector: await daySelector(page, day), label });
        await page.waitForTimeout(BEAT);
      }
      await page.waitForTimeout(BEAT / 2);
    },
  },
  {
    name: 'Open an event',
    narration: 'Each event carries its notes and who is coming.',
    run: async ({ demo, page }) => {
      await caption(demo, 'An event: its notes and who is coming');
      const card = '[data-testid="deck.plank"] [data-scope="card"][data-part="root"]:has-text("Oct 14, 2026")';
      await page.locator(card).first().waitFor({ state: 'visible', timeout: 15_000 });
      await demo.click({ selector: `${card} >> nth=0`, label: 'Event' });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Find the thread',
    narration: 'Five weeks ago Okapi, a customer, hit a cache-corruption incident.',
    run: async ({ demo, page }) => {
      await caption(demo, "Okapi's incident, five weeks back in the inbox");
      await demo.click({ selector: node('Inbox'), label: 'Inbox' });
      const mailbox = page.locator('[data-testid="inbox.mailbox"]').first();
      await page
        .locator('[data-testid="inbox.conversation.row"]')
        .first()
        .waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT);
      const box = await mailbox.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      const row = page.locator('[data-testid="inbox.conversation.row"]', { hasText: THREAD }).first();
      for (let step = 0; step < 80; step++) {
        const target = (await row.isVisible().catch(() => false)) ? await row.boundingBox() : undefined;
        if (target && target.y < box.y + box.height * 0.45) {
          break;
        }
        await page.mouse.wheel(0, 160);
        await page.waitForTimeout(70);
      }
      await row.waitFor({ state: 'visible' });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Open the conversation',
    narration: 'Open the thread: the whole conversation, with a summary at the end.',
    run: async ({ demo, page }) => {
      await caption(demo, 'The whole conversation, summarised');
      await demo.click({
        selector: `[data-testid="inbox.conversation.row"]:has-text("${THREAD}") >> text=Re: ${THREAD}`,
        label: THREAD,
      });
      await page.locator('[data-testid="conversation.summary"]').first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT * 1.5);
    },
  },
  {
    name: "Read Nadia's reply",
    narration: "Okapi's engineering director has replied, with one more request.",
    run: async ({ demo, page }) => {
      await caption(demo, 'Nadia replies with one more request');
      const card = messageCard(page, CONTACT, REPLY);
      await card.scrollIntoViewIfNeeded();
      await demo.click({
        selector: `[data-testid="deck.companion"] [data-scope="card"][data-part="root"]:has-text("${CONTACT}"):has-text("${REPLY}") button:has-text("${CONTACT}") >> nth=0`,
        label: CONTACT,
      });
      await card.locator('[data-testid="message-header"]').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Check who is asking',
    narration: 'Her card: Okapi Payments, her other mail, and a follow-up already booked.',
    run: async ({ demo, page }) => {
      await caption(demo, 'Who is asking: her card');
      const avatar = messageCard(page, CONTACT, REPLY).locator('[data-testid="row.contact-avatar"]').first();
      await avatar.hover();
      const popover = page.locator('[role="dialog"]', { hasText: CONTACT }).first();
      if (
        !(await popover.waitFor({ state: 'visible', timeout: 2_000 }).then(
          () => true,
          () => false,
        ))
      ) {
        await avatar.click();
      }
      await popover.waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Open her contact',
    narration: 'Open her contact.',
    run: async ({ demo, page }) => {
      await caption(demo, 'Open her contact');
      await demo.click({ selector: '[role="dialog"] button[aria-label="Actions"] >> nth=0', label: 'Actions' });
      await demo.click({ selector: 'role=menuitem[name="Open"]', label: 'Open' });
      await page
        .locator('[data-testid="deck.plank"]', { hasText: 'Okapi Payments' })
        .first()
        .waitFor({ timeout: 15_000 });
      // The hover card outlives the click that opened the contact; move off the avatar and dismiss it.
      const plank = await page.locator('[data-testid="deck.plank"]').first().boundingBox();
      await page.mouse.move(plank.x + plank.width / 2, plank.y + 80, { steps: 8 });
      const card = page.locator('[role="dialog"]', { hasText: 'from:' });
      for (let attempt = 0; attempt < 3 && (await card.count()) > 0; attempt++) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
      // Opening a contact reveals it under Database > People in the navtree; the tour keeps Database shut.
      await collapse(page, 'Database');
      await page.waitForTimeout(BEAT * 1.5);
    },
  },
  {
    name: 'Find the follow-up',
    narration:
      "And the follow-up is on the calendar, a week out. Mail, contacts and calendar are one set of objects in the team's space, on their own devices, synced through EDGE.",
    run: async ({ demo, page }) => {
      await caption(demo, 'The follow-up, already on the calendar');
      const related = page
        .locator('[data-testid="deck.plank"], [data-testid="deck.companion"]')
        .locator(`:text("${EVENT}")`)
        .first();
      if (
        await related.waitFor({ state: 'visible', timeout: 5_000 }).then(
          () => true,
          () => false,
        )
      ) {
        await demo.click({
          selector: `:is([data-testid="deck.plank"],[data-testid="deck.companion"]) :text("${EVENT}") >> nth=0`,
          label: EVENT,
        });
      } else {
        await demo.click({ selector: node('Alien Labs'), label: 'Alien Labs calendar' });
      }
      await page.getByText(EVENT).first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT * 4);
    },
  },
];
