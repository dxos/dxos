//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import {
  createEnvelopeMessage,
  createFeedAdmitMessage,
  createPartyGenesisMessage,
  KeyType,
  SecretProvider,
  wrapMessage
} from '@dxos/credentials';
import { humanize, keyToString, PublicKey } from '@dxos/crypto';
import { failUndefined, raise, timed } from '@dxos/debug';
import { createFeedWriter, FeedMessage, PartyKey, PartySnapshot, Timeframe } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';

import {
  createDataPartyAdmissionMessages,
  GreetingInitiator, InvitationDescriptor, InvitationDescriptorType, OfflineInvitationClaimer
} from '../invitations';
import { IdentityNotInitializedError } from '../packlets/errors';
import { MetadataStore, PartyFeedProvider, PipelineOptions } from '../pipeline';
import { IdentityCredentialsProvider } from '../protocol/identity-credentials';
import { SnapshotStore } from '../snapshots';
import { DataParty, PARTY_ITEM_TYPE } from './data-party';

const log = debug('dxos:echo-db:party-factory');

/**
 * Creates and constructs party instances.
 */
export class PartyFactory {
  constructor (
    private readonly _identityProvider: IdentityCredentialsProvider,
    private readonly _networkManager: NetworkManager,
    private readonly _modelFactory: ModelFactory,
    private readonly _snapshotStore: SnapshotStore,
    private readonly _feedProviderFactory: (partyKey: PublicKey) => PartyFeedProvider,
    private readonly _metadataStore: MetadataStore,
    private readonly _options: PipelineOptions = {}
  ) {}

  /**
   * Create a new party with a new feed for it. Writes a party genensis message to this feed.
   */
  @timed(5_000)
  async createParty (): Promise<DataParty> {
    const identity = this._identityProvider() ?? raise(new IdentityNotInitializedError());
    assert(!this._options.readOnly, 'PartyFactory is read-only.');

    const partyKey = await identity.keyring.createKeyRecord({ type: KeyType.PARTY });
    const party = await this.constructParty(partyKey.publicKey);

    const writableFeed = await party.getWriteFeed();
    party._setGenesisFeedKey(writableFeed.key);
    // Hint at the newly created writable feed so that we can start replicating from it.
    party._setFeedHints([writableFeed.key]);

    await this._metadataStore.addParty(partyKey.publicKey);
    await this._metadataStore.setGenesisFeed(partyKey.publicKey, writableFeed.key);

    // Connect the pipeline.
    await party.open();

    // PartyGenesis (self-signed by Party).
    await party.credentialsWriter.write(createPartyGenesisMessage(
      identity.keyring,
      partyKey,
      writableFeed.key,
      partyKey)
    );

    // KeyAdmit (IdentityGenesis in an Envelope signed by Party).
    await party.credentialsWriter.write(createEnvelopeMessage(
      identity.keyring,
      partyKey.publicKey,
      wrapMessage(identity.identityGenesis),
      [partyKey])
    );

    // FeedAdmit (signed by the Device KeyChain).
    // TODO(dmaretskyi): Is this really needed since a feed is already admitted by party genesis message.
    await party.credentialsWriter.write(createFeedAdmitMessage(
      identity.keyring,
      partyKey.publicKey,
      writableFeed.key,
      [identity.deviceKeyChain]
    ));

    // IdentityInfo in an Envelope signed by the Device KeyChain.
    if (identity.identityInfo) {
      await party.credentialsWriter.write(createEnvelopeMessage(
        identity.keyring,
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
   * Constructs a party object from an existing set of feeds.
   * @param partyKey
   * @param hints
   */
  async constructParty (partyKey: PartyKey, initialTimeframe?: Timeframe) {
    const identity = this._identityProvider() ?? raise(new IdentityNotInitializedError());

    //
    // Create the party.
    //
    const party = new DataParty(
      partyKey,
      this._modelFactory,
      this._snapshotStore,
      this._feedProviderFactory(partyKey),
      this._metadataStore,
      identity.createCredentialsSigner(),
      identity.preferences,
      this._networkManager,
      initialTimeframe,
      this._options
    );

    return party;
  }

  async constructPartyFromSnapshot (snapshot: PartySnapshot) {
    assert(snapshot.partyKey);
    log(`Constructing ${humanize(snapshot.partyKey)} from snapshot at ${JSON.stringify(snapshot.timeframe)}.`);

    const party = await this.constructParty(PublicKey.from(snapshot.partyKey), snapshot.timeframe);
    await party.restoreFromSnapshot(snapshot);
    return party;
  }

  async joinParty (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider): Promise<DataParty> {
    const originalInvitation = invitationDescriptor;

    const identity = this._identityProvider() ?? raise(new IdentityNotInitializedError());
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
      invitationDescriptor,
      async (partyKey, nonce) => [createDataPartyAdmissionMessages(
        identity.createCredentialsSigner(),
        partyKey,
        identity.identityGenesis,
        nonce
      )]
    );

    await initiator.connect();
    const { partyKey, genesisFeedKey, hints } = await initiator.redeemInvitation(secretProvider);
    const party = await this.constructParty(partyKey);
    
    await this._metadataStore.addParty(partyKey);
    await this._metadataStore.setGenesisFeed(partyKey, genesisFeedKey);

    party._setGenesisFeedKey(genesisFeedKey);
    party._setFeedHints(hints);
    
    await party.open();
    await initiator.destroy();

    // Copy our signed IdentityInfo into the new Party.
    if (identity.identityInfo) {
      await party.credentialsWriter.write(createEnvelopeMessage(
        identity.keyring,
        partyKey,
        wrapMessage(identity.identityInfo),
        [identity.deviceKeyChain]
      ));
    }

    return party;
  }

  async cloneParty (snapshot: PartySnapshot): Promise<DataParty> {
    const identity = this._identityProvider() ?? raise(new IdentityNotInitializedError());

    assert(!this._options.readOnly, 'PartyFactory is read-only');

    const partyKey = await identity.keyring.createKeyRecord({ type: KeyType.PARTY });
    const party = await this.constructParty(partyKey.publicKey);

    const writableFeed = await party.getWriteFeed();
    // Hint at the newly created writable feed so that we can start replicating from it.
    party._setGenesisFeedKey(writableFeed.key);
    party._setFeedHints([writableFeed.key]);

    await this._metadataStore.addParty(partyKey.publicKey);
    await this._metadataStore.setGenesisFeed(partyKey.publicKey, writableFeed.key);

    // Connect the pipeline.
    await party.open();

    // PartyGenesis (self-signed by Party).
    await party.credentialsWriter.write(createPartyGenesisMessage(
      identity.keyring,
      partyKey,
      writableFeed.key,
      partyKey)
    );

    // KeyAdmit (IdentityGenesis in an Envelope signed by Party).
    await party.credentialsWriter.write(createEnvelopeMessage(
      identity.keyring,
      partyKey.publicKey,
      wrapMessage(identity.identityGenesis),
      [partyKey]
    ));

    // FeedAdmit (signed by the Device KeyChain).
    await party.credentialsWriter.write(createFeedAdmitMessage(
      identity.keyring,
      partyKey.publicKey,
      writableFeed.key,
      [identity.deviceKeyChain]
    ));

    // IdentityInfo in an Envelope signed by the Device KeyChain.
    if (identity.identityInfo) {
      await party.credentialsWriter.write(createEnvelopeMessage(
        identity.keyring,
        partyKey.publicKey,
        wrapMessage(identity.identityInfo),
        [identity.deviceKeyChain]
      ));
    }

    // const keyAdmitMessage = snapshot.halo?.messages?.[1];
    // assert(keyAdmitMessage);
    // await party.writeCredentialsMessage(createEnvelopeMessage(
    //   identity.signer,
    //   partyKey.publicKey,
    //   keyAdmitMessage,
    //   [partyKey]
    // ));

    // for(const message of snapshot.halo?.messages?.slice(2) || []) {
    //   await party.writeCredentialsMessage(message);
    // }

    // Write messages to create ECHO items.
    const feedWriter = createFeedWriter(writableFeed.feed);
    for (const item of snapshot.database?.items || []) {
      const message: FeedMessage = {
        timeframe: new Timeframe(),
        echo: {
          itemId: item.itemId ?? failUndefined(),
          genesis: {
            itemType: item.itemType,
            modelType: item.modelType,
            modelVersion: item.modelVersion
          },
          itemMutation: {
            parentId: item.parentId
          },
          snapshot: item.model
        }
      };
      await feedWriter.write(message);
    }

    // The Party key is an inception key; its SecretKey must be destroyed once the Party has been created.
    await identity.keyring.deleteSecretKey(partyKey);

    return party;
  }
}
