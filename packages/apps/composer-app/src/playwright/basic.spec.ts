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
    test('guest can see same documents on join', async () => {});
    test('host and guest can see each others’ presence when same document is in focus', async () => {});
    test('host and guest can see each others’ changes in same document', async () => {});
  });

  const describeGithubIntegration = (process.env.GITHUB_PAT?.length ?? -1) > 0 ? test.describe : test.describe.skip;

  describeGithubIntegration('Github integration', () => {
    test('add Github PAT to profile', () => {});
  });
});
