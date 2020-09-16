//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import pify from 'pify';

import { Keyring, KeyType, createPartyGenesisMessage } from '@dxos/credentials';
import { keyToString, randomBytes } from '@dxos/crypto';
import { FeedKey, PartyKey, createOrderedFeedStream } from '@dxos/experimental-echo-protocol';
import { ModelFactory } from '@dxos/experimental-model-factory';
import { ObjectModel } from '@dxos/experimental-object-model';
import { createWritableFeedStream } from '@dxos/experimental-util';

import { FeedStoreAdapter } from '../feed-store-adapter';
import { GreetingInitiator, InvitationDescriptor, SecretProvider } from '../invitations';
import { createReplicatorFactory, ReplicatorFactory } from '../replication';
import { Party, PARTY_ITEM_TYPE } from './party';
import { PartyProcessor } from './party-processor';
import { Pipeline } from './pipeline';

interface Options {
  readLogger?: NodeJS.ReadWriteStream;
  writeLogger?: NodeJS.ReadWriteStream;
  readOnly?: boolean;
}

const log = debug('dxos:echo:party-factory');

/**
 * Manages the lifecycle of parties.
 */
export class PartyFactory {
  private readonly _keyring = new Keyring();

  // TODO(burdon): MemoryNetworkManager by default.
  private readonly _replicatorFactory: ReplicatorFactory | undefined;

  // TODO(burdon): Move into keyring.
  private _identityKey: any;

  constructor (
    private readonly _feedStore: FeedStoreAdapter,
    private readonly _modelFactory: ModelFactory,
    private readonly _networkManager: any | undefined, // TODO(burdon): By default provide MemoryNetworkManager?
    peerId: Buffer = randomBytes(), // TODO(burdon): If optional move to options?
    private readonly _options: Options = {}
  ) {
    this._replicatorFactory = _networkManager && createReplicatorFactory(this._networkManager, this._feedStore, peerId);
  }

  get keyring () {
    return this._keyring;
  }

  // TODO(burdon): Remove.
  get identityKey () {
    return this._identityKey;
  }

  // TODO(burdon): Remove? Keyring should be complete when passed in?
  async initIdentity () {
    this._identityKey = await this._keyring.createKeyRecord({ type: KeyType.IDENTITY });
  }

  /**
   * Create a new party with a new feed for it. Writes a party genensis message to this feed.
   */
  async createParty (): Promise<Party> {
    assert(!this._options.readOnly);

    // TODO(telackey): Proper identity and keyring management.
    const partyKey = await this._keyring.createKeyRecord({ type: KeyType.PARTY });

    const feed = await this._feedStore.createWritableFeed(partyKey.publicKey);
    const feedKey = await this._keyring.addKeyRecord({
      publicKey: feed.key,
      secretKey: feed.secretKey,
      type: KeyType.FEED
    });

    const party = await this.constructParty(partyKey.publicKey, []);

    // TODO(burdon): Call party processor to write genesis, etc.
    const message = createPartyGenesisMessage(this._keyring, partyKey, feedKey, this._identityKey);
    await pify(feed.append.bind(feed))({ halo: message });

    // Connect the pipeline.
    await party.open();

    // Create special properties item.
    await party.createItem(ObjectModel, PARTY_ITEM_TYPE);

    return party;
  }

  /**
   * Constructs a party object and creates a local write feed for it.
   * @param partyKey
   * @param feeds - set of hints for existing feeds belonging to this party.
   */
  async addParty (partyKey: PartyKey, feeds: FeedKey[]) {
    const feed = await this._initWritableFeed(partyKey);
    const feedKey = await this._keyring.getKey(feed.key);

    const party = await this.constructParty(partyKey, feeds);
    await party.open();

    // TODO(marik-d): Refactor so it doesn't return a tuple
    return { party, feedKey };
  }

  /**
   * Constructs a party object from an existing set of feeds.
   * @param partyKey
   * @param feedKeys
   */
  async constructParty (partyKey: PartyKey, feedKeys: FeedKey[]) {
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

    const partyProcessor = new PartyProcessor(partyKey);
    await partyProcessor.addHints([feed.key, ...feedKeys]);

    const feedReadStream = await createOrderedFeedStream(
      this._feedStore.feedStore, partyProcessor.getActiveFeedSet(), partyProcessor.messageSelector);
    const feedWriteStream = createWritableFeedStream(feed);

    // TODO(burdon): Move replicatorFactory to Party?
    const pipeline = new Pipeline(
      partyProcessor, feedReadStream, feedWriteStream, this._replicatorFactory, this._options);

    //
    // Create the party.
    //

    const party = new Party(
      this._modelFactory, partyProcessor, pipeline, this._keyring, this._identityKey, this._networkManager);
    log(`Constructed: ${party}`);
    return party;
  }

  async joinParty (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider): Promise<Party> {
    const initiator = new GreetingInitiator(
      this._networkManager,
      this._keyring,
      async partyKey => {
        const feed = await this._initWritableFeed(partyKey);
        return this._keyring.getKey(feed.key);
      },
      this._identityKey,
      invitationDescriptor
    );

    await initiator.connect();
    const { partyKey, hints } = await initiator.redeemInvitation(secretProvider);
    const { party } = await this.addParty(partyKey, hints);
    await initiator.destroy();
    return party;
  }

  // TODO(marik-d): Refactor this.
  private async _initWritableFeed (partyKey: PartyKey) {
    const feed = await this._feedStore.queryWritableFeed(partyKey) ??
      await this._feedStore.createWritableFeed(partyKey);

    if (!this._keyring.hasKey(feed.key)) {
      await this._keyring.addKeyRecord({
        publicKey: feed.key,
        secretKey: feed.secretKey,
        type: KeyType.FEED
      });
    }

    return feed;
  }
}
