//
// Copyright 2026 DXOS.org
//

/**
 * Bob follows a document with the bell, Alice comments on it, and the comment arrives in Bob's
 * notifications; Bob's reply reaches Alice, whom commenting subscribed. Recorded side by side.
 *
 * @mdl packages/plugins/plugin-review/PLUGIN.mdl test QA-3
 * @app composer-app `bundle-e2e` output, served by `vite preview` on 127.0.0.1:4173 (EDGE preview, for the inbox)
 *
 * A flow for `pair.mjs`: every step receives both peers. Built and served from `packages/apps/composer-app`:
 *
 *   VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:bundle-e2e
 *   pnpm exec vite preview --configLoader native --host 127.0.0.1 --port 4173 --strictPort
 *   node .agents/skills/autocue/scripts/pair.mjs \
 *     --flow packages/plugins/plugin-review/autocue/comment-notifications.mjs --out /tmp/pair
 *
 * Space, invitation and document setup follow `composer-app/autocue/two-peer-collaboration.mjs`. Keep the file
 * free of imports, since it is loaded from outside the workspace.
 */

const SPACE = 'Project Phoenix';
const DOCUMENT = 'Requirements';
const BODY = 'The mail client syncs over IMAP and keeps a local copy of every folder.';
const ALICE_COMMENT = 'Should this cover JMAP too?';
const BOB_REPLY = 'Yes, both IMAP and JMAP.';
const TIMEOUT = 60_000;

/** The workspace segment of a pair-chain URL (`/w/<workspace>/…`). */
const workspaceOf = (page) => {
  const [anchor, workspace] = new URL(page.url()).pathname.split('/').filter(Boolean);
  return anchor === 'w' ? workspace : undefined;
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

const textbox = (page) =>
  page.getByTestId('deck.plank').first().getByTestId('composer.markdownRoot').getByRole('textbox');

/** A right-rail companion tab, by the companion id its trigger's id ends with. */
const companionTab = (page, companion) => page.locator(`[id$="trigger-${companion}"]`).first();

const badge = async (page) => Number((await companionTab(page, 'messenger').getAttribute('data-badge')) ?? 0);

const bell = (page) => page.getByTestId('comments.subscription.toggle').filter({ visible: true }).first();

const isSubscribed = async (page) => (await bell(page).getAttribute('aria-pressed')) === 'true';

const notification = (page, text) => page.getByTestId('messenger.notification').filter({ hasText: text }).first();

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
  await closeSidebar({ page });
};

/** Collapses the right sidebar; while it is open, a plank shows no companions. */
const closeSidebar = async ({ page }) => {
  const sidebar = page.locator('[data-scope="main"][data-part="complementary-sidebar"]');
  if ((await sidebar.getAttribute('data-state').catch(() => null)) === 'expanded') {
    await sidebar.getByTestId('deck.toggleComplementarySidebar').click();
  }
};

const setDisplayName = (page, displayName) =>
  page.evaluate(
    (displayName) => globalThis.composer.invoke('org.dxos.operation.client.updateProfile', { displayName }),
    displayName,
  );

/** Opens the document's Comments companion, unless it already shows. */
const openComments = async (peer) => {
  if (
    await bell(peer.page)
      .isVisible()
      .catch(() => false)
  ) {
    return;
  }
  const tab = peer.page.getByTestId('deck.companion.tab.comments').filter({ visible: true }).first();
  // A plank whose companion is already open shows the tabs; otherwise its heading offers to open one.
  const open = peer.page.getByTestId('plankHeading.companion').filter({ visible: true }).first();
  await tab.or(open).first().waitFor({ timeout: TIMEOUT });
  if (!(await tab.isVisible())) {
    await peer.click(open);
    await tab.waitFor({ timeout: TIMEOUT });
  }
  await peer.click(tab);
  await bell(peer.page).waitFor({ timeout: TIMEOUT });
};

export const steps = [
  {
    name: 'Both peers boot and name themselves',
    setup: true,
    run: async ({ peers }) => {
      await peers.alice.page.waitForTimeout(3_000);
      await Promise.all([clearChrome(peers.alice), clearChrome(peers.bob)]);
      await Promise.all([setDisplayName(peers.alice.page, 'Alice'), setDisplayName(peers.bob.page, 'Bob')]);
    },
  },
  {
    name: `Alice creates "${SPACE}" with a "${DOCUMENT}" document`,
    setup: true,
    run: async ({ peers: { alice } }) => {
      const { page } = alice;
      await alice.click(page.getByTestId('spacePlugin.addSpace'));
      await alice.click(page.getByTestId('spacePlugin.createSpace'));
      const save = page.getByTestId('create-space-dialog').getByTestId('save-button');
      await waitFor(() => save.isEnabled(), { what: 'the create-space form' });
      await page.getByTestId('create-space-form').getByTestId('name').fill(SPACE);
      await alice.click(save);
      await page.getByTestId('create-space-form').waitFor({ state: 'detached', timeout: TIMEOUT });
      await page.getByText(SPACE).first().waitFor({ timeout: TIMEOUT });

      await alice.click(currentWorkspace(page).getByTestId('spacePlugin.createObject').first());
      await alice.click(page.getByTestId('create-object-form.type.org.dxos.type.document'));
      const dialog = page.locator('[data-scope="dialog"][data-part="content"][data-state="open"]');
      const form = page.getByTestId('create-object-form');
      await waitFor(async () => (await form.isVisible()) || !(await dialog.isVisible()), { what: 'the object form' });
      if (await form.isVisible()) {
        await alice.click(dialog.getByTestId('save-button'));
        await form.waitFor({ state: 'detached', timeout: TIMEOUT });
      }
      await textbox(page).waitFor({ timeout: TIMEOUT });
      // An unnamed document takes its title from its first line.
      await textbox(page).click();
      await page.keyboard.insertText(`# ${DOCUMENT}`);
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      await page.keyboard.insertText(BODY);
    },
  },
  {
    name: 'Alice invites Bob; Bob joins and opens the document',
    setup: true,
    run: async ({ peers: { alice, bob } }) => {
      const sharedWorkspace = workspaceOf(alice.page);
      await expandRow(alice, currentWorkspace(alice.page).getByTestId('spacePlugin.settings').first());
      await alice.click(
        currentWorkspace(alice.page).getByTestId('spacePlugin.members').first().getByTestId('treeItem.heading').first(),
      );
      const invitationCode = alice.nextConsoleValue('invitationCode');
      const authCode = alice.nextConsoleValue('authCode');
      await alice.click(alice.page.getByTestId('membersContainer.createInvitation.more'));
      await alice.click(alice.page.getByTestId('membersContainer.inviteOne'));
      await alice.click(alice.page.getByTestId('membersContainer.createInvitation'));

      await bob.click(bob.page.getByTestId('spacePlugin.addSpace'));
      await bob.click(bob.page.getByTestId('spacePlugin.joinSpace'));
      const input = bob.page.getByTestId('space-invitation-input');
      await input.fill(await invitationCode);
      await bob.page.keyboard.press('Enter');
      const pin = bob.page.locator("[data-testid='space-auth-code-input']:visible");
      await pin.waitFor({ timeout: TIMEOUT });
      await pin.locator('input').first().click();
      await bob.page.keyboard.type(await authCode, { delay: 50 });
      await bob.click(bob.page.getByTestId('space-invitation-authenticator-next'));
      await waitFor(() => workspaceOf(bob.page) === sharedWorkspace, { what: "Bob to reach Alice's space" });

      await clearChrome(bob);
      await expandRow(bob, currentWorkspace(bob.page).getByTestId('spacePlugin.collectionsSection').first());
      const link = currentWorkspace(bob.page).getByTestId('spacePlugin.object').first();
      await link.waitFor({ timeout: TIMEOUT });
      await bob.click(link);
      await waitFor(
        async () =>
          (
            await textbox(bob.page)
              .innerText()
              .catch(() => '')
          ).includes(BODY),
        {
          what: 'the document on Bob’s side',
        },
      );

      // Alice's deck still shows the members panel; bring the document back.
      await expandRow(alice, currentWorkspace(alice.page).getByTestId('spacePlugin.collectionsSection').first());
      await alice.click(currentWorkspace(alice.page).getByTestId('spacePlugin.object').first());
      await textbox(alice.page).waitFor({ timeout: TIMEOUT });
      await Promise.all([clearChrome(alice), clearChrome(bob)]);
    },
  },
  {
    name: 'Bob follows the document with the bell',
    subtitle: 'QA-3 step 1',
    run: async ({ peers: { bob } }) => {
      await openComments(bob);
      if (!(await isSubscribed(bob.page))) {
        await bob.click(bell(bob.page));
      }
      await waitFor(() => isSubscribed(bob.page), { what: "Bob's bell to turn on" });
    },
  },
  {
    name: 'Alice comments; commenting turns her bell on',
    subtitle: 'QA-3 step 2',
    run: async ({ peers: { alice } }) => {
      await openComments(alice);
      await alice.click(alice.page.getByTestId('comments.object-comment.add').filter({ visible: true }).first());
      const reply = alice.page
        .locator('[data-testid=thread][aria-current="location"]')
        .getByTestId('thread.reply')
        .getByRole('textbox');
      await alice.click(reply);
      await alice.type(ALICE_COMMENT);
      await alice.page.keyboard.press('Enter');
      await waitFor(() => isSubscribed(alice.page), { what: "Alice's bell to turn on" });
    },
  },
  {
    name: 'Bob is notified',
    subtitle: 'QA-3 step 3',
    run: async ({ peers: { bob } }) => {
      await waitFor(async () => (await badge(bob.page)) > 0, { what: "a badge on Bob's notifications" });
      await bob.click(companionTab(bob.page, 'messenger'));
      await notification(bob.page, ALICE_COMMENT).waitFor({ timeout: TIMEOUT });
    },
  },
  {
    name: 'Bob opens the notification',
    subtitle: 'QA-3 step 4',
    run: async ({ peers: { bob } }) => {
      await bob.click(notification(bob.page, ALICE_COMMENT));
      await waitFor(async () => (await badge(bob.page)) === 0, { what: 'the notification to be read' });
    },
  },
  {
    name: 'Bob replies, and Alice is notified',
    subtitle: 'QA-3 step 5',
    run: async ({ peers: { alice, bob } }) => {
      await closeSidebar(bob);
      await openComments(bob);
      const reply = bob.page.getByTestId('thread').first().getByTestId('thread.reply').getByRole('textbox');
      await bob.click(reply);
      await bob.type(BOB_REPLY);
      await bob.page.keyboard.press('Enter');

      await waitFor(async () => (await badge(alice.page)) > 0, { what: "a badge on Alice's notifications" });
      await alice.click(companionTab(alice.page, 'messenger'));
      await notification(alice.page, BOB_REPLY).waitFor({ timeout: TIMEOUT });
    },
  },
  {
    name: 'Comments reach everyone following the document, straight from the commenter’s device',
    subtitle: 'QA-3 then: neither person is notified about their own comment',
    run: async ({ sleep }) => {
      await sleep(6_000);
    },
  },
];
