//
// Copyright 2026 DXOS.org
//

/**
 * Alice, Bob and Carol share a plan. Bob follows whoever sits last in his Members list: their row rises to the top,
 * takes the follow's indigo and swaps Follow for Stop, and the leader sees him under "Following you". Every plank
 * heading on both screens, companions included, washes in indigo. The leader opens and closes the plan's companion,
 * types, and opens the notes, and Bob's deck goes along; Bob clicking in to type ends the follow, and the indigo clears.
 * Recorded side by side, three panes.
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
/**
 * Collapses the complementary sidebar so the plank keeps the room, and with `companions` any plank companion (a
 * document's help). A follower leaves companions alone: the follow mirrors the leader's, and a click in its deck would
 * end the follow.
 */
const closeSidebar = async (peer, { companions = false } = {}) => {
  if ((await sidebar(peer.page).getAttribute('data-state')) === 'expanded') {
    await peer.click(sidebar(peer.page).getByTestId('deck.toggleComplementarySidebar'));
  }
  if (!companions) {
    return;
  }
  const closeCompanion = peer.page.getByTestId('plankHeading.closeCompanion').filter({ visible: true });
  // A document's help companion opens a moment after its plank does.
  await closeCompanion
    .first()
    .waitFor({ timeout: 2_000 })
    .catch(() => {});
  for (let attempt = 0; attempt < 5 && (await closeCompanion.count()) > 0; attempt++) {
    await peer.click(closeCompanion.first());
  }
};
const presenceRows = (page) => sidebar(page).getByTestId('spacePlugin.presence.row');

const followRow = (page) => sidebar(page).locator('[data-member][data-follow]');
const followersGroup = (page) => sidebar(page).getByTestId('spacePlugin.presence.followers');
const followHeading = (page) => page.locator('[data-testid="deck.plank"] [data-accent]').first();

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
      const initialWorkspace = workspaceOf(page);
      await page.getByTestId('spacePlugin.addSpace').click();
      await page.getByTestId('spacePlugin.createSpace').click();
      const save = page.getByTestId('create-space-dialog').getByTestId('save-button');
      await waitFor(() => save.isEnabled(), { what: 'the create-space form' });
      await page.getByTestId('create-space-form').getByTestId('name').fill(SPACE);
      await save.click();
      await page.getByTestId('create-space-form').waitFor({ state: 'detached', timeout: TIMEOUT });
      await page.getByText(SPACE).first().waitFor({ timeout: TIMEOUT });
      // The space's name can show in the rail before Alice's page moves to it.
      await waitFor(() => workspaceOf(page) !== initialWorkspace, { what: 'Alice to open the new space' });

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
    subtitle:
      'QA-7 step 2: their row rises to the top, turns indigo and swaps Follow for Stop; every heading turns indigo',
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
      await closeSidebar(leader, { companions: true });
    },
    pace: 1_500,
  },
  {
    name: 'The leader opens the plan’s companion; Bob’s opens too',
    subtitle: 'Companions are content: the follow mirrors which one is open, and its heading takes the indigo too',
    run: async ({ peers: { bob }, sleep }) => {
      await closeSidebar(leader, { companions: true });
      await leader.click(plank(leader.page).getByTestId('plankHeading.companion'));
      const companionCount = (page) => page.getByTestId('deck.companion').filter({ visible: true }).count();
      await waitFor(async () => (await companionCount(bob.page)) > 0, { what: 'the companion beside Bob’s plank' });
      await sleep(3_000);
      await leader.click(leader.page.getByTestId('plankHeading.closeCompanion').filter({ visible: true }).first());
      await waitFor(async () => (await companionCount(bob.page)) === 0, { what: 'Bob’s companion to close' });
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
    subtitle: 'The indigo clears on both screens',
    run: async ({ peers: { bob }, sleep }) => {
      await bob.click(plank(bob.page).getByText('Who signs off?', { exact: false }).first());
      await bob.page.keyboard.press('End');
      await bob.page.keyboard.type(' I can.', { delay: 70 });
      await waitFor(async () => (await followHeading(bob.page).count()) === 0, { what: 'Bob’s follow to end' });
      await waitFor(async () => (await followHeading(leader.page).count()) === 0, {
        what: 'the leader’s headings to clear',
      });
      await sleep(1_500);
    },
    pace: 3_000,
  },
];
