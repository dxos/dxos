//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';
import waitForExpect from 'wait-for-expect';

import { createBundledRpcServer, createLinkedPorts } from '@dxos/rpc';
import { afterTest } from '@dxos/testutils';

import { Client } from './client';
import { clientServiceBundle } from './interfaces';
import { latch } from '@dxos/async';

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

describe('Remote client', () => {
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
  }).timeout(200);

  test.only('creates and joins a HALO invitation', async () => {
    const inviterRpcPort = await createServiceProviderPort();
    const inviteeRpcPort = await createServiceProviderPort();

    const inviter = new Client({ system: { remote: true } }, { rpcPort: inviterRpcPort });
    await inviter.initialize();
    const invitee = new Client({ system: { remote: true } }, { rpcPort: inviteeRpcPort });
    await invitee.initialize();

    await inviter.halo.createProfile({ username: 'test-user' });

    inviter.services.ProfileService.CreateInvitation().subscribe(inviterInvitation => {
      console.log({inviterInvitation})
    }, (error) => {throw error})

    
    const [inviteeProfileLatch, inviteeProfileTrigger] = latch();
    invitee.services.ProfileService.SubscribeProfile().subscribe(inviteeProfile => {
      if (inviteeProfile.profile?.username === 'test-user') {
        inviteeProfileTrigger();
      }
    }, error => {throw error})
    await inviteeProfileLatch
  }).timeout(5000);
});
