//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import {
  createDeviceInfoMessage,
  createIdentityInfoMessage,
  createKeyAdmitMessage,
  createPartyGenesisMessage,
  keyPairFromSeedPhrase,
  Keyring,
  KeyType,
  Filter,
  SecretProvider
} from '@dxos/credentials';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { PublicKey } from '@dxos/protocols';

import { createHaloPartyAdmissionMessage, GreetingInitiator, HaloRecoveryInitiator, InvitationDescriptor, InvitationDescriptorType, OfflineInvitationClaimer } from '../invitations';
import { PARTY_ITEM_TYPE } from '../parties';
import { PartyFeedProvider, PipelineOptions } from '../pipeline';
import { CredentialsSigner } from '../protocol/credentials-signer';
import { SnapshotStore } from '../snapshots';
import {
  HaloParty,
  HALO_PARTY_CONTACT_LIST_TYPE, HALO_PARTY_DEVICE_PREFERENCES_TYPE, HALO_PARTY_PREFERENCES_TYPE
} from './halo-party';

/**
 * Options allowed when creating the HALO.
 */
export interface HaloCreationOptions {
  identityDisplayName?: string
  deviceDisplayName?: string
}

const log = debug('dxos:echo-db:halo-factory');

/**
 * Create and manage HALO parties.
 */
export class HaloFactory {
  constructor (
    private readonly _networkManager: NetworkManager,
    private readonly _modelFactory: ModelFactory,
    private readonly _snapshotStore: SnapshotStore,
    private readonly _feedProviderFactory: (partyKey: PublicKey) => PartyFeedProvider,
    private readonly _keyring: Keyring,
    private readonly _options: PipelineOptions = {}
  ) {}

  async constructParty (): Promise<HaloParty> {
    const credentialsSigner = CredentialsSigner.createDirectDeviceSigner(this._keyring);
    const feedProvider = this._feedProviderFactory(credentialsSigner.getIdentityKey().publicKey);
    const halo = new HaloParty(
      this._modelFactory,
      this._snapshotStore,
      feedProvider,
      credentialsSigner,
      this._networkManager,
      undefined,
      this._options
    );

    return halo;
  }

  async createHalo (options: HaloCreationOptions = {}): Promise<HaloParty> {
    // Don't use `identityManager.identityKey`, because that doesn't check for the secretKey.
    const identityKey = this._keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }));
    assert(identityKey, 'Identity key required.');

    const deviceKey = this._keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE })) ??
      await this._keyring.createKeyRecord({ type: KeyType.DEVICE });

    // 1. Create a feed for the HALO.
    const halo = await this.constructParty();
    const feedKey = await halo.getWriteFeedKey();
    const feedKeyPair = this._keyring.getKey(feedKey);
    assert(feedKeyPair);
    halo._setGenesisFeedKey(feedKey);

    // Connect the pipeline.
    await halo.open();

    /* 2. Write a PartyGenesis message for the HALO. This message must be signed by the:
     *    A. Identity key (in the case of the HALO, this serves as the Party key).
     *    B. Device key (the first "member" of the Identity's HALO).
     *    C. Feed key (the feed owned by the Device).
     */
    await halo.credentialsWriter.write(createPartyGenesisMessage(this._keyring, identityKey, feedKeyPair.publicKey, deviceKey));

    /* 3. Make a special self-signed KeyAdmit message which will serve as an "IdentityGenesis" message. This
     *    message will be copied into other Parties which we create or join.
     */
    await halo.credentialsWriter.write(createKeyAdmitMessage(this._keyring, identityKey.publicKey, identityKey));

    if (options.identityDisplayName) {
      // 4. Write the IdentityInfo message with descriptive details (eg, display name).
      await halo.credentialsWriter.write(createIdentityInfoMessage(this._keyring, options.identityDisplayName, identityKey));
    }

    if (options.deviceDisplayName) {
      // 5. Write the DeviceInfo message with descriptive details (eg, display name).
      await halo.credentialsWriter.write(createDeviceInfoMessage(this._keyring, options.deviceDisplayName, deviceKey));
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

  async recoverHalo (seedPhrase: string) {
    const recoveredKeyPair = keyPairFromSeedPhrase(seedPhrase);
    await this._keyring.addKeyRecord({
      publicKey: PublicKey.from(recoveredKeyPair.publicKey),
      secretKey: recoveredKeyPair.secretKey,
      type: KeyType.IDENTITY
    });
    await this._keyring.createKeyRecord({ type: KeyType.DEVICE });

    const recoverer = new HaloRecoveryInitiator(this._networkManager, CredentialsSigner.createDirectDeviceSigner(this._keyring));
    await recoverer.connect();

    const invitationDescriptor = await recoverer.claim();

    return this._joinHalo(invitationDescriptor, recoverer.createSecretProvider());
  }

  async joinHalo (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider) {
    assert(!this._keyring.findKey(Filter.matches({ type: KeyType.IDENTITY })), 'Identity key must not exist.');

    return this._joinHalo(invitationDescriptor, secretProvider);
  }

  private async _joinHalo (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider) {
    log(`Admitting device with invitation: ${PublicKey.stringify(invitationDescriptor.invitation)}`);
    assert(invitationDescriptor.identityKey);

    let identityKey = this._keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }));
    if (!identityKey) {
      identityKey = await this._keyring.addPublicKey({
        type: KeyType.IDENTITY,
        publicKey: invitationDescriptor.identityKey,
        own: true,
        trusted: true
      });
    } else {
      assert(identityKey.publicKey.equals(invitationDescriptor.identityKey),
        'Identity key must match invitation');
    }
    assert(identityKey);

    const deviceKey = this._keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE })) ??
      await this._keyring.createKeyRecord({ type: KeyType.DEVICE });

    const originalInvitation = invitationDescriptor;

    const credentialsSigner = CredentialsSigner.createDirectDeviceSigner(this._keyring);
    // Claim the offline invitation and convert it into an interactive invitation.
    if (invitationDescriptor.type === InvitationDescriptorType.OFFLINE) {
      const invitationClaimer = new OfflineInvitationClaimer(this._networkManager, invitationDescriptor);
      await invitationClaimer.connect();
      invitationDescriptor = await invitationClaimer.claim();
      log(`Party invitation triggered interactive Greeting at: ${JSON.stringify({ original: originalInvitation.invitation, interactive: invitationDescriptor.invitation })}`);
      await invitationClaimer.destroy();
    }

    const initiator = new GreetingInitiator(
      this._networkManager,
      invitationDescriptor,
      async (partyKey, nonce) => {
        assert(partyKey.equals(identityKey!.publicKey));
        return [createHaloPartyAdmissionMessage(credentialsSigner, nonce)];
      }
    );

    await initiator.connect();
    const { genesisFeedKey } = await initiator.redeemInvitation(secretProvider);

    const halo = await this.constructParty();
    halo._setGenesisFeedKey(genesisFeedKey);
    await halo.open();

    await initiator.destroy();

    await halo.database.createItem({
      model: ObjectModel,
      type: HALO_PARTY_DEVICE_PREFERENCES_TYPE,
      props: { publicKey: deviceKey.publicKey.asBuffer() }
    });

    return halo;
  }
}
