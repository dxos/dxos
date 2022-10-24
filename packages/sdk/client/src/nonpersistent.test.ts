//
// Copyright 2021 DXOS.org
//

// @dxos/mocha platform=browser

import expect from 'expect';
import 'source-map-support/register';

import { createKeyPair } from '@dxos/crypto';
import { ObjectModel } from '@dxos/object-model';

import { Client, defaultTestingConfig } from './packlets/proxies';

describe('Client - nonpersistent', function () {
  it('open & close', async function () {
    const client = new Client(defaultTestingConfig);
    await client.initialize();
    await client.destroy();
  }).retries(10);

  it('create profile', async function () {
    const client = new Client(defaultTestingConfig);
    await client.initialize();
    await client.halo.createProfile({
      ...createKeyPair(),
      username: 'test-user'
    });

    // const profile = client.halo.profile;
    // expect(profile?.username).toEqual('DXOS test');

    await client.destroy();
  }).retries(10);

  it('create party', async function () {
    const client = new Client(defaultTestingConfig);
    await client.initialize();
    await client.halo.createProfile({
      ...createKeyPair(),
      username: 'test-user'
    });

    const party = await client.echo.createParty();

    const item = await party.database.createItem({ model: ObjectModel });
    await item.model.set('foo', 'bar');
    expect(item.model.get('foo')).toEqual('bar');

    await client.destroy();
  }).timeout(10_000).retries(10);

  it('invitations', async function () {
    if (mochaExecutor.environment === 'webkit') {
      // TODO(unknown): Doesn't work on CI for unknown reason.
      this.skip();
    }

    const clientA = new Client(defaultTestingConfig);
    await clientA.initialize();
    await clientA.halo.createProfile({
      ...createKeyPair(),
      username: 'test-user-1'
    });

    const party1 = await clientA.echo.createParty();
    const item = await party1.database.createItem({ model: ObjectModel, type: 'example:item/test' });
    await item.model.set('foo', 'bar');

    const clientB = new Client(defaultTestingConfig);
    await clientB.initialize();
    await clientB.halo.createProfile({
      ...createKeyPair(),
      username: 'test-user-2'
    });

    const invite = await party1.createInvitation();
    const party2 = await clientB.echo.acceptInvitation(invite.descriptor).getParty();

    await party2.database.waitForItem({ type: 'example:item/test' });
    const otherItem = party2.database.select({ type: 'example:item/test' }).exec().entities[0];
    expect(otherItem.model.get('foo')).toEqual('bar');

    await clientA.destroy();
    await clientB.destroy();
  }).timeout(10_000).retries(10);

  it.skip('offline invitations', async function () {
    if (mochaExecutor.environment === 'webkit' || mochaExecutor.environment === 'chromium') {
      // TODO(unknown): Doesn't work on CI for unknown reason.
      this.skip();
    }

    const clientA = new Client(defaultTestingConfig);
    await clientA.initialize();
    await clientA.halo.createProfile({ ...createKeyPair(), username: 'test-user-1' });

    const clientB = new Client(defaultTestingConfig);
    await clientB.initialize();
    const profileB = await clientB.halo.createProfile({ ...createKeyPair(), username: 'test-user-2' });

    // Wait for invited person to arrive.
    // TODO(dmaretskyi): Comparing by public key as a workaround for `https://github.com/dxos/dxos/issues/372`.
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
  }).timeout(20_000).retries(10);
});
