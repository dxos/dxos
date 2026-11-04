//
// Copyright 2023 DXOS.org
//

import { expect, test } from '@playwright/test';

import { AppManager } from './app-manager.ts';
import { Markdown } from './plugins/index.ts';

const perfomInvitation = async (host: AppManager, guest: AppManager) => {
  const sharedWorkspace = host.workspaceId;
  expect(sharedWorkspace, 'the host must be in a workspace before it can share one').toBeDefined();
  await host.shareSpace();
  const invitationCode = await host.createSpaceInvitation();
  const authCode = await host.getAuthCode();
  await guest.joinSpace();
  await guest.shell.acceptSpaceInvitation(invitationCode);
  await guest.shell.authenticate(authCode);

  await expect.poll(() => guest.workspaceId, { timeout: 30_000 }).toBe(sharedWorkspace);
  await guest.waitForSpaceReady(30_000);

  await navigateToNewDocument(host);
};

const navigateToNewDocument = async (app: AppManager) => {
  await app.navigateToObject(0); // New document.
};

// Two-peer WebRTC runs on all browsers in CI. The Claude cloud sandbox is the exception — webkit peers
// there time out waiting for transport, so cross-browser results come from CI, not local runs. Ignore
// webkit's `'allow-presentation'` console flood here, from MediaPlayer's iframe sandbox.
test.describe('Collaboration tests', () => {
  let host: AppManager;
  let guest: AppManager;

  test.beforeEach(async ({ browser }) => {
    test.setTimeout(90_000);

    host = new AppManager(browser, false);
    guest = new AppManager(browser, false);

    await host.init();
    await guest.init();
  });

  test.afterEach(async () => {
    // NOTE: `afterEach` even if the test is skipped in the beforeEach!
    // Guard against uninitialized app managers.
    if (host !== undefined && guest !== undefined) {
      await Promise.all([host.close(), guest.close()]);
    }
  });

  test("guest joins host's space", { tag: ['@QA-8'] }, async () => {
    // Host creates a space and adds a markdown object
    await host.createSpace();
    await host.createObject({ type: 'Document' });

    {
      // Focus new editor before space invitation.
      const plank = host.deck.plank();
      const hostTextbox = Markdown.getMarkdownTextboxWithLocator(plank.locator);
      await hostTextbox.focus();
      await hostTextbox.fill('Hello from the host');
    }

    // Perform invitation to the guest.
    await perfomInvitation(host, guest);

    // Guest waits for the space to be ready and confirms it has the markdown object.
    await guest.waitForSpaceReady();
    await guest.expandSection('spacePlugin.collectionsSection');
    await expect(guest.getObjectLinks()).toHaveCount(1);
    await navigateToNewDocument(guest);

    {
      // Update to use plank locator
      const plank = guest.deck.plank();
      const guestMarkdownDoc = Markdown.getMarkdownTextboxWithLocator(plank.locator);
      await expect(guestMarkdownDoc).toHaveText('Hello from the host', { timeout: 15_000 });

      // Verify URLs and object links match between host and guest.
      expect(host.page.url()).toEqual(guest.page.url());
    }
  });

  // TODO(wittjosiah): Flaky -- depends on winning a race between the awareness gossip channel
  //   becoming live and the peer's cursor-position broadcast, with no way from the test to
  //   detect readiness (the presence indicator this used to rely on no longer exists at the
  //   app level). Covered instead by a storybook interaction test exercising the CodeMirror
  //   awareness extension against an in-memory two-peer transport.
  test.skip(
    "host and guest can see each others' cursors when same document is in focus",
    { tag: ['@QA-8'] },
    async () => {
      await host.createSpace();
      await host.createObject({ type: 'Document' });

      // Focus on host's textbox and wait for it to be ready.
      const hostPlank = host.deck.plank();
      const hostTextbox = Markdown.getMarkdownTextboxWithLocator(hostPlank.locator);
      await hostTextbox.waitFor();
      // TODO(thure): Autofocus not working for solo mode when creating a new document.
      await hostTextbox.focus();

      await perfomInvitation(host, guest);

      await guest.waitForSpaceReady();
      await guest.expandSection('spacePlugin.collectionsSection');
      await expect(guest.getObjectLinks()).toHaveCount(1);
      await navigateToNewDocument(guest);

      // Find the plank in the guest.
      const guestPlank = guest.deck.plank();
      await Markdown.waitForMarkdownTextboxWithLocator(guestPlank.locator);
      await Markdown.getMarkdownTextboxWithLocator(guestPlank.locator).blur();

      await Promise.all([
        expect(Markdown.getCollaboratorCursorsWithLocator(hostPlank.locator)).toHaveCount(0),
        expect(Markdown.getCollaboratorCursorsWithLocator(guestPlank.locator)).toHaveCount(0),
      ]);

      // TODO(wittjosiah): Focusing too quickly causes the cursors not to show up.
      await Promise.all([host.page.waitForTimeout(1_000), guest.page.waitForTimeout(1_000)]);

      await Promise.all([
        Markdown.getMarkdownTextboxWithLocator(hostPlank.locator).focus(),
        Markdown.getMarkdownTextboxWithLocator(guestPlank.locator).focus(),
      ]);

      await Promise.all([
        expect(Markdown.getCollaboratorCursorsWithLocator(hostPlank.locator).first()).toHaveText(/.+/),
        expect(Markdown.getCollaboratorCursorsWithLocator(guestPlank.locator).first()).toHaveText(/.+/),
      ]);
    },
  );

  test("host and guest can see each others' changes in same document", { tag: ['@QA-8'] }, async () => {
    await host.createSpace();
    await host.createObject({ type: 'Document' });

    // Focus on host's textbox and wait for it to be ready
    const hostPlank = host.deck.plank();
    const hostTextbox = Markdown.getMarkdownTextboxWithLocator(hostPlank.locator);
    await hostTextbox.waitFor();
    // TODO(thure): Autofocus not working for solo mode when creating a new document.
    await hostTextbox.focus();

    // Perform invitation to the guest
    await perfomInvitation(host, guest);

    const parts = [
      'Lorem ipsum dolor sit amet,',
      ' consectetur adipiscing elit,',
      ' sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    ];
    const allParts = parts.join('');

    // Guest waits for the space to be ready and confirms it has the markdown object
    await guest.waitForSpaceReady();
    await guest.expandSection('spacePlugin.collectionsSection');
    await expect(guest.getObjectLinks()).toHaveCount(1);
    await navigateToNewDocument(guest);

    // Get guest's markdown planks and find the locator for the shared document
    const guestPlank = guest.deck.plank();
    const guestTextbox = Markdown.getMarkdownTextboxWithLocator(guestPlank.locator);
    await guestTextbox.focus();

    // Host types the first part.
    await hostTextbox.focus();
    await host.page.keyboard.insertText(parts[0]);

    // Guest waits for the first part to appear.
    await expect(guestTextbox).toContainText(parts[0]);

    // Guest appends the second part.
    await guestTextbox.focus();
    await guest.page.keyboard.press('End');
    await guest.page.keyboard.insertText(parts[1]);

    // Host waits for the combined first and second parts to appear
    await expect(hostTextbox).toContainText([parts[0], parts[1]].join(''));

    // Host appends the third part
    await hostTextbox.focus();
    await host.page.keyboard.press('End');
    await host.page.keyboard.insertText(parts[2]);

    // Guest waits for the complete text
    await expect(guestTextbox).toContainText(allParts);

    // Move cursor to the end in both host and guest
    await Promise.all([host.page.keyboard.press('End'), guest.page.keyboard.press('End')]);

    // Move down the lines in both host and guest
    await Promise.all([host.page.keyboard.press('ArrowDown'), guest.page.keyboard.press('ArrowDown')]);

    // Verify final content is the same
    await expect(hostTextbox).toContainText(allParts);
    await expect(guestTextbox).toContainText(allParts);
  });

  test('peers can see each others presence', { tag: ['@QA-8'] }, async () => {
    test.setTimeout(90_000);

    await host.createSpace();
    await host.createObject({ type: 'Document' });

    // Focus on host's textbox and wait for it to be ready
    const hostPlank = host.deck.plank();
    const hostTextbox = Markdown.getMarkdownTextboxWithLocator(hostPlank.locator);
    await hostTextbox.waitFor();
    // TODO(thure): Autofocus not working for solo mode when creating a new document.
    await hostTextbox.focus();

    await perfomInvitation(host, guest);
    await guest.waitForSpaceReady();
    await guest.expandSection('spacePlugin.collectionsSection');
    await expect(guest.getObjectLinks()).toHaveCount(1);
    await navigateToNewDocument(guest);

    const guestPlank = guest.deck.plank();
    const guestTextbox = Markdown.getMarkdownTextboxWithLocator(guestPlank.locator);
    await guestTextbox.waitFor();
    // TODO(thure): Autofocus not working for solo mode when creating a new document.
    await guestTextbox.focus();

    const hostPresence = hostPlank.membersPresence();
    const guestPresence = guestPlank.membersPresence();

    // TODO(wittjosiah): Initial viewing state is slow.
    await Promise.all([
      expect(hostPresence).toHaveCount(1, { timeout: 45_000 }),
      expect(guestPresence).toHaveCount(1, { timeout: 45_000 }),
    ]);

    await Promise.all([
      expect(hostPresence.first()).toHaveAttribute('data-status', 'current', { timeout: 30_000 }),
      expect(guestPresence.first()).toHaveAttribute('data-status', 'current', { timeout: 30_000 }),
    ]);
  });

  test("a peer's avatar opens the viewers list and jumps to their selection", { tag: ['@space:QA-3'] }, async () => {
    test.setTimeout(120_000);

    await host.createSpace();
    await host.createObject({ type: 'Document' });
    const hostPlank = host.deck.plank();
    const hostTextbox = Markdown.getMarkdownTextboxWithLocator(hostPlank.locator);
    await hostTextbox.waitFor();
    await hostTextbox.focus();

    await perfomInvitation(host, guest);
    await guest.expandSection('spacePlugin.collectionsSection');
    await navigateToNewDocument(guest);
    const guestTextbox = Markdown.getMarkdownTextboxWithLocator(guest.deck.plank().locator);
    await guestTextbox.waitFor();
    await guestTextbox.focus();
    await guestTextbox.fill('Hello from the guest');

    const hostPresence = hostPlank.membersPresence();
    await expect(hostPresence).toHaveCount(1, { timeout: 45_000 });
    await hostPresence.first().click();

    const row = host.page.getByTestId('spacePlugin.presence.row');
    await expect(row).toHaveCount(1);
    await expect(row).toHaveAttribute('aria-selected', 'true');

    // The guest's document is open on the host, so the action is Jump rather than Go to.
    await row.getByTestId('spacePlugin.presence.jump').click({ timeout: 30_000 });
    await expect(hostTextbox).toBeFocused();

    await hostPresence.first().click();
    await host.page.getByTestId('spacePlugin.presence.seeEveryone').click();
    const sidebar = host.page.locator('[data-scope="main"][data-part="complementary-sidebar"]');
    await expect(sidebar.getByTestId('spacePlugin.presence.row')).toHaveCount(1, { timeout: 30_000 });
    // The popover closed, so the companion's row is the only one left.
    await expect(row).toHaveCount(1);

    await sidebar.getByTestId('spacePlugin.membersCompanion.invite').click();
    await expect(host.page.getByTestId('membersContainer.createInvitation.more')).toBeVisible({ timeout: 15_000 });
  });

  test(
    "the sessions toggle lists a row per peer's session, each with its own Jump",
    { tag: ['@space:QA-4'] },
    async () => {
      test.setTimeout(150_000);

      await host.createSpace();
      await host.createObject({ type: 'Document' });
      const hostPlank = host.deck.plank();
      const hostTextbox = Markdown.getMarkdownTextboxWithLocator(hostPlank.locator);
      await hostTextbox.waitFor();

      await perfomInvitation(host, guest);
      await guest.expandSection('spacePlugin.collectionsSection');
      await navigateToNewDocument(guest);
      const guestTextbox = Markdown.getMarkdownTextboxWithLocator(guest.deck.plank().locator);
      await guestTextbox.waitFor();
      await guestTextbox.focus();
      await guestTextbox.fill('Hello from the guest');

      // A second tab of the guest's is a second session of the same identity.
      const secondTab = await guest.page.context().newPage();
      await secondTab.goto(guest.page.url());
      const secondTextbox = Markdown.getMarkdownTextboxWithLocator(secondTab.getByTestId('deck.plank').first());
      await secondTextbox.waitFor({ timeout: 60_000 });
      await secondTextbox.focus();

      const hostPresence = hostPlank.membersPresence();
      await expect(hostPresence).toHaveCount(1, { timeout: 45_000 });
      await hostPresence.first().click();

      const row = host.page.getByTestId('spacePlugin.presence.row');
      const sessions = host.page.getByTestId('spacePlugin.presence.session');
      await expect(row).toHaveCount(1);
      await expect(row).toContainText('2 sessions', { timeout: 45_000 });
      await host.page.getByTestId('spacePlugin.presence.showSessions').click();
      await expect(sessions).toHaveCount(2);
      await expect(row).toHaveCount(0);

      await sessions.first().getByTestId('spacePlugin.presence.jump').click({ timeout: 30_000 });
      await expect(hostTextbox).toBeFocused();
    },
  );
});
