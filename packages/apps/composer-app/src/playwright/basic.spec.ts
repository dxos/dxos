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

      // Wait for app to load identity.
      await waitForExpect(async () => {
        expect(await host.isAuthenticated()).to.be.true;
        expect(await host.getNSpaceItems()).to.equal(1);
      }, 1000);
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
      const textbox = await host.getMarkdownTextbox();
      const title = await host.getDocumentTitleInput();
      await waitForExpect(async () => {
        expect(await host.getNDocumentItems()).to.equal(2);
        expect(await textbox.isEditable()).to.be.true;
        expect(await title.isEditable()).to.be.true;
      });
    });
  });
});
