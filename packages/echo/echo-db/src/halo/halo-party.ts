//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

import { Event, synchronized } from '@dxos/async';
import { timed } from '@dxos/debug';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { PublicKey, Timeframe } from '@dxos/protocols';

import { InvitationAuthenticator, InvitationDescriptor, InvitationFactory, InvitationOptions } from '../invitations';
import { PARTY_ITEM_TYPE } from '../parties';
import { PartyFeedProvider, PartyProtocolFactory, PartyPipeline, PipelineOptions } from '../pipeline';
import { createAuthenticator, createAuthPlugin, createCredentialsProvider, createHaloRecoveryPlugin } from '../protocol';
import { CredentialsSigner } from '../protocol/credentials-signer';
import { createReplicatorPlugin } from '../protocol/replicator-plugin';
import { SnapshotStore } from '../snapshots';
import { ContactManager } from './contact-manager';
import { Preferences } from './preferences';

export const HALO_PARTY_DESCRIPTOR_TYPE = 'dxos:item/halo/party-descriptor';
export const HALO_PARTY_CONTACT_LIST_TYPE = 'dxos:item/halo/contact-list';
export const HALO_PARTY_PREFERENCES_TYPE = 'dxos:item/halo/preferences';
export const HALO_PARTY_DEVICE_PREFERENCES_TYPE = 'dxos:item/halo/device/preferences';

/**
 * A record in HALO party representing a party that user is currently a member of.
 */
export type JoinedParty = {
  partyKey: PublicKey
  genesisFeed: PublicKey
}

/**
 * Provides all HALO-related functionality.
 */
export class HaloParty {
  public readonly update = new Event<void>();

  private readonly _partyCore: PartyPipeline;
  private _invitationManager?: InvitationFactory;
  private _protocol?: PartyProtocolFactory;

  private readonly _contactManager: ContactManager;
  private readonly _preferences: Preferences;

  private _genesisFeedKey?: PublicKey | undefined;

  constructor (
    modelFactory: ModelFactory,
    snapshotStore: SnapshotStore,
    private readonly _feedProvider: PartyFeedProvider,
    private readonly _credentialsSigner: CredentialsSigner,
    private readonly _networkManager: NetworkManager,
    private readonly _initialTimeframe: Timeframe | undefined,
    _options: PipelineOptions
  ) {
    this._partyCore = new PartyPipeline(
      _credentialsSigner.getIdentityKey().publicKey,
      _feedProvider,
      modelFactory,
      snapshotStore,
      _credentialsSigner.getIdentityKey().publicKey,
      _options
    );

    this._contactManager = new ContactManager(() => this.isOpen ? this.database : undefined);
    this._preferences = new Preferences(
      () => this.isOpen ? this.database : undefined,
      _credentialsSigner.getDeviceKey().publicKey
    );
  }

  /**
   * Party key.
   * Always equal to the identity key.
   * @deprecated Should remove.
   */
  get key () {
    return this._partyCore.key;
  }

  get isOpen () {
    return !!(this._partyCore.isOpen && this._protocol);
  }

  get contacts () {
    return this._contactManager;
  }

  get preferences () {
    return this._preferences;
  }

  // TODO(burdon): Remove.
  get database () {
    return this._partyCore.database;
  }

  //
  // TODO(burdon): Factor out getters into other class abstractions (grouping functionality).
  // (eg, identity, credentials, device management.)
  //

  get identityInfo () {
    return this._partyCore.processor.infoMessages.get(this._credentialsSigner.getIdentityKey().publicKey.toHex());
  }

  get identityGenesis () {
    return this._partyCore.processor.credentialMessages.get(this._credentialsSigner.getIdentityKey().publicKey.toHex());
  }

  get credentialMessages () {
    return this._partyCore.processor.credentialMessages;
  }

  get feedKeys () {
    return this._partyCore.processor.feedKeys;
  }

  get credentialsWriter () {
    return this._partyCore.credentialsWriter;
  }

  async getWriteFeedKey () {
    const feed = await this._feedProvider.createOrOpenWritableFeed();
    return feed.key;
  }

  get processor () {
    return this._partyCore.processor;
  }

  /**
   * @internal
   */
  _setGenesisFeedKey (genesisFeedKey: PublicKey) {
    this._genesisFeedKey = genesisFeedKey;
  }

  /**
   * Opens the pipeline and connects the streams.
   */
  @synchronized
  @timed(5_000)
  async open () {
    if (this.isOpen) {
      return this;
    }

    assert(this._genesisFeedKey);
    await this._partyCore.open({
      genesisFeedKey: this._genesisFeedKey,
      initialTimeframe: this._initialTimeframe
    });

    this._invitationManager = new InvitationFactory(
      this._partyCore.processor,
      this._genesisFeedKey,
      this._credentialsSigner,
      this._partyCore.credentialsWriter,
      this._networkManager
    );

    //
    // Network/swarm.
    //

    const writeFeed = await this._partyCore.getWriteFeed();
    const peerId = this._credentialsSigner.getDeviceKey().publicKey;
    this._protocol = new PartyProtocolFactory(
      this._partyCore.key,
      this._networkManager,
      peerId,
      createCredentialsProvider(this._credentialsSigner, this._partyCore.key, writeFeed.key)
    );

    // Replication.
    await this._protocol.start([
      createReplicatorPlugin(this._feedProvider),
      createAuthPlugin(createAuthenticator(
        this._partyCore.processor,
        this._credentialsSigner,
        this._partyCore.credentialsWriter
      ), peerId),
      createHaloRecoveryPlugin(this._credentialsSigner.getIdentityKey().publicKey, this._invitationManager, peerId)
    ]);

    // Issue an 'update' whenever the properties change.
    this.database.select({ type: PARTY_ITEM_TYPE }).exec().update.on(() => this.update.emit());

    this.update.emit();
    return this;
  }

  /**
  * Closes the pipeline and streams.
  */
  @synchronized
  async close () {
    if (!this.isOpen) {
      return this;
    }

    await this._partyCore.close();
    await this._protocol?.stop();

    this._protocol = undefined;
    this._invitationManager = undefined;

    this.update.emit();

    return this;
  }

  async createInvitation (authenticationDetails: InvitationAuthenticator, options?: InvitationOptions): Promise<InvitationDescriptor> {
    assert(this._invitationManager, 'HALO party not open.');
    return this._invitationManager.createInvitation(authenticationDetails, options);
  }
}
