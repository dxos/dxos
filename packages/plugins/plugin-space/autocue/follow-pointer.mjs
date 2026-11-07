//
// Copyright 2026 DXOS.org
//

/**
 * Bob follows Alice, and both see it: Members names the follow in Alice's colour on each side, and the plan's
 * heading takes that colour. Her pointer lands on the same spot of the plan in his deck, his shows on hers, and he
 * switches his to a laser. Moving his mouse keeps the follow; Stop in Members ends it. Recorded side by side.
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
 *     --flow packages/plugins/plugin-space/autocue/follow-pointer.mjs --url http://127.0.0.1:4176 --out /tmp/pointer
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

const followBar = (page) => page.getByTestId('spacePlugin.followBar');
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

export const steps = [
  {
    name: 'Both peers boot with their own identity',
    setup: true,
    run: async ({ peers }) => {
      // The notice arrives a moment after boot; give it the chance to appear before clearing it.
      await peers.alice.page.waitForTimeout(3_000);
      await Promise.all([clearChrome(peers.alice), clearChrome(peers.bob)]);
      await Promise.all(
        [
          [peers.alice, 'Alice'],
          [peers.bob, 'Bob'],
        ].map(([{ page }, displayName]) =>
          page.evaluate(
            (displayName) => globalThis.composer.invoke('org.dxos.operation.client.updateProfile', { displayName }),
            displayName,
          ),
        ),
      );
    },
  },
  {
    name: `Alice creates "${SPACE}" with a plan and invites Bob`,
    setup: true,
    run: async ({ peers: { alice, bob } }) => {
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
      await objectLink(page, PLAN).click();
      await waitFor(async () => (await textbox(page).innerText()).includes('Launch plan'), {
        what: 'Alice to open the plan',
      });

      const sharedWorkspace = workspaceOf(page);
      await expandRow(currentWorkspace(page).getByTestId('spacePlugin.settings').first());
      await currentWorkspace(page)
        .getByTestId('spacePlugin.members')
        .first()
        .getByTestId('treeItem.heading')
        .first()
        .click();
      const invitationCode = alice.nextConsoleValue('invitationCode');
      const authCode = alice.nextConsoleValue('authCode');
      await page.getByTestId('membersContainer.createInvitation.more').click();
      await page.getByTestId('membersContainer.inviteOne').click();
      await page.getByTestId('membersContainer.createInvitation').click();

      await bob.page.getByTestId('spacePlugin.addSpace').click();
      await bob.page.getByTestId('spacePlugin.joinSpace').click();
      const input = bob.page.getByTestId('space-invitation-input');
      await input.fill(await invitationCode);
      await bob.page.keyboard.press('Enter');
      const pin = bob.page.locator("[data-testid='space-auth-code-input']:visible");
      await pin.waitFor({ timeout: TIMEOUT });
      await pin.locator('input').first().click();
      await bob.page.keyboard.type(await authCode, { delay: 50 });
      await bob.page.getByTestId('space-invitation-authenticator-next').click();
      await waitFor(() => workspaceOf(bob.page) === sharedWorkspace, { what: "Bob to reach Alice's space" });

      // Alice goes back to the plan; Bob opens it too and puts his caret in it.
      await objectLink(page, PLAN).click();
      await clearChrome(bob);
      await expandRow(currentWorkspace(bob.page).getByTestId('spacePlugin.collectionsSection').first());
      await objectLink(bob.page, PLAN).click();
      await waitFor(async () => (await textbox(bob.page).innerText()).includes('Launch plan'), {
        what: 'Bob to open the plan',
      });
      await textbox(bob.page).click();
      await textbox(page).click();
      for (const toast of await bob.page.getByTestId('toast.close').filter({ visible: true }).all()) {
        await toast.click().catch(() => {});
      }
    },
  },
  {
    name: 'Bob opens Members and follows Alice',
    subtitle: 'QA-7 step 2: Members opens under “Following Alice”, and the plan’s heading takes her colour',
    run: async ({ peers: { bob } }) => {
      await bob.click(membersTab(bob.page));
      const follow = presenceRows(bob.page).getByTestId('spacePlugin.presence.follow').first();
      await follow.waitFor({ state: 'attached', timeout: TIMEOUT });
      await presenceRows(bob.page).first().hover();
      await bob.click(follow);
      await followBar(bob.page).waitFor({ timeout: TIMEOUT });
      await followHeading(bob.page).waitFor({ state: 'attached', timeout: TIMEOUT });
    },
    pace: 3_000,
  },
  {
    name: 'Alice sees Bob following her',
    subtitle: 'QA-7 step 3: the dot on her Members tab, “Bob is following you”, and the same colour on her heading',
    run: async ({ peers: { alice } }) => {
      await waitFor(async () => (await membersTab(alice.page).getAttribute('data-badge')) !== null, {
        what: 'the dot on Alice’s Members tab',
      });
      await alice.click(membersTab(alice.page));
      await followBar(alice.page).waitFor({ timeout: TIMEOUT });
      await followHeading(alice.page).waitFor({ state: 'attached', timeout: TIMEOUT });
    },
    pace: 3_000,
  },
  {
    name: 'Alice points at the plan; Bob sees her pointer',
    subtitle: 'QA-7 step 4: at the same spot of the same plank in his deck',
    run: async ({ peers: { alice, bob }, sleep }) => {
      await glideUntilShown(
        alice,
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
    name: 'Bob points back; Alice sees his pointer',
    subtitle: 'QA-7 step 5: moving his mouse keeps the follow',
    run: async ({ peers: { alice, bob }, sleep }) => {
      await glideUntilShown(
        bob,
        alice,
        [
          [0.35, 0.7],
          [0.6, 0.75],
          [0.45, 0.62],
        ],
        sleep,
      );
      if (!(await followBar(bob.page).isVisible())) {
        throw new Error('the follow ended when Bob moved his mouse');
      }
    },
    pace: 2_000,
  },
  {
    name: 'Bob switches his pointer to the laser',
    subtitle: 'QA-7 step 6: Alice sees a glowing dot with a trail',
    run: async ({ peers: { alice, bob }, sleep }) => {
      await bob.click(followBar(bob.page).getByTestId('spacePlugin.followBar.laser'));
      await glide(
        bob,
        [
          [0.4, 0.4],
          [0.6, 0.45],
          [0.45, 0.6],
          [0.55, 0.35],
        ],
        sleep,
        500,
      );
      await waitFor(async () => (await pointers(alice.page).getAttribute('data-style')) === 'laser', {
        what: 'Bob’s pointer to draw as a laser on Alice’s screen',
      });
    },
    pace: 2_000,
  },
  {
    name: 'Bob stops following',
    subtitle: 'QA-7 step 7: both pointers, both follow blocks and the heading colour go',
    run: async ({ peers: { alice, bob } }) => {
      await bob.click(presenceRows(bob.page).first().getByTestId('spacePlugin.presence.stopFollowing'));
      await waitFor(async () => (await followBar(bob.page).count()) === 0, { what: 'Bob’s follow block to go' });
      await waitFor(async () => (await followBar(alice.page).count()) === 0, { what: 'Alice’s follow block to go' });
      await waitFor(
        async () => (await pointers(alice.page).count()) === 0 && (await pointers(bob.page).count()) === 0,
        {
          what: 'both pointers to go',
        },
      );
    },
    pace: 3_000,
  },
];
