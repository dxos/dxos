//
// Copyright 2020 DXOS.org
//

// @dxos/mocha platform=nodejs

import expect from 'expect';

import { waitForCondition } from '@dxos/async';
import { ConfigProto } from '@dxos/config';

import { Client } from './packlets/proxies/index.js';

describe('Client', function () {
  describe('Local-only tests', function () {});

  describe('With persistent storage', function () {
    it('persistent storage', async function () {
      const config: ConfigProto = {
        version: 1,
        runtime: {
          client: {
            storage: {
              persistent: true,
              path: `/tmp/dxos-${Date.now()}`
            }
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
        await waitForCondition(() => !!client.halo.profile);
        expect(client.halo.profile).toBeDefined();
        await client.destroy();
      }
    });
  });
});
