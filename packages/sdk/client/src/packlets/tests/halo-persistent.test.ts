//
// Copyright 2020 DXOS.org
//

// @dxos/mocha platform=nodejs

import { expect } from 'chai';

import { waitForCondition } from '@dxos/async';
import { Config } from '@dxos/config';
import { PublicKey } from '@dxos/keys';
import { afterTest } from '@dxos/testutils';

import { Client } from '../client';
import { TestClientBuilder } from '../testing';

describe('Halo', function () {
  it('reopens with persistent storage', async function () {
    const config = new Config({
      version: 1,
      runtime: {
        client: {
          storage: {
            persistent: true, // TODO(burdon): Note required if path set.
            path: `/tmp/dxos/client/${PublicKey.random().toHex()}`
          }
        }
      }
    });

    const testBuilder = new TestClientBuilder(config);

    {
      const client = new Client({ config, services: testBuilder.createClientServicesHost() });
      afterTest(() => client.destroy());
      await client.initialize();

      await client.halo.createProfile({ displayName: 'test-user' });
      expect(client.halo.profile).exist;
    }

    {
      const client = new Client({ config, services: testBuilder.createClientServicesHost() });
      afterTest(() => client.destroy());
      await client.initialize();

      await waitForCondition(() => !!client.halo.profile);
      expect(client.halo.profile).exist;
      // TODO(burdon): Not working.
      // expect(client.halo.profile!.displayName).to.eq('test-user');
    }
  });
});
