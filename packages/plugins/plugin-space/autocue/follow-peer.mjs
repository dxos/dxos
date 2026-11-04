//
// Copyright 2026 DXOS.org
//

/**
 * Bob follows Alice around a shared space: his deck opens what she opens and keeps her top line at the top of
 * his view, until he presses Escape. Recorded side by side.
 *
 * @mdl packages/plugins/plugin-space/PLUGIN.mdl test QA-5
 * @app composer-app `bundle-e2e` output, served by `vite preview` on 127.0.0.1:4173 (EDGE signaling)
 *
 * A flow for `pair.mjs`, not `driver.mjs`: every step receives both peers. Built and served from
 * `packages/apps/composer-app`:
 *
 *   VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:bundle-e2e
 *   pnpm exec vite preview --configLoader native --host 127.0.0.1 --port 4173 --strictPort
 *   node .agents/skills/autocue/scripts/pair.mjs \
 *     --flow packages/plugins/plugin-space/autocue/follow-peer.mjs --out /tmp/follow
 *
 * Keep the file free of imports, since it is loaded from outside the workspace.
 */

const SPACE = 'Launch';
const AGENDA = 'Agenda';
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
  .map((section, index) =>
    [
      `## ${index + 1}. ${section}`,
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
const scrollTop = (page) =>
  plank(page)
    .locator('.cm-scroller')
    .evaluate((element) => element.scrollTop);
const scrolledToEnd = (page) =>
  plank(page)
    .locator('.cm-scroller')
    .evaluate((element) => element.scrollHeight - element.clientHeight - element.scrollTop < 120);
const sidebar = (page) => page.locator('[data-scope="main"][data-part="complementary-sidebar"]');
const membersTab = (page) => page.locator('[id$="trigger-members"]');
const presenceRows = (page) => sidebar(page).getByTestId('spacePlugin.presence.row');

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
  // A document is created at once as "New document"; wait for its plank to replace the last one before typing,
  // then rename it through its navtree actions.
  const untitled = objectLink(page, 'New document');
  await untitled.waitFor({ timeout: TIMEOUT });
  await plank(page).getByText('New document').first().waitFor({ timeout: TIMEOUT });
  await textbox(page).waitFor({ timeout: TIMEOUT });
  await textbox(page).fill(text);
  // `fill` leaves the whole text selected, which the other peer would see as Alice's selection.
  await page.keyboard.press('ControlOrMeta+Home');
  {
    await untitled.hover();
    await untitled
      .getByTestId(/navtree\.treeItem\.actionsLevel\d+/)
      .first()
      .click();
    await page.getByTestId('spacePlugin.renameObject').last().click();
    const field = page.locator('[data-scope="popover"][data-part="content"]').getByRole('textbox', { name: 'Name' });
    await field.fill(name);
    await field.press('Escape');
  }
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
    name: `Alice creates "${SPACE}" with two documents and invites Bob`,
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

      await createDocument(page, AGENDA, '# Agenda\n\nWalk through the launch plan together.\n');
      await createDocument(page, PLAN, `# Launch plan\n\n${PLAN_TEXT}`);
      await objectLink(page, AGENDA).click();
      await waitFor(async () => (await textbox(page).innerText()).includes('Walk through'), {
        what: 'Alice to open the agenda',
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

      // Alice goes back to the agenda; Bob opens it too and puts his caret in it.
      await objectLink(page, AGENDA).click();
      await clearChrome(bob);
      await expandRow(currentWorkspace(bob.page).getByTestId('spacePlugin.collectionsSection').first());
      await objectLink(bob.page, AGENDA).click();
      await waitFor(async () => (await textbox(bob.page).innerText()).includes('Walk through'), {
        what: 'Bob to open the agenda',
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
    subtitle: 'QA-5 step 1: the tab shows a dot; Alice sits first in the list with Stop',
    run: async ({ peers: { bob } }) => {
      await bob.click(membersTab(bob.page));
      const follow = presenceRows(bob.page).getByTestId('spacePlugin.presence.follow').first();
      await follow.waitFor({ state: 'attached', timeout: TIMEOUT });
      await presenceRows(bob.page).first().hover();
      await bob.click(follow);
      await presenceRows(bob.page).first().getByTestId('spacePlugin.presence.stopFollowing').waitFor();
      await waitFor(async () => (await membersTab(bob.page).getAttribute('data-badge')) !== null, {
        what: 'the dot on the Members tab',
      });
    },
    pace: 3_500,
  },
  {
    name: 'Alice opens the launch plan; Bob’s deck opens it too',
    subtitle: 'QA-5 step 2',
    run: async ({ peers: { alice, bob } }) => {
      await alice.click(objectLink(alice.page, PLAN));
      await waitFor(async () => (await textbox(bob.page).innerText()).includes('Launch plan'), {
        what: 'the launch plan in Bob’s deck',
      });
    },
    pace: 3_500,
  },
  {
    name: 'Alice scrolls; Bob’s view keeps her top line',
    subtitle: 'QA-5 step 3: his caret and focus stay where they were',
    run: async ({ peers: { alice, bob }, sleep }) => {
      const box = await plank(alice.page).locator('.cm-scroller').boundingBox();
      await alice.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      for (let tick = 0; tick < 12; tick++) {
        await alice.page.mouse.wheel(0, 120);
        await sleep(180);
      }
      await waitFor(async () => (await scrollTop(alice.page)) > 400, { what: 'Alice’s view to scroll' });
      await waitFor(async () => (await scrollTop(bob.page)) > 400, { what: 'Bob’s view to scroll' });
      await sleep(1_500);
      for (let tick = 0; tick < 5; tick++) {
        await alice.page.mouse.wheel(0, -120);
        await sleep(180);
      }
    },
    pace: 3_500,
  },
  {
    name: 'Alice jumps to the end; Bob goes with her',
    subtitle: 'QA-5 step 3',
    run: async ({ peers: { alice, bob } }) => {
      await alice.click(plank(alice.page).getByText('Pricing note 3', { exact: false }).first());
      await alice.page.keyboard.press('ControlOrMeta+End');
      for (const [peer, who] of [
        [alice, 'Alice’s'],
        [bob, 'Bob’s'],
      ]) {
        await waitFor(() => scrolledToEnd(peer.page), { what: `${who} view to reach the end` });
      }
    },
    pace: 3_500,
  },
  {
    name: 'Bob presses Escape; following stops',
    subtitle: 'QA-5 step 4: the dot goes and Follow is back on Alice’s row',
    run: async ({ peers: { bob } }) => {
      await bob.page.keyboard.press('Escape');
      await waitFor(async () => (await membersTab(bob.page).getAttribute('data-badge')) === null, {
        what: 'the dot to clear',
      });
      await presenceRows(bob.page).getByTestId('spacePlugin.presence.follow').first().waitFor({ state: 'attached' });
    },
    pace: 3_500,
  },
  {
    name: 'Alice scrolls back up; Bob stays put',
    subtitle: 'Follow is off, so his view is his own again',
    run: async ({ peers: { alice, bob }, sleep }) => {
      const before = await scrollTop(bob.page);
      for (let tick = 0; tick < 10; tick++) {
        await alice.page.mouse.wheel(0, -150);
        await sleep(180);
      }
      await sleep(2_000);
      const after = await scrollTop(bob.page);
      if (Math.abs(after - before) > 2) {
        throw new Error(`Bob's view moved after Escape (${before} → ${after})`);
      }
    },
    pace: 4_000,
  },
];
