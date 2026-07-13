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

  // Create a JMAP-connected, synced mailbox by driving the real credential form; provider HTTP is
  // served by the fixture-backed mock. Generic mailbox behaviour is exercised here (JMAP always runs).
  const openSyncedMailbox = async () => {
    // The inbox plugin is enabled by default (see composer-app plugin-defs getDefaults).
    const mock = await installInboxMock(host.page, { account: 'me@jmap.test' });
    await host.createSpace();
    await host.createObject({ type: 'Mailbox' });
    await expect(Inbox.mailbox(host.page)).toBeVisible();
    await Inbox.connectJmap(host.page, { host: 'mail.test', email: 'me@jmap.test', token: 'fake-token' });
    await Inbox.sync(host.page);
    await expect(Inbox.rows(host.page).first()).toBeVisible();
    return mock;
  };

  test('JMAP: connect and sync populate the mailbox', async () => {
    await openSyncedMailbox();
    expect(await Inbox.rows(host.page).count()).toBeGreaterThan(0);
  });

  test('selecting a thread opens the message companion', async () => {
    await openSyncedMailbox();
    await Inbox.selectFirstThread(host.page);
    await expect(host.page.getByTestId('message-header').first()).toBeVisible();
  });

  // FIXME(wittjosiah): The send op fails client-side with JmapSendMessageInvalidError ("Missing to or
  //   content"): Playwright's synthetic input into the EditMessage form (To field) and CodeMirror body
  //   isn't propagating to the ECHO message (onValuesChanged / editor onChange don't commit under
  //   test input), so `message.properties.to` + text block read empty at send. The mock, connect, and
  //   sync paths are all validated by the tests above; this needs the trace viewer to pin the
  //   form→object write-back. Reply must also be covered for Gmail (task #7e).
  test.fixme('JMAP: reply sends', async () => {
    await openSyncedMailbox();
    await Inbox.selectFirstThread(host.page);
    await Inbox.reply(host.page, { to: 'bob@jmap.test', body: 'Thanks, sounds good.' });
    await expect(host.page.getByText('Message sent')).toBeVisible();
  });
});
