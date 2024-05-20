//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { waitForCondition } from '@dxos/async';
import { type Space } from '@dxos/client-protocol';
import { performInvitation } from '@dxos/client-services/testing';
import { AlreadyJoinedError, AuthorizationError } from '@dxos/protocols';
import { Invitation, SpaceMember, ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { SpaceMember as HaloSpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';
import { afterTest, describe, test } from '@dxos/test';
import { range } from '@dxos/util';

import { Client } from '../client';
import { TestBuilder } from '../testing';

describe('Spaces/member-management', () => {
  test('admins can remove members', async () => {
    const [client1, client2] = await createInitializedClients(2);
    const space = await client1.spaces.create();
    expect(space.members.get().length).to.eq(1);
    await inviteMember(space, client2, HaloSpaceMember.Role.EDITOR);
    expect(space.members.get().length).to.eq(2);
    await updateRole(space, client1, client2, HaloSpaceMember.Role.REMOVED, { waitUpdated: [space] });
  });

  test('admins can change member roles', async () => {
    const [client1, client2] = await createInitializedClients(2);
    const space1 = await client1.spaces.create();
    await inviteMember(space1, client2, HaloSpaceMember.Role.ADMIN);
    await updateRole(space1, client1, client2, HaloSpaceMember.Role.EDITOR, {
      waitUpdated: [space1, getClientSpace(client2, space1)],
    });
  });

  test('admins can add new admins who can add members', async () => {
    const [client1, client2, client3] = await createInitializedClients(3);
    const space1 = await client1.spaces.create();
    await inviteMember(space1, client2, HaloSpaceMember.Role.ADMIN);
    const space2 = getClientSpace(client2, space1);
    await waitHasRole(space2, client2, HaloSpaceMember.Role.ADMIN);
    await inviteMember(space2, client3, HaloSpaceMember.Role.ADMIN);
    await waitHasRole(space1, client3, HaloSpaceMember.Role.ADMIN);
  });

  test("editors can't invite new members", async () => {
    const [client1, client2, client3] = await createInitializedClients(3);
    const space1 = await client1.spaces.create();
    await inviteMember(space1, client2, HaloSpaceMember.Role.EDITOR);
    const space2 = getClientSpace(client2, space1);
    const { error } = await performInvitation({ host: space2, guest: client3.spaces })[0];
    expect(error).to.be.instanceof(AuthorizationError);
  });

  test("invitation can't be created for a removed members", async () => {
    const [client1, client2] = await createInitializedClients(2);
    const space1 = await client1.spaces.create();
    await inviteMember(space1, client2, HaloSpaceMember.Role.ADMIN);
    await updateRole(space1, client1, client2, HaloSpaceMember.Role.REMOVED, { waitUpdated: [space1] });
    const { error } = await performInvitation({ host: space1, guest: client2.spaces })[1];
    expect(error).to.be.instanceof(AlreadyJoinedError);
  });

  test('removed member fails to authenticate going online', async () => {
    const [client1, client2, client3] = await createInitializedClients(3);
    const space1 = await client1.spaces.create();
    await inviteMember(space1, [client2, client3], HaloSpaceMember.Role.ADMIN);
    expect(space1.members.get().length).to.eq(3);
    const space3 = getClientSpace(client3, space1);

    await waitHasStatus([space1, space3], client2, SpaceMember.PresenceState.ONLINE);
    await updateRole(space1, client1, client2, HaloSpaceMember.Role.REMOVED, { waitUpdated: [space1, space3] });
    await waitHasStatus([space1, space3], client2, SpaceMember.PresenceState.OFFLINE);
    await client2.mesh.updateConfig(ConnectionState.OFFLINE);
    await client2.mesh.updateConfig(ConnectionState.ONLINE);
    await expect(waitHasStatus([space1, space3], client2, SpaceMember.PresenceState.ONLINE, { timeout: 500 })).to.be
      .rejected;
  });

  test('removed member can rejoin with new role', async () => {
    const [client1, client2, client3] = await createInitializedClients(3);
    const space1 = await client1.spaces.create();
    await inviteMember(space1, [client2, client3], HaloSpaceMember.Role.ADMIN);
    expect(space1.members.get().length).to.eq(3);
    const space3 = getClientSpace(client3, space1);

    await waitHasStatus([space1, space3], client2, SpaceMember.PresenceState.ONLINE);
    await updateRole(space1, client1, client2, HaloSpaceMember.Role.REMOVED, { waitUpdated: [space1, space3] });
    await waitHasStatus([space1, space3], client2, SpaceMember.PresenceState.OFFLINE);

    await client2.mesh.updateConfig(ConnectionState.OFFLINE);
    await updateRole(space1, client1, client2, HaloSpaceMember.Role.EDITOR);
    await client2.mesh.updateConfig(ConnectionState.ONLINE);
    await waitHasStatus([space1, space3], client2, SpaceMember.PresenceState.ONLINE);

    // Editors can't invite members.
    const { error } = await performInvitation({ host: getClientSpace(client2, space1), guest: client3.spaces })[0];
    expect(error).to.be.instanceof(AuthorizationError);
  });

  const createInitializedClients = async (count: number): Promise<Client[]> => {
    const testBuilder = new TestBuilder();

    const clients = range(
      count,
      () => new Client({ services: testBuilder.createLocal({ fastPeerPresenceUpdate: true }) }),
    );
    const initialized = await Promise.all(
      clients.map(async (c, index) => {
        await c.initialize();
        await c.halo.createIdentity({ displayName: `Peer ${index}` });
        return c;
      }),
    );
    afterTest(() => destroyClients(initialized));
    return initialized;
  };

  const destroyClients = async (clients: Client[]): Promise<void> => {
    await Promise.all(clients.map((c) => c.destroy()));
  };
});

const inviteMember = async (host: Space, guestOrMany: Client | Client[], role: HaloSpaceMember.Role) => {
  const guests = Array.isArray(guestOrMany) ? guestOrMany : [guestOrMany];
  for (const guest of guests) {
    const [{ invitation: hostInvitation }] = await Promise.all(
      performInvitation({ host, guest: guest.spaces, options: { role } }),
    );
    expect(hostInvitation?.state).to.eq(Invitation.State.SUCCESS);
    await waitHasRole(host, guest, role);
  }
};

const updateRole = async (
  space: Space,
  host: Client,
  target: Client,
  newRole: HaloSpaceMember.Role,
  options?: { waitUpdated: Space[] },
) => {
  const echoSpace = host.spaces.get().find((s) => s.key.equals(space.key))!;
  await echoSpace.updateMemberRole({
    memberKey: target.halo.identity.get()!.identityKey,
    newRole,
  });
  if (options?.waitUpdated?.length) {
    await waitHasRole(options.waitUpdated, target, newRole);
  }
};

const findMember = (space: Space, client: Client) => {
  return space.members.get().find((m) => m.identity.identityKey.equals(client.halo.identity.get()!.identityKey));
};

const waitHasRole = async (spaceOrMany: Space | Space[], client: Client, role: HaloSpaceMember.Role) => {
  return waitForMemberState(spaceOrMany, client, (m) => m?.role === role);
};

const waitHasStatus = async (
  spaceOrMany: Space | Space[],
  client: Client,
  status: SpaceMember.PresenceState,
  options?: { timeout: number },
) => {
  return waitForMemberState(spaceOrMany, client, (m) => m?.presence === status, options);
};

const waitForMemberState = async (
  spaceOrMany: Space | Space[],
  client: Client,
  statePredicate: (member: SpaceMember | undefined) => boolean,
  options?: { timeout: number },
) => {
  const spaces = Array.isArray(spaceOrMany) ? spaceOrMany : [spaceOrMany];
  for (const space of spaces) {
    await waitForCondition({
      timeout: options?.timeout,
      condition: () => statePredicate(findMember(space, client)),
    });
  }
};

const getClientSpace = (client: Client, space: Space) => {
  return client.spaces.get().find((s) => s.key.equals(space.key))!;
};
