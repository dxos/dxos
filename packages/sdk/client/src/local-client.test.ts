//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { waitForCondition } from '@dxos/async';
import { defs } from '@dxos/config';
import { defaultSecretProvider } from '@dxos/credentials';

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

    test('creates and joins a Party invitation', async () => {
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

  describe('With persistent storage', () => {
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
});
