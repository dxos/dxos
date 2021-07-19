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

    const otherItem = otherParty.database.queryItems({ type: 'dxn://test' }).first;
    expect(otherItem.model.getProperty('foo')).toEqual('bar');

    await client.destroy();
    await otherClient.destroy();
  }).timeout(10_000).retries(2);

  it.only('reset storage', async () => {
    const client = new Client({ storage: { persistent: true } });
    await client.initialize(); // TODO(marik-d): This line does not work.
    await client.halo.createProfile({
      ...createKeyPair(),
      username: 'Reset test 1'
    });

    expect(client.echo.queryParties().value.length).toBe(0);
    await client.echo.createParty();
    expect(client.echo.queryParties().value.length).toBe(1);

    await client.reset();
    
    // We create another client instance after reset here because the first one becomes unusable.
    // In a browser this would be modeled as a page reload.
    const client2 = new Client({ storage: { persistent: true } });

    await client2.initialize();
    await client2.halo.createProfile({
      ...createKeyPair(),
      username: 'Reset test 2'
    });
    expect(client2.echo.queryParties().value.length).toBe(0);
  }).timeout(1000000);
});
