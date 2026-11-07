//
// Copyright 2026 DXOS.org
//

/**
 * Alice, Bob and Carol share a plan. Bob follows whoever sits last in his Members list: their row rises to the top,
 * takes the follow's indigo and swaps Follow for his pointer controls, and the leader sees him under "Following you".
 * Each sees the other's pointer on the same spot of the plan; Bob switches his to a laser whose tail traces its path.
 * Stop ends it on both sides. Recorded side by side, three panes; the third person sees no pointers.
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
const presenceRows = (page) => sidebar(page).getByTestId('spacePlugin.presence.row');

const followRow = (page) => sidebar(page).locator('[data-member][data-follow]');
const followersGroup = (page) => sidebar(page).getByTestId('spacePlugin.presence.followers');
const followHeading = (page) => page.getByTestId('spacePlugin.presence.followHeading').first();
const pointers = (page) => page.getByTestId('spacePlugin.followOverlay.pointer');

/** Glides the mouse through spots of the plan's plank, given as fractions of its box, resting on each. */
const glide = async (peer, spots, sleep, rest = 700) => {
  const box = await plank(peer.page).boundingBox();
  for (const [x, y] of spots) {
    await peer.page.mouse.move(box.x + box.width * x, box.y + box.height * y, { steps: 18 });
    await sleep(rest);
  }
};

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
    },
    pace: 3_000,
  },
  {
    name: 'The leader sees Bob following',
    subtitle: 'QA-7 step 3: an indigo dot on Members, Bob under “Following you”, the same indigo on the heading',
    run: async () => {
      await waitFor(async () => (await membersTab(leader.page).getAttribute('data-badge')) !== null, {
        what: 'the dot on the leader’s Members tab',
      });
      await leader.click(membersTab(leader.page));
      await followersGroup(leader.page).waitFor({ timeout: TIMEOUT });
      await followHeading(leader.page).waitFor({ state: 'attached', timeout: TIMEOUT });
    },
    pace: 3_000,
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
      await bob.click(followRow(bob.page).getByTestId('spacePlugin.presence.pointerLaser'));
      const box = await plank(bob.page).boundingBox();
      // A loop and a sweep, so the tail shows it follows the path rather than trailing at a fixed angle.
      for (let step = 0; step <= 48; step++) {
        const angle = (step / 48) * Math.PI * 2;
        await bob.page.mouse.move(
          box.x + box.width * (0.5 + 0.18 * Math.cos(angle)),
          box.y + box.height * (0.45 + 0.14 * Math.sin(angle)),
        );
        await sleep(40);
      }
      for (let step = 0; step <= 24; step++) {
        await bob.page.mouse.move(box.x + box.width * (0.25 + 0.5 * (step / 24)), box.y + box.height * 0.65);
        await sleep(40);
      }
      await waitFor(async () => (await pointers(leader.page).getAttribute('data-style')) === 'laser', {
        what: 'Bob’s pointer to draw as a laser on the leader’s screen',
      });
      await sleep(800);
    },
    pace: 2_000,
  },
  {
    name: 'Bob stops following',
    subtitle: 'QA-7 step 7: the row goes back to its place, and both pointers and the indigo go',
    run: async ({ peers: { bob } }) => {
      await bob.click(followRow(bob.page).getByTestId('spacePlugin.presence.stopFollowing'));
      await waitFor(async () => (await followRow(bob.page).count()) === 0, { what: 'Bob’s follow row to go' });
      await waitFor(async () => (await followersGroup(leader.page).count()) === 0, {
        what: 'the leader’s followers group to go',
      });
      await waitFor(
        async () => (await pointers(leader.page).count()) === 0 && (await pointers(bob.page).count()) === 0,
        { what: 'both pointers to go' },
      );
    },
    pace: 3_000,
  },
];
