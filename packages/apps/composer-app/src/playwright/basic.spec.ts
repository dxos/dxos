//
// Copyright 2023 DXOS.org
//

import { test } from '@playwright/test';
import { expect } from 'chai';
import { platform } from 'node:os';
import waitForExpect from 'wait-for-expect';

import { AppManager } from './app-manager';

test.describe('Basic test', () => {
  let host: AppManager;
  let guest: AppManager;

  // TODO(wittjosiah): Currently not running in Firefox.
  //   https://bugzilla.mozilla.org/show_bug.cgi?id=1247687
  test.beforeAll(async ({ browser, browserName }) => {
    host = new AppManager(browser, true);

    await host.init();
    guest = new AppManager(browser, true);
    await guest.init();
  });

  test.describe('Single-player tests', () => {
    test('create identity, space is created by default', async () => {
      await host.shell.createIdentity('host');
      await waitForExpect(async () => {
        expect(await host.isAuthenticated()).to.be.true;
        expect(await host.getSpaceItemsCount()).to.equal(1);
      });
    });

    test('create space, which is displayed in tree', async () => {
      await host.createSpace();
      await waitForExpect(async () => {
        expect(await host.getSpaceItemsCount()).to.equal(2);
      });
    });

    test('create document', async () => {
      await host.createDocument();
      const textBox = await host.getMarkdownTextbox();
      const title = await host.getDocumentTitleInput();
      await waitForExpect(async () => {
        expect(await host.getDocumentItemsCount()).to.equal(1);
        expect(await textBox.isEditable()).to.be.true;
        expect(await title.isEditable()).to.be.true;
      });
    });
  });

  // TODO(wittjosiah): WebRTC only available in chromium browser for testing currently.
  //   https://github.com/microsoft/playwright/issues/2973
  test.describe('Collaboration tests', () => {
    test('guest joins host’s space', async ({ browserName }) => {
      test.skip(platform() !== 'darwin' && browserName === 'webkit');

      await guest.shell.createIdentity('guest');
      const invitationCode = await host.shell.createSpaceInvitation();
      const authCode = await host.shell.getAuthCode();
      await guest.joinSpace();
      await guest.shell.acceptSpaceInvitation(invitationCode);
      await guest.shell.authenticate(authCode);
      await host.shell.closeShell();
      await host.page.getByRole('link').last().click();
      await host.waitForMarkdownTextbox();
      await waitForExpect(async () => {
        expect(await host.page.url()).to.include(await guest.page.url());
      });
    });

    test('guest can see same documents on join', async ({ browserName }) => {
      test.skip(platform() !== 'darwin' && browserName === 'webkit');

      const hostLinks = await Promise.all([host.getDocumentLinks().nth(0).getAttribute('data-itemid')]);
      const guestLinks = await Promise.all([guest.getDocumentLinks().nth(0).getAttribute('data-itemid')]);
      expect(hostLinks[0]).to.equal(guestLinks[0]);
    });

    test('host and guest can see each others’ presence when same document is in focus', async ({ browserName }) => {
      test.skip(platform() !== 'darwin' && browserName === 'webkit');

      await Promise.all([
        host.getDocumentLinks().nth(0).click(),
        guest.getDocumentLinks().nth(0).click(),
        host.waitForMarkdownTextbox(),
        guest.waitForMarkdownTextbox(),
      ]);
      await waitForExpect(async () => {
        expect(await host.getCollaboratorCursors().count()).to.equal(0);
        expect(await guest.getCollaboratorCursors().count()).to.equal(0);
      });
      await host.getMarkdownTextbox().focus();
      await guest.getMarkdownTextbox().focus();
      // TODO(burdon): Temporarily disable presence test in order to test replication.
      //  Figure out how to decouple tests.
      // TODO(burdon): https://github.com/dxos/dxos/pull/3777
      // await waitForExpect(async () => {
      //   expect(await host.getCollaboratorCursors().first().textContent()).to.equal('guest');
      //   expect(await guest.getCollaboratorCursors().first().textContent()).to.equal('host');
      // });
    });

    test('host and guest can see each others’ changes in same document', async ({ browserName }) => {
      test.skip(platform() !== 'darwin' && browserName === 'webkit');

      const parts = [
        'Lorem ipsum dolor sit amet,',
        ' consectetur adipiscing elit,',
        ' sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
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

  const describeGithubIntegration = (process.env.GITHUB_PAT?.length ?? -1) > 0 ? test.describe : test.describe.skip;

  describeGithubIntegration('Github integration', () => {
    test.skip('add Github PAT to profile', () => {});
  });
});
