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
  Filter,
  SecretProvider,
  createEnvelopeMessage,
  wrapMessage,
  KeyHint,
  createFeedAdmitMessage
} from '@dxos/credentials';
import { keyToString, PublicKey, keyPairFromSeedPhrase } from '@dxos/crypto';
import { PartyKey } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';

import { GreetingInitiator, HaloRecoveryInitiator, InvitationDescriptor, InvitationDescriptorType, OfflineInvitationClaimer } from '../invitations';
import { PartyOptions, PARTY_ITEM_TYPE } from '../parties';
import { PartyFeedProvider } from '../pipeline';
import { SnapshotStore } from '../snapshots';
import {
  HaloParty,
  HALO_PARTY_CONTACT_LIST_TYPE, HALO_PARTY_DEVICE_PREFERENCES_TYPE, HALO_PARTY_PREFERENCES_TYPE
} from './halo-party';
import { Identity, IdentityProvider } from './identity';

/**
 * Options allowed when creating the HALO.
 */
export interface HaloCreationOptions {
  identityDisplayName?: string,
  deviceDisplayName?: string
}

const log = debug('dxos:echo-db:halo-factory');

/**
 * Create and manage HALO parties.
 */
export class HaloFactory {
  constructor (
    private readonly _identityProvider: IdentityProvider,
    private readonly _networkManager: NetworkManager,
    private readonly _modelFactory: ModelFactory,
    private readonly _snapshotStore: SnapshotStore,
    private readonly _createFeedProvider: (partyKey: PublicKey) => PartyFeedProvider,
    private readonly _keyring: Keyring,
    private readonly _options: PartyOptions = {}
  ) {}

  async constructParty (): Promise<HaloParty> {
    const identityKey = this._keyring.findKey(Filter.matches({ type: KeyType.IDENTITY, own: true, trusted: true }));
    assert(identityKey, 'Identity key required.');

    const deviceKey = this._keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE }));
    assert(deviceKey, 'Device key required.');

    const feedProvider = this._createFeedProvider(identityKey.publicKey);

    //
    // Create the party.
    //
    const party = new HaloParty(
      identityKey.publicKey,
      this._modelFactory,
      this._snapshotStore,
      feedProvider,
      this._identityProvider,
      this._networkManager,
      [],
      undefined,
      this._options,
      deviceKey.publicKey
    );

    return party;
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

    // Connect the pipeline.
    await halo.open();

    /* 2. Write a PartyGenesis message for the HALO. This message must be signed by the:
     *    A. Identity key (in the case of the HALO, this serves as the Party key).
     *    B. Device key (the first "member" of the Identity's HALO).
     *    C. Feed key (the feed owned by the Device).
     */
    await halo.processor.writeHaloMessage(createPartyGenesisMessage(this._keyring, identityKey, feedKeyPair.publicKey, deviceKey));

    /* 3. Make a special self-signed KeyAdmit message which will serve as an "IdentityGenesis" message. This
     *    message will be copied into other Parties which we create or join.
     */
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

    // const halo = await this._partyFactory.joinParty(invitationDescriptor, secretProvider);
    const haloInvitation = !!invitationDescriptor.identityKey;
    const originalInvitation = invitationDescriptor;

    const identity = this._identityProvider();
    // Claim the offline invitation and convert it into an interactive invitation.
    if (InvitationDescriptorType.OFFLINE === invitationDescriptor.type) {
      const invitationClaimer = new OfflineInvitationClaimer(this._networkManager, invitationDescriptor);
      await invitationClaimer.connect();
      invitationDescriptor = await invitationClaimer.claim();
      log(`Party invitation ${keyToString(originalInvitation.invitation)} triggered interactive Greeting`,
          `at ${keyToString(invitationDescriptor.invitation)}`);
      await invitationClaimer.destroy();
    }

    // TODO(burdon): Factor out.
    const initiator = new GreetingInitiator(
      this._networkManager,
      identity,
      invitationDescriptor
    );

    await initiator.connect();
    const { partyKey, hints } = await initiator.redeemInvitation(secretProvider);
    const halo = await this._addParty(partyKey, hints);
    await initiator.destroy();
    if (!haloInvitation) {
      assert(identity.deviceKeyChain);

      // Copy our signed IdentityInfo into the new Party.
      const infoMessage = identity.identityInfo;
      if (infoMessage) {
        await halo.processor.writeHaloMessage(createEnvelopeMessage(
          identity.signer,
          partyKey,
          wrapMessage(infoMessage),
          [identity.deviceKeyChain]
        ));
      }
    }

    await halo.database.createItem({
      model: ObjectModel,
      type: HALO_PARTY_DEVICE_PREFERENCES_TYPE,
      props: { publicKey: deviceKey.publicKey.asBuffer() }
    });

    return halo;
  }

  /**
   * Constructs a party object and creates a local write feed for it.
   * @param partyKey
   * @param hints
   */
  private async _addParty (partyKey: PartyKey, hints: KeyHint[] = []): Promise<HaloParty> {
    const identity = this._identityProvider();

    const deviceKey = this._keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE })) ??
          await this._keyring.createKeyRecord({ type: KeyType.DEVICE });

    /*
       * TODO(telackey): We shouldn't have to add our key here, it should be in the hints, but our hint
       * mechanism is broken by not waiting on the messages to be processed before returning.
       */

    const feedProvider = this._createFeedProvider(partyKey);
    const { feed } = await feedProvider.createOrOpenWritableFeed();
    const feedKeyPair = identity.keyring.getKey(feed.key);
    assert(feedKeyPair, 'Keypair for writable feed not found.');
    const party = new HaloParty(
      partyKey,
      this._modelFactory,
      this._snapshotStore,
      feedProvider,
      this._identityProvider,
      this._networkManager,
      [{ type: feedKeyPair.type, publicKey: feedKeyPair.publicKey }, ...hints],
      undefined,
      this._options,
      deviceKey.publicKey
    );

    await party.open();
    assert(identity.identityKey, 'No identity key.');
    const isHalo = identity.identityKey.publicKey.equals(partyKey);
    const signingKey = isHalo ? identity.deviceKey : identity.deviceKeyChain;
    assert(signingKey, 'No device key or keychain.');
    // Write the Feed genesis message.
    await party.processor.writeHaloMessage(createFeedAdmitMessage(
      identity.signer,
      partyKey,
      feedKeyPair.publicKey,
      [signingKey]
    ));
    return party;
  }
}
