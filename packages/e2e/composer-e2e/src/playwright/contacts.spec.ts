//
// Copyright 2026 DXOS.org
//

import { expect, test } from '@playwright/test';

import { log } from '@dxos/log';

import { AppManager } from './app-manager.ts';

if (process.env.DX_PWA !== 'false') {
  log.error('PWA must be disabled to run e2e tests. Set DX_PWA=false before running again.');
  process.exit(1);
}

test.describe('Contacts', () => {
  let host: AppManager;
  let guest: AppManager;

  test.beforeEach(async ({ browser }) => {
    test.setTimeout(120_000);

    host = new AppManager(browser, false);
    guest = new AppManager(browser, false);

    await host.init();
    await guest.init();
  });

  test.afterEach(async () => {
    // Guard against uninitialized app managers if `beforeEach` failed partway.
    if (host !== undefined && guest !== undefined) {
      await Promise.all([host.close(), guest.close()]);
    }
  });

  test('host adds a known contact to a second space', { tag: ['@QA-10'] }, async () => {
    // Space A: establish the contact via a normal invitation.
    await host.createSpace();
    const spaceA = host.workspaceId;
    await host.shareSpace();
    const invitationCode = await host.createSpaceInvitation();
    const authCode = await host.getAuthCode();
    await guest.joinSpace();
    await guest.shell.acceptSpaceInvitation(invitationCode);
    await guest.shell.authenticate(authCode);
    await expect.poll(() => guest.workspaceId, { timeout: 30_000 }).toBe(spaceA);
    await guest.waitForSpaceReady(30_000);

    // Space B: add the guest from the contact picker, without an invitation code.
    await host.createSpace();
    const spaceB = host.workspaceId;
    await host.shareSpace();
    await host.page.getByTestId('contact-picker.trigger').click();
    // `Combobox.Item`'s `data-testid` prop is silently dropped by the shared Combobox primitive
    // (`ComboboxItem` in packages/ui/react-ui-list/src/components/Combobox/Combobox.tsx destructures
    // a named prop list with no rest spread, unlike `ComboboxTrigger`), so `contact-picker.item` never
    // reaches the DOM — `role='option'` is the only way to reach it until that is fixed.
    await host.page.getByRole('option').first().click();
    await host.page.keyboard.press('Escape');
    await host.page.getByTestId('contactPicker.add').click();
    const joinUrlField = host.page.getByTestId('contactPicker.joinUrl');
    await expect(joinUrlField).toBeVisible({ timeout: 15_000 });
    const joinUrl = await joinUrlField.inputValue();

    // Resolve the join URL against the guest's own origin in case it differs from the host's (e.g.
    // different dev-server bindings under the same suite) — keeping the PATH, not only the query:
    // `createJoinUrl` targets `invitationPath` ('/'), which is where the `?spaceKey=` handler is
    // wired, so swapping in the guest's current pathname would miss it.
    const hostJoinUrl = new URL(joinUrl);
    const resolvedJoinUrl = new URL(hostJoinUrl.pathname + hostJoinUrl.search, guest.page.url());
    await guest.page.goto(resolvedJoinUrl.toString());
    await expect.poll(() => guest.workspaceId, { timeout: 60_000 }).toBe(spaceB);
  });
});
