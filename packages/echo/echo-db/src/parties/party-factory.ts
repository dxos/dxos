//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import {
  createDeviceInfoMessage,
  createEnvelopeMessage,
  createFeedAdmitMessage,
  createIdentityInfoMessage,
  createKeyAdmitMessage,
  createPartyGenesisMessage,
  KeyHint,
  Keyring,
  KeyType,
  keyPairFromSeedPhrase,
  wrapMessage
} from '@dxos/credentials';
import { humanize, keyToString, PublicKey } from '@dxos/crypto';
import { timed } from '@dxos/debug';
import { PartyKey, PartySnapshot, Timeframe } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';

import {
  GreetingInitiator,
  HaloRecoveryInitiator,
  InvitationDescriptor,
  InvitationDescriptorType,
  OfflineInvitationClaimer,
  SecretProvider
} from '../invitations';
import { SnapshotStore } from '../snapshots';
import { FeedStoreAdapter } from '../util';
import { HALO_CONTACT_LIST_TYPE, HALO_DEVICE_PREFERENCES_TYPE, HALO_GENERAL_PREFERENCES_TYPE } from './halo-party';
import { IdentityManager } from './identity-manager';
import { PartyInternal, PARTY_ITEM_TYPE, PartyOptions } from './party-internal';

/**
 * Options allowed when creating the HALO.
 */
export interface HaloCreationOptions {
  identityDisplayName?: string,
  deviceDisplayName?: string
}

const log = debug('dxos:echo:parties:party-factory');

/**
 * Creates parties.
 */
export class PartyFactory {
  // TODO(telackey): It might be better to take Keyring as a param to createParty/constructParty/etc.
  constructor (
    private readonly _identityManager: IdentityManager,
    private readonly _feedStore: FeedStoreAdapter,
    private readonly _modelFactory: ModelFactory,
    private readonly _networkManager: NetworkManager,
    private readonly _snapshotStore: SnapshotStore,
    private readonly _options: PartyOptions = {}
  ) { }

  /**
   * Create a new party with a new feed for it. Writes a party genensis message to this feed.
   */
  @timed(5_000)
  async createParty (): Promise<PartyInternal> {
    assert(!this._options.readOnly, 'PartyFactory is read-only');
    assert(this._identityManager.halo, 'HALO must exist');
    assert(this._identityManager.identityGenesis, 'IdentityGenesis must exist');
    assert(this._identityManager.deviceKeyChain, 'Device KeyChain must exist');

    const partyKey = await this._identityManager.keyring.createKeyRecord({ type: KeyType.PARTY });
    const { feedKey } = await this._initWritableFeed(partyKey.publicKey);
    const party = await this.constructParty(partyKey.publicKey);

    // Connect the pipeline.
    await party.open();

    // PartyGenesis (self-signed by Party)
    await party.processor.writeHaloMessage(createPartyGenesisMessage(
      this._identityManager.keyring,
      partyKey,
      feedKey,
      partyKey)
    );

    // KeyAdmit (IdentityGenesis in an Envelope signed by Party)
    await party.processor.writeHaloMessage(createEnvelopeMessage(
      this._identityManager.keyring,
      partyKey.publicKey,
      wrapMessage(this._identityManager.identityGenesis),
      [partyKey])
    );

    // FeedAdmit (signed by the Device KeyChain).
    await party.processor.writeHaloMessage(createFeedAdmitMessage(
      this._identityManager.keyring,
      partyKey.publicKey,
      feedKey,
      [this._identityManager.deviceKeyChain]
    ));

    if (this._identityManager.identityInfo) {
      // IdentityInfo in an Envelope signed by the Device KeyChain
      await party.processor.writeHaloMessage(createEnvelopeMessage(
        this._identityManager.keyring,
        partyKey.publicKey,
        wrapMessage(this._identityManager.identityInfo),
        [this._identityManager.deviceKeyChain]
      ));
    }

    // Create special properties item.
    await party.database.createItem({ model: ObjectModel, type: PARTY_ITEM_TYPE });

    // The Party key is an inception key; its SecretKey must be destroyed once the Party has been created.
    await this._identityManager.keyring.deleteSecretKey(partyKey);

    return party;
  }

  /**
   * Constructs a party object and creates a local write feed for it.
   * @param partyKey
   * @param hints
   */
  async addParty (partyKey: PartyKey, hints: KeyHint[] = []) {
    const { feedKey } = await this._initWritableFeed(partyKey);

    // TODO(telackey): We shouldn't have to add our key here, it should be in the hints, but our hint
    // mechanism is broken by not waiting on the messages to be processed before returning.
    const party = await this.constructParty(partyKey, [
      {
        type: feedKey.type,
        publicKey: feedKey.publicKey
      },
      ...hints
    ]);

    await party.open();

    assert(this._identityManager.identityKey, 'No identity key');
    const isHalo = this._identityManager.identityKey.publicKey.equals(partyKey);

    const signingKey = isHalo ? this._identityManager.deviceKey : this._identityManager.deviceKeyChain;
    assert(signingKey, 'No device key or keychain.');

    // Write the Feed genesis message.
    await party.processor.writeHaloMessage(createFeedAdmitMessage(
      this._identityManager.keyring,
      partyKey,
      feedKey,
      [signingKey]
    ));

    return party;
  }

  /**
   * Constructs a party object from an existing set of feeds.
   * @param partyKey
   * @param hints
   */
  async constructParty (partyKey: PartyKey, hints: KeyHint[] = [], initialTimeframe?: Timeframe) {
    // TODO(marik-d): Support read-only parties if this feed doesn't exist?
    // TODO(marik-d): Verify that this feed is admitted.
    assert(this._feedStore.queryWritableFeed(partyKey), `Feed not found for party: ${partyKey.toHex()}`);

    //
    // Create the party.
    //
    const party = new PartyInternal(
      partyKey,
      this._identityManager,
      this._feedStore,
      this._modelFactory,
      this._networkManager,
      this._snapshotStore,
      hints,
      initialTimeframe,
      this._options
    );

    log(`Constructed: ${party}`);
    return party;
  }

  async constructPartyFromSnapshot (snapshot: PartySnapshot) {
    assert(snapshot.partyKey);
    log(`Constructing ${humanize(snapshot.partyKey)} from snapshot at ${JSON.stringify(snapshot.timeframe)}.`);

    const party = await this.constructParty(PublicKey.from(snapshot.partyKey), [], snapshot.timeframe);
    await party.restoreFromSnapshot(snapshot);
    return party;
  }

  async joinParty (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider): Promise<PartyInternal> {
    const haloInvitation = !!invitationDescriptor.identityKey;
    const originalInvitation = invitationDescriptor;

    // Claim the offline invitation and convert it into an interactive invitation.
    if (InvitationDescriptorType.OFFLINE_KEY === invitationDescriptor.type) {
      const invitationClaimer = new OfflineInvitationClaimer(this._networkManager, this._identityManager, invitationDescriptor);
      await invitationClaimer.connect();
      invitationDescriptor = await invitationClaimer.claim();
      log(`Party invitation ${keyToString(originalInvitation.invitation)} triggered interactive Greeting`,
        `at ${keyToString(invitationDescriptor.invitation)}`);
      await invitationClaimer.destroy();
    }

    // TODO(burdon): Factor out.
    const initiator = new GreetingInitiator(
      this._networkManager,
      this._identityManager,
      async partyKey => {
        const { feedKey } = await this._initWritableFeed(partyKey);
        return feedKey;
      },
      invitationDescriptor
    );

    await initiator.connect();
    const { partyKey, hints } = await initiator.redeemInvitation(secretProvider);
    const party = await this.addParty(partyKey, hints);
    await initiator.destroy();

    if (!haloInvitation) {
      assert(this._identityManager.deviceKeyChain);

      // Copy our signed IdentityInfo into the new Party.
      assert(this._identityManager.halo, 'No HALO');
      const infoMessage = this._identityManager.halo.identityInfo;
      if (infoMessage) {
        await party.processor.writeHaloMessage(createEnvelopeMessage(
          this._identityManager.keyring,
          partyKey,
          wrapMessage(infoMessage),
          [this._identityManager.deviceKeyChain]
        ));
      }
    }

    return party;
  }

  // TODO(marik-d): Refactor this.
  private async _initWritableFeed (partyKey: PartyKey) {
    const feed = this._feedStore.queryWritableFeed(partyKey) ??
      await this._feedStore.createWritableFeed(partyKey);

    const feedKey = this._identityManager.keyring.getKey(feed.key) ??
      await this._identityManager.keyring.addKeyRecord({
        publicKey: PublicKey.from(feed.key),
        secretKey: feed.secretKey,
        type: KeyType.FEED
      });

    return { feed, feedKey };
  }

  async recoverHalo (seedPhrase: string) {
    assert(!this._identityManager.halo, 'HALO already exists.');
    assert(!this._identityManager.identityKey, 'Identity key already exists.');

    const recoveredKeyPair = keyPairFromSeedPhrase(seedPhrase);
    await this._identityManager.keyring.addKeyRecord({
      publicKey: PublicKey.from(recoveredKeyPair.publicKey),
      secretKey: recoveredKeyPair.secretKey,
      type: KeyType.IDENTITY
    });

    const recoverer = new HaloRecoveryInitiator(this._networkManager, this._identityManager);
    await recoverer.connect();

    const invitationDescriptor = await recoverer.claim();

    return this._joinHalo(invitationDescriptor, recoverer.createSecretProvider());
  }

  async joinHalo (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider) {
    assert(!this._identityManager.identityKey, 'Identity key must NOT exist.');

    return this._joinHalo(invitationDescriptor, secretProvider);
  }

  private async _joinHalo (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider) {
    log(`Admitting device with invitation: ${keyToString(invitationDescriptor.invitation)}`);
    assert(invitationDescriptor.identityKey);

    if (!this._identityManager.identityKey) {
      await this._identityManager.keyring.addPublicKey({
        type: KeyType.IDENTITY,
        publicKey: invitationDescriptor.identityKey,
        own: true,
        trusted: true
      });
    } else {
      assert(this._identityManager.identityKey.publicKey.equals(invitationDescriptor.identityKey),
        'Identity key must match invitation');
    }

    if (!this._identityManager.deviceKey) {
      await this._identityManager.keyring.createKeyRecord({ type: KeyType.DEVICE });
      assert(this._identityManager.deviceKey);
    }

    const halo = await this.joinParty(invitationDescriptor, secretProvider);
    await halo.database.createItem({
      model: ObjectModel,
      type: HALO_DEVICE_PREFERENCES_TYPE,
      props: { publicKey: this._identityManager.deviceKey.publicKey.asBuffer() }
    });

    return halo;
  }

  // TODO(telackey): Combine with createParty?
  async createHalo (options: HaloCreationOptions = {}): Promise<PartyInternal> {
    // Don't use identityManager.identityKey, because that doesn't check for the secretKey.
    const identityKey = this._identityManager.keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }));
    assert(identityKey, 'Identity key required.');

    const deviceKey = this._identityManager.deviceKey ??
      await this._identityManager.keyring.createKeyRecord({ type: KeyType.DEVICE });

    // 1. Create a feed for the HALO.
    // TODO(telackey): Just create the FeedKey and then let other code create the feed with the correct key.
    const { feedKey } = await this._initWritableFeed(identityKey.publicKey);
    const halo = await this.constructParty(identityKey.publicKey);
    // Connect the pipeline.
    await halo.open();

    // 2. Write a PartyGenesis message for the HALO. This message must be signed by the:
    //      A. Identity key (in the case of the HALO, this serves as the Party key)
    //      B. Device key (the first "member" of the Identity's HALO)
    //      C. Feed key (the feed owned by the Device)
    await halo.processor.writeHaloMessage(createPartyGenesisMessage(this._identityManager.keyring, identityKey, feedKey, deviceKey));

    // 3. Make a special self-signed KeyAdmit message which will serve as an "IdentityGenesis" message. This
    //    message will be copied into other Parties which we create or join.
    await halo.processor.writeHaloMessage(createKeyAdmitMessage(this._identityManager.keyring, identityKey.publicKey, identityKey));

    if (options.identityDisplayName) {
      // 4. Write the IdentityInfo message with descriptive details (eg, display name).
      await halo.processor.writeHaloMessage(
        createIdentityInfoMessage(this._identityManager.keyring, options.identityDisplayName, identityKey)
      );
    }

    if (options.deviceDisplayName) {
      // 5. Write the DeviceInfo message with descriptive details (eg, display name).
      await halo.processor.writeHaloMessage(
        createDeviceInfoMessage(this._identityManager.keyring, options.deviceDisplayName, deviceKey)
      );
    }

    // Create special properties item.
    await halo.database.createItem({ model: ObjectModel, type: PARTY_ITEM_TYPE });
    await halo.database.createItem({ model: ObjectModel, type: HALO_GENERAL_PREFERENCES_TYPE });
    await halo.database.createItem({ model: ObjectModel, type: HALO_CONTACT_LIST_TYPE });
    await halo.database.createItem({
      model: ObjectModel,
      type: HALO_DEVICE_PREFERENCES_TYPE,
      props: { publicKey: deviceKey.publicKey.asBuffer() }
    });

    // Do no retain the Identity secret key after creation of the HALO.
    await this._identityManager.keyring.deleteSecretKey(identityKey);

    return halo;
  }
}
