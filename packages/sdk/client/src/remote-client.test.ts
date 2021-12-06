//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { latch } from '@dxos/async';
import { createBundledRpcServer, createLinkedPorts } from '@dxos/rpc';
import { afterTest } from '@dxos/testutils';

import { Client } from './client';
import { clientServiceBundle } from './interfaces';
import { InvitationProcess } from './proto/gen/dxos/client';

const createServiceProviderPort = async () => {
  const [proxyPort, hostPort] = createLinkedPorts();

  const hostClient = new Client();
  await hostClient.initialize();
  afterTest(() => hostClient.destroy());

  const server = createBundledRpcServer({
    services: clientServiceBundle,
    handlers: hostClient.services,
    port: hostPort
  });
  void server.open(); // This is blocks until the other client connects.
  afterTest(() => server.close());

  return proxyPort;
};

describe('Client', () => {
  describe('Remote only tests', () => {
    test('initialize and destroy a remote client', async () => {
      const rpcPort = await createServiceProviderPort();

      const client = new Client({ system: { remote: true } }, { rpcPort });
      await client.initialize();
      await client.destroy();
    }).timeout(200);

    test('creates a remote profile', async () => {
      const rpcPort = await createServiceProviderPort();

      const client = new Client({ system: { remote: true } }, { rpcPort });
      await client.initialize();

      const profile = await client.halo.createProfile({ username: 'test-user' });

      expect(profile).toBeDefined();
      expect(profile?.username).toEqual('test-user');

      expect(client.halo.profile).toBeDefined();
      await client.destroy();
    }).timeout(500);

    test('creates and joins a HALO invitation', async () => {
      const inviterRpcPort = await createServiceProviderPort();
      const inviteeRpcPort = await createServiceProviderPort();

      const inviter = new Client({ system: { remote: true } }, { rpcPort: inviterRpcPort });
      await inviter.initialize();
      const invitee = new Client({ system: { remote: true } }, { rpcPort: inviteeRpcPort });
      await invitee.initialize();

      await inviter.halo.createProfile({ username: 'test-user' });

      let inviteeInvitationProcess: InvitationProcess;
      inviter.services.ProfileService.CreateInvitation().subscribe(async inviterInvitation => {
        if (!inviteeInvitationProcess) {
          inviteeInvitationProcess = await invitee.services.ProfileService.AcceptInvitation({ invitationCode: inviterInvitation.invitationCode });
        } else if (inviterInvitation.secret) {
          await invitee.services.ProfileService.AuthenticateInvitation({ process: inviteeInvitationProcess, secret: inviterInvitation.secret });
        }
      }, (error) => {
        throw error;
      });

      const [inviteeProfileLatch, inviteeProfileTrigger] = latch();
      invitee.services.ProfileService.SubscribeProfile().subscribe(inviteeProfile => {
        if (inviteeProfile.profile?.username === 'test-user') {
          inviteeProfileTrigger();
        }
      }, error => {
        throw error;
      });
      await inviteeProfileLatch;
    }).timeout(5000);
  });
});
