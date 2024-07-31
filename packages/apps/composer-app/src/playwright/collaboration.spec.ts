//
// Copyright 2023 DXOS.org
//

import { test, expect } from '@playwright/test';
import { platform } from 'node:os';

import { AppManager } from './app-manager';
import { Markdown } from './plugins';

const perfomInvitation = async (host: AppManager, guest: AppManager) => {
  await host.openSpaceManager();
  const invitationCode = await host.shell.createSpaceInvitation();
  const authCode = await host.shell.getAuthCode();
  await guest.joinSpace();
  await guest.shell.acceptSpaceInvitation(invitationCode);
  await guest.shell.authenticate(authCode);
  await host.shell.closeShell();
};

// TODO(wittjosiah): WebRTC only available in chromium browser for testing currently.
//   https://github.com/microsoft/playwright/issues/2973
test.describe('Collaboration tests', () => {
  let host: AppManager;
  let guest: AppManager;

  test.beforeEach(async ({ browser, browserName }) => {
    test.skip(browserName === 'firefox');
    test.skip(browserName === 'webkit' && platform() !== 'darwin');

    host = new AppManager(browser, true);
    guest = new AppManager(browser, true);

    await host.init();
    await guest.init();
  });

  test.afterEach(async () => {
    // NOTE: `afterEach` even if the test is skipped in the beforeEach!
    // Guard against uninitialized app managers.
    if (host !== undefined && guest !== undefined) {
      await host.closePage();
      await guest.closePage();
    }
  });

  test('guest joins host’s space', async () => {
    // Host creates a space and adds a markdown object
    await host.createSpace();
    await host.createObject('markdownPlugin');

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
    await guest.toggleSpaceCollapsed(1);
    await expect(guest.getObjectLinks()).toHaveCount(1);

    await guest.page.pause();

    {
      // Update to use plank locator
      const plank = guest.deck.plank();
      const guestMarkdownDoc = Markdown.getMarkdownTextboxWithLocator(plank.locator);
      await expect(guestMarkdownDoc).toHaveText('Hello from the host', { timeout: 10_000 });

      // TODO(Zan): How should we handle URL comparisons now that we're in decklandia?

      // Verify URLs and object links match between host and guest.
      // expect(await host.page.url()).to.equal(await guest.page.url());
      // const hostLink = await host.getObjectLinks().last().getAttribute('data-itemid');
      // const guestLink = await guest.getObjectLinks().last().getAttribute('data-itemid');
      // expect(hostLink).to.equal(guestLink);
    }
  });

  test('host and guest can see each others’ presence when same document is in focus', async () => {
    await host.createSpace();
    await host.createObject('markdownPlugin');

    const hostPlank = host.deck.plank();
    await Markdown.waitForMarkdownTextboxWithLocator(hostPlank.locator);
    await perfomInvitation(host, guest);

    await guest.waitForSpaceReady();
    await guest.toggleSpaceCollapsed(1);
    await expect(guest.getObjectLinks()).toHaveCount(1);

    // Close the space collection in guest.
    const guestSpaceCollectionPlank = guest.deck.plank();
    await guestSpaceCollectionPlank.close();

    // Open the shared markdown plank in the guest.
    await guest.getObjectLinks().last().click();

    // Find the plank in the guest.
    const guestPlank = guest.deck.plank();
    await Markdown.waitForMarkdownTextboxWithLocator(guestPlank.locator);
    await Markdown.getMarkdownTextboxWithLocator(guestPlank.locator).blur();

    await expect(Markdown.getCollaboratorCursorsWithLocator(hostPlank.locator)).toHaveCount(0);
    await expect(Markdown.getCollaboratorCursorsWithLocator(guestPlank.locator)).toHaveCount(0);

    await Markdown.getMarkdownTextboxWithLocator(hostPlank.locator).focus();
    await Markdown.getMarkdownTextboxWithLocator(guestPlank.locator).focus();

    await expect(Markdown.getCollaboratorCursorsWithLocator(hostPlank.locator).first()).toHaveText(/.+/);
    await expect(Markdown.getCollaboratorCursorsWithLocator(guestPlank.locator).first()).toHaveText(/.+/);
  });

  test('host and guest can see each others’ changes in same document', async () => {
    await host.createSpace();
    await host.createObject('markdownPlugin');

    // Focus on host's textbox and wait for it to be ready
    const hostPlank = host.deck.plank();
    const hostTextbox = Markdown.getMarkdownTextboxWithLocator(hostPlank.locator);
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
    await guest.toggleSpaceCollapsed(1);
    await expect(guest.getObjectLinks()).toHaveCount(1);

    // Guest opens the shared markdown plank
    await guest.getObjectLinks().last().click();

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

  test('guest can jump to document host is viewing', async () => {
    test.setTimeout(60_000);

    await host.createSpace();
    await host.createObject('markdownPlugin');

    const hostPlank = host.deck.plank();
    await Markdown.waitForMarkdownTextboxWithLocator(hostPlank.locator);

    await perfomInvitation(host, guest);
    await guest.waitForSpaceReady();
    await guest.toggleSpaceCollapsed(1);
    await expect(guest.getObjectLinks()).toHaveCount(1);

    // Open the last created document in the guest.
    await guest.getObjectLinks().last().click();

    const guestPlank = guest.deck.plank();
    await Markdown.waitForMarkdownTextboxWithLocator(guestPlank.locator);

    const hostPresence = hostPlank.membersPresence();
    const guestPresence = guestPlank.membersPresence();

    // TODO(wittjosiah): Initial viewing state is slow.
    await expect(hostPresence).toHaveCount(1, { timeout: 30_000 });
    await expect(guestPresence).toHaveCount(1, { timeout: 30_000 });
    await expect(hostPresence.first()).toHaveAttribute('data-status', 'current');
    await expect(guestPresence.first()).toHaveAttribute('data-status', 'current');

    // TODO(zan): We need to update deck presence indications for this to be a valid test.

    // await host.createObject('markdownPlugin');
    // const newDocId = (await hostPlankManager.getPlanks({ filter: 'markdown' }))[0].qualifiedId;

    // await waitForExpect(async () => {
    //   expect((await hostPlankManager.getPlankPresence(newDocId))?.viewing).to.equal(0);
    //   expect((await guestPlankManager.getPlankPresence(guestSharedMarkdownId))?.viewing).to.equal(0);
    // });

    // await guest.getSpacePresenceMembers().first().click();

    // // TODO(wittjosiah): Second document is taking a while to sync.
    // await waitForExpect(async () => {
    //   expect((await host.getSpacePresenceCount()).viewing).to.equal(1);
    //   expect((await guest.getSpacePresenceCount()).viewing).to.equal(1);
    // }, 20_000);
  });
});
