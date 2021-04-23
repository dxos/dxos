//
// Copyright 2020 DXOS.org
//

import { createKeyPair } from '@dxos/crypto';

import { Client } from './client';

test('initialize and destroy in a reasonable time', async () => {
  const client = new Client();
  await client.initialize();
  await client.destroy();
}, 200);

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
  const keypair = createKeyPair();
  await client.createProfile({ ...keypair, username: 'test-user' });

  expect(client.hasProfile()).toBeTruthy();
  expect(client.getProfile()).toBeDefined();

  await client.destroy();
});

test('creating profile returns the profile', async () => {
  const client = new Client();
  await client.initialize();

  const keypair = createKeyPair();
  const profile = await client.createProfile({ ...keypair, username: 'test-user' });

  expect(profile).toBeDefined();
  expect(profile?.username).toEqual('test-user');

  await client.destroy();
});

test('persistent storage', async () => {
  const config = {
    storage: {
      persistent: true,
      path: `/tmp/dxos-${Date.now()}`
    }
  };

  {
    const client = new Client(config);
    await client.initialize();

    const keypair = createKeyPair();
    await client.createProfile({ ...keypair, username: 'test-user' });

    expect(client.getProfile()).toBeDefined();

    await client.destroy();
  }

  {
    const client = new Client(config);
    await client.initialize();

    expect(client.getProfile()).toBeDefined();
  }
});

test('creating profile twice throws an error', async () => {
  const client = new Client();
  await client.initialize();

  const keypair = createKeyPair();
  await client.createProfile({ ...keypair, username: 'test-user' });
  expect(client.hasProfile()).toBeTruthy();

  await expect(client.createProfile({ ...keypair, username: 'test-user' })).rejects.toThrow();
  expect(client.hasProfile()).toBeTruthy();

  await client.destroy();
});

test.skip('recreating party based on snapshot does not fail', async () => {
  const client = new Client();
  await client.initialize();

  const keypair = createKeyPair();
  await client.createProfile({ ...keypair, username: 'test-user' });

  const party = await client.echo.createParty();

  const recreatedParty = await client.createPartyFromSnapshot(party.database.createSnapshot());

  expect(recreatedParty).toBeDefined();
  // More extensive tests on actual Teamwork models are in Teamwork repo.

  await client.destroy();
});
