//
// Copyright 2023 DXOS.org
//

import { expect, test } from '@playwright/test';
import { platform } from 'node:os';

import { AppManager, INITIAL_SPACE_COUNT, INITIAL_URL } from './app-manager';

// TODO(wittjosiah): WebRTC only available in chromium browser for testing currently.
//   https://github.com/microsoft/playwright/issues/2973
test.describe('HALO tests', () => {
  let host: AppManager;
  let guest: AppManager;

  test.beforeEach(async ({ browser, browserName }) => {
    test.skip(browserName === 'firefox');
    test.skip(browserName === 'webkit' && platform() !== 'darwin');

    host = new AppManager(browser, false);
    guest = new AppManager(browser, false);

    await host.init();
    await guest.init();
  });

  test.afterEach(async () => {
    // NOTE: `afterEach` even if the test is skipped in the beforeEach!
    // Guard against uninitialized app managers.
    if (host !== undefined || guest !== undefined) {
      await host.closePage();
      await guest.closePage();
    }
  });

  // Re-enabled with the transport defect fixed. `client.reset()` was rejecting with
  // `Service handler not available: FeedService.getSyncState`: a background sync-status poll
  // hitting torn-down services threw a DEFECT in the rpc dispatch, and the worker-pool client
  // treats a defect as a crashed connection — failing every in-flight call with it, including the
  // unrelated reset (so `onReset` never reloaded into the join dialog). Missing-handler dispatch
  // is now a typed per-request failure (`service-rpc.ts` makeClientServicesHandlers; regression
  // test in client-services effect-rpc.test.ts). Measured 20/20 across both device-join tests
  // after the fix, against 4-in-10 failures before it.
  test('join new identity', async () => {
    test.setTimeout(90_000);

    await host.createSpace();

    await expect(host.getSpaceItems()).toHaveCount(INITIAL_SPACE_COUNT + 1);
    // The guest has only its own default space until it joins the host's identity.
    await expect(guest.getSpaceItems()).toHaveCount(INITIAL_SPACE_COUNT);

    await host.openUserDevices();
    const invitationCode = await host.createDeviceInvitation();
    const authCode = await host.getAuthCode();
    await guest.openUserDevices();
    // joinNewIdentity resets storage and reloads into the device-invitation shell. The shell's
    // invitation input only mounts after that reload, so acceptDeviceInvitation's fill auto-waits
    // for it — no need to race the reload against a fixed deadline.
    await guest.joinNewIdentity();
    await guest.shell.acceptDeviceInvitation(invitationCode);
    await guest.shell.authenticateDevice(authCode);

    await expect(host.getSpaceItems()).toHaveCount(INITIAL_SPACE_COUNT + 1);
    // TODO(wittjosiah): Why so slow?
    // Wait for replication to complete — guest inherits all of host's spaces.
    await expect(guest.getSpaceItems()).toHaveCount(INITIAL_SPACE_COUNT + 1, { timeout: 60_000 });

    // TODO(wittjosiah): Display name is not currently set in this test.
    // await host.openIdentityManager();
    // await guest.openIdentityManager();
    // await waitForExpect(async () => {
    //   expect(await host.shell.getDisplayName()).to.equal(await guest.shell.getDisplayName());
    // });
  });

  // Re-enabled together with the test above (same transport defect; see its note). Historical
  // watch item if this flakes again: one pre-fix run saw the join complete but the host's space
  // never replicate to the guest within 60s — not reproduced in 10/10 post-fix runs.
  test('deleting a space replicates across devices', async () => {
    test.setTimeout(120_000);

    // Host creates a space; guest joins the host's identity and inherits it.
    await host.createSpace();
    await expect(host.getSpaceItems()).toHaveCount(INITIAL_SPACE_COUNT + 1);

    await host.openUserDevices();
    const invitationCode = await host.createDeviceInvitation();
    const authCode = await host.getAuthCode();
    await guest.openUserDevices();
    // joinNewIdentity resets storage and reloads into the device-invitation shell. The shell's
    // invitation input only mounts after that reload, so acceptDeviceInvitation's fill auto-waits
    // for it — no need to race the reload against a fixed deadline.
    await guest.joinNewIdentity();
    await guest.shell.acceptDeviceInvitation(invitationCode);
    await guest.shell.authenticateDevice(authCode);

    // Both devices see the shared space.
    await expect(guest.getSpaceItems()).toHaveCount(INITIAL_SPACE_COUNT + 1, { timeout: 60_000 });

    // Return the host to a clean navtree (the device-join flow left the account panel open).
    await host.page.goto(INITIAL_URL);
    await expect(host.getSpaceItems()).toHaveCount(INITIAL_SPACE_COUNT + 1, { timeout: 30_000 });

    // Delete the shared space on the host.
    await host.deleteSpace();

    // The deletion is applied locally on the host...
    await expect(host.getSpaceItems()).toHaveCount(INITIAL_SPACE_COUNT, { timeout: 30_000 });
    // ...and replicates to the guest via the HALO.
    await expect(guest.getSpaceItems()).toHaveCount(INITIAL_SPACE_COUNT, { timeout: 60_000 });
  });
});
