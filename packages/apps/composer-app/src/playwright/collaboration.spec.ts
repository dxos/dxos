//
// Copyright 2023 DXOS.org
//

import { test } from '@playwright/test';
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
  test.setTimeout(60_000);

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
    await host.createSpace();
    await host.createObject('markdownPlugin');
    await perfomInvitation(host, guest);

    await guest.waitForSpaceReady();
    await waitForExpect(async () => {
      expect(await guest.getObjectsCount()).to.equal(2);
    });

    await guest.getObjectLinks().last().click();
    await Markdown.waitForMarkdownTextbox(guest.page);
    await waitForExpect(async () => {
      expect(await host.page.url()).to.equal(await guest.page.url());

      const hostLink = await host.getObjectLinks().last().getAttribute('data-itemid');
      const guestLink = await guest.getObjectLinks().last().getAttribute('data-itemid');
      expect(hostLink).to.equal(guestLink);
    });
  });

  test('host and guest can see each others’ presence when same document is in focus', async () => {
    await host.createSpace();
    await host.createObject('markdownPlugin');
    await Markdown.waitForMarkdownTextbox(host.page);
    await perfomInvitation(host, guest);

    await guest.waitForSpaceReady();
    await waitForExpect(async () => {
      expect(await guest.getObjectsCount()).to.equal(2);
    });

    await guest.getObjectLinks().last().click();
    await Markdown.waitForMarkdownTextbox(guest.page);
    await Markdown.getMarkdownTextbox(guest.page).blur();
    await waitForExpect(async () => {
      expect(await Markdown.getCollaboratorCursors(host.page).count()).to.equal(0);
      expect(await Markdown.getCollaboratorCursors(guest.page).count()).to.equal(0);
    });

    await Markdown.getMarkdownTextbox(host.page).focus();
    await Markdown.getMarkdownTextbox(guest.page).focus();
    await waitForExpect(async () => {
      expect(await Markdown.getCollaboratorCursors(host.page).first().textContent()).to.have.lengthOf.above(0);
      expect(await Markdown.getCollaboratorCursors(guest.page).first().textContent()).to.have.lengthOf.above(0);
    });
  });

  test('host and guest can see each others’ changes in same document', async () => {
    await host.createSpace();
    await host.createObject('markdownPlugin');
    await Markdown.waitForMarkdownTextbox(host.page);
    await perfomInvitation(host, guest);

    const parts = [
      'Lorem ipsum dolor sit amet,',
      ' consectetur adipiscing elit,',
      ' sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    ];
    const allParts = parts.join('');

    await guest.waitForSpaceReady();
    await waitForExpect(async () => {
      expect(await guest.getObjectsCount()).to.equal(2);
    });

    await guest.getObjectLinks().last().click();
    await Markdown.waitForMarkdownTextbox(guest.page);
    await Markdown.getMarkdownTextbox(host.page).type(parts[0]);
    await Markdown.getMarkdownTextbox(guest.page).getByText(parts[0]).waitFor();
    await Markdown.getMarkdownTextbox(guest.page).press('End');
    await Markdown.getMarkdownTextbox(guest.page).type(parts[1]);
    await Markdown.getMarkdownTextbox(host.page).getByText([parts[0], parts[1]].join('')).waitFor();
    await Markdown.getMarkdownTextbox(host.page).press('End');
    await Markdown.getMarkdownTextbox(host.page).type(parts[2]);
    await Markdown.getMarkdownTextbox(guest.page).getByText(allParts).waitFor();
    await Promise.all([
      Markdown.getMarkdownTextbox(host.page).press('End'),
      Markdown.getMarkdownTextbox(guest.page).press('End'),
    ]);
    await Promise.all([
      Markdown.getMarkdownTextbox(host.page).press('ArrowDown'),
      Markdown.getMarkdownTextbox(guest.page).press('ArrowDown'),
    ]);
    await Markdown.getMarkdownTextbox(host.page).getByText(allParts).waitFor();

    const hostContent = await Markdown.getMarkdownLineText(host.page);
    const guestContent = await Markdown.getMarkdownLineText(guest.page);
    expect(hostContent).to.equal(guestContent);
  });

  test('guest can jump to document host is viewing', async () => {
    await host.createSpace();
    await host.createObject('markdownPlugin');
    await Markdown.waitForMarkdownTextbox(host.page);
    await perfomInvitation(host, guest);
    await guest.waitForSpaceReady();
    await waitForExpect(async () => {
      expect(await guest.getObjectsCount()).to.equal(2);
    });

    await guest.getObjectLinks().last().click();
    await Markdown.waitForMarkdownTextbox(guest.page);
    // TODO(wittjosiah): Initial viewing state is slow.
    await waitForExpect(async () => {
      expect(await host.page.url()).to.equal(await guest.page.url());
      expect((await host.getSpacePresenceCount()).viewing).to.equal(1);
      expect((await guest.getSpacePresenceCount()).viewing).to.equal(1);
    }, 30_000);

    await host.createObject('markdownPlugin');
    await waitForExpect(async () => {
      expect(await host.page.url()).not.to.equal(await guest.page.url());
      expect((await host.getSpacePresenceCount()).active).to.equal(1);
      expect((await guest.getSpacePresenceCount()).active).to.equal(1);
    });

    await guest.getSpacePresenceMembers().first().click();
    // TODO(wittjosiah): Second document is taking a while to sync.
    await waitForExpect(async () => {
      expect(await host.page.url()).to.equal(await guest.page.url());
      expect((await host.getSpacePresenceCount()).viewing).to.equal(1);
      expect((await guest.getSpacePresenceCount()).viewing).to.equal(1);
    }, 20_000);
  });
});
