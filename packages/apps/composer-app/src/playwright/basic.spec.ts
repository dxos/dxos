//
// Copyright 2023 DXOS.org
//

import { test } from '@playwright/test';
import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { AppManager } from './app-manager';

test.describe.skip('Basic test', () => {
  let host: AppManager;
  let guest: AppManager;

  // TODO(wittjosiah): Currently not running in Firefox.
  //   https://bugzilla.mozilla.org/show_bug.cgi?id=1247687
  test.beforeAll(async ({ browser, browserName }) => {
    host = new AppManager(browser, true);

    await host.init();
    // TODO(wittjosiah): WebRTC only available in chromium browser for testing currently.
    //   https://github.com/microsoft/playwright/issues/2973
    guest = browserName === 'chromium' ? new AppManager(browser, true) : host;
    if (browserName === 'chromium') {
      await guest.init();
    }
  });

  test.describe.skip('Solo tests', () => {
    test('create identity, space is created by default', async () => {
      await host.shell.createIdentity('host');
      await waitForExpect(async () => {
        expect(await host.isAuthenticated()).to.be.true;
        expect(await host.getSpaceItemsCount()).to.equal(1);
      });
    });

    test('create space, document is created by default, is displayed in tree', async () => {
      await host.createSpace();
      await waitForExpect(async () => {
        expect(await host.getSpaceItemsCount()).to.equal(2);
        expect(await host.getDocumentItemsCount()).to.equal(1);
      });
    });

    test('create document', async () => {
      await host.createDocument();
      const textBox = await host.getMarkdownTextbox();
      const title = await host.getDocumentTitleInput();
      await waitForExpect(async () => {
        expect(await host.getDocumentItemsCount()).to.equal(2);
        expect(await textBox.isEditable()).to.be.true;
        expect(await title.isEditable()).to.be.true;
      });
    });
  });

  test.describe.skip('Collab tests', () => {
    test('guest joins host’s space', async ({ browserName }) => {
      if (browserName !== 'chromium') {
        return;
      }
      await guest.shell.createIdentity('guest');
      const invitationCode = await host.shell.createSpaceInvitation();
      await guest.joinSpace();
      const [authCode] = await Promise.all([
        host.shell.getAuthCode(),
        guest.shell.acceptSpaceInvitation(invitationCode)
      ]);
      await guest.shell.authenticate(authCode);
      await host.shell.closeShell();
      await host.page.getByRole('link').last().click();
      await host.waitForMarkdownTextbox();
      await waitForExpect(async () => {
        expect(await host.page.url()).to.include(await guest.page.url());
      });
    });

    test('guest can see same documents on join', async () => {
      const hostLinks = await Promise.all([
        host.getDocumentLinks().nth(0).getAttribute('href'),
        host.getDocumentLinks().nth(1).getAttribute('href')
      ]);
      const guestLinks = await Promise.all([
        guest.getDocumentLinks().nth(0).getAttribute('href'),
        guest.getDocumentLinks().nth(1).getAttribute('href')
      ]);
      expect(hostLinks[0]).to.equal(guestLinks[0]);
      expect(hostLinks[1]).to.equal(guestLinks[1]);
    });

    test('host and guest can see each others’ presence when same document is in focus', async () => {
      await Promise.all([
        host.getDocumentLinks().nth(0).click(),
        guest.getDocumentLinks().nth(0).click(),
        host.waitForMarkdownTextbox(),
        guest.waitForMarkdownTextbox()
      ]);
      await waitForExpect(async () => {
        expect(await host.getCollaboratorCursors().count()).to.equal(0);
        expect(await guest.getCollaboratorCursors().count()).to.equal(0);
      });
      await host.getMarkdownTextbox().focus();
      await guest.getMarkdownTextbox().focus();
      await waitForExpect(async () => {
        expect(await host.getCollaboratorCursors().first().textContent()).to.equal('guest');
        expect(await guest.getCollaboratorCursors().first().textContent()).to.equal('host');
      });
    });

    test('host and guest can see each others’ changes in same document', async () => {
      const parts = [
        'Lorem ipsum dolor sit amet,',
        ' consectetur adipiscing elit,',
        ' sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
      ];
      const allParts = parts.join('');

      await host.getMarkdownTextbox().type(parts[0]);
      await guest.getMarkdownTextbox().getByText(parts[0]).waitFor();
      await guest.getMarkdownTextbox().press('End');
      await guest.getMarkdownTextbox().type(parts[1]);
      await host.getMarkdownTextbox().getByText([parts[0], parts[1]].join('')).waitFor();
      await host.getMarkdownTextbox().press('End');
      await host.getMarkdownTextbox().type(parts[2]);
      await guest.getMarkdownTextbox().getByText(allParts).waitFor();
      // todo(thure): Just pressing 'End' was not enough to move the cursor to the end of the test string on my local device; validate that these presses work in CI.
      await Promise.all([host.getMarkdownTextbox().press('End'), guest.getMarkdownTextbox().press('End')]);
      await Promise.all([host.getMarkdownTextbox().press('ArrowDown'), guest.getMarkdownTextbox().press('ArrowDown')]);
      // await Promise.all([host.page.pause(), guest.page.pause()]);
      await host.getMarkdownTextbox().getByText(allParts).waitFor();
      const hostContent = await host.getMarkdownActiveLineText();
      const guestContent = await guest.getMarkdownActiveLineText();
      expect(hostContent).to.equal(guestContent);
    });
  });

  const describeGithubIntegration = (process.env.GITHUB_PAT?.length ?? -1) > 0 ? test.describe : test.describe.skip;

  describeGithubIntegration('Github integration', () => {
    test.skip('add Github PAT to profile', () => {});
  });
});
