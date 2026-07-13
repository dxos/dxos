//
// Copyright 2026 DXOS.org
//

import { expect, test } from '@playwright/test';

import { AppManager } from './app-manager';
import { Inbox, installInboxMock } from './plugins';

// The PWA service worker breaks `page.route` interception; require it disabled.
if (process.env.DX_PWA !== 'false') {
  throw new Error('Inbox e2e must run with DX_PWA=false');
}

test.describe('Inbox', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, false);
    await host.init();
  });

  test.afterEach(async () => {
    await host.closePage();
  });

  test('JMAP: connect and sync populate the mailbox', async () => {
    // The inbox plugin is enabled by default (see composer-app plugin-defs getDefaults).
    await installInboxMock(host.page, { account: 'me@jmap.test' });

    await host.createSpace();
    await host.createObject({ type: 'Mailbox' });
    await expect(Inbox.mailbox(host.page)).toBeVisible();

    await Inbox.connectJmap(host.page, { host: 'mail.test', email: 'me@jmap.test', token: 'fake-token' });
    await Inbox.sync(host.page);

    await expect(Inbox.rows(host.page).first()).toBeVisible();
    expect(await Inbox.rows(host.page).count()).toBeGreaterThan(0);
  });
});
