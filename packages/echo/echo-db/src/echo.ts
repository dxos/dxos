//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import memdown from 'memdown';

import { KeyRecord, Keyring, KeyStore, KeyType } from '@dxos/credentials';
import { KeyPair, PublicKey } from '@dxos/crypto';
import { PartyKey } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager, NetworkManagerOptions } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { Storage } from '@dxos/random-access-multi-storage';

import { Contact, HaloFactory, IdentityManager } from './halo';
import {
  InvitationAuthenticator, InvitationDescriptor, InvitationOptions, OfflineInvitationClaimer, SecretProvider
} from './invitations';
import { DefaultModel } from './items';
import { OpenProgress, Party, PartyFactory, PartyFilter, PartyManager } from './parties';
import { ResultSet } from './result';
import { SnapshotStore } from './snapshots';
import { FeedStoreAdapter, createRamStorage } from './util';

// TODO(burdon): Log vs error.
const log = debug('dxos:echo');

/**
 * Various options passed to `ECHO.create`.
 */
export interface EchoCreationOptions {
  /**
   * Storage used for feeds. Defaults to in-memory.
   */
  feedStorage?: Storage

  /**
   * Storage used for keys. Defaults to in-memory.
   */
  keyStorage?: any

  /**
   * Storage used for snapshots. Defaults to in-memory.
   */
  snapshotStorage?: Storage

  /**
   * Networking provider. Defaults to in-memory networking.
   */
  networkManagerOptions?: NetworkManagerOptions,

  /**
   * Whether to save and load snapshots. Defaults to `true`.
   */
  // TODO(burdon): Hierarchical config.
  snapshots?: boolean

  /**
   * Number of messages after which snapshot will be created. Defaults to 100.
   */
  snapshotInterval?: number

  // TODO(burdon): Comments.
  readLogger?: (msg: any) => void;
  writeLogger?: (msg: any) => void;
}

/**
 * This is the root object for the ECHO database.
 * It is used to query and mutate the state of all data accessible to the containing node.
 * Shared datasets are contained within `Parties` which consiste of immutable messages within multiple `Feeds`.
 * These feeds are replicated across peers in the network and stored in the `FeedStore`.
 * Parties contain queryable data `Items` which are reconstituted from an ordered stream of mutations by
 * different `Models`. The `Model` also handles `Item` mutations, which are streamed back to the `FeedStore`.
 * When opened, `Parties` construct a pair of inbound and outbound pipelines that connects each `Party` specific
 * `ItemManager` to the `FeedStore`.
 * Messages are streamed into the pipeline (from the `FeedStore`) in logical order, determined by the
 * `Spactime` `Timeframe` (which implements a vector clock).
 */
// TODO(burdon): Create ECHOError class for public errors.
export class ECHO {
  private readonly _keyring: Keyring;
  private readonly _identityManager: IdentityManager;
  private readonly _feedStore: FeedStoreAdapter;
  private readonly _modelFactory: ModelFactory;
  private readonly _networkManager: NetworkManager;
  private readonly _snapshotStore: SnapshotStore;
  private readonly _partyManager: PartyManager;

  /**
   * Creates a new instance of ECHO.
   * Default will create an in-memory database.
   */
  // TODO(burdon): Factor out config an define type.
  constructor ({
    keyStorage = memdown(),
    feedStorage = createRamStorage(),
    snapshotStorage = createRamStorage(),
    networkManagerOptions,
    snapshots = true,
    snapshotInterval = 100,
    readLogger,
    writeLogger
  }: EchoCreationOptions = {}) {
    this._keyring = new Keyring(new KeyStore(keyStorage));
    this._identityManager = new IdentityManager(this._keyring);

    this._feedStore = FeedStoreAdapter.create(feedStorage);

    this._modelFactory = new ModelFactory()
      .registerModel(ObjectModel)
      .registerModel(DefaultModel);

    this._networkManager = new NetworkManager(networkManagerOptions);
    this._snapshotStore = new SnapshotStore(snapshotStorage);

    const options = {
      snapshots,
      snapshotInterval,
      readLogger,
      writeLogger
    };

    const partyFactory = new PartyFactory(
      this._identityManager,
      this._networkManager,
      this._feedStore,
      this._modelFactory,
      this._snapshotStore,
      options
    );

    const haloFactory = new HaloFactory(
      partyFactory,
      this._identityManager,
      this._networkManager
    );

    this._partyManager = new PartyManager(
      this._identityManager,
      this._feedStore,
      this._snapshotStore,
      partyFactory,
      haloFactory
    );
  }

  toString () {
    return `Database(${JSON.stringify({
      parties: this._partyManager.parties.length
    })})`;
  }

  get isOpen () {
    return this._partyManager.isOpen;
  }

  //
  // HALO
  // TODO(burdon): Expose as Profile API class.
  //

  // TODO(burdon): Different from 'identityReady'?
  get isHaloInitialized (): boolean {
    return this._identityManager.halo !== undefined;
  }

  // TODO(burdon): Remove? This returns an event handler.
  get identityReady () {
    return this._identityManager.ready;
  }

  // TODO(burdon): Factor out into Profile API.
  get identityKey (): KeyRecord | undefined {
    return this._identityManager.identityKey;
  }

  // TODO(burdon): Factor out into Profile API.
  get identityDisplayName (): string | undefined {
    return this._identityManager.displayName;
  }

  //
  // Devtools.
  // TODO(burdon): Expose single devtools object.
  //

  get keyring (): Keyring {
    return this._keyring;
  }

  get feedStore (): FeedStore {
    return this._feedStore.feedStore; // TODO(burdon): Why not return top-level object?
  }

  get networkManager (): NetworkManager {
    return this._networkManager;
  }

  get modelFactory (): ModelFactory {
    return this._modelFactory;
  }

  /**
   * Opens the party and constructs the inbound/outbound mutation streams.
   */
  async open (onProgressCallback?: ((progress: OpenProgress) => void) | undefined) {
    if (!this.isOpen) {
      await this._keyring.load();
      await this._partyManager.open(onProgressCallback);
    }
  }

  /**
   * Closes the party and associated streams.
   */
  async close () {
    if (this.isOpen) {
      // TODO(marik-d): Close network manager.
      await this._partyManager.close();
    }
  }

  /**
   * Removes all data and closes this ECHO instance.
   */
  // TODO(burdon): Enable re-open.
  async reset () {
    await this.close();

    try {
      if (this._feedStore.storage.destroy) {
        await this._feedStore.storage.destroy();
      }
    } catch (err) {
      log('Error clearing feed storage:', err);
    }

    try {
      await this._keyring.deleteAllKeyRecords();
    } catch (err) {
      log('Error clearing keyring:', err);
    }

    try {
      await this._snapshotStore.clear();
    } catch (err) {
      log('Error clearing snapshot storage:', err);
    }
  }

  //
  // Parties
  //

  /**
   * Creates a new party.
   */
  async createParty (): Promise<Party> {
    await this.open();

    const impl = await this._partyManager.createParty();
    await impl.open();

    // TODO(burdon): Don't create a new instance (maintain map).
    return new Party(impl);
  }

  /**
   * Returns an individual party by it's key.
   * @param {PartyKey} partyKey
   */
  getParty (partyKey: PartyKey): Party | undefined {
    assert(this._partyManager.isOpen, 'ECHO not open.');

    const impl = this._partyManager.parties.find(party => party.key.equals(partyKey));
    // TODO(burdon): Don't create a new instance (maintain map).
    return impl && new Party(impl);
  }

  /**
   * Queries for a set of Parties matching the optional filter.
   * @param {PartyFilter} filter
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  queryParties (filter?: PartyFilter): ResultSet<Party> {
    assert(this._partyManager.isOpen, 'ECHO not open.');

    return new ResultSet(
      this._partyManager.update.discardParameter(), () => this._partyManager.parties.map(impl => new Party(impl))
    );
  }

  /**
   * Joins a party that was created by another peer and starts replicating with it.
   * @param invitationDescriptor
   * @param secretProvider
   */
  async joinParty (invitationDescriptor: InvitationDescriptor, secretProvider?: SecretProvider): Promise<Party> {
    assert(this._partyManager.isOpen, 'ECHO not open.');

    const actualSecretProvider =
      secretProvider ?? OfflineInvitationClaimer.createSecretProvider(this._identityManager);

    const impl = await this._partyManager.joinParty(invitationDescriptor, actualSecretProvider);
    return new Party(impl);
  }

  //
  // HALO
  // TODO(burdon): Factor out HALO-specific API?
  //

  /**
   * Create Profile. Add Identity key if public and secret key are provided.
   */
  // TODO(burdon): Why is this separate from createHalo?
  async createIdentity (keyPair: KeyPair) {
    const { publicKey, secretKey } = keyPair;
    assert(publicKey, 'Invalid publicKey');
    assert(secretKey, 'Invalid secretKey');

    if (this._identityManager.identityKey) {
      // TODO(burdon): Bad API: Semantics change based on options.
      // TODO(burdon): createProfile isn't part of this package.
      throw new Error('Identity key already exists. Call createProfile without a keypair to only create a halo party.');
    }

    await this._keyring.addKeyRecord({ secretKey, publicKey: PublicKey.from(publicKey), type: KeyType.IDENTITY });
  }

  /**
   * Creates the initial HALO party.
   * @param displayName
   */
  // TODO(burdon): Return Halo API object?
  async createHalo (displayName?: string) {
    // TODO(burdon): Why not assert?
    if (this._identityManager.halo) {
      throw new Error('HALO party already exists');
    }
    if (!this._identityManager.identityKey) {
      throw new Error('Cannot create HALO. Identity key not found.');
    }

    await this._partyManager.createHalo({
      identityDisplayName: displayName || this._identityManager.identityKey.publicKey.humanize()
    });
  }

  /**
   * Joins an existing identity HALO from a recovery seed phrase.
   */
  async recoverHalo (seedPhrase: string) {
    assert(this._partyManager.isOpen, 'ECHO not open.');
    assert(!this._identityManager.halo, 'HALO already exists.');
    assert(!this._identityManager.identityKey, 'Identity key already exists.');

    const impl = await this._partyManager.recoverHalo(seedPhrase);
    return new Party(impl);
  }

  /**
   * Joins an existing identity HALO by invitation.
   */
  async joinHalo (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider) {
    assert(this._partyManager.isOpen, 'ECHO not open.');
    assert(!this._identityManager.halo, 'HALO already exists.');

    const impl = await this._partyManager.joinHalo(invitationDescriptor, secretProvider);
    return new Party(impl);
  }

  /**
   * Create an invitation to an exiting identity HALO.
   */
  async createHaloInvitation (authenticationDetails: InvitationAuthenticator, options?: InvitationOptions) {
    assert(this._identityManager.halo, 'HALO not initialized.');

    return this._identityManager.halo.invitationManager.createInvitation(authenticationDetails, options);
  }

  /**
   * Query for contacts. Contacts represent member keys across all known Parties.
   */
  // TODO(burdon): Expose ContactManager directly.
  queryContacts (): ResultSet<Contact> {
    assert(this._partyManager.isOpen, 'ECHO not open.');
    assert(this._identityManager.halo, 'Invalid HALO.');

    return this._identityManager.halo.contacts.queryContacts();
  }
}
