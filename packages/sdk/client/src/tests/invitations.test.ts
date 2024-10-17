//
// Copyright 2021 DXOS.org
//

import { beforeEach, onTestFinished, describe, expect, test } from 'vitest';

import { sleep } from '@dxos/async';
import {
  createAdmissionKeypair,
  type DataSpace,
  InvitationsServiceImpl,
  ServiceContext,
  InvitationsManager,
} from '@dxos/client-services';
import { type PerformInvitationParams, type Result, performInvitation } from '@dxos/client-services/testing';
import { MetadataStore } from '@dxos/echo-pipeline';
import { createEphemeralEdgeIdentity, EdgeClient } from '@dxos/edge-client';
import { createTestLevel } from '@dxos/kv-store/testing';
import { log } from '@dxos/log';
import { EdgeSignalManager } from '@dxos/messaging';
import { MemoryTransportFactory, SwarmNetworkManager } from '@dxos/network-manager';
import { AlreadyJoinedError } from '@dxos/protocols';
import { ConnectionState, Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { openAndClose } from '@dxos/test-utils';

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
      // TODO(burdon): Incorrect number of devices.
      await expect.poll(() => host.identityManager.identity!.authorizedDeviceKeys.size).toEqual(2);
      await expect.poll(() => guest.identityManager.identity!.authorizedDeviceKeys.size).toEqual(2);

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

    expect(guestResult.error).to.exist;
    expect(hostResult.error).to.exist;
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
    expect(await hostResult).toEqual({
      error: expect.any(Error),
    });
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
    expect(guestResult).toEqual({ error: expect.any(Error) });
    expect(hostResult).toEqual({ error: expect.any(Error) });
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
    expect(hostResult).toEqual({ error: expect.any(Error) });
  });

  test('network error', async () => {
    const [, guest] = getPeers();
    const params = getParams();
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
    expect(guestResult.error).to.exist;
    expect(hostResult.error).to.exist;

    // Test cleanup fails if the guest is offline.
    await guest.networkManager.setConnectionState(ConnectionState.ONLINE);
  });
};

// TODO(mykola): Expects wrangler dev in edge repo to run. Skip to pass CI.
describe.only('EDGE signaling', () => {
  describe('space', () => {
    log.break();
    const createPeer = async () => {
      const identity = await createEphemeralEdgeIdentity();
      const edgeConnection = new EdgeClient(identity, {
        socketEndpoint: 'ws://localhost:8787',
      });
      await openAndClose(edgeConnection);
      const signalManager = new EdgeSignalManager({ edgeConnection });
      await openAndClose(signalManager);
      const networkManager = new SwarmNetworkManager({
        signalManager,
        transportFactory: MemoryTransportFactory,
        peerInfo: { peerKey: identity.peerKey, identityKey: identity.identityKey },
      });
      const level = createTestLevel();
      await openAndClose(level);

      const peer = new ServiceContext(
        createStorage({ type: StorageType.RAM }),
        level,
        networkManager,
        signalManager,
        edgeConnection,
        undefined,
        {
          invitationConnectionDefaultParams: { controlHeartbeatInterval: 200 },
        },
      );
      await openAndClose(peer);
      return peer;
    };

    let host: ServiceContext;
    let guest: ServiceContext;
    let space: DataSpace;

    beforeEach(async () => {
      host = await createPeer();
      await host.createIdentity();
      space = await host.dataSpaceManager!.createSpace();

      guest = await createPeer();
      await guest.createIdentity();
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
    const createPeer = async () => {
      const identity = await createEphemeralEdgeIdentity();
      const edgeConnection = new EdgeClient(identity, {
        socketEndpoint: 'ws://localhost:8787',
      });
      await openAndClose(edgeConnection);
      const signalManager = new EdgeSignalManager({ edgeConnection });
      await openAndClose(signalManager);
      const networkManager = new SwarmNetworkManager({
        signalManager,
        transportFactory: MemoryTransportFactory,
        peerInfo: { peerKey: identity.peerKey, identityKey: identity.identityKey },
      });
      const level = createTestLevel();
      await openAndClose(level);

      const peer = new ServiceContext(
        createStorage({ type: StorageType.RAM }),
        level,
        networkManager,
        signalManager,
        edgeConnection,
        undefined,
        {
          invitationConnectionDefaultParams: { controlHeartbeatInterval: 200 },
        },
      );
      await openAndClose(peer);
      return peer;
    };

    let host: ServiceContext;
    let guest: ServiceContext;

    beforeEach(async () => {
      host = await createPeer();
      await host.createIdentity();

      guest = await createPeer();
    });

    testSuite(
      () => ({
        host,
        guest,
        options: { kind: Invitation.Kind.DEVICE },
      }),
      () => [host, guest],
    );
  });
});

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
