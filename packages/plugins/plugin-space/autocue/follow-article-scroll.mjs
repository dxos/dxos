//
// Copyright 2026 DXOS.org
//

/**
 * Bob follows Alice on the space's Home, an article whose plugin has no follow code. As Alice scrolls Home, Bob's Home
 * scrolls with her, because the deck keeps every plank's scroll as view state that a follow carries. Bob's Home is
 * narrower, with Members open beside it, yet the same section stays at the top of both, since each Home section is a
 * scroll anchor. Recorded side by side.
 *
 * @title Follow a peer's scroll
 * @mdl packages/plugins/plugin-space/PLUGIN.mdl test QA-8
 * @app composer-app `bundle-e2e` output, served by `vite preview` on 127.0.0.1:4173 (EDGE signaling)
 *
 * A flow for `pair.mjs`, not `driver.mjs`: every step receives both peers. Built and served from
 * `packages/apps/composer-app`:
 *
 *   VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:bundle-e2e
 *   pnpm exec vite preview --configLoader native --host 127.0.0.1 --port 4173 --strictPort
 *   node .agents/skills/autocue/scripts/pair.mjs \
 *     --flow packages/plugins/plugin-space/autocue/follow-article-scroll.mjs --out /tmp/follow-scroll
 *
 * Keep the file free of imports, since it is loaded from outside the workspace.
 */

const SPACE = 'Launch';
const TIMEOUT = 60_000;

/** Enough documents to fill Home's Recent section past the bottom of the window. */
const DOCUMENTS = [
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
].map((section) => ({
  name: section,
  content: [
    `# ${section}`,
    '',
    ...Array.from({ length: 4 }, (_, line) => `${section} note ${line + 1}: what we decided and who owns it.`),
  ].join('\n'),
}));

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
const homePath = (page) => `root/${workspaceOf(page)}/home`;
const homeLink = (page) => page.locator(`[data-object-id="${homePath(page)}"]`).first();
const homeScroller = (page) =>
  page
    .locator(
      `[data-testid="deck.plank"][data-attendable-id="${homePath(page)}"] [data-scope="scroll-area"][data-orientation="vertical"] .dx-scroll-viewport`,
    )
    .first();
const scrollTop = (page) => homeScroller(page).evaluate((element) => element.scrollTop);
/** The Home section at the top of the view, and how far into it the view is, as a fraction of its height. */
const topSection = (page) =>
  homeScroller(page).evaluate((viewport) => {
    const top = viewport.getBoundingClientRect().top;
    const section = [...viewport.querySelectorAll('[data-scroll-anchor]')].find(
      (element) => element.getBoundingClientRect().bottom > top + 1,
    );
    const rect = section?.getBoundingClientRect();
    return section && { anchor: section.dataset.scrollAnchor, into: (top - rect.top) / rect.height };
  });
/** Whether both views have the same section at the top, scrolled about as far into it. */
const together = async (alice, bob) => {
  const [leader, follower] = await Promise.all([topSection(alice.page), topSection(bob.page)]);
  return leader?.anchor === follower?.anchor && Math.abs(leader.into - follower.into) < 0.15;
};
const scrollRange = (page) => homeScroller(page).evaluate((element) => element.scrollHeight - element.clientHeight);
const sidebar = (page) => page.locator('[data-scope="main"][data-part="complementary-sidebar"]');
const membersTab = (page) => page.locator('[id$="trigger-members"]');
const presenceRows = (page) => sidebar(page).getByTestId('spacePlugin.presence.row');

/**
 * Scrolls Home with the wheel, a tick at a time, as a reader would. The pointer rests in Home's left gutter: Recent is
 * a scrolling area of its own, which keeps a wheel over its cards from reaching Home.
 */
const wheel = async (peer, delta, ticks, sleep) => {
  const box = await homeScroller(peer.page).boundingBox();
  await peer.move({ x: box.x + 16, y: box.y + box.height / 2 });
  for (let tick = 0; tick < ticks; tick++) {
    await peer.page.mouse.wheel(0, delta);
    await sleep(160);
  }
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

/** First-run chrome that would cover the content: the privacy notice, toasts and any open companion. */
const clearChrome = async ({ page }) => {
  const notice = page.getByTestId('org.dxos.plugin.observability.notice');
  if (await notice.isVisible().catch(() => false)) {
    await notice.getByTestId('toast.close').click();
  }
  for (const toast of await page.getByTestId('toast.close').filter({ visible: true }).all()) {
    await toast.click().catch(() => {});
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

/** Opens Home and waits for its Recent section to list every document. */
const openHome = async (peer) => {
  const { page } = peer;
  await homeLink(page).click();
  await homeScroller(page).waitFor({ timeout: TIMEOUT });
  await waitFor(async () => (await scrollRange(page)) > 150, { what: 'Home to fill past the window' });
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
    name: `Alice creates "${SPACE}" with ten documents and invites Bob`,
    setup: true,
    run: async ({ peers: { alice, bob } }) => {
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

      const sharedWorkspace = workspaceOf(page);
      await page.evaluate(
        async ({ spaceId, documents }) => {
          for (const document of documents) {
            await globalThis.composer.invoke('org.dxos.operation.markdown.create', document, { spaceId });
          }
        },
        { spaceId: sharedWorkspace, documents: DOCUMENTS },
      );
      await openHome(alice);

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

      // Both end on Home, scrolled to the top.
      await openHome(alice);
      await clearChrome(bob);
      await openHome(bob);
      await clearChrome(alice);
      await clearChrome(bob);
    },
  },
  {
    name: 'Bob opens Members and follows Alice',
    subtitle: 'QA-8 step 2: both decks show Home',
    run: async ({ peers: { bob } }) => {
      await bob.click(membersTab(bob.page));
      const follow = presenceRows(bob.page).getByTestId('spacePlugin.presence.follow').first();
      await follow.waitFor({ state: 'attached', timeout: TIMEOUT });
      await presenceRows(bob.page).first().hover();
      await bob.click(follow);
      await presenceRows(bob.page).first().getByTestId('spacePlugin.presence.stopFollowing').waitFor();
      await homeScroller(bob.page).waitFor({ timeout: TIMEOUT });
    },
    pace: 3_000,
  },
  {
    name: 'Alice scrolls Home; Bob’s Home scrolls with her',
    subtitle: 'QA-8 step 3: Home has no follow code; the deck keeps its scroll as view state',
    run: async ({ peers: { alice, bob }, sleep }) => {
      await wheel(alice, 60, 4, sleep);
      await waitFor(async () => (await scrollTop(alice.page)) > 100, { what: 'Alice’s Home to scroll' });
      await waitFor(() => together(alice, bob), {
        what: 'Bob’s Home to reach Alice’s place',
      });
    },
    pace: 3_000,
  },
  {
    name: 'Alice scrolls to the end, then back up; Bob stays with her',
    subtitle: 'QA-8 step 3',
    run: async ({ peers: { alice, bob }, sleep }) => {
      await wheel(alice, 160, 10, sleep);
      await waitFor(() => together(alice, bob), {
        what: 'Bob’s Home to reach the end with Alice',
      });
      await sleep(1_500);
      await wheel(alice, -160, 6, sleep);
      await waitFor(() => together(alice, bob), {
        what: 'Bob’s Home to come back up with Alice',
      });
    },
    pace: 3_000,
  },
  {
    name: 'Bob scrolls his own Home; following stops',
    subtitle: 'The follow ends when the follower takes over; Alice’s Home stays where it is',
    run: async ({ peers: { alice, bob }, sleep }) => {
      await wheel(bob, 160, 4, sleep);
      await waitFor(async () => (await membersTab(bob.page).getAttribute('data-badge')) === null, {
        timeout: 15_000,
        what: 'the follow to end',
      });
      // Alice follows nobody, so Bob's scroll stays his own.
      await sleep(1_500);
      if ((await scrollTop(alice.page)) > 10) {
        throw new Error('Alice’s Home scrolled with Bob’s');
      }
    },
    pace: 5_000,
  },
];
