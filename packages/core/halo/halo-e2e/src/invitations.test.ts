//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { describe, expect, test } from 'vitest';

import { Identity, Invitation, Space } from '@dxos/halo';

import { awaitTerminal, createClients, runFlow, runWith } from './testing';

describe('Invitations', () => {
  test('device invitation admits a new device to the identity', { timeout: 30_000 }, async () => {
    const [host, guest] = await createClients(2, { identity: false });
    await runWith(host, Identity.create({ displayName: 'host' }));

    const hostFlow = await runWith(host, Identity.share());
    const code = await runFlow(hostFlow.code);
    const guestFlow = await runWith(guest, Identity.join(code));

    const [hostTerminal, guestTerminal] = await Promise.all([awaitTerminal(hostFlow), awaitTerminal(guestFlow)]);
    expect(hostTerminal._tag).toEqual('success');
    expect(guestTerminal._tag).toEqual('success');

    // The guest joined the host's identity.
    const guestIdentity = await runWith(guest, Identity.current);
    const hostIdentity = await runWith(host, Identity.current);
    expect(Option.getOrThrow(guestIdentity).did).toEqual(Option.getOrThrow(hostIdentity).did);

    // The host now sees two devices.
    await expect.poll(async () => (await runWith(host, Identity.devices)).length, { timeout: 5_000 }).toEqual(2);
  });

  test('space invitation admits a new member', { timeout: 30_000 }, async () => {
    const [host, guest] = await createClients(2);

    const space = await runWith(host, Space.create({ name: 'shared' }));
    await runWith(host, Space.waitReady(space.id));

    const hostFlow = await runWith(host, Space.share(space.id));
    const code = await runFlow(hostFlow.code);
    const guestFlow = await runWith(guest, Space.join(code));

    const [hostTerminal, guestTerminal] = await Promise.all([awaitTerminal(hostFlow), awaitTerminal(guestFlow)]);
    expect(hostTerminal._tag).toEqual('success');
    expect(guestTerminal._tag).toEqual('success');

    // The host space now has two members.
    await expect.poll(async () => (await runWith(host, Space.members(space.id))).length, { timeout: 5_000 }).toEqual(2);

    // The guest gained access to the space.
    await expect.poll(async () => (await runWith(guest, Space.list)).length, { timeout: 5_000 }).toBeGreaterThan(0);
  });

  test('active invitations are observable for a space', { timeout: 30_000 }, async () => {
    const [host] = await createClients(1);

    const space = await runWith(host, Space.create({ name: 'shared' }));
    await runWith(host, Space.waitReady(space.id));

    await runWith(host, Space.share(space.id));
    const active = await runWith(host, Invitation.active({ spaceId: space.id }));
    expect(active.length).toBeGreaterThan(0);
    expect(active[0].kind).toEqual('space');
  });
});
