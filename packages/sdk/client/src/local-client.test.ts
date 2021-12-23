//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { sleep, waitForCondition } from '@dxos/async';
import { defs } from '@dxos/config';
import { defaultSecretProvider } from '@dxos/credentials';

import { Client } from './client';
import { decodeInvitation } from './util';

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

    test.only('creates and joins a Party invitation', async () => {
      const inviter = new Client();
      await inviter.initialize();
      const invitee = new Client();
      await invitee.initialize();

      await inviter.halo.createProfile({ username: 'inviter' });
      await invitee.halo.createProfile({ username: 'invitee' });

      const partyProxy = await inviter.echo.createParty();
      // await partyProxy.open();
      console.log('creating invitation...')
      const invitation = await inviter.echo.createInvitation(partyProxy.key);

      expect(invitee.echo.queryParties().value.length).toEqual(0);

      const finishAuthentication = await invitee.echo.acceptInvitation(decodeInvitation(invitation.invitationCode));
      console.log('finishing authentication...')
      await finishAuthentication(invitation.pin ?? '0000')

      console.log('waiting for party...')
      await sleep(2000)
      console.log({
        inviter: inviter.echo.queryParties().value.length,
        invitee: invitee.echo.queryParties().value.length,
      })
      await invitee.echo.queryParties().waitFor(parties => parties.length > 0);

      expect(invitee.echo.queryParties().value.length).toEqual(1);

      console.log('> END')
      await inviter.destroy();
      await invitee.destroy();
    }).timeout(5000);
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
