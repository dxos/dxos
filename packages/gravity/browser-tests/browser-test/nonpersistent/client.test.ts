//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import 'source-map-support/register';

import { defaultTestingConfig, Client } from '@dxos/client';
import { createKeyPair } from '@dxos/crypto';
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

    const profile = client.halo.profile;
    expect(profile?.username).toEqual('DXOS test');

    await client.destroy();
  });

  it.only('create party', async () => {
    const client = new Client();

    await client.initialize();

    await client.halo.createProfile({
      ...createKeyPair(),
      username: 'DXOS test'
    });

    const party = await client.echo.createParty();

    const item = await party.database.createItem({ model: ObjectModel });
    await item.model.set('foo', 'bar');
    expect(item.model.get('foo')).toEqual('bar');

    await client.destroy();
  }).timeout(10_000);

  it('invitations', async function () {
    if (browserMocha.context.browser === 'webkit') {
      // TODO(unknown): Doesn't work on CI for unknown reason.
      this.skip();
    }

    const client = new Client(defaultTestingConfig);
    await client.initialize();
    await client.halo.createProfile({
      ...createKeyPair(),
      username: 'DXOS test'
    });

    const party = await client.echo.createParty();
    const item = await party.database.createItem({ model: ObjectModel, type: 'example:item/test' });
    await item.model.set('foo', 'bar');

    const otherClient = new Client(defaultTestingConfig);
    await otherClient.initialize();
    await otherClient.halo.createProfile({
      ...createKeyPair(),
      username: 'DXOS test 2'
    });

    const invite = await party.createInvitation();
    const otherParty = await otherClient.echo.acceptInvitation(invite.descriptor).getParty();

    const otherItem = otherParty.database.select({ type: 'example:item/test' }).exec().entities[0];
    expect(otherItem.model.get('foo')).toEqual('bar');

    await client.destroy();
    await otherClient.destroy();
  }).timeout(10_000).retries(2);

  it('offline invitations', async function () {
    if (browserMocha.context.browser === 'webkit') {
      // TODO(unknown): Doesn't work on CI for unknown reason.
      this.skip();
    }

    const clientA = new Client(defaultTestingConfig);
    await clientA.initialize();
    await clientA.halo.createProfile({ ...createKeyPair(), username: 'DXOS test 1' });

    const clientB = new Client(defaultTestingConfig);
    await clientB.initialize();
    const profileB = await clientB.halo.createProfile({ ...createKeyPair(), username: 'DXOS test 2' });

    // Wait for invited person to arrive.
    // TODO(marik-d): Comparing by public key as a workaround for `https://github.com/dxos/protocols/issues/372`.
    const contactPromise = clientA.halo.queryContacts()
      .update.waitFor(contacts => !!contacts.find(contact => contact.publicKey.equals(profileB.publicKey)));

    // Online (adds contact).
    {
      const party1A = await clientA.echo.createParty();
      const invite1 = await party1A.createInvitation();
      await clientB.echo.acceptInvitation(invite1.descriptor).getParty();
    }

    const contact = (await contactPromise)[0];

    // Offline (use existing contact).
    {
      const party2A = await clientA.echo.createParty();
      const invite2 = await party2A.createInvitation({ inviteeKey: contact.publicKey });
      await clientB.echo.acceptInvitation(invite2.descriptor).getParty();
    }

    await clientA.destroy();
    await clientB.destroy();
  }).timeout(20_000).retries(2);
});
