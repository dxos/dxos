//
// Copyright 2021 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import waitForExpect from 'wait-for-expect';

import { asyncChain, asyncTimeout, Trigger } from '@dxos/async';
import { type Space } from '@dxos/client-protocol';
import {
  createAdmissionKeypair,
  type DataSpace,
  InvitationsServiceImpl,
  type ServiceContext,
} from '@dxos/client-services';
import {
  type PerformInvitationParams,
  type Result,
  createIdentity,
  createPeers,
  performInvitation,
} from '@dxos/client-services/testing';
import { MetadataStore } from '@dxos/echo-pipeline';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
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

  test('with shared keypair', async () => {
    const [host, guest] = getPeers();
    const params = getParams();
    const guestKeypair = createAdmissionKeypair();
    const [hostResult, guestResult] = await Promise.all(
      performInvitation({
        ...params,
        options: { ...params.options, guestKeypair, authMethod: Invitation.AuthMethod.KNOWN_PUBLIC_KEY },
      }),
    );

    await successfulInvitation({ host, guest, hostResult, guestResult });
  });

  test('invalid shared keypair', async () => {
    const params = getParams();
    const keypair1 = createAdmissionKeypair();
    const keypair2 = createAdmissionKeypair();
    const invalidKeypair = { publicKey: keypair1.publicKey, privateKey: keypair2.privateKey };
    const [hostResult, guestResult] = performInvitation({
      ...params,
      options: {
        ...params.options,
        guestKeypair: invalidKeypair,
        authMethod: Invitation.AuthMethod.KNOWN_PUBLIC_KEY,
      },
    });

    expect((await guestResult).error).to.exist;
    await expect(asyncTimeout(hostResult, 100)).to.be.rejected;
  });

  test('incomplete shared keypair', async () => {
    const params = getParams();
    const keypair = createAdmissionKeypair();
    delete keypair.privateKey;
    const [hostResult, guestResult] = performInvitation({
      ...params,
      options: {
        ...params.options,
        guestKeypair: keypair,
        authMethod: Invitation.AuthMethod.KNOWN_PUBLIC_KEY,
      },
    });

    expect((await guestResult).error).to.exist;
    await expect(asyncTimeout(hostResult, 100)).to.be.rejected;
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
    describe('invitation expiry', () => {
      let hostContext: ServiceContext;
      let guestContext: ServiceContext;
      let host: InvitationsProxy;
      let space: DataSpace;
      let hostMetadata: MetadataStore;

      beforeEach(async () => {
        hostMetadata = new MetadataStore(createStorage({ type: StorageType.RAM }).createDirectory());
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
        space = await hostContext.dataSpaceManager.createSpace();
        host = new InvitationsProxy(hostService, undefined, () => ({
          kind: Invitation.Kind.SPACE,
          spaceKey: space.key,
        }));

        afterTest(() => space.close());
      });
      test('invitations expire', async () => {
        const expired = new Trigger();
        const complete = new Trigger();
        const invitation = host.share({ lifetime: 3 });
        invitation.subscribe(
          async (invitation) => {
            if (invitation.state === Invitation.State.EXPIRED) {
              expired.wake();
            }
          },
          (err: Error) => {
            log('invitation error', { err });
            throw err;
          },
          () => {
            complete.wake();
          },
        );
        await expired.wait({ timeout: 5_000 });
        await complete.wait();
        expect(invitation.get().state).to.eq(Invitation.State.EXPIRED);
        // TODO: assumes too much about implementation.
        expect(hostMetadata.getInvitations()).to.have.lengthOf(0);
        const swarmTopic = hostContext.networkManager.topics.find((topic) => topic.equals(invitation.get().swarmKey));
        expect(swarmTopic).to.be.undefined;
      });
    });
    describe('persistent invitations', () => {
      let hostContext: ServiceContext;
      let guestContext: ServiceContext;
      let host: InvitationsProxy;
      let guest: InvitationsProxy;
      let space: DataSpace;
      let hostService: InvitationsServiceImpl;
      let hostMetadata: MetadataStore;

      test('space with no auth', async () => {
        hostMetadata = new MetadataStore(createStorage({ type: StorageType.RAM }).createDirectory());
        const guestMetadata = new MetadataStore(createStorage({ type: StorageType.RAM }).createDirectory());
        const peers = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));
        hostContext = peers[0];
        guestContext = peers[1];
        invariant(hostContext.dataSpaceManager);
        invariant(guestContext.dataSpaceManager);
        hostService = new InvitationsServiceImpl(
          hostContext.invitations,
          (invitation) => hostContext.getInvitationHandler(invitation),
          hostMetadata,
        );
        // TODO(nf): require calling manually outside of service-host?
        await hostService.loadPersistentInvitations();

        const guestService = new InvitationsServiceImpl(
          guestContext.invitations,
          (invitation) => guestContext.getInvitationHandler(invitation),
          guestMetadata,
        );
        await guestService.loadPersistentInvitations();

        space = await hostContext?.dataSpaceManager.createSpace();
        afterTest(() => space.close());

        guest = new InvitationsProxy(guestService, undefined, () => ({ kind: Invitation.Kind.SPACE }));
        let persistentInvitationId: string;
        {
          const tempHost = new InvitationsProxy(hostService, undefined, () => ({
            kind: Invitation.Kind.SPACE,
            spaceKey: space.key,
          }));

          // ensure the saved event fires
          await tempHost.open();
          const savedTrigger = new Trigger();
          tempHost.saved.subscribe((invitation) => {
            if (invitation.length > 0) {
              savedTrigger.wake();
            }
          });
          const persistentInvitation = tempHost.share({ authMethod: Invitation.AuthMethod.NONE });
          persistentInvitationId = persistentInvitation.get().invitationId;
          await savedTrigger.wait();
          // TODO(nf): expose this in API as suspendInvitation()/SuspendableInvitation?
          await hostContext.networkManager.leaveSwarm(persistentInvitation.get().swarmKey);
        }

        const newHostService = new InvitationsServiceImpl(
          hostContext.invitations,
          (invitation) => hostContext.getInvitationHandler(invitation),
          hostMetadata,
        );
        host = new InvitationsProxy(newHostService, undefined, () => ({
          kind: Invitation.Kind.SPACE,
          spaceKey: space.key,
        }));

        const loadedInvitations = await newHostService.loadPersistentInvitations();
        await host.open();
        expect(loadedInvitations.invitations).to.have.lengthOf(1);

        const [hostObservable] = host.created.get();
        expect(hostObservable.get().invitationId).to.be.eq(persistentInvitationId);

        const hostComplete = new Trigger<Result>();
        const guestComplete = new Trigger<Result>();
        hostObservable.subscribe(
          async (hostInvitation: Invitation) => {
            switch (hostInvitation.state) {
              case Invitation.State.CONNECTING: {
                const guestObservable = guest.join(hostInvitation);
                guestObservable.subscribe(
                  async (guestInvitation: Invitation) => {
                    switch (guestInvitation.state) {
                      case Invitation.State.SUCCESS: {
                        guestComplete.wake({ invitation: guestInvitation });
                        break;
                      }
                    }
                  },
                  (err: Error) => {
                    throw err;
                  },
                );
                break;
              }
              case Invitation.State.SUCCESS: {
                hostComplete.wake({ invitation: hostInvitation });
                break;
              }
            }
          },
          (err: Error) => {
            throw err;
          },
        );

        await successfulInvitation({
          host: hostContext,
          guest: guestContext,
          hostResult: await hostComplete.wait(),
          guestResult: await guestComplete.wait(),
        });
      });
      test('non-persistent invitations are not persisted', async () => {
        hostMetadata = new MetadataStore(createStorage({ type: StorageType.RAM }).createDirectory());
        const peers = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(1));
        hostContext = peers[0];

        invariant(hostContext.dataSpaceManager);

        hostService = new InvitationsServiceImpl(
          hostContext.invitations,
          (invitation) => hostContext.getInvitationHandler(invitation),
          hostMetadata,
        );

        space = await hostContext?.dataSpaceManager.createSpace();
        afterTest(() => space.close());

        {
          const tempHost = new InvitationsProxy(hostService, undefined, () => ({
            kind: Invitation.Kind.SPACE,
            spaceKey: space.key,
            persistent: false,
          }));
          // TODO(nf): require calling manually outside of service-host?
          await hostService.loadPersistentInvitations();
          await tempHost.open();

          const createdTrigger = new Trigger();
          tempHost.created.subscribe((invitation) => {
            if (invitation.length > 0) {
              createdTrigger.wake();
            }
          });
          tempHost.share({ authMethod: Invitation.AuthMethod.NONE });
          await createdTrigger.wait();
        }

        const newHostService = new InvitationsServiceImpl(
          hostContext.invitations,
          (invitation) => hostContext.getInvitationHandler(invitation),
          hostMetadata,
        );
        await newHostService.loadPersistentInvitations();
        expect(hostMetadata.getInvitations()).to.have.lengthOf(0);

        host = new InvitationsProxy(newHostService, undefined, () => ({
          kind: Invitation.Kind.SPACE,
          spaceKey: space.key,
        }));
        await host.open();

        const loadedInvitations = await newHostService.loadPersistentInvitations();
        expect(loadedInvitations.invitations).to.have.lengthOf(0);
        expect(host.created.get()).to.have.lengthOf(0);
      });
    });
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
