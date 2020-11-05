//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import {
  Authenticator,
  createAuthMessage,
  createDeviceInfoMessage,
  createEnvelopeMessage,
  createFeedAdmitMessage,
  createIdentityInfoMessage,
  createKeyAdmitMessage,
  createPartyGenesisMessage,
  KeyHint,
  Keyring,
  KeyType,
  keyPairFromSeedPhrase
} from '@dxos/credentials';
import { humanize, keyToString } from '@dxos/crypto';
import { FeedKey, PartyKey, createFeedWriter, PartySnapshot, Timeframe } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { raise, timed } from '@dxos/util';

import { FeedStoreAdapter } from '../feed-store-adapter';
import { GreetingInitiator, InvitationDescriptor, InvitationDescriptorType, SecretProvider } from '../invitations';
import { HaloRecoveryInitiator } from '../invitations/halo-recovery-initiator';
import { InvitationManager } from '../invitations/invitation-manager';
import { OfflineInvitationClaimer } from '../invitations/offline-invitation-claimer';
import { TimeframeClock } from '../items/timeframe-clock';
import { SnapshotStore } from '../snapshot-store';
import { HALO_CONTACT_LIST_TYPE } from './halo-party';
import { IdentityManager } from './identity-manager';
import { createMessageSelector } from './message-selector';
import {
  PartyInternal,
  PARTY_ITEM_TYPE
} from './party-internal';
import { PartyProcessor } from './party-processor';
import { PartyProtocol } from './party-protocol';
import { Pipeline } from './pipeline';
import { makeAutomaticSnapshots } from './snapshot-maker';

/**
 * Options allowed when creating the HALO.
 */
export interface HaloCreationOptions {
  identityDisplayName?: string,
  deviceDisplayName?: string
}

interface Options {
  readLogger?: (msg: any) => void;
  writeLogger?: (msg: any) => void;
  readOnly?: boolean;
  snapshots?: boolean;
  snapshotInterval?: number;
}

const DEFAULT_SNAPSHOT_INTERVAL = 100; // every 100 messages

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
    private readonly _options: Options = {}
  ) { }

  /**
   * Create a new party with a new feed for it. Writes a party genensis message to this feed.
   */
  @timed(5000)
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
      this._identityManager.identityGenesis,
      partyKey)
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
        this._identityManager.identityInfo,
        [this._identityManager.deviceKeyChain]
      ));
    }

    // Create special properties item.
    assert(party.itemManager);
    await party.itemManager.createItem(ObjectModel.meta.type, PARTY_ITEM_TYPE);

    // The Party key is an inception key; its SecretKey must be destroyed once the Party has been created.
    await this._identityManager.keyring.deleteSecretKey(partyKey);

    await this._recordPartyJoining(party);

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

    // Write the Feed genesis message.
    await party.processor.writeHaloMessage(createFeedAdmitMessage(
      this._identityManager.keyring,
      Buffer.from(partyKey),
      feedKey,
      [isHalo ? this._identityManager.deviceKey : this._identityManager.deviceKeyChain]
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
    const feed = this._feedStore.queryWritableFeed(partyKey);
    assert(feed, `Feed not found for party: ${keyToString(partyKey)}`);

    //
    // Create the pipeline.
    // TODO(telackey): To use HaloPartyProcessor here we cannot keep passing FeedKey[] arrays around, instead
    // we need to use createFeedAdmitMessage to a write a properly signed message FeedAdmitMessage and write it,
    // like we do above for the PartyGenesis message.
    //

    const timeframeClock = new TimeframeClock(initialTimeframe);

    const partyProcessor = new PartyProcessor(partyKey);
    if (hints.length) {
      await partyProcessor.takeHints(hints);
    }

    const iterator = await this._feedStore.createIterator(partyKey, createMessageSelector(partyProcessor, timeframeClock), initialTimeframe);
    const feedWriteStream = createFeedWriter(feed);

    const pipeline = new Pipeline(
      partyProcessor, iterator, timeframeClock, feedWriteStream, this._options);

    const invitationManager = new InvitationManager(
      partyProcessor,
      this._identityManager,
      this._networkManager
    );

    assert(this._identityManager.deviceKey, 'No device key.');
    const protocol = new PartyProtocol(
      this._identityManager,
      this._networkManager,
      this._feedStore,
      partyKey,
      partyProcessor.getActiveFeedSet(),
      this._createCredentialsProvider(partyKey, feed?.key),
      partyProcessor.authenticator,
      invitationManager
    );

    //
    // Create the party.
    //
    const party = new PartyInternal(
      this._modelFactory,
      partyProcessor,
      pipeline,
      protocol,
      timeframeClock,
      invitationManager
    );

    if (this._options.snapshots) {
      makeAutomaticSnapshots(party, timeframeClock, this._snapshotStore, this._options.snapshotInterval ?? DEFAULT_SNAPSHOT_INTERVAL);
    }

    log(`Constructed: ${party}`);
    return party;
  }

  async constructPartyFromSnapshot (snapshot: PartySnapshot) {
    assert(snapshot.partyKey);
    log(`Constructing ${humanize(snapshot.partyKey)} from snapshot at ${JSON.stringify(snapshot.timeframe)}.`);

    const party = await this.constructParty(snapshot.partyKey, [], snapshot.timeframe);
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
      // Copy our signed IdentityInfo into the new Party.
      assert(this._identityManager.halo, 'No HALO');
      const infoMessage = this._identityManager.halo.identityInfo;
      if (infoMessage) {
        await party.processor.writeHaloMessage(createEnvelopeMessage(
          this._identityManager.keyring,
          partyKey,
          infoMessage,
          [this._identityManager.deviceKeyChain]
        ));
      }

      await this._recordPartyJoining(party);
    }

    return party;
  }

  // TODO(marik-d): Refactor this.
  private async _initWritableFeed (partyKey: PartyKey) {
    const feed = this._feedStore.queryWritableFeed(partyKey) ??
      await this._feedStore.createWritableFeed(partyKey);

    const feedKey = this._identityManager.keyring.getKey(feed.key) ??
      await this._identityManager.keyring.addKeyRecord({
        publicKey: feed.key,
        secretKey: feed.secretKey,
        type: KeyType.FEED
      });

    return { feed, feedKey };
  }

  async recoverHalo (seedPhrase: string) {
    assert(!this._identityManager.halo, 'HALO already exists.');
    assert(!this._identityManager.identityKey, 'Identity key already exists.');

    const recoveredKeyPair = keyPairFromSeedPhrase(seedPhrase);
    await this._identityManager.keyring.addKeyRecord({ ...recoveredKeyPair, type: KeyType.IDENTITY });

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
    }

    return this.joinParty(invitationDescriptor, secretProvider);
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
    assert(halo.itemManager);
    await halo.itemManager.createItem(ObjectModel.meta.type, PARTY_ITEM_TYPE);
    await halo.itemManager.createItem(ObjectModel.meta.type, HALO_CONTACT_LIST_TYPE);

    // Do no retain the Identity secret key after creation of the HALO.
    await this._identityManager.keyring.deleteSecretKey(identityKey);

    return halo;
  }

  private _createCredentialsProvider (partyKey: PartyKey, feedKey: FeedKey) {
    return {
      get: () => Authenticator.encodePayload(createAuthMessage(
        this._identityManager.keyring,
        Buffer.from(partyKey),
        this._identityManager.identityKey ?? raise(new Error('No identity key')),
        this._identityManager.deviceKeyChain ?? this._identityManager.deviceKey ?? raise(new Error('No device key')),
        this._identityManager.keyring.getKey(feedKey)
      ))
    };
  }

  @timed(5000)
  private async _recordPartyJoining (party: PartyInternal) {
    assert(this._identityManager.halo, 'HALO is required.');

    const keyHints: KeyHint[] = [
      ...party.processor.memberKeys.map(publicKey => ({ publicKey, type: KeyType.UNKNOWN })),
      ...party.processor.feedKeys.map(publicKey => ({ publicKey, type: KeyType.FEED }))
    ];
    await this._identityManager.halo.recordPartyJoining({
      partyKey: party.key,
      keyHints
    });
  }
}
