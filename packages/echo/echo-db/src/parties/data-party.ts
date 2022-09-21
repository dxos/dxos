//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

import { synchronized, Event } from '@dxos/async';
import { timed, todo } from '@dxos/debug';
import { FeedDescriptor } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { Timeframe } from '@dxos/protocols';
import { PartySnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';

import { ResultSet } from '../api';
import { ActivationOptions, PartyPreferences, Preferences } from '../halo';
import { InvitationFactory } from '../invitations';
import { Database, Item } from '../packlets/database';
import { PartyFeedProvider, PartyProtocolFactory, PartyPipeline, PipelineOptions, MetadataStore } from '../pipeline';
import { createAuthPlugin, createOfflineInvitationPlugin, createAuthenticator, createCredentialsProvider } from '../protocol';
import { CredentialsSigner } from '../protocol/credentials-signer';
import { createReplicatorPlugin } from '../protocol/replicator-plugin';
import { SnapshotStore } from '../snapshots';
import { CONTACT_DEBOUNCE_INTERVAL } from './party-manager';

export const PARTY_ITEM_TYPE = 'dxos:item/party';

export const PARTY_TITLE_PROPERTY = 'title'; // TODO(burdon): Remove (should not be special).

// TODO(burdon): Factor out public API.
export interface PartyMember {
  publicKey: PublicKey
  displayName?: string
}

/**
 * Generic parties that peers create that is capable of storing data in the database.
 *
 * This class handles data-storage, replication, snapshots, access-control, and invitations.
 */
export class DataParty {
  public readonly update = new Event<void>();

  private readonly _partyCore: PartyPipeline;
  private readonly _preferences?: PartyPreferences;
  private _invitationManager?: InvitationFactory;
  private _protocol?: PartyProtocolFactory;

  private _genesisFeedKey?: PublicKey | undefined;

  constructor (
    partyKey: PublicKey,
    modelFactory: ModelFactory,
    snapshotStore: SnapshotStore,
    private readonly _feedProvider: PartyFeedProvider,
    private readonly _metadataStore: MetadataStore,
    private readonly _credentialsSigner: CredentialsSigner,
    // TODO(dmaretskyi): Pull this out to a higher level. Should preferences be part of client API instead?
    private readonly _profilePreferences: Preferences | undefined,
    private readonly _networkManager: NetworkManager,
    private readonly _initialTimeframe?: Timeframe,
    _options: PipelineOptions = {}
  ) {
    this._partyCore = new PartyPipeline(
      partyKey,
      _feedProvider,
      modelFactory,
      snapshotStore,
      this._credentialsSigner.getIdentityKey().publicKey,
      _options
    );

    // TODO(dmaretskyi): Pull this out to a higher level. Should preferences be part of client API instead?
    if (this._profilePreferences) {
      this._preferences = new PartyPreferences(this._profilePreferences, this);
    }
  }

  get partyInfo () {
    return {
      key: this.key.toHex(),
      isOpen: this.isOpen,
      isActive: this.isActive,
      feedKeys: this._feedProvider.getFeeds().length, // TODO(burdon): feeds.
      timeframe: this.isOpen ? this._partyCore.timeframe : undefined,
      properties: this.isOpen ? this.getPropertiesSet().expectOne().model.toObject() : undefined
    };
  }

  get key (): PublicKey {
    return this._partyCore.key;
  }

  get isOpen (): boolean {
    return !!(this._partyCore.isOpen && this._protocol);
  }

  get database (): Database {
    return this._partyCore.database;
  }

  // TODO(burdon): Create Devtools interface?

  // TODO(burdon): Remove?
  get processor () {
    return this._partyCore.processor;
  }

  // TODO(burdon): Remove?
  get pipeline () {
    return this._partyCore.pipeline;
  }

  // TODO(burdon): Remove?
  get timeframe () {
    return this._partyCore.timeframe;
  }

  // TODO(burdon): Remove?
  get timeframeUpdate () {
    return this._partyCore.timeframeUpdate;
  }

  // TODO(burdon): Remove?
  get invitationManager () {
    assert(this._invitationManager, 'Party not open.');
    return this._invitationManager;
  }

  get credentialsWriter () {
    return this._partyCore.credentialsWriter;
  }

  get title () {
    return this._preferences?.getLastKnownTitle();
  }

  async setTitle (title: string) {
    const item = await this.getPropertiesItem();
    await item.model.set(PARTY_TITLE_PROPERTY, title);
    await this._preferences?.setLastKnownTitle(title);
  }

  get genesisFeedKey (): PublicKey {
    assert(this._genesisFeedKey);
    return this._genesisFeedKey;
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

    // TODO(dmaretskyi): May be undefined in some tests.
    const party = this._metadataStore.getParty(this._partyCore.key);

    assert(this._genesisFeedKey);
    await this._partyCore.open({
      genesisFeedKey: this._genesisFeedKey,
      initialTimeframe: this._initialTimeframe,
      targetTimeframe: party?.latestTimeframe
    });

    // Keep updating latest reached timeframe in the metadata.
    // This timeframe will be waited for when opening the party next time.
    this._partyCore.timeframeUpdate.on(timeframe => {
      void this._metadataStore.setTimeframe(this._partyCore.key, timeframe);
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
    // Replication, invitations, and authentication functions.
    //

    const deviceKey = this._credentialsSigner.getDeviceKey();
    const writeFeed = await this._partyCore.getWriteFeed();
    this._protocol = new PartyProtocolFactory(
      this._partyCore.key,
      this._networkManager,
      deviceKey.publicKey,
      createCredentialsProvider(this._credentialsSigner, this._partyCore.key, writeFeed.key)
    );

    await this._protocol.start([
      createReplicatorPlugin(this._feedProvider),
      createAuthPlugin(createAuthenticator(this._partyCore.processor, this._credentialsSigner, this.credentialsWriter), deviceKey.publicKey),
      createOfflineInvitationPlugin(this._invitationManager, deviceKey.publicKey)
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

    // Save the latest reached timeframe.
    await this._metadataStore.setTimeframe(this._partyCore.key, this._partyCore.timeframe);

    await this._partyCore.close();
    await this._protocol?.stop();

    this._protocol = undefined;
    this._invitationManager = undefined;

    this.update.emit();

    return this;
  }

  async getWriteFeed (): Promise<FeedDescriptor> {
    return this._feedProvider.createOrOpenWritableFeed();
  }

  getFeeds (): FeedDescriptor[] {
    return this._feedProvider.getFeeds();
  }

  get isActive (): boolean {
    assert(this._preferences, 'PartyActivator required');
    return this._preferences.isActive;
  }

  async activate (options: ActivationOptions) {
    assert(this._preferences, 'PartyActivator required');
    await this._preferences.activate(options);

    if (!this.isOpen) {
      await this.open();
    } else {
      this.update.emit();
    }
  }

  async deactivate (options: ActivationOptions) {
    assert(this._preferences, 'PartyActivator required');
    await this._preferences.deactivate(options);

    if (this.isOpen) {
      await this.close();
    } else {
      this.update.emit();
    }
  }

  /**
   * Returns a special Item that is used by the Party to manage its properties.
   */
  async getPropertiesItem (): Promise<Item<ObjectModel>> {
    assert(this.isOpen, 'Party not open.');

    await this.database.waitForItem({ type: PARTY_ITEM_TYPE });
    const items = this.database.select({ type: PARTY_ITEM_TYPE }).exec().entities;
    assert(items.length === 1, 'Party properties missing.');
    return items[0] as Item<ObjectModel>;
  }

  /**
   * Get the SelectionResult for the Properties Item query.
   */
  getPropertiesSet () {
    assert(this.isOpen, 'Party not open.');
    return this.database.select({ type: PARTY_ITEM_TYPE }).exec();
  }

  /**
   * Create a snapshot of the current state.
   */
  createSnapshot (): PartySnapshot {
    return this._partyCore.createSnapshot();
  }

  async restoreFromSnapshot (snapshot: PartySnapshot) {
    await this._partyCore.restoreFromSnapshot(snapshot);
  }

  /**
   * Get all party members.
   */
  queryMembers (): ResultSet<PartyMember> {
    assert(this.isOpen, 'Party is not open.');
    return new ResultSet(
      this.processor.keyOrInfoAdded.debounce(CONTACT_DEBOUNCE_INTERVAL).discardParameter(),
      () => {
        if (!this.isOpen) {
          return [];
        }
        return this.processor.memberKeys
          .filter(publicKey => !this.processor.partyKey.equals(publicKey))
          .map((publicKey: PublicKey): PartyMember => {
            const displayName = todo(); // this.processor.getMemberInfo(publicKey)?.displayName;
            return {
              publicKey,
              displayName
            };
          });
      }
    );
  }
}
