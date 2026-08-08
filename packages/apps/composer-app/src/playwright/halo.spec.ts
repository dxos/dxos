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

  // TODO(wittjosiah): Deferred, and the stall is UPSTREAM of the join UI. DOM of a failing run
  //   (1 in 6 serialized, 2026-08-08): the guest is still on the account/devices plank with no
  //   shell dialog present at all — so `client.reset()` + the `onReset` reload never completed and
  //   `JoinPanel` never mounted. `localStorage.clear()` runs in the same `onReset` callback as the
  //   navigation, and the restored devices plank proves that callback did not run. Suspect
  //   `client.reset()` hanging (or rejecting) after `join-new-identity.reset-identity-confirm`.
  //   Two real UI defects were found and fixed while chasing this, neither sufficient: the
  //   `OnboardingManager` welcome/join dialog race, and `JoinPanel` stranding in the exit-less
  //   `resettingIdentity` state when a reset settles after mount. Next: instrument
  //   `ResetDialog.handleReset` around `client.reset()` to see whether it resolves.
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

  // TODO(wittjosiah): Deferred on TWO measured modes, both distinct from the join-mount stall the
  //   test above tracks: (1) the invitation code submits but `halo-auth-code-input` stays disabled,
  //   so the handshake never reaches the auth stage; (2) the join completes but the host's space
  //   never replicates to the guest — `spacePlugin.space` stays at 1 of 2 for 60s (measured
  //   2026-08-08, 1 of 4 serialized runs). Mode 2 is a replication-timing question for HALO, not a
  //   UI race, and needs its own investigation.
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
