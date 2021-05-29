//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import {
  createEnvelopeMessage,
  createFeedAdmitMessage,
  createPartyGenesisMessage,
  KeyHint,
  KeyType,
  wrapMessage
} from '@dxos/credentials';
import { humanize, keyToString, PublicKey } from '@dxos/crypto';
import { timed } from '@dxos/debug';
import { PartyKey, PartySnapshot, Timeframe } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';

import { IdentityManager } from '../halo';
import {
  GreetingInitiator,
  InvitationDescriptor,
  InvitationDescriptorType,
  OfflineInvitationClaimer,
  SecretProvider
} from '../invitations';
import { SnapshotStore } from '../snapshots';
import { FeedStoreAdapter } from '../util';
import { PartyOptions } from './party-core';
import { PartyInternal, PARTY_ITEM_TYPE } from './party-internal';

const log = debug('dxos:echo:parties:party-factory');

/**
 * Creates parties.
 */
export class PartyFactory {
  // TODO(telackey): It might be better to take Keyring as a param to createParty/constructParty/etc.
  constructor (
    private readonly _identityManager: IdentityManager,
    private readonly _networkManager: NetworkManager,
    private readonly _feedStore: FeedStoreAdapter,
    private readonly _modelFactory: ModelFactory,
    private readonly _snapshotStore: SnapshotStore,
    private readonly _options: PartyOptions = {}
  ) {}

  // TODO(marik-d): Refactor this.
  async initWritableFeed (partyKey: PartyKey) {
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
    const { feedKey } = await this.initWritableFeed(partyKey.publicKey);
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
    const { feedKey } = await this.initWritableFeed(partyKey);

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
      this._feedStore,
      this._modelFactory,
      this._snapshotStore,
      this._identityManager,
      this._networkManager,
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
      invitationDescriptor,
      async partyKey => {
        const { feedKey } = await this.initWritableFeed(partyKey);
        return feedKey;
      }
    );

    await initiator.connect();
    const { partyKey, hints } = await initiator.redeemInvitation(secretProvider);
    const party = await this.addParty(partyKey, hints);
    await initiator.destroy();

    if (!haloInvitation) {
      assert(this._identityManager.deviceKeyChain);

      // Copy our signed IdentityInfo into the new Party.
      assert(this._identityManager.halo, 'HALO not initialized.');
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
}
