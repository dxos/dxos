//
// Copyright 2021 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { waitForCondition } from '@dxos/async';
import { type Space } from '@dxos/client-protocol';
import { performInvitation } from '@dxos/client-services/testing';
import { Context } from '@dxos/context';
import { AlreadyJoinedError, AuthorizationError } from '@dxos/protocols';
import { toPublicKey } from '@dxos/protocols/buf';
import { Invitation_State } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import {
  ConnectionState,
  type SpaceMember,
  SpaceMember_PresenceState,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import { SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { type Client } from '../client';
import { createInitializedClientsWithContext } from '../testing';

describe('Spaces/member-management', () => {
  test('admins can remove members', async () => {
    const [client1, client2] = await createInitializedClients(2);
    const space = await client1.spaces.create();
    expect(space.members.get().length).to.eq(1);
    await inviteMember(space, client2, SpaceMember_Role.EDITOR);
    expect(space.members.get().length).to.eq(2);
    await updateRole(space, client1, client2, SpaceMember_Role.REMOVED, { waitUpdated: [space] });
  });

  test('admins can change member roles', async () => {
    const [client1, client2] = await createInitializedClients(2);
    const space1 = await client1.spaces.create();
    await inviteMember(space1, client2, SpaceMember_Role.ADMIN);
    await updateRole(space1, client1, client2, SpaceMember_Role.EDITOR, {
      waitUpdated: [space1, getClientSpace(client2, space1)],
    });
  });

  test('admins can add new admins who can add members', async () => {
    const [client1, client2, client3] = await createInitializedClients(3);
    const space1 = await client1.spaces.create();
    await inviteMember(space1, client2, SpaceMember_Role.ADMIN);
    const space2 = getClientSpace(client2, space1);
    await space2.waitUntilReady();
    await waitHasRole(space2, client2, SpaceMember_Role.ADMIN);
    await inviteMember(space2, client3, SpaceMember_Role.ADMIN);
    await waitHasRole(space1, client3, SpaceMember_Role.ADMIN);
  });

  test("editors can't invite new members", async () => {
    const [client1, client2, client3] = await createInitializedClients(3);
    const space1 = await client1.spaces.create();
    await inviteMember(space1, client2, SpaceMember_Role.EDITOR);
    const space2 = getClientSpace(client2, space1);
    await space2.waitUntilReady();
    const { error } = await performInvitation({ host: space2, guest: client3.spaces })[0];
    expect(error).to.be.instanceof(AuthorizationError);
  });

  test("invitation can't be created for a removed members", async () => {
    const [client1, client2] = await createInitializedClients(2);
    const space1 = await client1.spaces.create();
    await inviteMember(space1, client2, SpaceMember_Role.ADMIN);
    await updateRole(space1, client1, client2, SpaceMember_Role.REMOVED, { waitUpdated: [space1] });
    const { error } = await performInvitation({ host: space1, guest: client2.spaces })[1];
    expect(error).to.be.instanceof(AlreadyJoinedError);
  });

  test('removed member fails to authenticate going online', async () => {
    const [client1, client2, client3] = await createInitializedClients(3);
    const space1 = await client1.spaces.create();
    await inviteMember(space1, [client2, client3], SpaceMember_Role.ADMIN);
    expect(space1.members.get().length).to.eq(3);
    const space3 = getClientSpace(client3, space1);

    await waitHasStatus([space1, space3], client2, SpaceMember_PresenceState.ONLINE);
    await updateRole(space1, client1, client2, SpaceMember_Role.REMOVED, { waitUpdated: [space1, space3] });
    await waitHasStatus([space1, space3], client2, SpaceMember_PresenceState.OFFLINE);
    await client2.mesh.updateConfig(ConnectionState.OFFLINE);
    await client2.mesh.updateConfig(ConnectionState.ONLINE);
    await expect(
      waitHasStatus([space1, space3], client2, SpaceMember_PresenceState.ONLINE, { timeout: 500 }),
    ).rejects.toBeInstanceOf(Error);
  });

  test('removed member can rejoin with new role', async () => {
    const [client1, client2, client3] = await createInitializedClients(3);
    const space1 = await client1.spaces.create();
    await inviteMember(space1, [client2, client3], SpaceMember_Role.ADMIN);
    expect(space1.members.get().length).to.eq(3);
    const space3 = getClientSpace(client3, space1);

    await waitHasStatus([space1, space3], client2, SpaceMember_PresenceState.ONLINE);
    await updateRole(space1, client1, client2, SpaceMember_Role.REMOVED, { waitUpdated: [space1, space3] });
    await waitHasStatus([space1, space3], client2, SpaceMember_PresenceState.OFFLINE);

    await client2.mesh.updateConfig(ConnectionState.OFFLINE);
    await updateRole(space1, client1, client2, SpaceMember_Role.EDITOR);
    await client2.mesh.updateConfig(ConnectionState.ONLINE);
    await waitHasStatus([space1, space3], client2, SpaceMember_PresenceState.ONLINE);

    // Editors can't invite members.
    const { error } = await performInvitation({ host: getClientSpace(client2, space1), guest: client3.spaces })[0];
    expect(error).to.be.instanceof(AuthorizationError);
  });

  const createInitializedClients = async (count: number): Promise<Client[]> => {
    const context = new Context();
    onTestFinished(async () => {
      await context.dispose();
    });
    return createInitializedClientsWithContext(context, count, { serviceConfig: { fastPeerPresenceUpdate: true } });
  };
});

const inviteMember = async (host: Space, guestOrMany: Client | Client[], role: SpaceMember_Role) => {
  const guests = Array.isArray(guestOrMany) ? guestOrMany : [guestOrMany];
  for (const guest of guests) {
    const [{ invitation: hostInvitation }] = await Promise.all(
      performInvitation({ host, guest: guest.spaces, options: { role: role as never } }),
    );
    expect(hostInvitation?.state).to.eq(Invitation_State.SUCCESS);
    await waitHasRole(host, guest, role);
  }
};

const updateRole = async (
  space: Space,
  host: Client,
  target: Client,
  newRole: SpaceMember_Role,
  options?: { waitUpdated: Space[] },
) => {
  const echoSpace = host.spaces.get().find((s) => s.key.equals(space.key))!;
  const memberIdentityKey = target.halo.identity.get()?.identityKey;
  await echoSpace.updateMemberRole({
    memberKey: memberIdentityKey!,
    newRole,
  } as never);
  if (options?.waitUpdated?.length) {
    await waitHasRole(options.waitUpdated, target, newRole);
  }
};

const findMember = (space: Space, client: Client) => {
  const clientIdentityKey = client.halo.identity.get()?.identityKey;
  return space.members
    .get()
    .find(
      (m) =>
        m.identity?.identityKey &&
        clientIdentityKey &&
        toPublicKey(m.identity.identityKey).equals(toPublicKey(clientIdentityKey)),
    );
};

const waitHasRole = async (spaceOrMany: Space | Space[], client: Client, role: SpaceMember_Role) => {
  return waitForMemberState(spaceOrMany, client, (m) => m?.role === role);
};

const waitHasStatus = async (
  spaceOrMany: Space | Space[],
  client: Client,
  status: SpaceMember_PresenceState,
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
