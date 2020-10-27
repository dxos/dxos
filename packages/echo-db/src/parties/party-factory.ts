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
  createFeedAdmitMessage, createIdentityInfoMessage,
  createKeyAdmitMessage,
  createPartyGenesisMessage, KeyHint, Keyring,
  KeyType
} from '@dxos/credentials';
import { keyToString } from '@dxos/crypto';
import { FeedKey, PartyKey, createFeedWriter } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';

import { FeedStoreAdapter } from '../feed-store-adapter';
import { GreetingInitiator, InvitationDescriptor, SecretProvider } from '../invitations';
import { TimeframeClock } from '../items/timeframe-clock';
import { ReplicationAdapter } from '../replication';
import { IdentityManager } from './identity-manager';
import { createMessageSelector } from './message-selector';
import {
  PartyInternal,
  PARTY_ITEM_TYPE,
  HALO_PARTY_DESCRIPTOR_TYPE
} from './party-internal';
import { PartyProcessor } from './party-processor';
import { Pipeline } from './pipeline';

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
}

const log = debug('dxos:echo:party-factory');

/**
 * Manages the lifecycle of parties.
 */
export class PartyFactory {
  // TODO(telackey): It might be better to take Keyring as a param to createParty/constructParty/etc.
  // TODO(marik-d): Maybe pass identityManager here instead to be able to copy genesis messages.
  constructor (
    private readonly _identityManager: IdentityManager,
    private readonly _feedStore: FeedStoreAdapter,
    private readonly _modelFactory: ModelFactory,
    private readonly _networkManager: NetworkManager,
    private readonly _options: Options = {}
  ) {}

  /**
   * Create a new party with a new feed for it. Writes a party genensis message to this feed.
   */
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
  async constructParty (partyKey: PartyKey, hints: KeyHint[] = []) {
    // TODO(burdon): Ensure that this node's feed (for this party) has been created first.
    //   I.e., what happens if remote feed is synchronized first triggering 'feed' event above.
    //   In this case create pipeline in read-only mode.
    const feed = this._feedStore.queryWritableFeed(partyKey);
    assert(feed, `Feed not found for party: ${keyToString(partyKey)}`);

    //
    // Create the pipeline.
    // TODO(telackey): To use HaloPartyProcessor here we cannot keep passing FeedKey[] arrays around, instead
    // we need to use createFeedAdmitMessage to a write a properly signed message FeedAdmitMessage and write it,
    // like we do above for the PartyGenesis message.
    //

    const timeframeClock = new TimeframeClock();

    const partyProcessor = new PartyProcessor(partyKey);
    if (hints.length) {
      await partyProcessor.takeHints(hints);
    }

    const iterator = await this._feedStore.createIterator(partyKey, createMessageSelector(partyProcessor, timeframeClock));
    const feedWriteStream = createFeedWriter(feed);

    const pipeline = new Pipeline(
      partyProcessor, iterator, timeframeClock, feedWriteStream, this._options);

    const replicator = new ReplicationAdapter(
      this._networkManager,
      this._feedStore,
      this._identityManager.deviceKey.publicKey,
      partyKey,
      partyProcessor.getActiveFeedSet(),
      this._createCredentialsProvider(partyKey, feed?.key),
      partyProcessor.authenticator
    );

    //
    // Create the party.
    //
    const party = new PartyInternal(
      this._modelFactory,
      partyProcessor,
      pipeline,
      this._identityManager,
      this._networkManager,
      replicator,
      timeframeClock
    );
    log(`Constructed: ${party}`);
    return party;
  }

  async joinParty (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider): Promise<PartyInternal> {
    const haloInvitation = !!invitationDescriptor.identityKey;
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
      const infoMessage = this._identityManager.halo?.processor.infoMessages.get(this._identityManager.identityKey.key);
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
    const feed = await this._feedStore.queryWritableFeed(partyKey) ??
      await this._feedStore.createWritableFeed(partyKey);

    const feedKey = this._identityManager.keyring.getKey(feed.key) ??
      await this._identityManager.keyring.addKeyRecord({
        publicKey: feed.key,
        secretKey: feed.secretKey,
        type: KeyType.FEED
      });

    return { feed, feedKey };
  }

  async joinHalo (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider) {
    assert(!this._identityManager.identityKey, 'Identity key must NOT exist.');

    log(`Admitting device with invitation: ${keyToString(invitationDescriptor.invitation)}`);

    if (!this._identityManager.deviceKey) {
      await this._identityManager.keyring.createKeyRecord({ type: KeyType.DEVICE });
    }

    await this._identityManager.keyring.addPublicKey({
      type: KeyType.IDENTITY,
      publicKey: invitationDescriptor.identityKey,
      own: true,
      trusted: true
    });

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

    // Do no retain the Identity secret key after creation of the HALO.
    await this._identityManager.keyring.deleteSecretKey(identityKey);

    return halo;
  }

  private _createCredentialsProvider (partyKey: PartyKey, feedKey: FeedKey) {
    return {
      get: () => Authenticator.encodePayload(createAuthMessage(
        this._identityManager.keyring,
        Buffer.from(partyKey),
        this._identityManager.identityKey,
        this._identityManager.deviceKeyChain ?? this._identityManager.deviceKey,
        this._identityManager.keyring.getKey(feedKey)
      ))
    };
  }

  private async _recordPartyJoining (party: PartyInternal) {
    assert(this._identityManager.halo, 'HALO is required.');
    assert(this._identityManager.halo.itemManager, 'ItemManager is required.');

    const knownParties = await this._identityManager.halo.itemManager.queryItems({ type: HALO_PARTY_DESCRIPTOR_TYPE }).value;
    const partyDesc = knownParties.find(partyMarker => Buffer.compare(partyMarker.model.getProperty('publicKey'), party.key) === 0);
    assert(!partyDesc, `Descriptor already exists for Party ${keyToString(party.key)}`);

    await this._identityManager.halo.itemManager.createItem(
      ObjectModel.meta.type,
      HALO_PARTY_DESCRIPTOR_TYPE,
      undefined,
      {
        publicKey: party.key,
        subscribed: true,
        hints: [
          ...party.processor.memberKeys.map(publicKey => ({ publicKey })),
          ...party.processor.feedKeys.map(publicKey => ({ publicKey, type: KeyType.FEED }))
        ]
      }
    );
  }
}
