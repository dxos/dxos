//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import assert from 'node:assert';

import { asyncChain } from '@dxos/async';
import { Client, InvitationsProxy, Space, SpaceProxy } from '@dxos/client';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { afterTest, describe, test } from '@dxos/test';

import { InvitationsServiceImpl } from '../invitations';
import { LocalClientServices, ServiceContext } from '../services';
import { DataSpace } from '../spaces';
import { createIdentity, createPeers, performInvitation, PerformInvitationParams, TestBuilder } from '../testing';

const closeAfterTest = async (peer: ServiceContext) => {
  afterTest(() => peer.close());
  return peer;
};

const testSuite = (
  kind: Invitation.Kind,
  getParams: () => PerformInvitationParams,
  getPeers: () => [ServiceContext, ServiceContext]
) => {
  test('no auth', async () => {
    const [host, guest] = getPeers();
    const [{ invitation: hostInvitation }, { invitation: guestInvitation }] = await performInvitation(getParams());

    expect(hostInvitation?.state).to.eq(Invitation.State.SUCCESS);
    expect(guestInvitation?.state).to.eq(Invitation.State.SUCCESS);

    switch (kind) {
      case Invitation.Kind.SPACE:
        expect(guestInvitation?.spaceKey).to.exist;
        expect(hostInvitation?.spaceKey).to.deep.eq(guestInvitation?.spaceKey);
        break;

      case Invitation.Kind.DEVICE:
        expect(hostInvitation!.identityKey).not.to.exist;
        expect(guestInvitation?.identityKey).to.deep.eq(host.identityManager.identity!.identityKey);
        expect(guestInvitation?.identityKey).to.deep.eq(guest.identityManager.identity!.identityKey);
        break;
    }
  });

  test('with shared secret', async () => {
    const [host, guest] = getPeers();
    const params = getParams();
    const [{ invitation: hostInvitation }, { invitation: guestInvitation }] = await performInvitation({
      ...params,
      options: { ...params.options, authMethod: Invitation.AuthMethod.SHARED_SECRET }
    });

    expect(hostInvitation?.state).to.eq(Invitation.State.SUCCESS);
    expect(guestInvitation?.state).to.eq(Invitation.State.SUCCESS);

    switch (kind) {
      case Invitation.Kind.SPACE:
        expect(guestInvitation?.spaceKey).to.exist;
        expect(hostInvitation?.spaceKey).to.deep.eq(guestInvitation?.spaceKey);
        break;

      case Invitation.Kind.DEVICE:
        expect(hostInvitation!.identityKey).not.to.exist;
        expect(guestInvitation?.identityKey).to.deep.eq(host.identityManager.identity!.identityKey);
        expect(guestInvitation?.identityKey).to.deep.eq(guest.identityManager.identity!.identityKey);
        break;
    }
  });
};

describe('Invitations', () => {
  describe('ServiceContext', () => {
    describe('space', () => {
      let host: ServiceContext;
      let guest: ServiceContext;
      let space: DataSpace;

      beforeEach(async () => {
        const peers = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));
        host = peers[0];
        guest = peers[1];
        space = await host.dataSpaceManager!.createSpace();
      });

      testSuite(
        Invitation.Kind.SPACE,
        () => ({
          host,
          guest,
          options: { kind: Invitation.Kind.SPACE, spaceKey: space.key }
        }),
        () => [host, guest]
      );
    });

    describe('device', () => {
      let host: ServiceContext;
      let guest: ServiceContext;

      beforeEach(async () => {
        const peers = await asyncChain<ServiceContext>([closeAfterTest])(createPeers(2));
        host = peers[0];
        guest = peers[1];
        await host.createIdentity();
      });

      testSuite(
        Invitation.Kind.DEVICE,
        () => ({ host, guest, options: { kind: Invitation.Kind.DEVICE } }),
        () => [host, guest]
      );
    });
  });

  describe('InvitationsProxy', () => {
    describe('space', () => {
      let hostContext: ServiceContext;
      let guestContext: ServiceContext;
      let host: InvitationsProxy;
      let guest: InvitationsProxy;
      let space: DataSpace;

      beforeEach(async () => {
        const peers = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));
        hostContext = peers[0];
        guestContext = peers[1];
        assert(hostContext.dataSpaceManager);
        assert(guestContext.dataSpaceManager);

        const hostService = new InvitationsServiceImpl(hostContext.invitations, (invitation) =>
          hostContext.getInvitationHandler(invitation)
        );
        const guestService = new InvitationsServiceImpl(guestContext.invitations, (invitation) =>
          guestContext.getInvitationHandler(invitation)
        );

        space = await hostContext.dataSpaceManager.createSpace();
        host = new InvitationsProxy(hostService, () => ({ kind: Invitation.Kind.SPACE, spaceKey: space.key }));
        guest = new InvitationsProxy(guestService, () => ({ kind: Invitation.Kind.SPACE }));

        afterTest(() => space.close());
      });

      testSuite(
        Invitation.Kind.SPACE,
        () => ({ host, guest }),
        () => [hostContext, guestContext]
      );
    });

    describe('device', () => {
      let hostContext: ServiceContext;
      let guestContext: ServiceContext;
      let host: InvitationsProxy;
      let guest: InvitationsProxy;

      beforeEach(async () => {
        const peers = await asyncChain<ServiceContext>([closeAfterTest])(createPeers(2));
        hostContext = peers[0];
        guestContext = peers[1];

        await hostContext.identityManager.createIdentity();

        const hostService = new InvitationsServiceImpl(hostContext.invitations, (invitation) =>
          hostContext.getInvitationHandler(invitation)
        );

        const guestService = new InvitationsServiceImpl(guestContext.invitations, (invitation) =>
          guestContext.getInvitationHandler(invitation)
        );

        host = new InvitationsProxy(hostService, () => ({ kind: Invitation.Kind.DEVICE }));
        guest = new InvitationsProxy(guestService, () => ({ kind: Invitation.Kind.DEVICE }));
      });

      testSuite(
        Invitation.Kind.DEVICE,
        () => ({ host, guest }),
        () => [hostContext, guestContext]
      );
    });
  });

  describe('HaloProxy', () => {
    let host: Client;
    let guest: Client;

    beforeEach(async () => {
      const testBuilder = new TestBuilder();

      host = new Client({ services: testBuilder.createLocal() });
      guest = new Client({ services: testBuilder.createLocal() });
      await host.initialize();
      await guest.initialize();

      await host.halo.createIdentity({ displayName: 'Peer' });

      afterTest(() => Promise.all([host.destroy()]));
      afterTest(() => Promise.all([guest.destroy()]));
    });

    testSuite(
      Invitation.Kind.DEVICE,
      () => ({ host: host.halo, guest: guest.halo }),
      () => [
        (host.services as LocalClientServices).host._serviceContext,
        (guest.services as LocalClientServices).host._serviceContext
      ]
    );
  });

  describe('EchoProxy', () => {
    let host: Client;
    let guest: Client;
    let space: Space;
    beforeEach(async () => {
      const testBuilder = new TestBuilder();

      host = new Client({ services: testBuilder.createLocal() });
      guest = new Client({ services: testBuilder.createLocal() });
      await host.initialize();
      await guest.initialize();
      await host.halo.createIdentity({ displayName: 'Peer 1' });
      await guest.halo.createIdentity({ displayName: 'Peer 2' });

      afterTest(() => Promise.all([host.destroy()]));
      afterTest(() => Promise.all([guest.destroy()]));

      space = await host.createSpace();
    });

    testSuite(
      Invitation.Kind.SPACE,
      () => ({ host: space as SpaceProxy, guest }),
      () => [
        (host.services as LocalClientServices).host._serviceContext,
        (guest.services as LocalClientServices).host._serviceContext
      ]
    );
  });
});
