//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { z } from 'zod';

import {
  INITIAL_SPACE_COUNT,
  INITIAL_URL,
  type Peer,
  countSpaces,
  createPeer,
  createSpace,
  waitForAppReady,
  waitForAuthCodeInput,
  waitForInput,
} from './composer';

/**
 * Guest resets its identity and joins the host's identity as a second device. The
 * guest is brought all the way to the invitation input before the host creates the
 * invitation: plain-language steps take tens of seconds each and invitations expire
 * on that timescale.
 */
const joinHostIdentity = async (host: Peer, guest: Peer): Promise<void> => {
  await guest.act('Click the "App menu" button at the top of the left sidebar');
  await guest.act('Click the "Open user account" option in the open menu');
  await guest.act('Click the "Devices" item in the user account panel');
  await guest.act('Click the "Join an existing identity" button in the devices view');
  await guest.act('Type "RESET" into the confirmation input in the dialog');
  await guest.act('Click the confirm button in the dialog');

  // Joining resets storage and reloads into the device-invitation shell; wait for the
  // invitation input to mount before typing.
  await waitForInput(guest.page, /invitation code/i);

  await host.act('Click the "App menu" button at the top of the left sidebar');
  await host.act('Click the "Open user account" option in the open menu');
  await host.act('Click the "Devices" item in the user account panel');
  await host.act('Click the "Create code" button in the devices view');
  const invitationCode = await host.invitationCode();
  const authCode = await host.authCode();

  await guest.act('Type %code% into the invitation code input', { variables: { code: invitationCode } });
  await guest.act('Click the continue button next to the invitation code input');
  await waitForAuthCodeInput(guest.page);
  await guest.act('Type %code% into the verification code input', { variables: { code: authCode } });
  // Entering the full code can auto-submit and dismiss the dialog at any moment; click
  // the verify button only if it is still mounted, tolerating it disappearing mid-click
  // (the subsequent replication wait verifies the join either way).
  const nextStillMounted = await guest.page.evaluate(
    () =>
      document.querySelector(
        '[data-testid="halo-invitation-authenticator-next"], [data-testid="space-invitation-authenticator-next"]',
      ) !== null,
  );
  if (nextStillMounted) {
    await guest.act('Click the next/verify button next to the verification code input').catch(() => {});
  }

  // The join flow leaves the account panel open on both peers, hiding the space rail
  // that the space-count assertions read — return both to a clean main view.
  await guest.page.waitForTimeout(5_000);
  await guest.page.goto(INITIAL_URL);
  await waitForAppReady(guest.page, 120_000);
  await host.page.goto(INITIAL_URL);
  await waitForAppReady(host.page, 120_000);
};

// Multi-peer tests run a full identity-join flow plus replication waits (147–158s
// measured at 2 workers), well past the single-peer default budget.
describe('HALO tests', { timeout: 480_000 }, () => {
  let host: Peer;
  let guest: Peer;

  beforeEach(async () => {
    [host, guest] = await Promise.all([createPeer(), createPeer()]);
  });

  afterEach(async () => {
    await Promise.all([host.close(), guest.close()]);
  });

  test('join new identity', async () => {
    await createSpace(host);
    expect(await countSpaces(host)).toBe(INITIAL_SPACE_COUNT + 1);

    await joinHostIdentity(host, guest);

    // Cross-device replication is genuinely asynchronous — wait on the deterministic
    // (DOM) space-rail probe, then the count assertion is exact.
    await expect
      .poll(() => countSpaces(guest), { timeout: 180_000, interval: 5_000 })
      .toBe(INITIAL_SPACE_COUNT + 1);
  });

  test('deleting a space replicates across devices', async () => {
    await createSpace(host);
    expect(await countSpaces(host)).toBe(INITIAL_SPACE_COUNT + 1);

    await joinHostIdentity(host, guest);
    await expect
      .poll(() => countSpaces(guest), { timeout: 180_000, interval: 5_000 })
      .toBe(INITIAL_SPACE_COUNT + 1);

    // Delete the created (non-personal) space on the host via its settings danger zone.
    await host.act('Click the second space in the sidebar navigation tree to select it');
    const general = await host.extract(
      'Is a "General" settings item visible in the space sidebar tree (under a Settings section)?',
      z.object({ visible: z.boolean() }),
    );
    if (!general.visible) {
      await host.act('Click the disclosure arrow at the left edge of the "Settings" row in the space sidebar tree');
    }
    await host.act('Click the "General" settings item in the space sidebar tree');
    await host.act('Click the "Delete space" button in the space settings danger zone');
    await host.act('Click the confirmation button to confirm deleting the space');

    // The deletion is applied locally on the host…
    await expect.poll(() => countSpaces(host), { timeout: 30_000, interval: 1_000 }).toBe(INITIAL_SPACE_COUNT);
    // …and replicates to the guest via the HALO.
    await expect
      .poll(() => countSpaces(guest), { timeout: 180_000, interval: 5_000 })
      .toBe(INITIAL_SPACE_COUNT);
  });
});
