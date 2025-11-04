//
// Copyright 2022 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { CredentialGenerator, createDidFromIdentityKey, verifyCredential } from '@dxos/credentials';
import {
  MOCK_AUTH_PROVIDER,
  MOCK_AUTH_VERIFIER,
  MetadataStore,
  Space,
  SpaceProtocol,
  createIdFromSpaceKey,
  valueEncoding,
} from '@dxos/echo-pipeline';
import { type EdgeConnection, type MessageListener } from '@dxos/edge-client';
import { FeedFactory, FeedStore } from '@dxos/feed-store';
import { type FeedWrapper } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { type PublicKey } from '@dxos/keys';
import { MemorySignalManager, MemorySignalManagerContext } from '@dxos/messaging';
import { MemoryTransportFactory, SwarmNetworkManager } from '@dxos/network-manager';
import { EdgeStatus } from '@dxos/protocols/proto/dxos/client/services';
import { type FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { AdmittedFeed } from '@dxos/protocols/proto/dxos/halo/credentials';
import { StorageType, createStorage } from '@dxos/random-access-storage';
import { BlobStore } from '@dxos/teleport-extension-object-sync';

import { Identity } from './identity';

const createStores = () => {
  const storage = createStorage({ type: StorageType.RAM });
  const metadataStore = new MetadataStore(storage.createDirectory('metadata'));
  const blobStore = new BlobStore(storage.createDirectory('blobs'));

  return {
    storage,
    metadataStore,
    blobStore,
  };
};

describe('identity/identity', () => {
  test('create', async () => {
    const setup = await setupIdentity();

    await writeGenesisCredential(setup);

    // Wait for identity to be ready.
    await setup.identity.ready();
    const identitySigner = setup.identity.getIdentityCredentialSigner();
    const credential = await identitySigner.createCredential({
      subject: setup.identityKey,
      assertion: {
        '@type': 'dxos.halo.credentials.IdentityProfile',
        profile: {
          displayName: 'Alice',
        },
      },
    });

    expect(credential.issuer).toEqual(setup.identityKey);
    expect(await verifyCredential(credential)).toEqual({ kind: 'pass' });
  });

  test('two devices', async () => {
    const signalContext = new MemorySignalManagerContext();

    const owner = await setupIdentity({ signalContext });
    await writeGenesisCredential(owner);
    await owner.identity.ready();

    const secondDevice = (
      await setupIdentity({
        signalContext,
        spaceKey: owner.spaceKey,
        identityKey: owner.identityKey,
        genesisFeedKey: owner.controlFeed.key,
      })
    ).identity;

    //
    // Second device admission
    //
    {
      const signer = owner.identity.getIdentityCredentialSigner();
      void owner.identity.controlPipeline.writer.write({
        credential: {
          credential: await signer.createCredential({
            subject: secondDevice.deviceKey,
            assertion: {
              '@type': 'dxos.halo.credentials.AuthorizedDevice',
              identityKey: owner.identityKey,
              deviceKey: secondDevice.deviceKey,
            },
          }),
        },
      });

      await secondDevice.ready();
    }

    expect(Array.from(owner.identity.authorizedDeviceKeys.keys())).toEqual([owner.deviceKey, secondDevice.deviceKey]);
    expect(Array.from(secondDevice.authorizedDeviceKeys.keys())).toEqual([owner.deviceKey, secondDevice.deviceKey]);
  });

  test('edge feed replicator', async () => {
    let replicationStarted = false;
    let status = EdgeStatus.ConnectionState.NOT_CONNECTED;
    const listeners: Array<() => void> = [];
    const setup = await setupIdentity({
      edgeConnection: {
        statusChanged: new Event(),
        get status() {
          return { state: status };
        },
        onReconnected: (listener) => {
          if (status === EdgeStatus.ConnectionState.CONNECTED) {
            listener();
          } else {
            listeners.push(listener);
          }
          return () => {};
        },
        open: async () => {},
        close: async () => {},
        onMessage:
          (_: MessageListener): (() => void) =>
          () => {},
        send: async (_) => {
          replicationStarted = true;
        },
      } as EdgeConnection,
    });

    await writeGenesisCredential(setup);
    listeners.forEach((callback) => callback());
    status = EdgeStatus.ConnectionState.CONNECTED;

    await expect.poll(() => replicationStarted).toBeTruthy();
  });

  const setupIdentity = async (args?: {
    signalContext?: MemorySignalManagerContext;
    spaceKey?: PublicKey;
    identityKey?: PublicKey;
    genesisFeedKey?: PublicKey;
    edgeConnection?: EdgeConnection;
  }): Promise<TestIdentitySetup> => {
    const { storage, metadataStore, blobStore } = createStores();

    const keyring = new Keyring();
    const deviceKey = await keyring.createKey();
    const identityKey = args?.identityKey ?? (await keyring.createKey());
    const spaceKey = args?.spaceKey ?? (await keyring.createKey());

    const feedStore = new FeedStore<FeedMessage>({
      factory: new FeedFactory<FeedMessage>({
        root: storage.createDirectory(),
        signer: keyring,
        hypercore: {
          valueEncoding,
        },
      }),
    });

    const createFeed = async () => {
      const feedKey = await keyring.createKey();
      return feedStore.openFeed(feedKey, { writable: true });
    };

    const controlFeed = await createFeed();
    const dataFeed = await createFeed();

    const protocol = new SpaceProtocol({
      topic: spaceKey,
      swarmIdentity: {
        peerKey: deviceKey,
        identityKey,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialAuthenticator: MOCK_AUTH_VERIFIER,
      },
      blobStore,
      networkManager: new SwarmNetworkManager({
        signalManager: new MemorySignalManager(args?.signalContext ?? new MemorySignalManagerContext()),
        transportFactory: MemoryTransportFactory,
        peerInfo: { identityKey: identityKey.toHex(), peerKey: deviceKey.toHex() },
      }),
    });

    await metadataStore.setIdentityRecord({ haloSpace: { key: spaceKey }, identityKey, deviceKey });
    const space: Space = new Space({
      id: await createIdFromSpaceKey(spaceKey),
      spaceKey,
      protocol,
      genesisFeed: args?.genesisFeedKey ? await feedStore.openFeed(args.genesisFeedKey) : controlFeed,
      feedProvider: (feedKey) => feedStore.openFeed(feedKey),
      memberKey: identityKey,
      metadataStore,
      snapshotId: undefined,
      onDelegatedInvitationStatusChange: async () => {},
      onMemberRolesChanged: async () => {},
    });
    await space.setControlFeed(controlFeed);
    await space.setDataFeed(dataFeed);

    const identity = new Identity({
      signer: keyring,
      did: await createDidFromIdentityKey(identityKey),
      identityKey,
      deviceKey,
      space,
      edgeFeatures: args?.edgeConnection && { feedReplicator: true },
      edgeConnection: args?.edgeConnection,
    });

    await identity.open(new Context());
    await identity.joinNetwork();
    onTestFinished(() => identity.close(new Context()));
    return { identity, identityKey, keyring, deviceKey, controlFeed, spaceKey, dataFeed };
  };

  const writeGenesisCredential = async (setup: TestIdentitySetup) => {
    const generator = new CredentialGenerator(setup.keyring, setup.identityKey, setup.deviceKey);
    const credentials = [
      ...(await generator.createSpaceGenesis(setup.spaceKey, setup.controlFeed.key)),
      await generator.createDeviceAuthorization(setup.deviceKey),
      await generator.createFeedAdmission(setup.spaceKey, setup.dataFeed.key, AdmittedFeed.Designation.DATA),
    ];

    for (const credential of credentials) {
      await setup.identity.controlPipeline.writer.write({
        credential: { credential },
      });
    }
  };
});

type TestIdentitySetup = {
  identity: Identity;
  keyring: Keyring;
  identityKey: PublicKey;
  deviceKey: PublicKey;
  spaceKey: PublicKey;
  controlFeed: FeedWrapper<FeedMessage>;
  dataFeed: FeedWrapper<FeedMessage>;
};
