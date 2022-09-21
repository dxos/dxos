//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { defaultSecretProvider, Keyring, codec as haloCodec } from '@dxos/credentials'; // TODO(burdon): Remove haloCodec.
import { FeedStore } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { MemorySignalManagerContext, MemorySignalManager } from '@dxos/messaging';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { KeyType } from '@dxos/protocols/proto/dxos/halo/keys';
import { createStorage, StorageType } from '@dxos/random-access-storage';

import { createDataPartyAdmissionMessages, defaultInvitationAuthenticator, GreetingInitiator } from '../invitations';
import { MetadataStore, PartyFeedProvider } from '../pipeline';
import { createAuthenticator, createCredentialsProvider, createTestIdentityCredentials, deriveTestDeviceCredentials, IdentityCredentials } from '../protocol';
import { SnapshotStore } from '../snapshots';
import { DataParty } from './data-party';
import { codec } from '../codec';

const signalContext = new MemorySignalManagerContext();

describe.skip('DataParty', () => {
  const createParty = async (identity: IdentityCredentials, partyKey: PublicKey, genesisFeedKey?: PublicKey) => {

    const storage = createStorage({ type: StorageType.RAM });
    const snapshotStore = new SnapshotStore(storage.createDirectory('snapshots'));
    const metadataStore = new MetadataStore(storage.createDirectory('metadata'));
    const feedStore = new FeedStore(storage.createDirectory('feed'), { valueEncoding: codec });
    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const networkManager = new NetworkManager({ signalManager: new MemorySignalManager(signalContext) });
    const partyFeedProvider = new PartyFeedProvider(metadataStore, identity.keyring, feedStore, partyKey);
    const writableFeed = await partyFeedProvider.createOrOpenWritableFeed();

    const party = new DataParty(
      partyKey,
      modelFactory,
      snapshotStore,
      partyFeedProvider,
      metadataStore,
      identity.createCredentialsSigner(),
      identity.preferences,
      networkManager
    );
    party._setGenesisFeedKey(genesisFeedKey ?? writableFeed.key);
    return party;
  };

  test('open & close', async () => {
    const keyring = new Keyring();
    const identity = await createTestIdentityCredentials(keyring);
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const party = await createParty(identity, partyKey.publicKey);

    await party.open();
    await party.close();
  });

  test('edit data', async () => {
    const keyring = new Keyring();
    const identity = await createTestIdentityCredentials(keyring);
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const party = await createParty(identity, partyKey.publicKey);
    await party.open();

    const feed = await party.getWriteFeed();
    // await party.credentialsWriter.write(createPartyGenesisMessage(
    //   keyring,
    //   partyKey,
    //   feed.key,
    //   partyKey
    // ));

    await party.database.createItem({ type: 'test:item' });

    await party.close();
  });

  test('data is immediately available after re-opening', async () => {
    const keyring = new Keyring();
    const identity = await createTestIdentityCredentials(keyring);
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const party = await createParty(identity, partyKey.publicKey);
    await party.open();

    const feed = await party.getWriteFeed();
    // await party.credentialsWriter.write(createPartyGenesisMessage(
    //   keyring,
    //   partyKey,
    //   feed.key,
    //   partyKey
    // ));

    for (let i = 0; i < 10; i++) {
      await party.database.createItem({ type: 'test:item' });
    }

    await party.close();
    await party.open();

    expect(party.database.select({ type: 'test:item' }).exec().entities).toHaveLength(10);

    await party.close();
  });

  test('authenticates its own credentials', async () => {
    const keyring = new Keyring();
    const identity = await createTestIdentityCredentials(keyring);
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });

    const party = await createParty(identity, partyKey.publicKey);
    await party.open();
    const feed = await party.getWriteFeed();
    // await party.credentialsWriter.write(createPartyGenesisMessage(
    //   keyring,
    //   partyKey,
    //   feed.key,
    //   partyKey
    // ));
    await party.processor.feedAdded.waitForCount(1);

    const authenticator = createAuthenticator(party.processor, identity.createCredentialsSigner(), party.credentialsWriter);
    const credentialsProvider = createCredentialsProvider(identity.createCredentialsSigner(), party.key, feed.key);

    const wrappedCredentials = haloCodec.decode(credentialsProvider.get() as any);
    expect(await authenticator.authenticate(wrappedCredentials.payload)).toEqual(true);

    await party.close();
  });

  test('authenticates another device', async () => {
    const keyring = new Keyring();
    const identityA = await createTestIdentityCredentials(keyring);
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });

    const party = await createParty(identityA, partyKey.publicKey);
    await party.open();
    const feed = await party.getWriteFeed();
    // await party.credentialsWriter.write(createPartyGenesisMessage(
    //   keyring,
    //   partyKey,
    //   feed.key,
    //   partyKey
    // ));
    await party.processor.feedAdded.waitForCount(1);

    const authenticator = createAuthenticator(party.processor, identityA.createCredentialsSigner(), party.credentialsWriter);

    const identityB = await deriveTestDeviceCredentials(identityA);
    const credentialsProvider = createCredentialsProvider(identityB.createCredentialsSigner(), party.key, feed.key);

    const wrappedCredentials = haloCodec.decode(credentialsProvider.get());
    expect(await authenticator.authenticate(wrappedCredentials.payload)).toEqual(true);

    await party.close();
  });

  test('two instances replicating', async () => {
    const keyring = new Keyring();
    const identityA = await createTestIdentityCredentials(keyring);
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });

    const partyA = await createParty(identityA, partyKey.publicKey);
    await partyA.open();
    const feedA = await partyA.getWriteFeed();
    // await partyA.credentialsWriter.write(createPartyGenesisMessage(
    //   keyring,
    //   partyKey,
    //   feedA.key,
    //   partyKey
    // ));
    // await partyA.credentialsWriter.write(createKeyAdmitMessage(
    //   keyring,
    //   partyKey.publicKey,
    //   identityA.identityKey,
    //   [partyKey]
    // ));

    const identityB = await deriveTestDeviceCredentials(identityA);
    const partyB = await createParty(identityB, partyKey.publicKey, feedA.key);
    await partyB.open();

    await partyA.database.createItem({ type: 'test:item-a' });
    await partyB.database.waitForItem({ type: 'test:item-a' });

    await partyB.database.createItem({ type: 'test:item-b' });
    await partyA.database.waitForItem({ type: 'test:item-b' });

    await partyA.close();
    await partyB.close();
  });

  test('invitations', async () => {
    const identityA = await createTestIdentityCredentials(new Keyring());
    const partyKeyA = await identityA.keyring.createKeyRecord({ type: KeyType.PARTY });

    const partyA = await createParty(identityA, partyKeyA.publicKey);
    await partyA.open();
    const feedA = await partyA.getWriteFeed();
    // await partyA.credentialsWriter.write(createPartyGenesisMessage(
    //   identityA.keyring,
    //   partyKeyA,
    //   feedA.key,
    //   partyKeyA
    // ));
    // await partyA.credentialsWriter.write(createKeyAdmitMessage(
    //   identityA.keyring,
    //   partyKeyA.publicKey,
    //   identityA.identityKey,
    //   [partyKeyA]
    // ));

    const invitation = await partyA.invitationManager.createInvitation(defaultInvitationAuthenticator);

    const identityB = await createTestIdentityCredentials(new Keyring());
    const initiator = new GreetingInitiator(
      new NetworkManager({ signalManager: new MemorySignalManager(signalContext) }),
      invitation,
      async (partyKey, nonce) => [createDataPartyAdmissionMessages(
        identityB.createCredentialsSigner(),
        partyKey,
        identityB.identityGenesis,
        nonce
      )]
    );

    await initiator.connect();
    const { partyKey: partyKeyB, genesisFeedKey } = await initiator.redeemInvitation(defaultSecretProvider);
    expect(partyKeyB.equals(partyKeyA.publicKey));
    const partyB = await createParty(identityB, partyKeyB, genesisFeedKey);
    await partyB.open();
    await initiator.destroy();

    await partyA.database.createItem({ type: 'test:item-a' });
    await partyB.database.waitForItem({ type: 'test:item-a' });

    await partyB.database.createItem({ type: 'test:item-b' });
    await partyA.database.waitForItem({ type: 'test:item-b' });

    await partyA.close();
    await partyB.close();
  });
});
