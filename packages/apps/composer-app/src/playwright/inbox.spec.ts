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

/**
 * Whether the app under test syncs a newly connected account on its own. Mirrors `MAIL_AUTO_SYNC` in
 * plugin-inbox's connector capability — a stale value here fails these tests rather than quietly
 * exercising the other path, since the two configurations differ in whether "Sync now" is pressed.
 */
const AUTO_SYNC = false;

test.describe('Inbox', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, false);
    await host.init();
  });

  test.afterEach(async () => {
    await host.closePage();
  });

  // Create a JMAP-connected mailbox by driving the real credential form; provider HTTP is served by
  // the fixture-backed mock.
  const connectMailbox = async () => {
    // The inbox plugin is enabled by default (see composer-app plugin-defs getDefaults).
    const mock = await installInboxMock(host.page, { account: 'me@jmap.test' });
    await host.createSpace();
    await host.createObject({ type: 'Mailbox' });
    await expect(Inbox.mailbox(host.page)).toBeVisible();
    await Inbox.connectJmap(host.page, { host: 'mail.test', email: 'me@jmap.test', token: 'fake-token' });
    return mock;
  };

  // A populated mailbox, however this build gets there: whichever of the two paths below is live.
  // Generic mailbox behaviour is exercised on top of this (JMAP always runs).
  const openSyncedMailbox = async () => {
    const mock = await connectMailbox();
    if (!AUTO_SYNC) {
      await Inbox.sync(host.page);
    }
    await expect(Inbox.rows(host.page).first()).toBeVisible();
    return mock;
  };

  test('JMAP: connecting an account syncs it with no sync press', async () => {
    test.skip(!AUTO_SYNC, 'auto sync is off; the mailbox waits for a sync press');
    await connectMailbox();

    // Nothing presses "Sync now": binding the connection is what runs the connector's sync.
    await expect(Inbox.rows(host.page).first()).toBeVisible();
    expect(await Inbox.rows(host.page).count()).toBeGreaterThan(0);
  });

  test('JMAP: a connected account populates when sync is pressed', async () => {
    test.skip(AUTO_SYNC, 'auto sync populates the mailbox on connect');
    await connectMailbox();

    // The sync button is the only thing that fills the mailbox, so it is empty until pressed.
    await expect(Inbox.rows(host.page)).toHaveCount(0);
    await Inbox.sync(host.page);

    await expect(Inbox.rows(host.page).first()).toBeVisible();
    expect(await Inbox.rows(host.page).count()).toBeGreaterThan(0);
  });

  test('selecting a thread opens the message companion', async () => {
    await openSyncedMailbox();
    await Inbox.selectFirstThread(host.page);
    await expect(host.page.getByTestId('message-header').first()).toBeVisible();
  });

  test('JMAP: reply sends', async () => {
    const mock = await openSyncedMailbox();
    await Inbox.selectFirstThread(host.page);
    await Inbox.reply(host.page, 'Thanks, sounds good.');
    // The reply round-trips through JMAP submission; assert on the recorded provider calls.
    await expect.poll(() => mock.calls).toContain('EmailSubmission/set');
    await expect(host.page.getByTestId(/^notify-success-/).first()).toBeVisible();
  });
});
