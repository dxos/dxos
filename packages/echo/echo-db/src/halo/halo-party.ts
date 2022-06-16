//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { Event, synchronized } from '@dxos/async';
import { KeyHint } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import { failUndefined, timed } from '@dxos/debug';
import { Timeframe } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';

import { InvitationManager } from '../invitations';
import { PartyCore, PartyOptions, PARTY_ITEM_TYPE } from '../parties';
import { createAuthenticator, createCredentialsProvider } from '../parties/authenticator';
import { PartyFeedProvider, PartyProtocolFactory } from '../pipeline';
import { SnapshotStore } from '../snapshots';
import { ContactManager } from './contact-manager';
import { IdentityProvider } from './identity';
import { Preferences } from './preferences';

export const HALO_PARTY_DESCRIPTOR_TYPE = 'dxos:item/halo/party-descriptor';
export const HALO_PARTY_CONTACT_LIST_TYPE = 'dxos:item/halo/contact-list';
export const HALO_PARTY_PREFERENCES_TYPE = 'dxos:item/halo/preferences';
export const HALO_PARTY_DEVICE_PREFERENCES_TYPE = 'dxos:item/halo/device/preferences';

/**
 * A record in HALO party representing a party that user is currently a member of.
 */
export interface JoinedParty {
  partyKey: PublicKey,
  keyHints: KeyHint[]
}

/**
 * Wraps PartyInternal and provides all HALO-related functionality.
 */
export class HaloParty {
  public readonly update = new Event<void>();

  private readonly _partyCore: PartyCore;
  private _invitationManager?: InvitationManager;
  private _protocol?: PartyProtocolFactory;

  private readonly _contactManager: ContactManager;
  private readonly _preferences: Preferences;

  constructor (
    private readonly _identityKey: PublicKey,
    modelFactory: ModelFactory,
    snapshotStore: SnapshotStore,
    private readonly _feedProvider: PartyFeedProvider,
    // This needs to be a provider in case this is a backend for the HALO party.
    // Then the identity would be changed after this is instantiated.
    private readonly _identityProvider: IdentityProvider,
    private readonly _networkManager: NetworkManager,
    private readonly _hints: KeyHint[] = [],
    _initialTimeframe: Timeframe | undefined,
    _options: PartyOptions,
    deviceKey: PublicKey
  ) {
    const identity = this._identityProvider();

    this._partyCore = new PartyCore(
      _identityKey,
      _feedProvider,
      modelFactory,
      snapshotStore,
      identity.identityKey?.publicKey ?? failUndefined(),
      _initialTimeframe,
      _options
    );

    this._contactManager = new ContactManager(() => this.isOpen ? this.database : undefined);
    this._preferences = new Preferences(
      () => this.isOpen ? this.database : undefined,
      deviceKey
    );
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

  get invitationManager () {
    assert(this._invitationManager);
    return this._invitationManager;
  }

  get identityInfo () {
    return this._partyCore.processor.infoMessages.get(this._identityKey.toHex());
  }

  get identityGenesis () {
    return this._partyCore.processor.credentialMessages.get(this._identityKey.toHex());
  }

  get memberKeys () {
    return this._partyCore.processor.memberKeys;
  }

  get credentialMessages () {
    return this._partyCore.processor.credentialMessages;
  }

  get feedKeys () {
    return this._partyCore.processor.feedKeys;
  }

  async getWriteFeedKey () {
    const feed = await this._feedProvider.createOrOpenWritableFeed();
    return feed.key;
  }

  get processor () {
    return this._partyCore.processor;
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
}
