//
// Copyright 2026 DXOS.org
//

import { expect, test } from '@playwright/test';

import { AppManager } from './app-manager.ts';
import { Inbox, installInboxMock } from './plugins/index.ts';

// The PWA service worker breaks `page.route` interception; require it disabled.
if (process.env.DX_PWA !== 'false') {
  throw new Error('Inbox e2e must run with DX_PWA=false');
}

/**
 * Whether the app under test syncs a newly connected account on its own. Mirrors `MAIL_AUTO_SYNC` in
 * plugin-inbox's connector capability — a stale value here fails these tests rather than quietly
 * exercising the other path, since the two configurations differ in whether "Sync now" is pressed.
 */
const AUTO_SYNC = true;

/**
 * Skipped: every test here reaches a populated mailbox by running a real sync, and mail sync now runs
 * on EDGE (`MAIL_REMOTE_SYNC` in plugin-inbox's connector capability). An EDGE-run sync issues no
 * request from the browser, so `installInboxMock`'s `page.route` fixture is never reached and the
 * mailbox stays empty — the failure is the harness, not the app.
 *
 * TODO(wittjosiah): Restore by seeding the mailbox instead of syncing it — create the Mailbox and its
 *   messages directly (as `seedMailboxBinding` does in plugin-inbox's testing package), then assert on
 *   the UI. Sync mechanics are already covered by plugin-inbox's sync tests against these same
 *   fixtures, so the suite loses nothing by not driving a sync, and it stops depending on where sync
 *   runs.
 */
test.describe.skip('Inbox', () => {
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
    // App startup plus a first sync outlasts the default per-test budget; claimed here, before any
    // step spends it.
    test.slow();
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
    await expectPopulated();
    return mock;
  };

  // A first sync creates the sync Routine and then waits on the trigger dispatcher to run it, which
  // outlasts the default assertion timeout.
  const expectPopulated = async () => {
    await expect(Inbox.rows(host.page).first()).toBeVisible({ timeout: 45_000 });
    expect(await Inbox.rows(host.page).count()).toBeGreaterThan(0);
  };

  test('JMAP: connecting an account syncs it with no sync press', async () => {
    test.skip(!AUTO_SYNC, 'auto sync is off; the mailbox waits for a sync press');
    await connectMailbox();

    // Nothing presses "Sync now": binding the connection is what runs the connector's sync.
    await expectPopulated();
  });

  test('JMAP: a connected account populates when sync is pressed', async () => {
    test.skip(AUTO_SYNC, 'auto sync populates the mailbox on connect');
    await connectMailbox();

    // The sync button is the only thing that fills the mailbox, so it is empty until pressed.
    await expect(Inbox.rows(host.page)).toHaveCount(0);
    await Inbox.sync(host.page);

    await expectPopulated();
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
