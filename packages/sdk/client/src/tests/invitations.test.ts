//
// Copyright 2021 DXOS.org
//

import { beforeEach, onTestFinished, describe, expect, test } from 'vitest';

import { asyncTimeout, sleep } from '@dxos/async';
import { type DataSpace, InvitationsServiceImpl, ServiceContext, InvitationsManager } from '@dxos/client-services';
import { type PerformInvitationParams, type Result, performInvitation } from '@dxos/client-services/testing';
import { MetadataStore } from '@dxos/echo-pipeline';
import { createEphemeralEdgeIdentity, EdgeClient } from '@dxos/edge-client';
import { createTestLevel } from '@dxos/kv-store/testing';
import { log } from '@dxos/log';
import { EdgeSignalManager } from '@dxos/messaging';
import { MemoryTransportFactory, SwarmNetworkManager } from '@dxos/network-manager';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
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
    await asyncTimeout(successfulInvitation({ host, guest, hostResult, guestResult }), 1500);
  });
};

// TODO(mykola): Expects wrangler dev in edge repo to run. Skip to pass CI.
describe.only('EDGE signaling', () => {
  describe.skip('space', () => {
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
