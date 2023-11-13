//
// Copyright 2023 DXOS.org
//

import { test } from '@playwright/test';
import { expect } from 'chai';
import { platform } from 'node:os';
import waitForExpect from 'wait-for-expect';

import { AppManager } from './app-manager';

const perfomInvitation = async (host: AppManager, guest: AppManager) => {
  const invitationCode = await host.shell.createSpaceInvitation();
  const authCode = await host.shell.getAuthCode();
  await guest.joinSpace();
  await guest.shell.acceptSpaceInvitation(invitationCode);
  await guest.shell.authenticate(authCode);
  await host.shell.closeShell();
};

test.describe('Basic test', () => {
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

  // TODO(wittjosiah): WebRTC only available in chromium browser for testing currently.
  //   https://github.com/microsoft/playwright/issues/2973
  test.describe('Collaboration tests', () => {
    test('guest joins host’s space', async () => {
      test.slow();

      await host.createSpace();
      await host.createDocument();
      await perfomInvitation(host, guest);

      // TODO(wittjosiah): Currently the guest lands on the space folder, not the document.
      //  Consider whether this is the desired behavior before removing this check.
      // await guest.waitForMarkdownTextbox();
      // await waitForExpect(async () => {
      //   expect(await host.page.url()).to.include(await guest.page.url());
      // });

      await waitForExpect(async () => {
        const hostLink = await host.getObjectLinks().last().getAttribute('data-itemid');
        const guestLink = await guest.getObjectLinks().last().getAttribute('data-itemid');
        expect(hostLink).to.equal(guestLink);
      });
    });

    test('host and guest can see each others’ presence when same document is in focus', async () => {
      test.slow();

      await host.createSpace();
      await host.createDocument();
      await host.waitForMarkdownTextbox();
      await perfomInvitation(host, guest);

      await waitForExpect(async () => {
        expect(await guest.getObjectsCount()).to.equal(2);
      });
      await guest.getObjectLinks().last().click();
      await guest.waitForMarkdownTextbox();
      await waitForExpect(async () => {
        expect(await host.getCollaboratorCursors().count()).to.equal(0);
        expect(await guest.getCollaboratorCursors().count()).to.equal(0);
      });
      await host.getMarkdownTextbox().focus();
      await guest.getMarkdownTextbox().focus();
      await waitForExpect(async () => {
        expect(await host.getCollaboratorCursors().first().textContent()).to.have.lengthOf.above(0);
        expect(await guest.getCollaboratorCursors().first().textContent()).to.have.lengthOf.above(0);
      });
    });

    test('host and guest can see each others’ changes in same document', async () => {
      test.slow();

      await host.createSpace();
      await host.createDocument();
      await host.waitForMarkdownTextbox();
      await perfomInvitation(host, guest);

      const parts = [
        'Lorem ipsum dolor sit amet,',
        ' consectetur adipiscing elit,',
        ' sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      ];
      const allParts = parts.join('');

      await waitForExpect(async () => {
        expect(await guest.getObjectsCount()).to.equal(2);
      });
      await guest.getObjectLinks().last().click();
      await guest.waitForMarkdownTextbox();
      await host.getMarkdownTextbox().type(parts[0]);
      await guest.getMarkdownTextbox().getByText(parts[0]).waitFor();
      await guest.getMarkdownTextbox().press('End');
      await guest.getMarkdownTextbox().type(parts[1]);
      await host.getMarkdownTextbox().getByText([parts[0], parts[1]].join('')).waitFor();
      await host.getMarkdownTextbox().press('End');
      await host.getMarkdownTextbox().type(parts[2]);
      await guest.getMarkdownTextbox().getByText(allParts).waitFor();
      // TODO(thure): Just pressing 'End' was not enough to move the cursor to the end of the test string on my local device; validate that these presses work in CI.
      await Promise.all([host.getMarkdownTextbox().press('End'), guest.getMarkdownTextbox().press('End')]);
      await Promise.all([host.getMarkdownTextbox().press('ArrowDown'), guest.getMarkdownTextbox().press('ArrowDown')]);
      // await Promise.all([host.page.pause(), guest.page.pause()]);
      await host.getMarkdownTextbox().getByText(allParts).waitFor();
      const hostContent = await host.getMarkdownActiveLineText();
      const guestContent = await guest.getMarkdownActiveLineText();
      expect(hostContent).to.equal(guestContent);
    });
  });
});
