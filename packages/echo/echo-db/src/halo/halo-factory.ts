//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import {
  createDeviceInfoMessage,
  createIdentityInfoMessage,
  createKeyAdmitMessage,
  createPartyGenesisMessage,
  Keyring,
  KeyType,
  Filter
} from '@dxos/credentials';
import { keyToString, PublicKey, keyPairFromSeedPhrase } from '@dxos/crypto';
import { NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';

import {
  HaloRecoveryInitiator,
  InvitationDescriptor,
  SecretProvider
} from '../invitations';
import { PartyFactory, PartyInternal, PARTY_ITEM_TYPE } from '../parties';
import {
  HALO_PARTY_CONTACT_LIST_TYPE, HALO_PARTY_DEVICE_PREFERENCES_TYPE, HALO_PARTY_PREFERENCES_TYPE
} from './halo-party';
import { Identity } from './identity';

/**
 * Options allowed when creating the HALO.
 */
export interface HaloCreationOptions {
  identityDisplayName?: string,
  deviceDisplayName?: string
}

const log = debug('dxos:echo:parties:halo-factory');

/**
 * Create and manage HALO parties.
 */
export class HaloFactory {
  constructor (
    private readonly _partyFactory: PartyFactory,
    private readonly _networkManager: NetworkManager,
    private readonly _keyring: Keyring
  ) {}

  async constructParty (partyKey: PublicKey) {
    return this._partyFactory.constructParty(partyKey);
  }

  async createHalo (options: HaloCreationOptions = {}): Promise<PartyInternal> {
    // Don't use identityManager.identityKey, because that doesn't check for the secretKey.
    const identityKey = this._keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }));
    assert(identityKey, 'Identity key required.');

    const deviceKey = this._keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE })) ??
      await this._keyring.createKeyRecord({ type: KeyType.DEVICE });

    // 1. Create a feed for the HALO.
    const halo = await this._partyFactory.constructParty(identityKey.publicKey);
    const { feed } = await halo.feedProvider.getWritableFeed();

    // Connect the pipeline.
    await halo.open();

    // 2. Write a PartyGenesis message for the HALO. This message must be signed by the:
    //    A. Identity key (in the case of the HALO, this serves as the Party key)
    //    B. Device key (the first "member" of the Identity's HALO)
    //    C. Feed key (the feed owned by the Device)
    const feedKeyPair = this._keyring.getKey(feed.key);
    assert(feedKeyPair);
    await halo.processor.writeHaloMessage(createPartyGenesisMessage(this._keyring, identityKey, feedKeyPair, deviceKey));

    // 3. Make a special self-signed KeyAdmit message which will serve as an "IdentityGenesis" message. This
    //    message will be copied into other Parties which we create or join.
    await halo.processor.writeHaloMessage(createKeyAdmitMessage(this._keyring, identityKey.publicKey, identityKey));

    if (options.identityDisplayName) {
      // 4. Write the IdentityInfo message with descriptive details (eg, display name).
      await halo.processor.writeHaloMessage(createIdentityInfoMessage(this._keyring, options.identityDisplayName, identityKey));
    }

    if (options.deviceDisplayName) {
      // 5. Write the DeviceInfo message with descriptive details (eg, display name).
      await halo.processor.writeHaloMessage(createDeviceInfoMessage(this._keyring, options.deviceDisplayName, deviceKey));
    }

    // Create special properties item.
    await halo.database.createItem({ model: ObjectModel, type: PARTY_ITEM_TYPE });
    await halo.database.createItem({ model: ObjectModel, type: HALO_PARTY_PREFERENCES_TYPE });
    await halo.database.createItem({ model: ObjectModel, type: HALO_PARTY_CONTACT_LIST_TYPE });
    await halo.database.createItem({
      model: ObjectModel,
      type: HALO_PARTY_DEVICE_PREFERENCES_TYPE,
      props: { publicKey: deviceKey.publicKey.asBuffer() }
    });

    // Do no retain the Identity secret key after creation of the HALO.
    await this._keyring.deleteSecretKey(identityKey);

    return halo;
  }

  async recoverHalo (identity: Identity, seedPhrase: string) {
    const recoveredKeyPair = keyPairFromSeedPhrase(seedPhrase);
    await this._keyring.addKeyRecord({
      publicKey: PublicKey.from(recoveredKeyPair.publicKey),
      secretKey: recoveredKeyPair.secretKey,
      type: KeyType.IDENTITY
    });

    const recoverer = new HaloRecoveryInitiator(this._networkManager, identity);
    await recoverer.connect();

    const invitationDescriptor = await recoverer.claim();

    return this._joinHalo(invitationDescriptor, recoverer.createSecretProvider());
  }

  async joinHalo (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider) {
    assert(!this._keyring.findKey(Filter.matches({ type: KeyType.PARTY })), 'Identity key must NOT exist.');

    return this._joinHalo(invitationDescriptor, secretProvider);
  }

  private async _joinHalo (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider) {
    log(`Admitting device with invitation: ${keyToString(invitationDescriptor.invitation)}`);
    assert(invitationDescriptor.identityKey);

    const identityKey = this._keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }));
    if (!identityKey) {
      await this._keyring.addPublicKey({
        type: KeyType.IDENTITY,
        publicKey: invitationDescriptor.identityKey,
        own: true,
        trusted: true
      });
    } else {
      assert(identityKey.publicKey.equals(invitationDescriptor.identityKey),
        'Identity key must match invitation');
    }

    const deviceKey = this._keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE })) ??
      await this._keyring.createKeyRecord({ type: KeyType.DEVICE });

    const halo = await this._partyFactory.joinParty(invitationDescriptor, secretProvider);
    await halo.database.createItem({
      model: ObjectModel,
      type: HALO_PARTY_DEVICE_PREFERENCES_TYPE,
      props: { publicKey: deviceKey.publicKey.asBuffer() }
    });

    return halo;
  }
}
