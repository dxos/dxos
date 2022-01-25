//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { waitForCondition } from '@dxos/async';
import { ConfigV1Object, defs } from '@dxos/config';

import { Client } from './client';

describe('Client', () => {
  describe('Local-only tests', () => {
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

  describe('With persistent storage', () => {
    test('persistent storage', async () => {
      const config: ConfigV1Object = {
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
        await waitForCondition(() => client.halo.hasProfile());

        expect(client.halo.profile).toBeDefined();
        await client.destroy();
      }
    });
  });
});
