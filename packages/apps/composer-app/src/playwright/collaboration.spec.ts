//
// Copyright 2023 DXOS.org
//

import { test, expect as playwrightExpect } from '@playwright/test';
import { expect } from 'chai';
import { platform } from 'node:os';
import waitForExpect from 'wait-for-expect';

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

  test('guest joins host’s space', async () => {
    // Host creates a space and adds a markdown object
    await host.createSpace();
    await host.createObject('markdownPlugin');

    // Focus new editor before space invitation.
    const markdownPlanks = await host.planks.getPlanks({ filter: 'markdown' });
    expect(markdownPlanks.length).to.equal(2);
    const newDocumentLocator = markdownPlanks[0].locator;
    const hostTextbox = Markdown.getMarkdownTextboxWithLocator(newDocumentLocator);
    await hostTextbox.focus();
    await hostTextbox.fill('Hello from the host');

    // Perform invitation to the guest.
    await perfomInvitation(host, guest);

    // Guest waits for the space to be ready and confirms it has the markdown object.
    await guest.waitForSpaceReady();
    await waitForExpect(async () => {
      expect(await guest.getObjectsCount()).to.equal(2);
    });

    // Guest opens the shared markdown plank.
    await guest.getObjectLinks().last().click();

    // Update to use plank locator
    const guestMarkdownPlanks = await guest.planks.getPlanks({ filter: 'markdown' });
    const guestSharedMarkdownLocator = guestMarkdownPlanks[0].locator;
    const guestMarkdownDoc = Markdown.getMarkdownTextboxWithLocator(guestSharedMarkdownLocator);

    await waitForExpect(async () => {
      await playwrightExpect(guestMarkdownDoc).toHaveText('Hello from the host');

      // TODO(Zan): How should we handle URL comparisons now that we're in decklandia?

      // Verify URLs and object links match between host and guest.
      // expect(await host.page.url()).to.equal(await guest.page.url());
      // const hostLink = await host.getObjectLinks().last().getAttribute('data-itemid');
      // const guestLink = await guest.getObjectLinks().last().getAttribute('data-itemid');
      // expect(hostLink).to.equal(guestLink);
    });
  });

  test('host and guest can see each others’ presence when same document is in focus', async () => {
    await host.createSpace();
    await host.createObject('markdownPlugin');

    const hostMarkdownPlanks = await host.planks.getPlanks({ filter: 'markdown' });
    expect(hostMarkdownPlanks.length).to.equal(2);
    const hostSharedMarkdownLocator = hostMarkdownPlanks[0].locator;

    await Markdown.waitForMarkdownTextboxWithLocator(hostSharedMarkdownLocator);
    await perfomInvitation(host, guest);

    await guest.waitForSpaceReady();
    await waitForExpect(async () => {
      expect(await guest.getObjectsCount()).to.equal(2);
    });

    // Close the space collection in guest.
    const guestSpaceCollectionPlank = (await guest.planks.getPlanks({ filter: 'collection' }))[0];
    await guest.planks.closePlank(guestSpaceCollectionPlank.qualifiedId);

    // Open the shared markdown plank in the guest.
    await guest.getObjectLinks().last().click();

    // Find the plank in the guest.
    const guestMarkdownPlanks = await guest.planks.getPlanks({ filter: 'markdown' });
    expect(guestMarkdownPlanks.length).to.equal(2);
    const guestSharedMarkdownLocator = hostMarkdownPlanks[0].locator;

    await Markdown.waitForMarkdownTextboxWithLocator(guestSharedMarkdownLocator);
    await Markdown.getMarkdownTextboxWithLocator(guestSharedMarkdownLocator).blur();

    await waitForExpect(async () => {
      expect(await Markdown.getCollaboratorCursorsWithLocator(hostSharedMarkdownLocator).count()).to.equal(1);
      expect(await Markdown.getCollaboratorCursorsWithLocator(guestSharedMarkdownLocator).count()).to.equal(1);
    });

    await Markdown.getMarkdownTextboxWithLocator(hostSharedMarkdownLocator).focus();
    await Markdown.getMarkdownTextboxWithLocator(guestSharedMarkdownLocator).focus();

    await waitForExpect(async () => {
      expect(
        await Markdown.getCollaboratorCursorsWithLocator(hostSharedMarkdownLocator).first().textContent(),
      ).to.have.lengthOf.above(0);
      expect(
        await Markdown.getCollaboratorCursorsWithLocator(guestSharedMarkdownLocator).first().textContent(),
      ).to.have.lengthOf.above(0);
    });
  });

  test('host and guest can see each others’ changes in same document', async () => {
    await host.createSpace();
    await host.createObject('markdownPlugin');

    // Get host's markdown planks and find the locator for the new document
    const hostMarkdownPlanks = await host.planks.getPlanks({ filter: 'markdown' });
    const hostSharedMarkdownLocator = hostMarkdownPlanks[0].locator;

    // Focus on host's textbox and wait for it to be ready
    const hostTextbox = Markdown.getMarkdownTextboxWithLocator(hostSharedMarkdownLocator);
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
    await waitForExpect(async () => {
      expect(await guest.getObjectsCount()).to.equal(2);
    });

    // Guest opens the shared markdown plank
    await guest.getObjectLinks().last().click();

    // Get guest's markdown planks and find the locator for the shared document
    const guestMarkdownPlanks = await guest.planks.getPlanks({ filter: 'markdown' });
    const { locator: guestSharedMarkdownLocator } = guestMarkdownPlanks[0];

    const guestTextbox = Markdown.getMarkdownTextboxWithLocator(guestSharedMarkdownLocator);
    await guestTextbox.focus();

    // Host types the first part.
    await hostTextbox.focus();
    await host.page.keyboard.insertText(parts[0]);

    // Guest waits for the first part to appear.
    await waitForExpect(async () => {
      await playwrightExpect(guestTextbox).toContainText(parts[0]);
    });

    // Guest appends the second part.
    await guestTextbox.focus();
    await guest.page.keyboard.press('End');
    await guest.page.keyboard.insertText(parts[1]);

    // Host waits for the combined first and second parts to appear
    await waitForExpect(async () => {
      await playwrightExpect(hostTextbox).toContainText([parts[0], parts[1]].join(''));
    });

    // Host appends the third part
    await hostTextbox.focus();
    await host.page.keyboard.press('End');
    await host.page.keyboard.insertText(parts[2]);

    // Guest waits for the complete text
    await waitForExpect(async () => {
      await playwrightExpect(guestTextbox).toContainText(allParts);
    });

    // Move cursor to the end in both host and guest
    await Promise.all([host.page.keyboard.press('End'), guest.page.keyboard.press('End')]);

    // Move down the lines in both host and guest
    await Promise.all([host.page.keyboard.press('ArrowDown'), guest.page.keyboard.press('ArrowDown')]);

    // Verify final content is the same
    await waitForExpect(async () => {
      await playwrightExpect(hostTextbox).toContainText(allParts);
      await playwrightExpect(guestTextbox).toContainText(allParts);
    });
  });

  test('guest can jump to document host is viewing', async () => {
    await host.createSpace();
    await host.createObject('markdownPlugin');

    const { locator: hostMarkdownLocator, qualifiedId: hostMarkdownId } = (
      await host.planks.getPlanks({ filter: 'markdown' })
    )[0];

    await Markdown.waitForMarkdownTextboxWithLocator(hostMarkdownLocator);

    await perfomInvitation(host, guest);
    await guest.waitForSpaceReady();
    await waitForExpect(async () => {
      expect(await guest.getObjectsCount()).to.equal(2);
    });

    // Open the last created document in the guest.
    await guest.getObjectLinks().last().click();

    const { locator: guestSharedMarkdownLocator, qualifiedId: guestSharedMarkdownId } = (
      await guest.planks.getPlanks({ filter: 'markdown' })
    )[0];

    await Markdown.waitForMarkdownTextboxWithLocator(guestSharedMarkdownLocator);

    // TODO(wittjosiah): Initial viewing state is slow.
    await waitForExpect(async () => {
      expect((await host.planks.getPlankPresence(hostMarkdownId))?.viewing).to.equal(1);
      expect((await guest.planks.getPlankPresence(guestSharedMarkdownId))?.viewing).to.equal(1);
    }, 30_000);

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
