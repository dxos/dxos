//
// Copyright 2023 DXOS.org
//

import { expect, test } from '@playwright/test';
import { platform } from 'node:os';

import { AppManager, INITIAL_SPACE_COUNT, INITIAL_URL } from './app-manager';
import { StackPlugin } from './plugins';

// TODO(wittjosiah): WebRTC only available in chromium browser for testing currently.
//   https://github.com/microsoft/playwright/issues/2973
test.describe('HALO tests', () => {
  // TODO(wittjosiah): STRICTLY temporary, remove when DX-1152 lands. These retries exist solely
  //   because the production edge's two-peer path stalls endemically (invitations and replication,
  //   ~2% per operation); the defect is known, tracked, and not maskable — Trunk still records every
  //   first-attempt failure. Do not copy this pattern to any suite without a tracked issue.
  test.describe.configure({ retries: 2 });

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

  test('join new identity', async () => {
    test.setTimeout(90_000);

    await host.createSpace();

    await expect(host.getSpaceItems()).toHaveCount(INITIAL_SPACE_COUNT + 1);
    // The guest has only its own default space until it joins the host's identity.
    await expect(guest.getSpaceItems()).toHaveCount(INITIAL_SPACE_COUNT);

    await host.openUserDevices();
    const invitationCode = await host.createDeviceInvitation();
    await guest.openUserDevices();
    // joinNewIdentity resets storage and reloads into the device-invitation shell. The shell's
    // invitation input only mounts after that reload, so acceptDeviceInvitation's fill auto-waits
    // for it — no need to race the reload against a fixed deadline.
    await guest.joinNewIdentity();
    await guest.shell.acceptDeviceInvitation(invitationCode);
    // Read after the guest connects: the host learns the auth code from `readyForAuthentication`,
    // which the flow only reaches once there is a guest on the other side.
    const authCode = await host.getAuthCode();
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

  test('settings sync across devices, and one device can keep its own', async () => {
    test.setTimeout(180_000);

    // Both devices on one identity, so they share a settings space.
    await host.waitForDefaultWorkspace();
    await host.openUserDevices();
    const invitationCode = await host.createDeviceInvitation();
    await guest.openUserDevices();
    await guest.joinNewIdentity();
    await guest.shell.acceptDeviceInvitation(invitationCode);
    // Read after the guest connects: the host learns the auth code from `readyForAuthentication`,
    // which the flow only reaches once there is a guest on the other side.
    const authCode = await host.getAuthCode();
    await guest.shell.authenticateDevice(authCode);
    await expect(guest.getSpaceItems()).toHaveCount(INITIAL_SPACE_COUNT, { timeout: 60_000 });
    await guest.waitForDefaultWorkspace();

    // The plugin set is an ordinary synced namespace keyed by plugin id, so enabling one here is
    // the same mechanism as changing any other setting.
    await host.openRegistryCategory('recommended');
    await expect(host.getPluginToggle(StackPlugin.meta.profile.key)).not.toBeChecked();
    await host.getPluginToggle(StackPlugin.meta.profile.key).click();
    await expect(host.getPluginToggle(StackPlugin.meta.profile.key)).toBeChecked();

    // 1. Sync: the host's decision replicates to the guest through the settings space.
    await guest.openRegistryCategory('recommended');
    await expect(guest.getPluginToggle(StackPlugin.meta.profile.key)).toBeChecked({ timeout: 60_000 });

    // 2. Local override: the guest leaves the account for the plugin set only.
    await guest.openPluginSettings('org.dxos.plugin.registry');
    await guest.usePluginSetForThisDeviceOnly();

    await guest.openRegistryCategory('recommended');
    await guest.getPluginToggle(StackPlugin.meta.profile.key).click();
    await expect(guest.getPluginToggle(StackPlugin.meta.profile.key)).not.toBeChecked();

    // The guest's change stays put and the host is untouched. Asserting the host after the guest
    // has settled is the real check: a leaked write would have replicated by now.
    await expect(guest.getPluginToggle(StackPlugin.meta.profile.key)).not.toBeChecked({ timeout: 30_000 });
    await host.openRegistryCategory('recommended');
    await expect(host.getPluginToggle(StackPlugin.meta.profile.key)).toBeChecked({ timeout: 30_000 });
  });

  test('deleting a space replicates across devices', async () => {
    test.setTimeout(120_000);

    // Host creates a space; guest joins the host's identity and inherits it.
    await host.createSpace();
    await expect(host.getSpaceItems()).toHaveCount(INITIAL_SPACE_COUNT + 1);

    await host.openUserDevices();
    const invitationCode = await host.createDeviceInvitation();
    await guest.openUserDevices();
    // joinNewIdentity resets storage and reloads into the device-invitation shell. The shell's
    // invitation input only mounts after that reload, so acceptDeviceInvitation's fill auto-waits
    // for it — no need to race the reload against a fixed deadline.
    await guest.joinNewIdentity();
    await guest.shell.acceptDeviceInvitation(invitationCode);
    // Read after the guest connects: the host learns the auth code from `readyForAuthentication`,
    // which the flow only reaches once there is a guest on the other side.
    const authCode = await host.getAuthCode();
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
