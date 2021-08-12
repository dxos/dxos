//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import 'source-map-support/register';

import { Client } from '@dxos/client';
import { defaultSecretProvider } from '@dxos/credentials';
import { createKeyPair } from '@dxos/crypto';
import { defaultInvitationAuthenticator } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

describe('Client - nonpersistent', () => {
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

  it('invitations', async function () {
    if (browserMocha.context.browser === 'webkit') {
      // TODO: Doesn't work on CI for unknown reason.
      this.skip();
    }

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

    const invite = await party.createInvitation(defaultInvitationAuthenticator);
    const otherParty = await otherClient.echo.joinParty(invite, defaultSecretProvider);

    const otherItem = otherParty.database.select(s => s.filter({ type: 'dxn://test' }).items).getValue()[0];
    expect(otherItem.model.getProperty('foo')).toEqual('bar');

    await client.destroy();
    await otherClient.destroy();
  }).timeout(10_000).retries(2);

  it('offline invitations', async function () {
    if (browserMocha.context.browser === 'webkit') {
      // TODO: Doesn't work on CI for unknown reason.
      this.skip();
    }

    const clientA = new Client();
    await clientA.initialize();
    await clientA.halo.createProfile({
      ...createKeyPair(),
      username: 'DXOS test'
    });

    const party1A = await clientA.echo.createParty();

    const clientB = new Client();
    await clientB.initialize();
    await clientB.halo.createProfile({
      ...createKeyPair(),
      username: 'DXOS test 2'
    });

    const invite1 = await party1A.createInvitation(defaultInvitationAuthenticator);

    const contactPromise = clientA.halo.queryContacts().update.waitFor(contacts => !!contacts.find(x => x.displayName === 'DXOS test 2'));

    await clientB.echo.joinParty(invite1, defaultSecretProvider);

    const contact = (await contactPromise)[0];

    const party2A = await clientA.echo.createParty();

    const invite2 = await party2A.createOfflineInvitation(contact.publicKey);
    await clientB.echo.joinParty(invite2);

    await clientA.destroy();
    await clientB.destroy();
  }).timeout(10_000).retries(2);
});
