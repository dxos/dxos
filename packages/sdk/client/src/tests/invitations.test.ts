//
// Copyright 2021 DXOS.org
//

import { beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { Trigger, chain, sleep, waitForCondition } from '@dxos/async';
import { type Space } from '@dxos/client-protocol';
import {
  type DataSpace,
  InvitationsManager,
  InvitationsServiceImpl,
  type ServiceContext,
  createAdmissionKeypair,
} from '@dxos/client-services';
import {
  type PerformInvitationProps,
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
import { StorageType, createStorage } from '@dxos/random-access-storage';

import { Client } from '../client';
import { InvitationsProxy } from '../invitations';
import { TestBuilder } from '../testing';

const closeAfterTest = async (peer: ServiceContext) => {
  onTestFinished(async () => {
    await peer.close();
  });

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
  await sleep(20);

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
      await expect.poll(() => host.identityManager.identity!.authorizedDeviceKeys.size).toEqual(2);
      await expect.poll(() => guest.identityManager.identity!.authorizedDeviceKeys.size).toEqual(2);
      break;
  }
};

const testSuite = (getProps: () => PerformInvitationProps, getPeers: () => [ServiceContext, ServiceContext]) => {
  test('no auth', async () => {
    const [host, guest] = getPeers();
    const [hostResult, guestResult] = await Promise.all(performInvitation(getProps()));
    await successfulInvitation({ host, guest, hostResult, guestResult });
  });

  test('already joined', async () => {
    const [host, guest] = getPeers();
    const [hostResult, guestResult] = await Promise.all(performInvitation(getProps()));
    await successfulInvitation({ host, guest, hostResult, guestResult });
    const [_, result] = performInvitation(getProps());
    expect((await result).error).to.be.instanceof(AlreadyJoinedError);
  });

  test('with shared secret', async () => {
    const [host, guest] = getPeers();
    const params = getProps();
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
    const params = getProps();
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
    const params = getProps();
    const keypair1 = createAdmissionKeypair();
    const keypair2 = createAdmissionKeypair();
    const invalidKeypair = { publicKey: keypair1.publicKey, privateKey: keypair2.privateKey };
    const [hostResult, guestResult] = await Promise.all(
      performInvitation({
        ...params,
        options: {
          ...params.options,
          guestKeypair: invalidKeypair,
          authMethod: Invitation.AuthMethod.KNOWN_PUBLIC_KEY,
        },
      }),
    );

    await expectErrorState({ hostResult, guestResult });
  });

  test('incomplete shared keypair', async () => {
    const params = getProps();
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

    await expectErrorState({ hostResult, guestResult });
  });

  test('with target', async () => {
    const [host, guest] = getPeers();
    const params = getProps();
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
    const params = getProps();
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
    const params = getProps();
    let attempt = 0;
    const [hostResult, guestResult] = await Promise.all(
      performInvitation({
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
      }),
    );

    expect(attempt).to.eq(3);
    await expectErrorState({ hostResult, guestResult });
  });

  test('invitation timeout', async () => {
    const params = getProps();
    const [hostResult, guestResult] = await Promise.all(
      performInvitation({
        ...params,
        options: { ...params.options, authMethod: Invitation.AuthMethod.SHARED_SECRET, timeout: 1 },
      }),
    );

    expect(guestResult.invitation?.state).to.eq(Invitation.State.TIMEOUT);
    await expectErrorState({ hostResult });
  });

  test('host cancels invitation', async () => {
    const params = getProps();
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
    const params = getProps();
    const [hostResult, guestResult] = await Promise.all(
      performInvitation({
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
      }),
    );

    expect(guestResult.invitation?.state).to.eq(Invitation.State.CANCELLED);
    await expectErrorState({ hostResult });
  });

  test('network error', async () => {
    const [, guest] = getPeers();
    const params = getProps();
    const [hostResult, guestResult] = await Promise.all(
      performInvitation({
        ...params,
        options: { ...params.options, authMethod: Invitation.AuthMethod.SHARED_SECRET },
        codeInputDelay: 200,
        hooks: {
          guest: {
            onConnected: () => {
              void guest.networkManager.setConnectionState(ConnectionState.OFFLINE);
              return true;
            },
          },
        },
      }),
    );
    await expectErrorState({ hostResult, guestResult });

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
        const peers = await chain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));
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
        const peers = await chain<ServiceContext>([closeAfterTest])(createPeers(2));
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
        const peers = await chain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));
        hostContext = peers[0];
        guestContext = peers[1];
        invariant(hostContext.dataSpaceManager);
        invariant(guestContext.dataSpaceManager);

        const { service, metadata } = createInvitationsApi(hostContext);
        hostMetadata = metadata;
        space = await hostContext.dataSpaceManager.createSpace();
        host = new InvitationsProxy(service, undefined, () => ({
          kind: Invitation.Kind.SPACE,
          spaceKey: space.key,
        }));

        onTestFinished(() => space.close());
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
      test('space with no auth', async () => {
        const [hostContext, guestContext] = await chain<ServiceContext>([createIdentity, closeAfterTest])(
          createPeers(2),
        );
        invariant(hostContext.dataSpaceManager);
        invariant(guestContext.dataSpaceManager);
        const hostApi = createInvitationsApi(hostContext);
        // TODO(nf): require calling manually outside of service-host?
        await hostApi.manager.loadPersistentInvitations();

        const { service: guestService, manager: guestManager } = createInvitationsApi(guestContext);
        await guestManager.loadPersistentInvitations();

        const space = await hostContext?.dataSpaceManager.createSpace();
        onTestFinished(() => space.close());

        const guest = new InvitationsProxy(guestService, undefined, () => ({ kind: Invitation.Kind.SPACE }));
        let persistentInvitationId: string;
        {
          const tempHost = new InvitationsProxy(hostApi.service, undefined, () => ({
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
          await waitForCondition({
            condition: () => hostContext.networkManager.topics.includes(persistentInvitation.get().swarmKey),
          });
          // TODO(nf): expose this in API as suspendInvitation()/SuspendableInvitation?
          await hostContext.networkManager.leaveSwarm(persistentInvitation.get().swarmKey);
        }

        const { service: newHostService, manager: newHostManager } = createInvitationsApi(
          hostContext,
          hostApi.metadata,
        );
        const host = new InvitationsProxy(newHostService, undefined, () => ({
          kind: Invitation.Kind.SPACE,
          spaceKey: space.key,
        }));

        const loadedInvitations = await newHostManager.loadPersistentInvitations();
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
        const peers = await chain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(1));
        const hostContext = peers[0];

        invariant(hostContext.dataSpaceManager);

        const hostApi = createInvitationsApi(hostContext);

        const space = await hostContext?.dataSpaceManager.createSpace();
        onTestFinished(() => space.close());

        {
          const tempHost = new InvitationsProxy(hostApi.service, undefined, () => ({
            kind: Invitation.Kind.SPACE,
            spaceKey: space.key,
            persistent: false,
          }));
          // TODO(nf): require calling manually outside of service-host?
          await hostApi.manager.loadPersistentInvitations();
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

        const { service: newHostService, manager: newHostManager } = createInvitationsApi(
          hostContext,
          hostApi.metadata,
        );
        await newHostManager.loadPersistentInvitations();
        expect(hostApi.metadata.getInvitations()).to.have.lengthOf(0);

        const host = new InvitationsProxy(newHostService, undefined, () => ({
          kind: Invitation.Kind.SPACE,
          spaceKey: space.key,
        }));
        await host.open();

        const loadedInvitations = await newHostManager.loadPersistentInvitations();
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
        const peers = await chain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));
        hostContext = peers[0];
        guestContext = peers[1];
        invariant(hostContext.dataSpaceManager);
        invariant(guestContext.dataSpaceManager);

        const { service: hostService } = createInvitationsApi(hostContext);
        const { service: guestService } = createInvitationsApi(guestContext);

        space = await hostContext.dataSpaceManager.createSpace();
        host = new InvitationsProxy(hostService, undefined, () => ({
          kind: Invitation.Kind.SPACE,
          spaceKey: space.key,
        }));
        guest = new InvitationsProxy(guestService, undefined, () => ({ kind: Invitation.Kind.SPACE }));

        onTestFinished(() => space.close());
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
        const peers = await chain<ServiceContext>([closeAfterTest])(createPeers(2));
        hostContext = peers[0];
        guestContext = peers[1];

        await hostContext.createIdentity();

        const { service: hostService } = createInvitationsApi(hostContext);
        const { service: guestService } = createInvitationsApi(guestContext);

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

      host = new Client({ services: testBuilder.createLocalClientServices() });
      guest = new Client({ services: testBuilder.createLocalClientServices() });
      await host.initialize();
      await guest.initialize();

      await host.halo.createIdentity({ displayName: 'Peer' });

      onTestFinished(async () => {
        await Promise.all([host.destroy()]);
      });
      onTestFinished(async () => {
        await Promise.all([guest.destroy()]);
      });
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

      host = new Client({ services: testBuilder.createLocalClientServices() });
      guest = new Client({ services: testBuilder.createLocalClientServices() });
      await host.initialize();
      await guest.initialize();
      await host.halo.createIdentity({ displayName: 'Peer 1' });
      await guest.halo.createIdentity({ displayName: 'Peer 2' });

      onTestFinished(async () => {
        await Promise.all([host.destroy()]);
      });
      onTestFinished(async () => {
        await Promise.all([guest.destroy()]);
      });

      space = await host.spaces.create();
    });

    testSuite(
      () => ({ host: space, guest: guest.spaces }),
      () => [(host.services as any).host._serviceContext, (guest.services as any).host._serviceContext],
    );
  });
});

const expectErrorState = async (args: {
  hostResult?: Promise<Result> | Result;
  guestResult?: Promise<Result> | Result;
}) => {
  const { hostResult, guestResult } = args;
  if (guestResult) {
    expect((await guestResult).error).to.exist;
  }
  if (hostResult) {
    // Host terminal states are EXPIRED, CANCELLED and SUCCESS. Instead of ERROR or TIMEOUT hosts
    // transition back to CONNECTING waiting for new guests.
    expect((await hostResult).error).not.to.exist;
    expect((await hostResult).invitation).toEqual(expect.objectContaining({ state: Invitation.State.CONNECTING }));
  }
};

const createInvitationsApi = (
  context: ServiceContext,
  metadata: MetadataStore = new MetadataStore(createStorage({ type: StorageType.RAM }).createDirectory()),
) => {
  const manager = new InvitationsManager(
    context.invitations,
    (invitation) => context.getInvitationHandler(invitation),
    metadata,
  );
  const service = new InvitationsServiceImpl(manager);
  return { manager, service, metadata };
};
