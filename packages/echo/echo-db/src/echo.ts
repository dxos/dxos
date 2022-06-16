//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import memdown from 'memdown';

import { Keyring, KeyStore, SecretProvider } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import { InvalidStateError } from '@dxos/debug';
import { codec, DataService, PartyKey, PartySnapshot } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager, NetworkManagerOptions } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { IStorage } from '@dxos/random-access-multi-storage';
import { SubscriptionGroup } from '@dxos/util';

import { ResultSet } from './api';
import { DataServiceRouter } from './database';
import { InvalidStorageVersionError } from './errors';
import { HALO } from './halo';
import { autoPartyOpener } from './halo/party-opener';
import { InvitationDescriptor, OfflineInvitationClaimer } from './invitations';
import { MetadataStore, STORAGE_VERSION } from './metadata';
import { OpenProgress, PartyFactory, PartyInternal, PartyManager } from './parties';
import { PartyFeedProvider } from './pipeline';
import { SnapshotStore } from './snapshots';
import { createRamStorage } from './util';

const log = debug('dxos:echo');
const error = log.extend('error');

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PartyFilter {}

/**
 * Various options passed to `ECHO.create`.
 */
export interface EchoCreationOptions {
  /**
   * Storage used for feeds. Defaults to in-memory.
   */
  feedStorage?: IStorage

  /**
   * Storage used for keys. Defaults to in-memory.
   */
  keyStorage?: any

  /**
   * Storage used for snapshots. Defaults to in-memory.
   */
  snapshotStorage?: IStorage

  /**
   * Storage used for snapshots. Defaults to in-memory.
   */
  metadataStorage?: IStorage

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
 * Shared datasets are contained within `Parties` which consists of immutable messages within multiple `Feeds`.
 * These feeds are replicated across peers in the network and stored in the `FeedStore`.
 * Parties contain queryable data `Items` which are reconstituted from an ordered stream of mutations by
 * different `Models`. The `Model` also handles `Item` mutations, which are streamed back to the `FeedStore`.
 * When opened, `Parties` construct a pair of inbound and outbound pipelines that connects each `Party` specific
 * `ItemManager` to the `FeedStore`.
 * Messages are streamed into the pipeline (from the `FeedStore`) in logical order, determined by the
 * `Timeframe` (which implements a vector clock).
 */
// TODO(burdon): Create ECHOError class for public errors.
export class ECHO {
  private readonly _halo: HALO;
  private readonly _keyring: Keyring;

  private readonly _feedStore: FeedStore;
  private readonly _modelFactory: ModelFactory;
  private readonly _networkManager: NetworkManager;
  private readonly _snapshotStore: SnapshotStore;
  private readonly _partyManager: PartyManager;
  private readonly _subs = new SubscriptionGroup();
  private readonly _metadataStore: MetadataStore;
  private readonly _dataServiceRouter: DataServiceRouter;

  /**
   * Creates a new instance of ECHO.
   * Default will create an in-memory database.
   */
  // TODO(burdon): Factor out config an define type.
  constructor ({
    keyStorage = memdown(),
    feedStorage = createRamStorage(),
    snapshotStorage = createRamStorage(),
    metadataStorage = createRamStorage(),
    networkManagerOptions,
    /// TODO(burdon): See options below.
    snapshots = true,
    snapshotInterval = 100,
    readLogger,
    writeLogger
  }: EchoCreationOptions = {}) {
    this._modelFactory = new ModelFactory()
      .registerModel(ObjectModel);

    this._networkManager = new NetworkManager(networkManagerOptions);
    this._snapshotStore = new SnapshotStore(snapshotStorage);
    this._metadataStore = new MetadataStore(metadataStorage);
    this._keyring = new Keyring(new KeyStore(keyStorage));
    this._feedStore = new FeedStore(feedStorage, { valueEncoding: codec });

    const createFeedProvider = (partyKey: PublicKey) => new PartyFeedProvider(
      this._metadataStore,
      this._keyring,
      this._feedStore,
      partyKey
    );

    // TODO(burdon): Restructure options (e.g., hierarchical options for snapshots).
    const options = {
      snapshots,
      snapshotInterval,
      readLogger,
      writeLogger
    };

    const partyFactory = new PartyFactory(
      () => this.halo.identity,
      this._networkManager,
      this._modelFactory,
      this._snapshotStore,
      createFeedProvider,
      options
    );

    this._partyManager = new PartyManager(
      this._metadataStore,
      this._snapshotStore,
      () => this.halo.identity,
      partyFactory
    );

    // TODO(burdon): Why does this need both PartyManager and PartyFactory?
    this._halo = new HALO({
      keyring: this._keyring,
      partyManager: this._partyManager,
      networkManager: this._networkManager,
      metadataStore: this._metadataStore,
      createFeedProvider: createFeedProvider,
      identityProvider: () => this.halo.identity,
      modelFactory: this._modelFactory,
      snapshotStore: this._snapshotStore,
      options
    });

    this._halo.identityReady.once(() => {
      // It might be the case that halo gets closed before this has a chance to execute.
      if (this.halo.identity.halo?.isOpen) {
        this._subs.push(autoPartyOpener(this.halo.identity.preferences!, this._partyManager));
      }
    });

    this._dataServiceRouter = new DataServiceRouter();
    this._partyManager.update.on(party => {
      log('New party to be included in data service router: %s', party.key);
      void party.update.waitForCondition(() => party.isOpen).then(() => {
        this._dataServiceRouter.trackParty(party.key, party.database.createDataServiceHost());
      });
    });
  }

  toString () {
    return `ECHO(${JSON.stringify(this.info())})`;
  }

  info () {
    return {
      open: this.isOpen,
      parties: this._partyManager.parties.length
    };
  }

  get isOpen () {
    return this._partyManager.isOpen;
  }

  get halo () {
    return this._halo;
  }

  //
  // Devtools.
  // TODO(burdon): Expose single devtools object.
  //

  get feedStore (): FeedStore {
    return this._feedStore;
  }

  get networkManager (): NetworkManager {
    return this._networkManager;
  }

  get modelFactory (): ModelFactory {
    return this._modelFactory;
  }

  get dataService (): DataService {
    return this._dataServiceRouter;
  }

  get snapshotStore (): SnapshotStore {
    return this._snapshotStore;
  }

  /**
   * Opens the ECHO instance and reads the saved state from storage.
   *
   * Previously active parties will be opened and will begin replication.
   */
  async open (onProgressCallback?: ((progress: OpenProgress) => void) | undefined) {
    if (this.isOpen) {
      return;
    }

    await this._metadataStore.load();

    if (this._metadataStore.version !== STORAGE_VERSION) {
      throw new InvalidStorageVersionError(STORAGE_VERSION, this._metadataStore.version);
    }

    await this._keyring.load();
    await this._metadataStore.load();
    await this.halo.open(onProgressCallback);

    await this._partyManager.open(onProgressCallback);
  }

  /**
   * Closes the ECHO instance.
   */
  async close () {
    if (!this.isOpen) {
      return;
    }

    this._subs.unsubscribe();

    // TODO(marik-d): Should be `_identityManager.close()`.
    await this.halo.close();

    // TODO(marik-d): Close network manager.
    await this._partyManager.close();

    await this._feedStore.close();

    await this.networkManager.destroy();
  }

  /**
   * Removes all data and closes this ECHO instance.
   *
   * The instance will be in an unusable state at this point and a page refresh is recommended.
   */
  // TODO(burdon): Enable re-open.
  async reset () {
    await this.close();

    try {
      if (this._feedStore.storage.destroy) {
        await this._feedStore.storage.destroy();
      }
    } catch (err: any) {
      error('Error clearing feed storage:', err);
    }

    await this.halo.reset();

    try {
      await this._snapshotStore.clear();
    } catch (err: any) {
      error('Error clearing snapshot storage:', err);
    }

    try {
      await this._metadataStore.clear();
    } catch (err: any) {
      error('Error clearing metadata storage:', err);
    }
  }

  //
  // Parties.
  //

  /**
   * Creates a new party.
   */
  async createParty (): Promise<PartyInternal> {
    await this.open();

    const party = await this._partyManager.createParty();
    await party.open();

    return party;
  }

  /**
   * Clones an existing party from a snapshot.
   * @param snapshot
   */
  async cloneParty (snapshot: PartySnapshot) {
    await this.open();

    const party = await this._partyManager.cloneParty(snapshot);
    await party.open();

    return party;
  }

  /**
   * Returns an individual party by it's key.
   * @param {PartyKey} partyKey
   */
  getParty (partyKey: PartyKey): PartyInternal | undefined {
    if (!this._partyManager.isOpen) {
      throw new InvalidStateError();
    }

    const party = this._partyManager.parties.find(party => party.key.equals(partyKey));
    return party;
  }

  /**
   * Queries for a set of Parties matching the optional filter.
   * @param {PartyFilter} filter
   */
  // eslint-disable-next-line unused-imports/no-unused-vars
  queryParties (filter?: PartyFilter): ResultSet<PartyInternal> {
    if (!this._partyManager.isOpen) {
      throw new InvalidStateError();
    }

    return new ResultSet(
      this._partyManager.update.discardParameter(),
      () => this._partyManager.parties
    );
  }

  /**
   * Joins a party that was created by another peer and starts replicating with it.
   * @param invitationDescriptor Invitation descriptor passed from another peer.
   * @param secretProvider Shared secret provider, the other peer creating the invitation must have the same secret.
   */
  async joinParty (invitationDescriptor: InvitationDescriptor, secretProvider?: SecretProvider): Promise<PartyInternal> {
    assert(this._partyManager.isOpen, new InvalidStateError());

    const actualSecretProvider =
      secretProvider ?? OfflineInvitationClaimer.createSecretProvider(this.halo.identity);

    return this._partyManager.joinParty(invitationDescriptor, actualSecretProvider);
  }
}
