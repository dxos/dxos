//
// Copyright 2026 DXOS.org
//

/**
 * Alice and Bob, each with their own identity, share a space by invitation and write one document together,
 * recorded side by side.
 *
 * @mdl packages/apps/composer-app/spec/APP.mdl test QA-8
 * @app composer-app `bundle-e2e` output, served by `vite preview` on 127.0.0.1:4173 (EDGE signaling)
 *
 * A flow for `pair.mjs`, not `driver.mjs`: every step receives both peers. Built and served from
 * `packages/apps/composer-app`:
 *
 *   VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:bundle-e2e
 *   pnpm exec vite preview --configLoader native --host 127.0.0.1 --port 4173 --strictPort
 *   node .agents/skills/autocue/scripts/pair.mjs \
 *     --flow packages/apps/composer-app/autocue/two-peer-collaboration.mjs --out /tmp/pair
 *
 * 127.0.0.1, not localhost: the e2e suite found invitations strand on an IPv6-loopback origin. Selectors are
 * the ones `composer-e2e`'s `AppManager` uses; keep the file free of imports, since it is loaded from outside
 * the workspace.
 */

const SPACE = 'Project Phoenix';
const ALICE_TEXT = 'Agenda: finalise the roadmap and assign owners.';
const BOB_TEXT = 'Bob: I will draft the launch checklist by Friday.';
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

export const steps = [
  {
    name: 'Both peers boot with their own identity',
    setup: true,
    run: async ({ peers }) => {
      // The notice arrives a moment after boot; give it the chance to appear before clearing it.
      await peers.alice.page.waitForTimeout(3_000);
      await Promise.all([clearChrome(peers.alice), clearChrome(peers.bob)]);
      const keys = await Promise.all(
        [peers.alice, peers.bob].map(({ page }) =>
          // `String`, not `.toHex()`: the key's type differs across builds, and both stringify to its id.
          page.evaluate(() => String(globalThis.dxos?.client?.halo.identity.get()?.identityKey ?? '')),
        ),
      );
      if (!keys[0] || keys[0] === keys[1]) {
        throw new Error(`expected two distinct identities, got ${keys.join(' / ')}`);
      }
    },
  },
  {
    name: `Alice creates "${SPACE}" with a document`,
    subtitle: 'QA-8 given: a host with a space containing one document',
    run: async ({ peers: { alice } }) => {
      const { page } = alice;
      await alice.click(page.getByTestId('spacePlugin.addSpace'));
      await alice.click(page.getByTestId('spacePlugin.createSpace'));
      const save = page.getByTestId('create-space-dialog').getByTestId('save-button');
      await waitFor(() => save.isEnabled(), { what: 'the create-space form' });
      const name = page.getByTestId('create-space-form').getByTestId('name');
      await alice.click(name);
      await alice.type(SPACE);
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
    },
  },
  {
    name: 'Alice invites Bob; Bob joins with the code',
    subtitle: 'QA-8 step 1: Invite the guest',
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
      await bob.click(input);
      await input.fill(await invitationCode);
      await bob.page.keyboard.press('Enter');
      const pin = bob.page.locator("[data-testid='space-auth-code-input']:visible");
      await pin.waitFor({ timeout: TIMEOUT });
      await bob.click(pin.locator('input').first());
      await bob.type(await authCode, { delay: 120 });
      await bob.click(bob.page.getByTestId('space-invitation-authenticator-next'));

      await waitFor(() => workspaceOf(bob.page) === sharedWorkspace, { what: "Bob to reach Alice's space" });
    },
  },
  {
    name: 'Both open the document',
    subtitle: 'QA-8 step 2',
    run: async ({ peers: { alice, bob } }) => {
      await clearChrome(bob);
      await expandRow(bob, currentWorkspace(bob.page).getByTestId('spacePlugin.collectionsSection').first());
      const link = currentWorkspace(bob.page).getByTestId('spacePlugin.object').first();
      await link.waitFor({ timeout: TIMEOUT });
      await bob.click(link);
      await textbox(bob.page).waitFor({ timeout: TIMEOUT });
      await textbox(alice.page).waitFor({ timeout: TIMEOUT });
    },
  },
  {
    name: 'Alice types; Bob sees it arrive',
    subtitle: 'QA-8 step 3: Type on the host',
    run: async ({ peers: { alice, bob } }) => {
      await alice.click(textbox(alice.page));
      await alice.page.keyboard.press('ControlOrMeta+End');
      await alice.type(ALICE_TEXT);
      await waitFor(async () => (await textbox(bob.page).innerText()).includes(ALICE_TEXT), {
        what: "Alice's text on Bob's side",
      });
    },
  },
  {
    name: 'Bob replies in the same document; both converge',
    subtitle: 'QA-8 step 4: Type on the guest',
    run: async ({ peers: { alice, bob } }) => {
      await bob.click(textbox(bob.page));
      await bob.page.keyboard.press('ControlOrMeta+End');
      await bob.page.keyboard.press('Enter');
      await bob.page.keyboard.press('Enter');
      await bob.type(BOB_TEXT);
      await bob.page.keyboard.press('ControlOrMeta+End');
      for (const peer of [alice, bob]) {
        await waitFor(
          async () => {
            const text = await textbox(peer.page).innerText();
            return text.includes(ALICE_TEXT) && text.includes(BOB_TEXT);
          },
          { what: `both paragraphs on ${peer.name}'s side` },
        );
      }
    },
  },
];
