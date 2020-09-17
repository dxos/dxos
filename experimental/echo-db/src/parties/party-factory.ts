//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import pify from 'pify';

import { Keyring, KeyType, createPartyGenesisMessage, createKeyAdmitMessage, Filter } from '@dxos/credentials';
import { keyToString, keyToBuffer, randomBytes } from '@dxos/crypto';
import { FeedKey, PartyKey, createOrderedFeedStream } from '@dxos/experimental-echo-protocol';
import { ModelFactory } from '@dxos/experimental-model-factory';
import { ObjectModel } from '@dxos/experimental-object-model';
import { createWritableFeedStream } from '@dxos/experimental-util';
import { NetworkManager } from '@dxos/network-manager';

import { FeedStoreAdapter } from '../feed-store-adapter';
import { GreetingInitiator, InvitationDescriptor, SecretProvider } from '../invitations';
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

const log = debug('dxos:echo:party-factory');

/**
 * Manages the lifecycle of parties.
 */
export class PartyFactory {
  // TODO(burdon): MemoryNetworkManager by default.
  private readonly _replicatorFactory: ReplicatorFactory | undefined;

  // TODO(telackey): It might be better to take Keyring as a param to createParty/constructParty/etc.
  constructor (
    private readonly _keyring: Keyring,
    private readonly _feedStore: FeedStoreAdapter,
    private readonly _modelFactory: ModelFactory,
    private readonly _networkManager: NetworkManager | undefined, // TODO(burdon): By default provide MemoryNetworkManager?
    peerId: Buffer = randomBytes(), // TODO(burdon): If optional move to options?
    private readonly _options: Options = {}
  ) {
    this._replicatorFactory = _networkManager && createReplicatorFactory(_networkManager, this._feedStore, peerId);
  }

  /**
   * Create a new party with a new feed for it. Writes a party genensis message to this feed.
   */
  async createParty (): Promise<Party> {
    assert(!this._options.readOnly);

    // TODO(telackey): Proper identity and keyring management.
    const partyKey = await this._keyring.createKeyRecord({ type: KeyType.PARTY });

    const { feed, feedKey } = await this._initWritableFeed(partyKey.publicKey);

    const { party, pipeline } = await this.constructParty(partyKey.publicKey, []);

    // Connect the pipeline.
    await party.open();

    // TODO(burdon): Call party processor to write genesis, etc.
    pipeline.haloWriteStream!.write(createPartyGenesisMessage(this._keyring, partyKey, feedKey, this._getIdentityKey()));

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
    const { feed, feedKey } = await this._initWritableFeed(partyKey);

    const { party } = await this.constructParty(partyKey, feeds);
    await party.open();

    // TODO(marik-d): Refactor so it doesn't return a tuple
    return { party, feedKey };
  }

  /**
   * Constructs a party object from an existing set of feeds.
   * @param partyKey
   * @param feedKeys
   */
  async constructParty (partyKey: PartyKey, feedKeys: FeedKey[] = []) {
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
      this._modelFactory, partyProcessor, pipeline, this._keyring, this._getIdentityKey(), this._networkManager);
    log(`Constructed: ${party}`);
    return { party, pipeline };
  }

  async joinParty (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider): Promise<Party> {
    const initiator = new GreetingInitiator(
      this._networkManager!,
      this._keyring,
      async partyKey => {
        const { feedKey } = await this._initWritableFeed(partyKey);
        return feedKey;
      },
      this._getIdentityKey(),
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

    const feedKey = this._keyring.getKey(feed.key) ??
      await this._keyring.addKeyRecord({
        publicKey: feed.key,
        secretKey: feed.secretKey,
        type: KeyType.FEED
      });

    return { feed, feedKey };
  }

  // TODO(telackey): Combine with createParty?
  async createHalo (): Promise<Party> {
    const identityKey = this._keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }));
    const deviceKey = this._keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE }));
    assert(identityKey, 'Identity key required.');
    assert(deviceKey, 'Device key required.');

    // 1. Create a feed for the HALO.
    // TODO(telackey): Just create the FeedKey and then let other code create the feed with the correct key.
    const { feedKey } = await this._initWritableFeed(identityKey.publicKey);
    const { party: halo, pipeline } = await this.constructParty(identityKey.publicKey, [feedKey.publicKey]);
    // Connect the pipeline.
    await halo.open();

    // 2. Write a PartyGenesis message for the HALO. This message must be signed by the:
    //      A. Identity key (in the case of the HALO, this serves as the Party key)
    //      B. Device key (the first "member" of the Identity's HALO)
    //      C. Feed key (the feed owned by the Device)
    pipeline.haloWriteStream!.write(createPartyGenesisMessage(this._keyring, identityKey, feedKey, deviceKey));

    // 3. Make a special self-signed KeyAdmit message which will serve as an "IdentityGenesis" message. This
    //    message will be copied into other Parties which we create or join.
    pipeline.haloWriteStream!.write(createKeyAdmitMessage(this._keyring, identityKey.publicKey, identityKey));

    // 4. LATER write the IdentityInfo message with descriptive details (eg, display name).
    // 5. LATER write the DeviceInfo message with descriptive details (eg, display name).

    return halo;
  }

  // TODO(telackey): This seems kind of out of place. Perhaps we should simply pass the IdentityManager
  // either to PartyFactory or as a param to the create/add methods.
  private _getIdentityKey () {
    return this._keyring.findKey(Filter.matches({ type: KeyType.IDENTITY, own: true, trusted: true }));
  }
}
