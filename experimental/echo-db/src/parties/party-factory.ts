//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { Keyring, KeyType, createPartyGenesisMessage, createKeyAdmitMessage, Filter } from '@dxos/credentials';
import { keyToString, randomBytes } from '@dxos/crypto';
import { FeedKey, PartyKey } from '@dxos/experimental-echo-protocol';
import { ModelFactory } from '@dxos/experimental-model-factory';
import { ObjectModel } from '@dxos/experimental-object-model';
import { createWritableFeedStream } from '@dxos/experimental-util';
import { NetworkManager } from '@dxos/network-manager';

import { FeedStoreAdapter } from '../feed-store-adapter';
import { GreetingInitiator, InvitationDescriptor, SecretProvider } from '../invitations';
import { ReplicationAdapter } from '../replication';
import { PartyInternal, PARTY_ITEM_TYPE } from './party-internal';
import { PartyProcessor } from './party-processor';
import { Pipeline } from './pipeline';

interface Options {
  readLogger?: NodeJS.ReadWriteStream;
  writeLogger?: NodeJS.ReadWriteStream;
  readOnly?: boolean;
  peerId?: Buffer,
}

const log = debug('dxos:echo:party-factory');

/**
 * Manages the lifecycle of parties.
 */
export class PartyFactory {
  // TODO(telackey): It might be better to take Keyring as a param to createParty/constructParty/etc.
  // TODO(marik-d): Maybe pass identityManager here instead to be able to copy genesis messages.
  constructor (
    private readonly _keyring: Keyring,
    private readonly _feedStore: FeedStoreAdapter,
    private readonly _modelFactory: ModelFactory,
    private readonly _networkManager: NetworkManager,
    private readonly _options: Options = {}
  ) {}

  /**
   * Create a new party with a new feed for it. Writes a party genensis message to this feed.
   */
  async createParty (): Promise<PartyInternal> {
    assert(!this._options.readOnly);

    const partyKey = await this._keyring.createKeyRecord({ type: KeyType.PARTY });
    const { feedKey } = await this._initWritableFeed(partyKey.publicKey);
    const { party, pipeline } = await this.constructParty(partyKey.publicKey);

    // Connect the pipeline.
    await party.open();

    // TODO(burdon): Call party processor to write genesis, etc.
    // TODO(marik-d): Wait for this message to be processed first
    pipeline.outboundHaloStream!.write(createPartyGenesisMessage(this._keyring, partyKey, feedKey, this._getIdentityKey()));

    // Create special properties item.
    await party.createItem(ObjectModel, PARTY_ITEM_TYPE);

    // The Party key is an inception key; its SecretKey must be destroyed once the Party has been created.
    await this._keyring.deleteSecretKey(partyKey);

    return party;
  }

  /**
   * Constructs a party object and creates a local write feed for it.
   * @param partyKey
   * @param feedKeyHints - set of hints for existing feeds belonging to this party.
   */
  // TODO(marik-d): Expand this API to accept any type of hint.
  async addParty (partyKey: PartyKey, feedKeyHints: FeedKey[] = []) {
    const { feedKey } = await this._initWritableFeed(partyKey);

    // TODO(telackey): We shouldn't have to add our key here, it should be in the hints, but our hint
    // mechanism is broken by not waiting on the messages to be processed before returning.
    const { party } = await this.constructParty(partyKey, [feedKey.publicKey, ...feedKeyHints]);
    await party.open();

    // TODO(marik-d): Refactor so it doesn't return a tuple
    return party;
  }

  /**
   * Constructs a party object from an existing set of feeds.
   * @param partyKey
   * @param feedKeyHints
   */
  async constructParty (partyKey: PartyKey, feedKeyHints: FeedKey[] = []) {
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
    if (feedKeyHints.length) {
      await partyProcessor.takeHints(feedKeyHints);
    }

    const iterator = await this._feedStore.createIterator(partyKey, partyProcessor.messageSelector);
    const feedWriteStream = createWritableFeedStream(feed);

    const pipeline = new Pipeline(
      partyProcessor, iterator, feedWriteStream, this._options);

    const replicator = new ReplicationAdapter(
      this._networkManager,
      this._feedStore,
      this._options.peerId ?? randomBytes(),
      partyKey,
      partyProcessor.getActiveFeedSet()
    );

    //
    // Create the party.
    //
    const party = new PartyInternal(
      this._modelFactory, partyProcessor, pipeline, this._keyring, this._getIdentityKey(), this._networkManager, replicator);
    log(`Constructed: ${party}`);
    return { party, pipeline };
  }

  async joinParty (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider): Promise<PartyInternal> {
    const initiator = new GreetingInitiator(
      this._networkManager,
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
    const party = await this.addParty(partyKey, hints);
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
  async createHalo (): Promise<PartyInternal> {
    const identityKey = this._keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }));
    assert(identityKey, 'Identity key required.');
    let deviceKey = this._keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE }));
    if (!deviceKey) {
      deviceKey = await this._keyring.createKeyRecord({ type: KeyType.DEVICE });
    }

    // 1. Create a feed for the HALO.
    // TODO(telackey): Just create the FeedKey and then let other code create the feed with the correct key.
    const { feedKey } = await this._initWritableFeed(identityKey.publicKey);
    const { party: halo, pipeline } = await this.constructParty(identityKey.publicKey);
    // Connect the pipeline.
    await halo.open();

    // 2. Write a PartyGenesis message for the HALO. This message must be signed by the:
    //      A. Identity key (in the case of the HALO, this serves as the Party key)
    //      B. Device key (the first "member" of the Identity's HALO)
    //      C. Feed key (the feed owned by the Device)
    pipeline.outboundHaloStream!.write(createPartyGenesisMessage(this._keyring, identityKey, feedKey, deviceKey));

    // 3. Make a special self-signed KeyAdmit message which will serve as an "IdentityGenesis" message. This
    //    message will be copied into other Parties which we create or join.
    pipeline.outboundHaloStream!.write(createKeyAdmitMessage(this._keyring, identityKey.publicKey, identityKey));

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
