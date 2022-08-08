//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { defaultSecretProvider, generateSeedPhrase, keyPairFromSeedPhrase, Keyring } from '@dxos/credentials';
import { codec } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { PublicKey } from '@dxos/protocols';
import { createStorage, StorageType } from '@dxos/random-access-multi-storage';
import { afterTest, testTimeout } from '@dxos/testutils';

import { defaultInvitationAuthenticator } from '../invitations';
import { MetadataStore, PartyFeedProvider } from '../pipeline';
import { SnapshotStore } from '../snapshots';
import { HALO } from './halo';

describe('HALO', () => {
  const setup = () => {
    const modelFactory = new ModelFactory()
      .registerModel(ObjectModel);

    const networkManager = new NetworkManager();
    const storage = createStorage('', StorageType.RAM);
    const snapshotStore = new SnapshotStore(storage.directory('snapshots'));
    const metadataStore = new MetadataStore(storage.directory('metadata'));
    const keyring = new Keyring();
    const feedStore = new FeedStore(storage.directory('feed'), { valueEncoding: codec });

    const feedProviderFactory = (partyKey: PublicKey) => new PartyFeedProvider(
      metadataStore,
      keyring,
      feedStore,
      partyKey
    );

    return new HALO({
      keyring,
      networkManager,
      metadataStore,
      feedProviderFactory,
      modelFactory,
      snapshotStore,
      options: {}
    });
  };

  const setupOpen = async () => {
    const halo = setup();
    await halo.open();
    afterTest(() => halo.close());
    return halo;
  };

  test('open & close', async () => {
    const halo = setup();

    await halo.open();
    await halo.close();
  });

  test('create profile', async () => {
    const halo = setup();
    await halo.open();
    afterTest(() => halo.close());

    const profile = await halo.createProfile({ username: 'Test user' });
    expect(profile.username).toEqual('Test user');
    expect(profile.publicKey).toBeInstanceOf(PublicKey);
  });

  test('reload with profile', async () => {
    const halo = setup();
    await halo.open();

    const initialProfile = await halo.createProfile({ username: 'Test user' });
    await halo.close();

    await halo.open();
    const profile = halo.getProfile();
    expect(profile).toBeDefined();
    expect(profile!.username).toEqual('Test user');
    expect(profile!.publicKey.equals(initialProfile.publicKey)).toBeTruthy();

    await halo.close();
  });

  test('invite another device', async () => {
    const deviceA = setup();
    await deviceA.open();
    afterTest(() => deviceA.close());
    const profileA = await deviceA.createProfile({ username: 'Test user' });

    const deviceB = setup();
    await deviceB.open();
    afterTest(() => deviceB.close());

    const invitation = await deviceA.createInvitation(defaultInvitationAuthenticator);
    await deviceB.join(invitation, defaultSecretProvider);

    const profileB = deviceB.getProfile();
    expect(profileB).toBeDefined();
    expect(profileB!.username).toEqual('Test user');
    expect(profileB!.publicKey.equals(profileA.publicKey)).toBeTruthy();
  });

  test('invite 2 devices in a chain', async () => {
    const deviceA = await setupOpen();
    const deviceB = await setupOpen();
    const deviceC = await setupOpen();

    const profileA = await deviceA.createProfile({ username: 'Test user' });

    {
      const invitation = await deviceA.createInvitation(defaultInvitationAuthenticator);
      await deviceB.join(invitation, defaultSecretProvider);
    }

    {
      const invitation = await deviceB.createInvitation(defaultInvitationAuthenticator);
      await deviceC.join(invitation, defaultSecretProvider);
    }

    const profileC = deviceC.getProfile();
    expect(profileC).toBeDefined();
    expect(profileC!.username).toEqual('Test user');
    expect(profileC!.publicKey.equals(profileA.publicKey)).toBeTruthy();
  });

  test('recover HALO', async () => {
    const deviceA = await setupOpen();
    const deviceB = await setupOpen();

    const seedPhrase = generateSeedPhrase();
    const profileA = await deviceA.createProfile({ username: 'Test user', ...keyPairFromSeedPhrase(seedPhrase) });

    await deviceB.recover(seedPhrase);
    const profileB = deviceB.getProfile();
    expect(profileB).toBeDefined();
    expect(profileB!.username).toEqual('Test user');
    expect(profileB!.publicKey.equals(profileA.publicKey)).toBeTruthy();
  });

  test('HALO database is synced between 2 devices', async () => {
    const deviceA = await setupOpen();
    const deviceB = await setupOpen();
    await deviceA.createProfile({ username: 'Test user' });
    const invitation = await deviceA.createInvitation(defaultInvitationAuthenticator);
    await deviceB.join(invitation, defaultSecretProvider);

    {
      const itemA = await deviceA.identity!.halo!.database.createItem({ type: 'example:test-1' });
      const itemB = await testTimeout(deviceB.identity!.halo!.database.waitForItem({ type: 'example:test-1' }));
      expect(itemA.id).toEqual(itemB.id);
    }

    {
      const itemB = await deviceB.identity!.halo.database.createItem({ type: 'example:test-2' });
      const itemA = await testTimeout(deviceA.identity!.halo.database.waitForItem({ type: 'example:test-2' }));
      expect(itemB.id).toEqual(itemA.id);
    }
  });

  describe('Preferences', () => {
    test('global and device work on single device', async () => {
      const halo = await setupOpen();
      await halo.createProfile();

      const globalPreferences: ObjectModel = halo.identity!.preferences!.getGlobalPreferences()!.model;
      await globalPreferences.set('key', 'value');
      expect(globalPreferences.get('key')).toEqual('value');

      const devicePreferences: ObjectModel = halo.identity!.preferences!.getDevicePreferences()!.model;
      await devicePreferences.set('key', 'value2');
      expect(devicePreferences.get('key')).toEqual('value2');
    });

    test('global preferences are synced between devices', async () => {
      const deviceA = await setupOpen();
      const deviceB = await setupOpen();
      await deviceA.createProfile({ username: 'Test user' });
      const invitation = await deviceA.createInvitation(defaultInvitationAuthenticator);
      await deviceB.join(invitation, defaultSecretProvider);

      const preferencesA: ObjectModel = deviceA.identity!.preferences!.getGlobalPreferences()!.model;
      const preferencesB: ObjectModel = deviceB.identity!.preferences!.getGlobalPreferences()!.model;

      const update = preferencesB.update.waitForCount(1);
      await preferencesA.set('key', 'value');
      await testTimeout(update);
      expect(preferencesB.get('key')).toEqual('value');
    });
  });
});
