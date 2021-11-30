//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { waitForCondition } from '@dxos/async';
import { defs } from '@dxos/config';
import { defaultSecretProvider } from '@dxos/credentials';

import { Client } from './client';

describe('Local client', () => {
  test('initialize and destroy in a reasonable time', async () => {
    const client = new Client();
    await client.initialize();
    await client.destroy();
  }).timeout(200);

  test('initialize and destroy are idempotent', async () => {
    const client = new Client();
    await client.initialize();
    await client.initialize();
    expect(client.initialized).toBeTruthy();

    await client.destroy();
    await client.destroy();
    expect(client.initialized).toBeFalsy();
  });

  test('initialize', async () => {
    const client = new Client();
    await client.initialize();

    // TODO(burdon): Open promises.
    //   On test close: A worker process has failed to exit gracefully and has been force exited.
    await client.halo.createProfile({ username: 'test-user' });

    expect(client.halo.profile).toBeDefined();

    await client.destroy();
  });

  test('initialize and open echo', async () => {
    const client = new Client();
    await client.initialize();
    await client.halo.createProfile({ username: 'test-user' });
    await client.echo.open();
    await client.destroy();
  }).timeout(200);

  test('creating profile returns the profile', async () => {
    const client = new Client();
    await client.initialize();

    const profile = await client.halo.createProfile({ username: 'test-user' });

    expect(profile).toBeDefined();
    expect(profile?.username).toEqual('test-user');

    await client.destroy();
  });

  test('creating profile twice throws an error', async () => {
    const client = new Client();
    await client.initialize();

    await client.halo.createProfile({ username: 'test-user' });
    expect(client.halo.hasProfile()).toBeTruthy();

    await expect(client.halo.createProfile({ username: 'test-user' })).rejects.toThrow();
    expect(client.halo.hasProfile()).toBeTruthy();

    await client.destroy();
  });

  test.skip('recreating party based on snapshot does not fail', async () => {
    const client = new Client();
    await client.initialize();

    await client.halo.createProfile({ username: 'test-user' });

    const party = await client.echo.createParty();

    const recreatedParty = await client.createPartyFromSnapshot(party.database.createSnapshot());

    expect(recreatedParty).toBeDefined();
    // More extensive tests on actual Teamwork models are in Teamwork repo.

    await client.destroy();
  });

  test.only('creates and joins a Party invitation', async () => {
    const inviter = new Client();
    await inviter.initialize();
    const invitee = new Client();
    await invitee.initialize();

    await inviter.halo.createProfile({ username: 'inviter' });
    await invitee.halo.createProfile({ username: 'invitee' });

    const partyProxy = await inviter.echo.createParty();
    const invitation = await inviter.createInvitation(partyProxy.key, defaultSecretProvider);

    expect(invitee.echo.queryParties().value.length).toEqual(0);

    await invitee.echo.joinParty(invitation, defaultSecretProvider);

    expect(invitee.echo.queryParties().value.length).toEqual(1);
  }).timeout(2000);
});

describe('Client with persistent storage', () => {
  test('persistent storage', async () => {
    const config: defs.Config = {
      system: {
        storage: {
          persistent: true,
          path: `/tmp/dxos-${Date.now()}`
        }
      }
    };

    {
      const client = new Client(config);
      await client.initialize();

      await client.halo.createProfile({ username: 'test-user' });

      expect(client.halo.profile).toBeDefined();

      await client.destroy();
    }

    {
      const client = new Client(config);
      await client.initialize();
      await waitForCondition(() => client.halo.hasProfile());

      expect(client.halo.profile).toBeDefined();
      await client.destroy();
    }
  });
});
