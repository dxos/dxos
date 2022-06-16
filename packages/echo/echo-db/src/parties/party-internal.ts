//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { synchronized, Event } from '@dxos/async';
import { KeyHint, createAuthMessage, createFeedAdmitMessage, codec } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import { failUndefined, raise, timed } from '@dxos/debug';
import { PartyKey, PartySnapshot, Timeframe, FeedKey } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';

import { Database, Item, ResultSet } from '../api';
import { IdentityNotInitializedError } from '../errors';
import { ActivationOptions, PartyPreferences, IdentityProvider } from '../halo';
import { InvitationManager } from '../invitations';
import { PartyFeedProvider, PartyProtocolFactory } from '../pipeline';
import { SnapshotStore } from '../snapshots';
import { createAuthenticator, createCredentialsProvider } from './authenticator';
import { PartyCore, PartyOptions } from './party-core';
import { CONTACT_DEBOUNCE_INTERVAL } from './party-manager';

export const PARTY_ITEM_TYPE = 'dxos:item/party';

export const PARTY_TITLE_PROPERTY = 'title'; // TODO(burdon): Remove (should not be special).

// TODO(burdon): Factor out public API.
export interface PartyMember {
  publicKey: PublicKey,
  displayName?: string
}

/**
 * TODO(burdon): Comment.
 */
export class PartyInternal {
  public readonly update = new Event<void>();

  private readonly _partyCore: PartyCore;
  private readonly _preferences?: PartyPreferences;
  private _invitationManager?: InvitationManager;
  private _protocol?: PartyProtocolFactory;

  constructor (
    partyKey: PartyKey,
    modelFactory: ModelFactory,
    snapshotStore: SnapshotStore,
    private readonly _feedProvider: PartyFeedProvider,
    // This needs to be a provider in case this is a backend for the HALO party.
    // Then the identity would be changed after this is instantiated.
    private readonly _identityProvider: IdentityProvider,
    private readonly _networkManager: NetworkManager,
    private readonly _hints: KeyHint[] = [],
    _initialTimeframe?: Timeframe,
    _options: PartyOptions = {}
  ) {
    const identity = this._identityProvider();

    this._partyCore = new PartyCore(
      partyKey,
      _feedProvider,
      modelFactory,
      snapshotStore,
      identity.identityKey?.publicKey ?? failUndefined(),
      _initialTimeframe,
      _options
    );

    if (identity.preferences) {
      this._preferences = new PartyPreferences(identity.preferences, this);
    }
  }

  get partyInfo () {
    return {
      key: this.key.toHex(),
      isOpen: this.isOpen,
      isActive: this.isActive,
      feedKeys: this._feedProvider.getFeeds().length,
      timeframe: this.isOpen ? this._partyCore.timeframe : undefined,
      properties: this.isOpen ? this.getPropertiesSet().expectOne().model.toObject() : undefined
    };
  }

  get key (): PartyKey {
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

  // TODO(burdon): Remove?
  get feedProvider (): PartyFeedProvider {
    return this._feedProvider;
  }

  get preferences (): PartyPreferences {
    assert(this._preferences, 'Preferences not available.');
    return this._preferences;
  }

  get title () {
    return this._preferences?.getLastKnownTitle();
  }

  async setTitle (title: string) {
    const item = await this.getPropertiesItem();
    await item.model.set(PARTY_TITLE_PROPERTY, title);
    await this._preferences?.setLastKnownTitle(title);
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

    const identity = this._identityProvider();
    assert(identity.deviceKey, 'Missing device key.');

    await this._partyCore.open(this._hints);

    this._invitationManager = new InvitationManager(
      this._partyCore.processor,
      this._identityProvider,
      this._networkManager
    );

    //
    // Network/swarm.
    //

    const writeFeed = await this._partyCore.getWriteFeed();

    this._protocol = new PartyProtocolFactory(
      this._partyCore.key,
      this._networkManager,
      this._feedProvider,
      this._identityProvider,
      createCredentialsProvider(this._identityProvider, this._partyCore.key, writeFeed.key),
      this._invitationManager,
      createAuthenticator(this._partyCore.processor, this._identityProvider),
      this._partyCore.processor.getActiveFeedSet()
    );

    // Replication.
    await this._protocol.start();

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
      () => this.processor.memberKeys
        .filter(publicKey => !this.processor.partyKey.equals(publicKey))
        .map((publicKey: PublicKey): PartyMember => {
          const displayName = this.processor.getMemberInfo(publicKey)?.displayName;
          return {
            publicKey,
            displayName
          };
        })
    );
  }
}
