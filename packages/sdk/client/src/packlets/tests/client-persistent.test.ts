//
// Copyright 2020 DXOS.org
//

// @dxos/mocha platform=nodejs

import { expect } from 'chai';

import { waitForCondition } from '@dxos/async';
import { ConfigProto } from '@dxos/config';
import { PublicKey } from '@dxos/keys';

import { Client } from '../client';

describe('Client', function () {
  it('reopens with persistent storage', async function () {
    const config: ConfigProto = {
      version: 1,
      runtime: {
        client: {
          storage: {
            persistent: true, // TODO(burdon): Note required if path set.
            path: `/tmp/dxos/client/${PublicKey.random().toHex()}`
          }
        }
      }
    };

    {
      const client = new Client(config);
      await client.initialize();
      await client.halo.createProfile({ username: 'test-user' });
      expect(client.halo.profile).exist;
      await client.destroy();
    }

    {
      const client = new Client(config);
      await client.initialize();
      await waitForCondition(() => !!client.halo.profile);
      expect(client.halo.profile).exist;
      // TODO(burdon): Not working.
      // expect(client.halo.profile!.username).to.eq('test-user');
      await client.destroy();
    }
  });
});
