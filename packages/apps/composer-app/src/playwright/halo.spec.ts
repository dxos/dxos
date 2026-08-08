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

  // TODO(wittjosiah): Still deferred, cause narrowed: after `joinNewIdentity()` resets storage and
  //   reloads, `halo-invitation-input` never mounts (1 of 6 serialized local runs; CI runs
  //   31131235658, 31271416331). RULED OUT: a welcome-screen/join-dialog update race — real, and
  //   now fixed in `OnboardingManager`, but composer e2e runs without a hubUrl, so `skipAuth`
  //   means the welcome screen never opens on this path. What remains is inside the post-reset
  //   join flow itself: `onReset` reloads with an EMPTY `?deviceInvitationCode=` (the guest never
  //   had one in its URL), so onboarding opens the join dialog with an empty initial code — the
  //   suspect is that empty-code path racing the shell's own mount. Instrument JOIN_DIALOG mount
  //   vs. `_openJoinIdentity` next.
  test.fixme('join new identity', async () => {
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

  // Shares the device-join flow (and its unresolved mount stall) with the test above. A second
  // hazard is specific to this test: the invitation code submits but `halo-auth-code-input` stays
  // disabled, so the handshake never reaches the auth stage (1 of 11 device invitations).
  test.fixme('deleting a space replicates across devices', async () => {
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
