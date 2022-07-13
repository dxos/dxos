//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { createKeyAdmitMessage, createPartyGenesisMessage, defaultSecretProvider, Keyring, KeyType, codec as haloCodec } from '@dxos/credentials';
import { codec } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { PublicKey } from '@dxos/protocols';
import { createStorage, StorageType } from '@dxos/random-access-multi-storage';

import { createDataPartyAdmissionMessages, defaultInvitationAuthenticator, GreetingInitiator } from '../invitations';
import { MetadataStore, PartyFeedProvider } from '../pipeline';
import { createAuthenticator, createCredentialsProvider } from '../protocol';
import { createTestIdentityCredentials, deriveTestDeviceCredentials, IdentityCredentials } from '../protocol/identity-credentials';
import { SnapshotStore } from '../snapshots';
import { DataParty } from './data-party';

describe('DataParty', () => {
  const createParty = async (identity: IdentityCredentials, partyKey: PublicKey, feedHints: PublicKey[]) => {

    const storage = createStorage('', StorageType.RAM);
    const snapshotStore = new SnapshotStore(storage.directory('snapshots'));
    const metadataStore = new MetadataStore(storage.directory('metadata'));
    const feedStore = new FeedStore(storage.directory('feed'), { valueEncoding: codec });
    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const networkManager = new NetworkManager();
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
    party._setFeedHints([...feedHints, writableFeed.key]);
    return party;
  };

  test('open & close', async () => {
    const keyring = new Keyring();
    const identity = await createTestIdentityCredentials(keyring);
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const party = await createParty(identity, partyKey.publicKey, []);

    await party.open();
    await party.close();
  });

  test('edit data', async () => {
    const keyring = new Keyring();
    const identity = await createTestIdentityCredentials(keyring);
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const party = await createParty(identity, partyKey.publicKey, []);
    await party.open();

    const feed = await party.getWriteFeed();
    await party.credentialsWriter.write(createPartyGenesisMessage(
      keyring,
      partyKey,
      feed.key,
      partyKey
    ));

    await party.database.createItem({ type: 'test:item' });

    await party.close();
  });

  test('data is immediately available after re-opening', async () => {
    const keyring = new Keyring();
    const identity = await createTestIdentityCredentials(keyring);
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const party = await createParty(identity, partyKey.publicKey, []);
    await party.open();

    const feed = await party.getWriteFeed();
    await party.credentialsWriter.write(createPartyGenesisMessage(
      keyring,
      partyKey,
      feed.key,
      partyKey
    ));

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

    const party = await createParty(identity, partyKey.publicKey, []);
    await party.open();
    const feed = await party.getWriteFeed();
    await party.credentialsWriter.write(createPartyGenesisMessage(
      keyring,
      partyKey,
      feed.key,
      partyKey
    ));
    await party.processor.feedAdded.waitForCount(1);

    const authenticator = createAuthenticator(party.processor, identity.createCredentialsSigner(), party.credentialsWriter);
    const credentialsProvider = createCredentialsProvider(identity.createCredentialsSigner(), party.key, feed.key);

    const wrappedCredentials = haloCodec.decode(credentialsProvider.get());
    expect(await authenticator.authenticate(wrappedCredentials.payload)).toEqual(true);

    await party.close();
  });

  test('authenticates another device', async () => {
    const keyring = new Keyring();
    const identityA = await createTestIdentityCredentials(keyring);
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });

    const party = await createParty(identityA, partyKey.publicKey, []);
    await party.open();
    const feed = await party.getWriteFeed();
    await party.credentialsWriter.write(createPartyGenesisMessage(
      keyring,
      partyKey,
      feed.key,
      partyKey
    ));
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

    const partyA = await createParty(identityA, partyKey.publicKey, []);
    await partyA.open();
    const feedA = await partyA.getWriteFeed();
    await partyA.credentialsWriter.write(createPartyGenesisMessage(
      keyring,
      partyKey,
      feedA.key,
      partyKey
    ));
    await partyA.credentialsWriter.write(createKeyAdmitMessage(
      keyring,
      partyKey.publicKey,
      identityA.identityKey,
      [partyKey]
    ));

    const identityB = await deriveTestDeviceCredentials(identityA);
    const partyB = await createParty(identityB, partyKey.publicKey, [feedA.key]);
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

    const partyA = await createParty(identityA, partyKeyA.publicKey, []);
    await partyA.open();
    const feedA = await partyA.getWriteFeed();
    await partyA.credentialsWriter.write(createPartyGenesisMessage(
      identityA.keyring,
      partyKeyA,
      feedA.key,
      partyKeyA
    ));
    await partyA.credentialsWriter.write(createKeyAdmitMessage(
      identityA.keyring,
      partyKeyA.publicKey,
      identityA.identityKey,
      [partyKeyA]
    ));

    const invitation = await partyA.invitationManager.createInvitation(defaultInvitationAuthenticator);

    const identityB = await createTestIdentityCredentials(new Keyring());
    const initiator = new GreetingInitiator(
      new NetworkManager(),
      invitation,
      async (partyKey, nonce) => [createDataPartyAdmissionMessages(
        identityB.createCredentialsSigner(),
        partyKey,
        identityB.identityGenesis,
        nonce
      )]
    );

    await initiator.connect();
    const { partyKey: partyKeyB, hints: hintsB } = await initiator.redeemInvitation(defaultSecretProvider);
    expect(partyKeyB.equals(partyKeyA.publicKey));
    const partyB = await createParty(identityB, partyKeyB, hintsB);
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
