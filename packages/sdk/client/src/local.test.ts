//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { waitForCondition } from '@dxos/async';
import { ConfigProto } from '@dxos/config';

import { Client } from './packlets/proxies';

describe('Client', () => {
  describe('Local-only tests', () => {});

  describe('With persistent storage', () => {
    test('persistent storage', async () => {
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
