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

import { IdentityProvider } from '../halo';
import {
  GreetingInitiator,
  InvitationDescriptor,
  InvitationDescriptorType,
  OfflineInvitationClaimer,
  SecretProvider
} from '../invitations';
import { SnapshotStore } from '../snapshots';
import { PartyOptions } from './party-core';
import { PartyFeedProvider } from './party-feed-provider';
import { PartyInternal, PARTY_ITEM_TYPE } from './party-internal';

const log = debug('dxos:echo:parties:party-factory');

/**
 * Creates parties.
 */
export class PartyFactory {
  constructor (
    private readonly _identityProvider: IdentityProvider,
    private readonly _networkManager: NetworkManager,
    private readonly _modelFactory: ModelFactory,
    private readonly _snapshotStore: SnapshotStore,
    private readonly _createFeedProvider: (partyKey: PublicKey) => PartyFeedProvider,
    private readonly _options: PartyOptions = {}
  ) {}

  /**
   * Create a new party with a new feed for it. Writes a party genensis message to this feed.
   */
  @timed(5_000)
  async createParty (): Promise<PartyInternal> {
    const identity = this._identityProvider();

    assert(!this._options.readOnly, 'PartyFactory is read-only');
    assert(identity.identityGenesis, 'IdentityGenesis must exist');
    assert(identity.deviceKeyChain, 'Device KeyChain must exist');

    const partyKey = await identity.keyring.createKeyRecord({ type: KeyType.PARTY });
    const party = await this.constructParty(partyKey.publicKey);

    // Connect the pipeline.
    await party.open();

    const writableFeed = await party.feedProvider.createOrOpenWritableFeed();

    // PartyGenesis (self-signed by Party).
    await party.processor.writeHaloMessage(createPartyGenesisMessage(
      identity.signer,
      partyKey,
      writableFeed.key,
      partyKey)
    );

    // KeyAdmit (IdentityGenesis in an Envelope signed by Party).
    await party.processor.writeHaloMessage(createEnvelopeMessage(
      identity.signer,
      partyKey.publicKey,
      wrapMessage(identity.identityGenesis),
      [partyKey])
    );

    // FeedAdmit (signed by the Device KeyChain).
    await party.processor.writeHaloMessage(createFeedAdmitMessage(
      identity.signer,
      partyKey.publicKey,
      writableFeed.key,
      [identity.deviceKeyChain]
    ));

    // IdentityInfo in an Envelope signed by the Device KeyChain.
    if (identity.identityInfo) {
      await party.processor.writeHaloMessage(createEnvelopeMessage(
        identity.signer,
        partyKey.publicKey,
        wrapMessage(identity.identityInfo),
        [identity.deviceKeyChain]
      ));
    }

    // Create special properties item.
    await party.database.createItem({ model: ObjectModel, type: PARTY_ITEM_TYPE });

    // The Party key is an inception key; its SecretKey must be destroyed once the Party has been created.
    await identity.keyring.deleteSecretKey(partyKey);

    return party;
  }

  /**
   * Constructs a party object and creates a local write feed for it.
   * @param partyKey
   * @param hints
   */
  async addParty (partyKey: PartyKey, hints: KeyHint[] = []) {
    const identity = this._identityProvider();

    // TODO(telackey): We shouldn't have to add our key here, it should be in the hints, but our hint
    // mechanism is broken by not waiting on the messages to be processed before returning.

    const feedProvider = this._createFeedProvider(partyKey);
    const { feed } = await feedProvider.createOrOpenWritableFeed();
    const feedKeyPair = identity.keyring.getKey(feed.key);
    assert(feedKeyPair, 'Keypair for writable feed not found');
    const party = new PartyInternal(
      partyKey,
      this._modelFactory,
      this._snapshotStore,
      feedProvider,
      this._identityProvider,
      this._networkManager,
      [{ type: feedKeyPair.type, publicKey: feedKeyPair.publicKey }, ...hints],
      undefined,
      this._options
    );

    await party.open();
    assert(identity.identityKey, 'No identity key');
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

  /**
   * Constructs a party object from an existing set of feeds.
   * @param partyKey
   * @param hints
   */
  async constructParty (partyKey: PartyKey, hints: KeyHint[] = [], initialTimeframe?: Timeframe) {
    // TODO(marik-d): Support read-only parties if this feed doesn't exist?
    const feedProvider = this._createFeedProvider(partyKey);

    //
    // Create the party.
    //
    const party = new PartyInternal(
      partyKey,
      this._modelFactory,
      this._snapshotStore,
      feedProvider,
      this._identityProvider,
      this._networkManager,
      hints,
      initialTimeframe,
      this._options
    );

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

    const identity = this._identityProvider();
    // Claim the offline invitation and convert it into an interactive invitation.
    if (InvitationDescriptorType.OFFLINE_KEY === invitationDescriptor.type) {
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
      invitationDescriptor,
      async partyKey => {
        const feedProvider = this._createFeedProvider(partyKey);
        const feed = await feedProvider.createOrOpenWritableFeed();
        return feed.key;
      }
    );

    await initiator.connect();
    const { partyKey, hints } = await initiator.redeemInvitation(secretProvider);
    const party = await this.addParty(partyKey, hints);
    await initiator.destroy();
    if (!haloInvitation) {
      assert(identity.deviceKeyChain);

      // Copy our signed IdentityInfo into the new Party.
      const infoMessage = identity.identityInfo;
      if (infoMessage) {
        await party.processor.writeHaloMessage(createEnvelopeMessage(
          identity.signer,
          partyKey,
          wrapMessage(infoMessage),
          [identity.deviceKeyChain]
        ));
      }
    }
    return party;
  }
}
