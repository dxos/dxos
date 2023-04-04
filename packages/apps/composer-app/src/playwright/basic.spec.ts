//
// Copyright 2023 DXOS.org
//

import { test } from '@playwright/test';
import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { AppManager } from './app-manager';

test.describe('Basic test', () => {
  let host: AppManager;
  let guest: AppManager;

  // TODO(wittjosiah): Currently not running in Firefox.
  //   https://bugzilla.mozilla.org/show_bug.cgi?id=1247687
  test.beforeAll(async ({ browser, browserName }) => {
    host = new AppManager(browser, false);

    await host.init();
    // TODO(wittjosiah): WebRTC only available in chromium browser for testing currently.
    //   https://github.com/microsoft/playwright/issues/2973
    guest = browserName === 'chromium' ? new AppManager(browser, false) : host;
    if (browserName === 'chromium') {
      await guest.init();
    }
  });

  test.describe('Solo tests', () => {
    test('create identity, space is created by default', async () => {
      await host.shell.createIdentity('host');
      await waitForExpect(async () => {
        expect(await host.isAuthenticated()).to.be.true;
        expect(await host.getNSpaceItems()).to.equal(1);
      });
    });

    test('create space, document is created by default, is displayed in tree', async () => {
      await host.createSpace();
      await waitForExpect(async () => {
        expect(await host.getNSpaceItems()).to.equal(2);
        expect(await host.getNDocumentItems()).to.equal(1);
      });
    });

    test('create document', async () => {
      await host.createDocument();
      const textBox = await host.getMarkdownTextbox();
      const title = await host.getDocumentTitleInput();
      await waitForExpect(async () => {
        expect(await host.getNDocumentItems()).to.equal(2);
        expect(await textBox.isEditable()).to.be.true;
        expect(await title.isEditable()).to.be.true;
      });
    });
  });

  test.describe('Collab tests', () => {
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
        host.page.getByRole('link').nth(0).getAttribute('href'),
        host.page.getByRole('link').nth(1).getAttribute('href')
      ]);
      const guestLinks = await Promise.all([
        guest.page.getByRole('link').nth(0).getAttribute('href'),
        guest.page.getByRole('link').nth(1).getAttribute('href')
      ]);
      expect(hostLinks[0]).to.equal(guestLinks[0]);
      expect(hostLinks[1]).to.equal(guestLinks[1]);
    });

    test('host and guest can see each others’ presence when same document is in focus', async () => {
      await Promise.all([
        host.page.getByRole('link').nth(0).click(),
        guest.page.getByRole('link').nth(0).click(),
        host.waitForMarkdownTextbox(),
        guest.waitForMarkdownTextbox()
      ]);
      await waitForExpect(async () => {
        expect(await host.page.locator('.cm-ySelectionInfo').count()).to.equal(0);
        expect(await guest.page.locator('.cm-ySelectionInfo').count()).to.equal(0);
      });
      await host.getMarkdownTextbox().focus();
      await guest.getMarkdownTextbox().focus();
      await waitForExpect(async () => {
        expect(await host.page.locator('.cm-ySelectionInfo').first().textContent()).to.equal('guest');
        expect(await guest.page.locator('.cm-ySelectionInfo').first().textContent()).to.equal('host');
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
      await Promise.all([host.getMarkdownTextbox().press('ArrowDown'), guest.getMarkdownTextbox().press('ArrowDown')]);
      await Promise.all([host.getMarkdownTextbox().press('ArrowDown'), guest.getMarkdownTextbox().press('ArrowDown')]);
      // await Promise.all([host.page.pause(), guest.page.pause()]);
      await host.getMarkdownTextbox().getByText(allParts).waitFor();
      const hostContent = await host
        .getMarkdownTextbox()
        .locator('.cm-activeLine > span:not([class=cm-ySelectionCaret])')
        .first()
        .textContent();
      const guestContent = await guest
        .getMarkdownTextbox()
        .locator('.cm-activeLine > span:not([class=cm-ySelectionCaret])')
        .first()
        .textContent();
      await waitForExpect(async () => {
        expect(hostContent).to.equal(guestContent);
      });
    });
  });

  const describeGithubIntegration = (process.env.GITHUB_PAT?.length ?? -1) > 0 ? test.describe : test.describe.skip;

  describeGithubIntegration('Github integration', () => {
    test('add Github PAT to profile', () => {});
  });
});
