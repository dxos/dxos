//
// Copyright 2026 DXOS.org
//

import { expect, test } from '@playwright/test';

import { AppManager } from './app-manager.ts';
import { Drawing, type DrawingVariant } from './plugins/index.ts';

const performInvitation = async (host: AppManager, guest: AppManager) => {
  const sharedWorkspace = host.workspaceId;
  expect(sharedWorkspace, 'the host must be in a workspace before it can share one').toBeDefined();
  await host.shareSpace();
  const invitationCode = await host.createSpaceInvitation();
  const authCode = await host.getAuthCode();
  await guest.joinSpace();
  await guest.shell.acceptSpaceInvitation(invitationCode);
  await guest.shell.authenticate(authCode);

  await expect.poll(() => guest.workspaceId, { timeout: 30_000 }).toBe(sharedWorkspace);
  await guest.waitForSpaceReady(30_000);
};

// Two peers over WebRTC, as in collaboration.spec.ts: cross-browser results come from CI.
test.describe('Drawing cursors', () => {
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
    // `afterEach` runs even if `beforeEach` failed part way.
    if (host !== undefined && guest !== undefined) {
      await Promise.all([host.close(), guest.close()]);
    }
  });

  for (const variant of ['svg', 'tldraw'] satisfies DrawingVariant[]) {
    test(`host and guest see each other's pointer on a ${variant} drawing`, async () => {
      await host.createSpace();
      await Drawing.createDrawing(host, variant);
      await performInvitation(host, guest);

      await host.navigateToObject(0);
      await guest.expandSection('spacePlugin.collectionsSection');
      await expect(guest.getObjectLinks()).toHaveCount(1);
      await guest.navigateToObject(0);

      const hostPlank = host.deck.plank();
      const guestPlank = guest.deck.plank();
      const hostSurface = Drawing.getSurface(hostPlank.locator, variant);
      const guestSurface = Drawing.getSurface(guestPlank.locator, variant);
      await expect(hostSurface).toBeVisible({ timeout: 30_000 });
      await expect(guestSurface).toBeVisible({ timeout: 30_000 });

      // A pointer posted before the peers' connection forms is lost, so keep moving until it lands.
      await expect
        .poll(
          async () => {
            await Drawing.hover(host.page, hostSurface);
            return Drawing.getRemoteCursors(guestPlank.locator).count();
          },
          { timeout: 30_000, intervals: [1_000] },
        )
        .toBe(1);
      await expect(Drawing.getRemoteCursors(guestPlank.locator)).toHaveText(/.+/);
      await expect(Drawing.getRemoteCursors(hostPlank.locator)).toHaveCount(0);

      await expect
        .poll(
          async () => {
            await Drawing.hover(guest.page, guestSurface);
            return Drawing.getRemoteCursors(hostPlank.locator).count();
          },
          { timeout: 30_000, intervals: [1_000] },
        )
        .toBe(1);

      // Leaving the surface withdraws the pointer.
      await host.page.mouse.move(0, 0);
      await expect(Drawing.getRemoteCursors(guestPlank.locator)).toHaveCount(0, { timeout: 10_000 });
    });
  }
});
