//
// Copyright 2020 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { waitForCondition } from '@dxos/async';
import { Config } from '@dxos/config';
import { PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';

import { Client } from '../client';
import { TestBuilder } from '../testing';

describe('Halo', () => {
  test('reopens with persistent storage', async () => {
    const config = new Config({
      version: 1,
      runtime: {
        client: {
          storage: {
            persistent: true,
            dataRoot: `/tmp/dxos/client/${PublicKey.random().toHex()}`,
          },
        },
      },
    });

    const testBuilder = new TestBuilder(config);
    testBuilder.level = () => createTestLevel();

    {
      const client = new Client({ config, services: testBuilder.createLocalClientServices() });
      onTestFinished(() => client.destroy());
      await client.initialize();

      await client.halo.createIdentity({ displayName: 'test-user' });
      expect(client.halo.identity).exist;
      await client.spaces.waitUntilReady();
      await client.destroy();
    }

    {
      const client = new Client({ config, services: testBuilder.createLocalClientServices() });
      onTestFinished(() => client.destroy());
      await client.initialize();

      await waitForCondition({ condition: () => !!client.halo.identity });
      expect(client.halo.identity).exist;
      await client.spaces.waitUntilReady();
      expect(client.halo.identity.get()?.profile?.displayName).to.eq('test-user');
      await client.destroy();
    }
  });
});
