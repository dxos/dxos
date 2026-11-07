//
// Copyright 2026 DXOS.org
//

/**
 * Alice, Bob and Carol share a plan. Bob follows whoever sits last in his Members list: their row rises to the top,
 * takes the follow's indigo and swaps Follow for his pointer controls, and the leader sees him under "Following you".
 * Each sees the other's pointer on the same spot of the plan; Bob switches his to a laser whose tail traces its path.
 * The leader points across the navtree, types and opens the notes, and Bob's deck goes along; Bob typing ends it.
 * Recorded side by side, three panes; the third person sees no pointers.
 *
 * @mdl packages/plugins/plugin-space/PLUGIN.mdl test QA-7
 * @app composer-app `bundle-e2e` output, served by `vite preview` on 127.0.0.1:4176 (EDGE signaling)
 *
 * A flow for `pair.mjs`, not `driver.mjs`: every step receives both peers. Built and served from
 * `packages/apps/composer-app`:
 *
 *   VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:bundle-e2e
 *   pnpm exec vite preview --configLoader native --host 127.0.0.1 --port 4176 --strictPort
 *   node .agents/skills/autocue/scripts/pair.mjs \
 *     --flow packages/plugins/plugin-space/autocue/follow-pointer.mjs --url http://127.0.0.1:4176 --out /tmp/pointer \\
 *     --peers Alice,Bob,Carol --width 1024
 *
 * Keep the file free of imports, since it is loaded from outside the workspace.
 */

const SPACE = 'Launch';
const PLAN = 'Launch plan';
const NOTES = 'Notes';
const TIMEOUT = 60_000;

const PLAN_TEXT = [
  'Goals',
  'Timeline',
  'Owners',
  'Pricing',
  'Docs',
  'Support',
  'Marketing',
  'Risks',
  'Metrics',
  'Rollback',
  'Retrospective',
]
  .map((section) =>
    [
      `## ${section}`,
      '',
      ...Array.from({ length: 6 }, (_, line) => `${section} note ${line + 1}: what we decided and who owns it.`),
      '',
    ].join('\n'),
  )
  .join('\n');

const waitFor = async (predicate, { timeout = TIMEOUT, what }) => {
  const deadline = Date.now() + timeout;
  while (!(await predicate())) {
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for ${what}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
};

/** The workspace segment of a pair-chain URL (`/w/<workspace>/…`). */
const workspaceOf = (page) => {
  const [anchor, workspace] = new URL(page.url()).pathname.split('/').filter(Boolean);
  return anchor === 'w' ? workspace : undefined;
};

const currentWorkspace = (page) => page.getByTestId('navtree.workspace.visible');
const objectLink = (page, name) =>
  currentWorkspace(page).getByTestId('spacePlugin.object').filter({ hasText: name }).first();
const plank = (page) => page.getByTestId('deck.plank').first();
const textbox = (page) => plank(page).getByTestId('composer.markdownRoot').getByRole('textbox');
const sidebar = (page) => page.locator('[data-scope="main"][data-part="complementary-sidebar"]');
const membersTab = (page) => page.locator('[id$="trigger-members"]');
/** Collapses the complementary sidebar and any plank companion (a document's help), so the plank keeps the room. */
const closeSidebar = async (peer) => {
  if ((await sidebar(peer.page).getAttribute('data-state')) === 'expanded') {
    await peer.click(sidebar(peer.page).getByTestId('deck.toggleComplementarySidebar'));
  }
  const closeCompanion = peer.page.getByTestId('plankHeading.closeCompanion').filter({ visible: true });
  for (let attempt = 0; attempt < 5 && (await closeCompanion.count()) > 0; attempt++) {
    await peer.click(closeCompanion.first());
  }
};
const presenceRows = (page) => sidebar(page).getByTestId('spacePlugin.presence.row');

const followRow = (page) => sidebar(page).locator('[data-member][data-follow]');
const followersGroup = (page) => sidebar(page).getByTestId('spacePlugin.presence.followers');
const followHeading = (page) => page.getByTestId('spacePlugin.presence.followHeading').first();
const pointers = (page) => page.getByTestId('spacePlugin.followOverlay.pointer');

// Where each peer's mouse last went, so a move glides from there.
const mouseAt = new WeakMap();

/** Moves the mouse in small steps and the recording's cursor with it, so each pane shows its own pointer moving. */
const moveMouse = async (peer, x, y, steps = 12) => {
  const from = mouseAt.get(peer) ?? { x, y };
  for (let step = 1; step <= steps; step++) {
    const point = { x: from.x + ((x - from.x) * step) / steps, y: from.y + ((y - from.y) * step) / steps };
    await peer.page.mouse.move(point.x, point.y);
    await peer.page.evaluate((point) => globalThis.__demoOverlay?.moveCursor(point.x, point.y), point);
  }
  mouseAt.set(peer, { x, y });
};

/** Glides the mouse through spots of an element's box, given as fractions of it, resting on each. */
const glideOver = async (peer, locator, spots, sleep, rest = 700) => {
  const box = await locator.boundingBox();
  for (const [x, y] of spots) {
    await moveMouse(peer, box.x + box.width * x, box.y + box.height * y);
    await sleep(rest);
  }
};

/** Glides the mouse through spots of the plank, given as fractions of its box, resting on each. */
const glide = (peer, spots, sleep, rest) => glideOver(peer, plank(peer.page), spots, sleep, rest);

/** Glides until the other peer draws this one's pointer: a session posts only once it knows it is in a follow. */
const glideUntilShown = async (peer, other, spots, sleep) => {
  const deadline = Date.now() + TIMEOUT;
  while ((await pointers(other.page).count()) === 0) {
    if (Date.now() > deadline) {
      throw new Error('timed out waiting for the pointer to show');
    }
    await glide(peer, spots.slice(0, 1), sleep, 250);
  }
  await glide(peer, spots, sleep);
};

/** Expands a navtree row unless it is already open; a row with no children yet keeps its caret disabled. */
const expandRow = async (row) => {
  const toggle = row.locator('[data-part="branch-trigger"]').first();
  await toggle.waitFor({ state: 'attached', timeout: TIMEOUT });
  if ((await toggle.getAttribute('data-state')) === 'open') {
    return;
  }
  await row.hover();
  await waitFor(() => toggle.isEnabled(), { what: 'the row to become expandable' });
  await toggle.click();
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
  if (
    (await sidebar(page)
      .getAttribute('data-state')
      .catch(() => null)) === 'expanded'
  ) {
    await sidebar(page).getByTestId('deck.toggleComplementarySidebar').click();
  }
};

/** Creates a named document in the current space and fills it with `text`. */
const createDocument = async (page, name, text) => {
  await currentWorkspace(page).getByTestId('spacePlugin.createObject').first().click();
  await page.getByTestId('create-object-form.type.org.dxos.type.document').click();
  const dialog = page.locator('[data-scope="dialog"][data-part="content"][data-state="open"]');
  const form = page.getByTestId('create-object-form');
  await waitFor(async () => (await form.isVisible()) || !(await dialog.isVisible()), { what: 'the object form' });
  if (await form.isVisible()) {
    await form.getByLabel('Name').fill(name);
    await dialog.getByTestId('save-button').click();
    await form.waitFor({ state: 'detached', timeout: TIMEOUT });
  }
  // A document is created at once as "New document" and opens in a plank; it takes its name from its first heading.
  await plank(page).getByText('New document').first().waitFor({ timeout: TIMEOUT });
  await textbox(page).waitFor({ timeout: TIMEOUT });
  await textbox(page).fill(text);
  // `fill` leaves the whole text selected, which the other peer would see as Alice's selection.
  await page.keyboard.press('ControlOrMeta+Home');
  // The navtree can hold the new row in a collapsed Collections section.
  await expandRow(currentWorkspace(page).getByTestId('spacePlugin.collectionsSection').first());
  await objectLink(page, name).waitFor({ timeout: TIMEOUT });
  await clearChrome({ page });
};

/** Joins `guest` to the space Alice has open, with a fresh single-use invitation from its members settings. */
const invite = async (alice, guest, sharedWorkspace) => {
  const { page } = alice;
  const invitationCode = alice.nextConsoleValue('invitationCode');
  const authCode = alice.nextConsoleValue('authCode');
  await page.getByTestId('membersContainer.createInvitation.more').click();
  await page.getByTestId('membersContainer.inviteOne').click();
  await page.getByTestId('membersContainer.createInvitation').click();

  await guest.page.getByTestId('spacePlugin.addSpace').click();
  await guest.page.getByTestId('spacePlugin.joinSpace').click();
  await guest.page.getByTestId('space-invitation-input').fill(await invitationCode);
  await guest.page.keyboard.press('Enter');
  const pin = guest.page.locator("[data-testid='space-auth-code-input']:visible");
  await pin.waitFor({ timeout: TIMEOUT });
  await pin.locator('input').first().click();
  await guest.page.keyboard.type(await authCode, { delay: 50 });
  await guest.page.getByTestId('space-invitation-authenticator-next').click();
  await waitFor(() => workspaceOf(guest.page) === sharedWorkspace, { what: 'the guest to reach the space' });
};

/** Opens the plan and puts the caret in it. */
const openPlan = async (peer) => {
  await clearChrome(peer);
  await expandRow(currentWorkspace(peer.page).getByTestId('spacePlugin.collectionsSection').first());
  await objectLink(peer.page, PLAN).click();
  await waitFor(async () => (await textbox(peer.page).innerText()).includes('Launch plan'), {
    what: 'the plan to open',
  });
  await textbox(peer.page).click();
  for (const toast of await peer.page.getByTestId('toast.close').filter({ visible: true }).all()) {
    await toast.click().catch(() => {});
  }
};

/** The person Bob follows: whoever sat last in his Members list; set by the step that follows them. */
let leader;

export const steps = [
  {
    name: 'Three people boot with their own identity',
    setup: true,
    run: async ({ peers }) => {
      // The notice arrives a moment after boot; give it the chance to appear before clearing it.
      await peers.alice.page.waitForTimeout(3_000);
      const people = [
        [peers.alice, 'Alice'],
        [peers.bob, 'Bob'],
        [peers.carol, 'Carol'],
      ];
      await Promise.all(people.map(([peer]) => clearChrome(peer)));
      await Promise.all(
        people.map(([{ page }, displayName]) =>
          page.evaluate(
            (displayName) => globalThis.composer.invoke('org.dxos.operation.client.updateProfile', { displayName }),
            displayName,
          ),
        ),
      );
    },
  },
  {
    name: `Alice creates "${SPACE}" with a plan and invites Bob and Carol`,
    setup: true,
    run: async ({ peers: { alice, bob, carol } }) => {
      const { page } = alice;
      await page.getByTestId('spacePlugin.addSpace').click();
      await page.getByTestId('spacePlugin.createSpace').click();
      const save = page.getByTestId('create-space-dialog').getByTestId('save-button');
      await waitFor(() => save.isEnabled(), { what: 'the create-space form' });
      await page.getByTestId('create-space-form').getByTestId('name').fill(SPACE);
      await save.click();
      await page.getByTestId('create-space-form').waitFor({ state: 'detached', timeout: TIMEOUT });
      await page.getByText(SPACE).first().waitFor({ timeout: TIMEOUT });

      await createDocument(page, PLAN, `# Launch plan\n\n${PLAN_TEXT}`);
      await createDocument(page, NOTES, '# Notes\n\nQuestions to settle before launch.\n');
      const sharedWorkspace = workspaceOf(page);
      await expandRow(currentWorkspace(page).getByTestId('spacePlugin.settings').first());
      await currentWorkspace(page)
        .getByTestId('spacePlugin.members')
        .first()
        .getByTestId('treeItem.heading')
        .first()
        .click();
      await invite(alice, bob, sharedWorkspace);
      await invite(alice, carol, sharedWorkspace);

      await objectLink(page, PLAN).click();
      await openPlan(bob);
      await openPlan(carol);
      await textbox(page).click();
    },
  },
  {
    name: 'Bob opens Members',
    subtitle: 'Everyone viewing the plan, each with Jump and Follow',
    run: async ({ peers: { bob } }) => {
      await bob.click(membersTab(bob.page));
      await waitFor(async () => (await presenceRows(bob.page).count()) >= 2, { what: 'both people in Bob’s list' });
    },
    pace: 2_500,
  },
  {
    name: 'Bob follows the person at the bottom of his list',
    subtitle: 'QA-7 step 2: their row rises to the top, turns indigo and swaps Follow for pointer controls and Stop',
    run: async ({ peers, sleep }) => {
      const { bob } = peers;
      const last = presenceRows(bob.page).last();
      // The row's text starts with the avatar's glyph, so find the name in it.
      const text = await last.innerText();
      const name = ['Alice', 'Carol'].find((candidate) => text.includes(candidate));
      leader = name && peers[name.toLowerCase()];
      if (!leader) {
        throw new Error(`no peer named in "${text}"`);
      }
      await last.hover();
      await sleep(600);
      await bob.click(last.getByTestId('spacePlugin.presence.follow'));
      await followRow(bob.page).waitFor({ timeout: TIMEOUT });
      await followHeading(bob.page).waitFor({ state: 'attached', timeout: TIMEOUT });
      await sleep(2_500);
      // The side panel would crowd the plank the two point at.
      await closeSidebar(bob);
    },
    pace: 1_500,
  },
  {
    name: 'The leader sees Bob following',
    subtitle: 'QA-7 step 3: an indigo dot on Members, Bob under “Following you”, the same indigo on the heading',
    run: async ({ sleep }) => {
      await waitFor(async () => (await membersTab(leader.page).getAttribute('data-badge')) !== null, {
        what: 'the dot on the leader’s Members tab',
      });
      await leader.click(membersTab(leader.page));
      await followersGroup(leader.page).waitFor({ timeout: TIMEOUT });
      await followHeading(leader.page).waitFor({ state: 'attached', timeout: TIMEOUT });
      await sleep(2_500);
      await closeSidebar(leader);
    },
    pace: 1_500,
  },
  {
    name: 'The leader points at the plan; Bob sees the pointer',
    subtitle: 'QA-7 step 4: at the same spot of the same plank in his deck',
    run: async ({ peers: { bob }, sleep }) => {
      await glideUntilShown(
        leader,
        bob,
        [
          [0.3, 0.25],
          [0.55, 0.32],
          [0.4, 0.45],
          [0.6, 0.5],
        ],
        sleep,
      );
    },
    pace: 2_000,
  },
  {
    name: 'Bob points back; the leader sees his pointer',
    subtitle: 'QA-7 step 5: moving his mouse keeps the follow',
    run: async ({ peers: { bob }, sleep }) => {
      await glideUntilShown(
        bob,
        leader,
        [
          [0.35, 0.7],
          [0.6, 0.75],
          [0.45, 0.62],
        ],
        sleep,
      );
      if ((await followRow(bob.page).count()) === 0) {
        throw new Error('the follow ended when Bob moved his mouse');
      }
    },
    pace: 2_000,
  },
  {
    name: 'Bob switches his pointer to the laser',
    subtitle: 'QA-7 step 6: a glowing dot whose tail traces where it went',
    run: async ({ peers: { bob }, sleep }) => {
      // The switch lives in Members, closed while pointing, so Bob opens it for the switch and closes it again.
      await bob.click(membersTab(bob.page));
      await bob.click(followRow(bob.page).getByTestId('spacePlugin.presence.pointerLaser'));
      await sleep(800);
      await closeSidebar(bob);
      const box = await plank(bob.page).boundingBox();
      // A loop and a sweep, so the tail shows it follows the path rather than trailing at a fixed angle.
      for (let step = 0; step <= 48; step++) {
        const angle = (step / 48) * Math.PI * 2;
        await moveMouse(
          bob,
          box.x + box.width * (0.5 + 0.18 * Math.cos(angle)),
          box.y + box.height * (0.45 + 0.14 * Math.sin(angle)),
          2,
        );
        await sleep(30);
      }
      for (let step = 0; step <= 24; step++) {
        await moveMouse(bob, box.x + box.width * (0.25 + 0.5 * (step / 24)), box.y + box.height * 0.65, 2);
        await sleep(30);
      }
      await waitFor(async () => (await pointers(leader.page).getAttribute('data-style')) === 'laser', {
        what: 'Bob’s pointer to draw as a laser on the leader’s screen',
      });
      await sleep(800);
    },
    pace: 2_000,
  },
  {
    name: 'The leader points across the navtree',
    subtitle: 'Pointers cover the whole window: over a navtree row, each sees it on the same row',
    run: async ({ peers: { bob }, sleep }) => {
      const tree = currentWorkspace(leader.page);
      await glideOver(leader, tree.getByTestId('spacePlugin.collectionsSection').first(), [[0.5, 0.5]], sleep, 400);
      await glideOver(
        leader,
        objectLink(leader.page, PLAN),
        [
          [0.3, 0.5],
          [0.7, 0.5],
        ],
        sleep,
        500,
      );
      await glideOver(
        leader,
        objectLink(leader.page, NOTES),
        [
          [0.4, 0.5],
          [0.6, 0.5],
        ],
        sleep,
        700,
      );
      await waitFor(
        async () =>
          (await pointers(bob.page).count()) > 0 &&
          (await pointers(bob.page).first().getAttribute('data-anchor')) === 'row',
        {
          what: 'the leader’s pointer over a row of Bob’s navtree',
        },
      );
    },
    pace: 1_500,
  },
  {
    name: 'The leader types in the plan',
    subtitle: 'Bob’s view keeps the leader’s place while the text arrives',
    run: async ({ peers: { bob }, sleep }) => {
      // A heading is one short line, so End lands at its end; a wrapped note's End stops mid-sentence.
      await leader.click(plank(leader.page).getByText('Owners', { exact: true }).first());
      await leader.page.keyboard.press('End');
      await leader.page.keyboard.press('Enter');
      await leader.page.keyboard.press('Enter');
      await leader.page.keyboard.type('Bob, can you take pricing?', { delay: 70 });
      await waitFor(async () => (await textbox(bob.page).innerText()).includes('can you take pricing'), {
        what: 'the leader’s words in Bob’s view',
      });
      await sleep(1_000);
    },
    pace: 1_500,
  },
  {
    name: 'The leader opens the notes; Bob’s deck goes with them',
    subtitle: 'Following carries navigation',
    run: async ({ peers: { bob } }) => {
      await leader.click(objectLink(leader.page, NOTES));
      await waitFor(async () => (await textbox(bob.page).innerText()).includes('Questions to settle'), {
        what: 'the notes in Bob’s deck',
      });
      await leader.click(plank(leader.page).getByText('Questions to settle', { exact: false }).first());
      await leader.page.keyboard.press('End');
      await leader.page.keyboard.type(' Who signs off?', { delay: 70 });
    },
    pace: 2_000,
  },
  {
    name: 'Bob clicks in and types; his own input ends the follow',
    subtitle: 'F-8.22 today: a follower typing in a plank stops following',
    run: async ({ peers: { bob }, sleep }) => {
      await bob.click(plank(bob.page).getByText('Who signs off?', { exact: false }).first());
      await bob.page.keyboard.press('End');
      await bob.page.keyboard.type(' I can.', { delay: 70 });
      await waitFor(async () => (await followHeading(bob.page).count()) === 0, { what: 'Bob’s follow to end' });
      await waitFor(
        async () => (await pointers(leader.page).count()) === 0 && (await pointers(bob.page).count()) === 0,
        { what: 'both pointers to go' },
      );
      await sleep(1_000);
    },
    pace: 3_000,
  },
];
