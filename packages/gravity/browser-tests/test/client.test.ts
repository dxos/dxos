//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import 'source-map-support/register';

import { Client } from '@dxos/client';
import { testSecretProvider } from '@dxos/credentials';
import { createKeyPair } from '@dxos/crypto';
import { testInvitationAuthenticator } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

describe('Client', () => {
  it('open & close', async () => {
    const client = new Client();

    await client.initialize();

    await client.destroy();
  });

  it('create profile', async () => {
    const client = new Client();

    await client.initialize();

    await client.halo.createProfile({
      ...createKeyPair(),
      username: 'DXOS test'
    });

    const profile = client.halo.getProfile();
    expect(profile?.username).toEqual('DXOS test');

    await client.destroy();
  });

  it('create party', async () => {
    const client = new Client();

    await client.initialize();

    await client.halo.createProfile({
      ...createKeyPair(),
      username: 'DXOS test'
    });

    const party = await client.echo.createParty();

    const item = await party.database.createItem({ model: ObjectModel });
    await item.model.setProperty('foo', 'bar');

    expect(item.model.getProperty('foo')).toEqual('bar');

    await client.destroy();
  });

  it('invitations', async () => {
    const client = new Client();
    await client.initialize();
    await client.halo.createProfile({
      ...createKeyPair(),
      username: 'DXOS test'
    });

    const party = await client.echo.createParty();
    const item = await party.database.createItem({ model: ObjectModel, type: 'dxn://test' });
    await item.model.setProperty('foo', 'bar');

    const otherClient = new Client();
    await otherClient.initialize();
    await otherClient.halo.createProfile({
      ...createKeyPair(),
      username: 'DXOS test 2'
    });

    const invite = await party.createInvitation(testInvitationAuthenticator);
    const otherParty = await otherClient.echo.joinParty(invite, testSecretProvider);

    const otherItem = otherParty.database.select(s => s.filter({ type: 'dxn://test' }).items).getValue()[0];
    expect(otherItem.model.getProperty('foo')).toEqual('bar');

    await client.destroy();
    await otherClient.destroy();
  }).timeout(10_000).retries(2);
});
