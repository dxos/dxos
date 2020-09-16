//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import pify from 'pify';

import { Keyring, KeyType, createPartyGenesisMessage, createKeyAdmitMessage } from '@dxos/credentials';
import { keyToString, keyToBuffer, randomBytes } from '@dxos/crypto';
import { FeedKey, PartyKey, createOrderedFeedStream } from '@dxos/experimental-echo-protocol';
import { ModelFactory } from '@dxos/experimental-model-factory';
import { ObjectModel } from '@dxos/experimental-object-model';
import { createWritableFeedStream } from '@dxos/experimental-util';

import { FeedStoreAdapter } from '../feed-store-adapter';
import { SecretProvider } from '../invitations/common';
import { GreetingInitiator } from '../invitations/greeting-initiator';
import { InvitationDescriptor } from '../invitations/invitation-descriptor';
import { createReplicatorFactory, ReplicatorFactory } from '../replication';
import { IdentityManager } from './identity-manager';
import { Party, PARTY_ITEM_TYPE } from './party';
import { PartyProcessor } from './party-processor';
import { Pipeline } from './pipeline';

interface Options {
  readLogger?: NodeJS.ReadWriteStream;
  writeLogger?: NodeJS.ReadWriteStream;
  readOnly?: boolean;
}

export class PartyFactory {
  private _replicatorFactory: ReplicatorFactory | undefined;

  constructor (
    private readonly _identityManager: IdentityManager,
    private readonly _feedStore: FeedStoreAdapter,
    private readonly _modelFactory: ModelFactory,
    private readonly _networkManager: any | undefined,
    peerId: Buffer = randomBytes(),
    private readonly _options: Options = {}
  ) {
    this._replicatorFactory = _networkManager && createReplicatorFactory(this._networkManager, this._feedStore, peerId);
  }

  async initIdentity () {
    // TODO(telackey): Is this safe?
    await this._feedStore.open();
    return this._createHalo();
  }

  // TODO(telackey): Remove
  get keyring () { return this._identityManager.keyring; }

  // TODO(telackey): Remove
  get identityKey () { return this._identityManager.identityKey; }

  /**
   * Create a new party with a new feed for it. Writes a party genensis message to this feed.
   */
  async createParty (): Promise<Party> {
    assert(!this._options.readOnly);

    // TODO(telackey): Proper identity and keyring management.
    const partyKey = await this._identityManager.keyring.createKeyRecord({ type: KeyType.PARTY });

    const feed = await this._feedStore.createWritableFeed(partyKey.publicKey);
    const feedKey = await this._identityManager.keyring.addKeyRecord({
      publicKey: feed.key,
      secretKey: feed.secretKey,
      type: KeyType.FEED
    });

    const party = await this.constructParty(partyKey.publicKey, []);

    // TODO(burdon): Call party processor to write genesis, etc.
    const message = createPartyGenesisMessage(this._identityManager.keyring, partyKey, feedKey, this._identityManager.identityKey);
    await pify(feed.append.bind(feed))({ halo: message });

    // Connect the pipeline.
    await party.open();

    // Create special properties item.
    await party.createItem(ObjectModel, PARTY_ITEM_TYPE);

    return party;
  }

  /**
   * Constructs a party object and creates a local write feed for it.
   * @param feeds set of hints for existing feeds belonging to this party.
   */
  async addParty (partyKey: PartyKey, feeds: FeedKey[]) {
    const feed = await this._initWritableFeed(partyKey);
    const feedKey = await this._identityManager.keyring.getKey(feed.key);

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

    // Create pipeline.
    // TODO(telackey): To use HaloPartyProcessor here we cannot keep passing FeedKey[] arrays around, instead
    // we need to use createFeedAdmitMessage to a write a properly signed message FeedAdmitMessage and write it,
    // like we do above for the PartyGenesis message.
    const partyProcessor = new PartyProcessor(partyKey);
    await partyProcessor.addHints([feed.key, ...feedKeys]);
    const feedReadStream = await createOrderedFeedStream(
      this._feedStore.feedStore, partyProcessor.getActiveFeedSet(), partyProcessor.messageSelector);
    const feedWriteStream = createWritableFeedStream(feed);
    const pipeline =
      new Pipeline(partyProcessor, feedReadStream, feedWriteStream, this._replicatorFactory, this._options);

    // Create party.
    const party = new Party(this._modelFactory, pipeline, partyProcessor,
      this._identityManager.keyring, this._identityManager.identityKey, this._networkManager);

    return party;
  }

  async joinParty (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider): Promise<Party> {
    const initiator = new GreetingInitiator(
      this._networkManager,
      this._identityManager.keyring,
      async partyKey => {
        const feed = await this._initWritableFeed(partyKey);
        return this._identityManager.keyring.getKey(feed.key);
      },
      this._identityManager.identityKey,
      invitationDescriptor
    );
    await initiator.connect();
    const { partyKey, hints } = await initiator.redeemInvitation(secretProvider);
    const { party } = await this.addParty(partyKey, hints);
    await initiator.destroy();
    return party;
  }

  // TODO(marik-d): Refactor this
  private async _initWritableFeed (partyKey: PartyKey) {
    const feed = await this._feedStore.queryWritableFeed(partyKey) ??
      await this._feedStore.createWritableFeed(partyKey);

    if (!this._identityManager.keyring.hasKey(feed.key)) {
      await this._identityManager.keyring.addKeyRecord({
        publicKey: feed.key,
        secretKey: feed.secretKey,
        type: KeyType.FEED
      });
    }
    return feed;
  }

  private async _createHalo (): Promise<Party> {
    await this._identityManager.initialize();
    const { keyring, identityKey, deviceKey } = this._identityManager;

    // 1. Create a feed for the HALO.
    // TODO(telackey): Just create the FeedKey and then let other code create the feed with the correct key.
    const feed = await this._feedStore.createWritableFeed(identityKey.publicKey);
    const writeToFeed = pify(feed.append.bind(feed));
    const feedKey = await keyring.addKeyRecord({
      publicKey: feed.key,
      secretKey: feed.secretKey,
      type: KeyType.FEED
    });
    const halo = await this.constructParty(identityKey.publicKey, [feedKey.publicKey]);

    // 2. Write a PartyGenesis message for the HALO. This message must be signed by the:
    //      A. Identity key (in the case of the HALO, this serves as the Party key)
    //      B. Device key (the first "member" of the Identity's HALO)
    //      C. Feed key (the feed owned by the Device)
    await writeToFeed(createPartyGenesisMessage(keyring, identityKey, feedKey, deviceKey));

    // 3. Make a special self-signed KeyAdmit message which will serve as an "IdentityGenesis" message. This
    //    message will be copied into other Parties which we create or join.
    await writeToFeed(createKeyAdmitMessage(keyring, identityKey.publicKey, identityKey));

    // 4. LATER write the IdentityInfo message with descriptive details (eg, display name).
    // 5. LATER write the DeviceInfo message with descriptive details (eg, display name).

    // Connect the pipeline.
    await halo.open();

    return halo;
  }
}
