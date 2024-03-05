//
// Copyright 2021 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import waitForExpect from 'wait-for-expect';

import { asyncChain, asyncTimeout } from '@dxos/async';
import { type Space } from '@dxos/client-protocol';
import { type DataSpace, InvitationsServiceImpl, type ServiceContext } from '@dxos/client-services';
import {
  type PerformInvitationParams,
  type Result,
  createIdentity,
  createPeers,
  performInvitation,
} from '@dxos/client-services/testing';
import { MetadataStore } from '@dxos/echo-pipeline';
import { invariant } from '@dxos/invariant';
import { AlreadyJoinedError } from '@dxos/protocols';
import { ConnectionState, Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { afterTest, describe, test } from '@dxos/test';

import { Client } from '../client';
import { InvitationsProxy } from '../invitations';
import { TestBuilder } from '../testing';

chai.use(chaiAsPromised);

const closeAfterTest = async (peer: ServiceContext) => {
  afterTest(() => peer.close());
  return peer;
};

const successfulInvitation = async ({
  host,
  guest,
  hostResult: { invitation: hostInvitation, error: hostError },
  guestResult: { invitation: guestInvitation, error: guestError },
}: {
  host: ServiceContext;
  guest: ServiceContext;
  hostResult: Result;
  guestResult: Result;
}) => {
  expect(hostError).to.be.undefined;
  expect(guestError).to.be.undefined;
  expect(hostInvitation?.state).to.eq(Invitation.State.SUCCESS);
  expect(guestInvitation?.state).to.eq(Invitation.State.SUCCESS);
  expect(guestInvitation!.target).to.eq(hostInvitation!.target);

  switch (hostInvitation!.kind) {
    case Invitation.Kind.SPACE:
      expect(guestInvitation!.spaceKey).to.exist;
      expect(hostInvitation!.spaceKey).to.deep.eq(guestInvitation!.spaceKey);

      expect(host.dataSpaceManager!.spaces.get(hostInvitation!.spaceKey!)).to.exist;
      expect(guest.dataSpaceManager!.spaces.get(guestInvitation!.spaceKey!)).to.exist;

      break;

    case Invitation.Kind.DEVICE:
      expect(hostInvitation!.identityKey).not.to.exist;
      expect(guestInvitation!.identityKey).to.deep.eq(host.identityManager.identity!.identityKey);
      expect(guestInvitation!.identityKey).to.deep.eq(guest.identityManager.identity!.identityKey);

      // Check devices.
      // TODO(burdon): Incorrect number of devices.
      await waitForExpect(() => {
        expect(host.identityManager.identity!.authorizedDeviceKeys.size).to.eq(2);
        expect(guest.identityManager.identity!.authorizedDeviceKeys.size).to.eq(2);
      });
      // console.log(host.identityManager.identity!.authorizedDeviceKeys.size);
      // console.log(guest.identityManager.identity!.authorizedDeviceKeys.size);
      break;
  }
};

const testSuite = (getParams: () => PerformInvitationParams, getPeers: () => [ServiceContext, ServiceContext]) => {
  test('no auth', async () => {
    const [host, guest] = getPeers();
    const [hostResult, guestResult] = await Promise.all(performInvitation(getParams()));
    await successfulInvitation({ host, guest, hostResult, guestResult });
  });

  test('already joined', async () => {
    const [host, guest] = getPeers();
    const [hostResult, guestResult] = await Promise.all(performInvitation(getParams()));
    await successfulInvitation({ host, guest, hostResult, guestResult });
    const [_, result] = performInvitation(getParams());
    expect((await result).error).to.be.instanceof(AlreadyJoinedError);
  });

  test('with shared secret', async () => {
    const [host, guest] = getPeers();
    const params = getParams();
    const [hostResult, guestResult] = await Promise.all(
      performInvitation({
        ...params,
        options: { ...params.options, authMethod: Invitation.AuthMethod.SHARED_SECRET },
      }),
    );

    await successfulInvitation({ host, guest, hostResult, guestResult });
  });

  test('with target', async () => {
    const [host, guest] = getPeers();
    const params = getParams();
    const [hostResult, guestResult] = await Promise.all(
      performInvitation({
        ...params,
        options: { ...params.options, authMethod: Invitation.AuthMethod.SHARED_SECRET, target: 'example' },
      }),
    );

    await successfulInvitation({ host, guest, hostResult, guestResult });
  });

  test('invalid auth code', async () => {
    const [host, guest] = getPeers();
    const params = getParams();
    let attempt = 1;
    const [hostResult, guestResult] = await Promise.all(
      performInvitation({
        ...params,
        options: { ...params.options, authMethod: Invitation.AuthMethod.SHARED_SECRET },
        hooks: {
          guest: {
            onReady: (invitation) => {
              if (attempt === 0) {
                // Force retry.
                void invitation.authenticate('000000');
                attempt++;
                return true;
              }

              return false;
            },
          },
        },
      }),
    );

    expect(attempt).to.eq(1);
    await successfulInvitation({ host, guest, hostResult, guestResult });
  });

  test('max auth code retries', async () => {
    const params = getParams();
    let attempt = 0;
    const [hostPromise, guestPromise] = performInvitation({
      ...params,
      options: { ...params.options, authMethod: Invitation.AuthMethod.SHARED_SECRET },
      hooks: {
        guest: {
          onReady: (invitation) => {
            // Force retry.
            void invitation.authenticate('000000');
            attempt++;
            return true;
          },
        },
      },
    });
    const guestResult = await guestPromise;

    expect(attempt).to.eq(3);
    expect(guestResult.error).to.exist;
    await expect(asyncTimeout(hostPromise, 100)).to.be.rejected;
  });

  test('invitation timeout', async () => {
    const params = getParams();
    const [hostResult, guestResult] = await Promise.all(
      performInvitation({
        ...params,
        options: { ...params.options, authMethod: Invitation.AuthMethod.SHARED_SECRET, timeout: 1 },
      }),
    );

    expect(hostResult.invitation?.state).to.eq(Invitation.State.TIMEOUT);
    expect(guestResult.invitation?.state).to.eq(Invitation.State.TIMEOUT);
  });

  test('host cancels invitation', async () => {
    const params = getParams();
    const [hostResult, guestResult] = await Promise.all(
      performInvitation({
        ...params,
        options: { ...params.options, authMethod: Invitation.AuthMethod.SHARED_SECRET },
        hooks: {
          host: {
            onConnected: (invitation) => {
              void invitation.cancel();
              return true;
            },
          },
        },
      }),
    );

    expect(hostResult.invitation?.state).to.eq(Invitation.State.CANCELLED);
    expect(guestResult.error).to.exist;
  });

  test('guest cancels invitation', async () => {
    const params = getParams();
    const [hostPromise, guestPromise] = performInvitation({
      ...params,
      options: { ...params.options, authMethod: Invitation.AuthMethod.SHARED_SECRET },
      hooks: {
        guest: {
          onConnected: (invitation) => {
            void invitation.cancel();
            return true;
          },
        },
      },
    });
    const guestResult = await guestPromise;

    expect(guestResult.invitation?.state).to.eq(Invitation.State.CANCELLED);
    await expect(asyncTimeout(hostPromise, 100)).to.be.rejected;
  });

  test('network error', async () => {
    const [, guest] = getPeers();
    const params = getParams();
    const [hostPromise, guestPromise] = performInvitation({
      ...params,
      options: { ...params.options, authMethod: Invitation.AuthMethod.SHARED_SECRET },
      hooks: {
        guest: {
          onConnected: () => {
            void guest.networkManager.setConnectionState(ConnectionState.OFFLINE);
            return true;
          },
        },
      },
    });
    const guestResult = await guestPromise;

    expect(guestResult.error).to.exist;
    await expect(asyncTimeout(hostPromise, 100)).to.be.rejected;

    // Test cleanup fails if the guest is offline.
    await guest.networkManager.setConnectionState(ConnectionState.ONLINE);
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
        () => ({
          host,
          guest,
          options: { kind: Invitation.Kind.SPACE, spaceKey: space.key },
        }),
        () => [host, guest],
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
        () => ({ host, guest, options: { kind: Invitation.Kind.DEVICE } }),
        () => [host, guest],
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
        const hostMetadata = new MetadataStore(createStorage({ type: StorageType.RAM }).createDirectory());
        const guestMetadata = new MetadataStore(createStorage({ type: StorageType.RAM }).createDirectory());
        const peers = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));
        hostContext = peers[0];
        guestContext = peers[1];
        invariant(hostContext.dataSpaceManager);
        invariant(guestContext.dataSpaceManager);

        const hostService = new InvitationsServiceImpl(
          hostContext.invitations,
          (invitation) => hostContext.getInvitationHandler(invitation),
          hostMetadata,
        );
        const guestService = new InvitationsServiceImpl(
          guestContext.invitations,
          (invitation) => guestContext.getInvitationHandler(invitation),
          guestMetadata,
        );

        space = await hostContext.dataSpaceManager.createSpace();
        host = new InvitationsProxy(hostService, undefined, () => ({
          kind: Invitation.Kind.SPACE,
          spaceKey: space.key,
        }));
        guest = new InvitationsProxy(guestService, undefined, () => ({ kind: Invitation.Kind.SPACE }));

        afterTest(() => space.close());
      });

      testSuite(
        () => ({ host, guest }),
        () => [hostContext, guestContext],
      );
    });

    describe('device', () => {
      let hostContext: ServiceContext;
      let guestContext: ServiceContext;
      let host: InvitationsProxy;
      let guest: InvitationsProxy;

      beforeEach(async () => {
        const hostMetadata = new MetadataStore(createStorage({ type: StorageType.RAM }).createDirectory());
        const guestMetadata = new MetadataStore(createStorage({ type: StorageType.RAM }).createDirectory());
        const peers = await asyncChain<ServiceContext>([closeAfterTest])(createPeers(2));
        hostContext = peers[0];
        guestContext = peers[1];

        await hostContext.identityManager.createIdentity();

        const hostService = new InvitationsServiceImpl(
          hostContext.invitations,
          (invitation) => hostContext.getInvitationHandler(invitation),
          hostMetadata,
        );

        const guestService = new InvitationsServiceImpl(
          guestContext.invitations,
          (invitation) => guestContext.getInvitationHandler(invitation),
          guestMetadata,
        );

        host = new InvitationsProxy(hostService, undefined, () => ({ kind: Invitation.Kind.DEVICE }));
        guest = new InvitationsProxy(guestService, undefined, () => ({ kind: Invitation.Kind.DEVICE }));
      });

      testSuite(
        () => ({ host, guest }),
        () => [hostContext, guestContext],
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
      () => ({ host: host.halo, guest: guest.halo }),
      () => [(host.services as any).host._serviceContext, (guest.services as any).host._serviceContext],
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

      space = await host.spaces.create();
    });

    testSuite(
      () => ({ host: space, guest: guest.spaces }),
      () => [(host.services as any).host._serviceContext, (guest.services as any).host._serviceContext],
    );
  });
});
