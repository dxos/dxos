//
// Copyright 2023 DXOS.org
//

import { expect, test } from '@playwright/test';

import { AppManager } from './app-manager';
import { Markdown } from './plugins';

const perfomInvitation = async (host: AppManager, guest: AppManager) => {
  const spaceId = host.currentSpaceId;
  await host.shareSpace();
  const invitationCode = await host.createSpaceInvitation();
  const authCode = await host.getAuthCode();
  await guest.joinSpace();
  await guest.shell.acceptSpaceInvitation(invitationCode);
  await guest.shell.authenticate(authCode);
  // Authenticating does not itself move the guest into the space: until the app switches
  // workspaces the navtree still being rendered is the one the guest is leaving, which answers
  // object queries with its own contents.
  await guest.waitForSpace(spaceId);
  await navigateToNewDocument(host);
};

const navigateToNewDocument = async (app: AppManager) => {
  await app.navigateToObject(0); // New document.
};

// Two-peer WebRTC runs on all browsers in CI. The Claude cloud sandbox is the exception — webkit peers
// there time out waiting for transport, so cross-browser results come from CI, not local runs. Ignore
// webkit's `'allow-presentation'` console flood here, from MediaPlayer's iframe sandbox.
//
// Stability here waits on DX-1152 (production-edge two-peer stalls: invitations and replication) —
// these tests stay ENABLED in the meantime, both as sensors for that defect and because skipping one
// victim of a shared cause just moves the failure to the next test.
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

  test("guest joins host's space", async () => {
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
    await guest.toggleSection('spacePlugin.collectionsSection');
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
  test.skip("host and guest can see each others' cursors when same document is in focus", async () => {
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
    await guest.toggleSection('spacePlugin.collectionsSection');
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
  });

  test("host and guest can see each others' changes in same document", async () => {
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
    await guest.toggleSection('spacePlugin.collectionsSection');
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

  // TODO(wittjosiah): Fix.
  test.skip('peers can see each others presence', async () => {
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
    await guest.toggleSection('spacePlugin.collectionsSection');
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
});
