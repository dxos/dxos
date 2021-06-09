//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { synchronized, Event } from '@dxos/async';
import { KeyHint, createAuthMessage, Authenticator } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import { raise, timed } from '@dxos/debug';
import { PartyKey, PartySnapshot, Timeframe, FeedKey } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';

import { ActivationOptions, PartyActivator, Identity } from '../halo';
import { InvitationManager } from '../invitations';
import { Database } from '../items';
import { SnapshotStore } from '../snapshots';
import { FeedStoreAdapter } from '../util';
import { PartyCore, PartyOptions } from './party-core';
import { PartyProtocol } from './party-protocol';

export const PARTY_ITEM_TYPE = 'dxn://dxos/item/party';
export const PARTY_TITLE_PROPERTY = 'title';

// TODO(burdon): Factor out public API.
export interface PartyMember {
  publicKey: PublicKey,
  displayName?: string
}

// TODO(burdon): Factor out public API.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PartyFilter {}

/**
 * Internal representation of a party.
 */
// TODO(burdon): Rename PartyImpl.
export class PartyInternal {
  public readonly update = new Event<void>();

  // TODO(burdon): Merge with PartyInternal.
  private readonly _partyCore: PartyCore;

  private readonly _activator?: PartyActivator;

  private _invitationManager?: InvitationManager;
  private _protocol?: PartyProtocol;

  constructor (
    _partyKey: PartyKey,
    _feedStore: FeedStoreAdapter,
    _modelFactory: ModelFactory,
    _snapshotStore: SnapshotStore,
    private readonly _identity: Identity,
    private readonly _networkManager: NetworkManager,
    private readonly _hints: KeyHint[] = [],
    _initialTimeframe?: Timeframe,
    _options: PartyOptions = {}
  ) {
    this._partyCore = new PartyCore(
      _partyKey,
      _feedStore,
      _modelFactory,
      _snapshotStore,
      _initialTimeframe,
      _options
    );

    if (this._identity.halo) {
      this._activator = new PartyActivator(this._identity.halo, this);
    }
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

  get processor () {
    return this._partyCore.processor;
  }

  get pipeline () {
    return this._partyCore.pipeline;
  }

  get invitationManager () {
    assert(this._invitationManager, 'Party not open.');
    return this._invitationManager;
  }

  get title () {
    return this._activator?.getLastKnownTitle();
  }

  async setTitle (title: string) {
    const item = await this.getPropertiesItem();
    await item.model.setProperty(PARTY_TITLE_PROPERTY, title);
    await this._activator?.setLastKnownTitle(title);
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

    await this._partyCore.open(this._hints);

    this._invitationManager = new InvitationManager(
      this._partyCore.processor,
      this._identity,
      this._networkManager
    );

    assert(this._identity.deviceKey, 'Missing device key.');

    // Network/swarm.
    this._protocol = new PartyProtocol(
      this._partyCore.key,
      this._networkManager,
      this._partyCore.feedStore,
      this._partyCore.processor.getActiveFeedSet(),
      this._invitationManager,
      this._identity,
      this._createCredentialsProvider(this._partyCore.key, PublicKey.from(this._partyCore.getWriteFeed().key)),
      this._partyCore.processor.authenticator
    );

    // TODO(burdon): Support read-only parties.

    // Replication.
    await this._protocol.start();

    // Issue an 'update' whenever the properties change.
    this.database.queryItems({ type: PARTY_ITEM_TYPE }).update.on(() => this.update.emit());

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
    assert(this._activator, 'PartyActivator required');
    return this._activator.isActive;
  }

  async activate (options: ActivationOptions) {
    assert(this._activator, 'PartyActivator required');
    await this._activator.activate(options);

    if (!this.isOpen) {
      await this.open();
    } else {
      this.update.emit();
    }
  }

  async deactivate (options: ActivationOptions) {
    assert(this._activator, 'PartyActivator required');
    await this._activator.deactivate(options);

    if (this.isOpen) {
      await this.close();
    } else {
      this.update.emit();
    }
  }

  /**
   * Returns a special Item that is used by the Party to manage its properties.
   */
  async getPropertiesItem () {
    assert(this.isOpen, 'Party not open.');

    await this.database.waitForItem({ type: PARTY_ITEM_TYPE });
    const { value: items } = this.database.queryItems({ type: PARTY_ITEM_TYPE });
    assert(items.length === 1, 'Party properties missing.');
    return items[0];
  }

  /**
   * Get the ResultSet for the Properties Item query.
   */
  getPropertiesSet () {
    assert(this.isOpen, 'Party not open.');
    return this.database.queryItems({ type: PARTY_ITEM_TYPE });
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

  private _createCredentialsProvider (partyKey: PartyKey, feedKey: FeedKey) {
    return {
      get: () => Buffer.from(Authenticator.encodePayload(createAuthMessage(
        this._identity.keyring,
        partyKey,
        this._identity.identityKey ?? raise(new Error('No identity key')),
        this._identity.deviceKeyChain ?? this._identity.deviceKey ?? raise(new Error('No device key')),
        this._identity.keyring.getKey(feedKey)
      )))
    };
  }
}
