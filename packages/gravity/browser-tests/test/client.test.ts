//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import { Mocha } from 'mocha';

import { Client } from '@dxos/client';
import { createKeyPair } from '@dxos/crypto';

import 'source-map-support/register';
import { testInvitationAuthenticator } from '../../../echo/echo-db/dist/src';
import { ObjectModel } from '../../../echo/object-model/dist/src';
import { testSecretProvider } from '../../../halo/credentials/dist/src';

Mocha.describe('Client', () => {
  Mocha.it('open & close', async () => {
    const client = new Client();

    await client.initialize();

    await client.destroy();
  });

  Mocha.it('create profile', async () => {
    const client = new Client();

    await client.initialize();

    await client.createProfile({
      ...createKeyPair(),
      username: 'DXOS test'
    });

    const profile = client.getProfile();
    expect(profile.username).toEqual('DXOS test');

    await client.destroy();
  });

  Mocha.it('create party', async () => {
    const client = new Client();

    await client.initialize();

    await client.createProfile({
      ...createKeyPair(),
      username: 'DXOS test'
    });

    const party = await client.echo.createParty();

    const item = await party.database.createItem({ model: ObjectModel });
    await item.model.setProperty('foo', 'bar');

    expect(item.model.getProperty('foo')).toEqual('bar');

    await client.destroy();
  });

  // TODO(marik-d): Fails with "RTCError: Transport channel closed".
  Mocha.it.skip('invitations', async () => {
    const client = new Client();
    await client.initialize();
    await client.createProfile({
      ...createKeyPair(),
      username: 'DXOS test'
    });

    const party = await client.echo.createParty();
    const item = await party.database.createItem({ model: ObjectModel, type: 'dxn://test' });
    await item.model.setProperty('foo', 'bar');

    const otherClient = new Client();
    await otherClient.initialize();
    await otherClient.createProfile({
      ...createKeyPair(),
      username: 'DXOS test 2'
    });

    const invite = await party.createInvitation(testInvitationAuthenticator);
    const otherParty = await otherClient.echo.joinParty(invite, testSecretProvider);

    const otherItem = otherParty.database.queryItems({ type: 'dxn://test' }).first;
    expect(otherItem.model.getProperty('foo')).toEqual('bar');

    await client.destroy();
  });
});
