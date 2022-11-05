//
// Copyright 2021 DXOS.org
//

// @dxos/mocha platform=browser

import 'source-map-support/register';

describe('Spaces invitations', function () {
  /*
  const prepareInvitations = async () => {
    const inviter = await createClient();
    await inviter.initialize();
    afterTest(() => inviter.destroy());

    const invitee = await createClient();
    await invitee.initialize();
    afterTest(() => invitee.destroy());

    await inviter.halo.createProfile({ username: 'inviter' });
    await invitee.halo.createProfile({ username: 'invitee' });

    return { inviter, invitee };
  };

  it('creates and joins a Party invitation', async function () {
    const { inviter, invitee } = await prepareInvitations();

    const party = await inviter.echo.createParty();
    const invitation = await party.createInvitation();
    invitation.error.on(throwUnhandledRejection);
    log('created invitation', { invitation: invitation.descriptor });

    const inviteeParty = await invitee.echo.acceptInvitation(invitation.descriptor).getParty();
    expect(inviteeParty.key).toEqual(party.key);

    // const members = party.queryMembers().value;
    // expect(members.length).toEqual(2);
  }).timeout(5000);

  it.skip('invitation callbacks are fired', async function () {
    const { inviter, invitee } = await prepareInvitations();

    const party = await inviter.echo.createParty();
    const invitation = await party.createInvitation();
    log('created invitation', { invitation: invitation.descriptor });

    const connectedFired = invitation.connected.waitForCount(1);
    // Simulate invitation being serialized. This effectively removes the pin from the invitation.
    const reencodedDescriptor = InvitationWrapper.fromQueryParameters(invitation.descriptor.toQueryParameters());
    const acceptedInvitation = invitee.echo.acceptInvitation(reencodedDescriptor);
    await connectedFired;

    const finishedFired = invitation.finished.waitForCount(1);
    acceptedInvitation.authenticate(invitation.secret);
    await finishedFired;

    const inviteeParty = await acceptedInvitation.getParty();
    expect(inviteeParty.key).toEqual(party.key);
  }).timeout(5000);

  it.skip('creates and joins an offline Party invitation', async function () {
    const { inviter, invitee } = await prepareInvitations();

    const party = await inviter.echo.createParty();
    assert(invitee.halo.profile);
    const invitation = await party.createInvitation({
      inviteeKey: invitee.halo.profile.publicKey
    });
    expect(invitation.descriptor.secret).toBeUndefined();
    invitation.error.on(throwUnhandledRejection);
    const inviteeParty = await invitee.echo.acceptInvitation(invitation.descriptor).getParty();

    expect(inviteeParty.key).toEqual(party.key);

    const members = party.queryMembers().value;
    expect(members.length).toEqual(2);
  }).timeout(5000);

  it.skip('creates and joins more than 1 Party', async function () {
    const { inviter, invitee } = await prepareInvitations();

    for (let i = 0; i < 3; i++) {
      const party = await inviter.echo.createParty();
      const invitation = await party.createInvitation();
      invitation.error.on(throwUnhandledRejection);
      const inviteeParty = await invitee.echo.acceptInvitation(invitation.descriptor).getParty();

      expect(inviteeParty.key).toEqual(party.key);
    }
  }).timeout(5000);
  */
  /*
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
    const item = await party1.database.createItem({
      model: ObjectModel,
      type: 'example:item/test'
    });
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
  })
    .timeout(10_000)
    .retries(10);

  it.skip('offline invitations', async function () {
    if (mochaExecutor.environment === 'webkit' || mochaExecutor.environment === 'chromium') {
      // TODO(unknown): Doesn't work on CI for unknown reason.
      this.skip();
    }

    const clientA = new Client(defaultTestingConfig);
    await clientA.initialize();
    await clientA.halo.createProfile({
      ...createKeyPair(),
      username: 'test-user-1'
    });

    const clientB = new Client(defaultTestingConfig);
    await clientB.initialize();
    const profileB = await clientB.halo.createProfile({
      ...createKeyPair(),
      username: 'test-user-2'
    });

    // Wait for invited person to arrive.
    // TODO(dmaretskyi): Comparing by public key as a workaround for `https://github.com/dxos/dxos/issues/372`.
    const contactPromise = clientA.halo
      .queryContacts()
      .update.waitFor((contacts) => !!contacts.find((contact) => contact.publicKey.equals(profileB.publicKey)));

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
      const invite2 = await party2A.createInvitation({
        inviteeKey: contact.publicKey
      });
      await clientB.echo.acceptInvitation(invite2.descriptor).getParty();
    }

    await clientA.destroy();
    await clientB.destroy();
  })
    .timeout(20_000)
    .retries(10);
  */
});
