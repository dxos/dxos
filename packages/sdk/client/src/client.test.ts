//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { sleep, waitForCondition } from '@dxos/async';
import { defs } from '@dxos/config';

import { Client } from './client';
import { TestModel } from '@dxos/model-factory';

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

  test('late-register models after refresh', async () => {
    const config: defs.Config = {
      system: {
        storage: {
          persistent: true,
          path: `/tmp/dxos-${Date.now()}`
        }
      }
    };

    {
      const client = new Client(config).registerModel(TestModel);
      await client.initialize();
      await client.halo.createProfile({ username: 'test-user' });
      const party = await client.echo.createParty();
      const item = await party.database.createItem({ model: TestModel, type: 'test' });
      await item.model.setProperty('prop', 'value1');

      await client.destroy();
    }

    {
      const client = new Client(config);
      await client.initialize();
      await waitForCondition(() => client.halo.hasProfile());
      await sleep(10); // Make sure all events were processed.

      client.registerModel(TestModel);
      
      const party = client.echo.queryParties().first;
      const selection = party.database.select(s => s.filter({ type: 'test' }).items)
      await selection.update.waitForCondition(() => selection.getValue().length > 0)

      const item = selection.expectOne();

      expect(item.model.getProperty('prop')).toEqual('value1');

      await item.model.setProperty('prop', 'value2');
      expect(item.model.getProperty('prop')).toEqual('value2');
      
      await client.destroy();
    }
  })
});
