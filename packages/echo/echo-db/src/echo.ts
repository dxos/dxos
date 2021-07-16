//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import memdown from 'memdown';

import { PartyKey } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager, NetworkManagerOptions } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { Storage } from '@dxos/random-access-multi-storage';
import { SubscriptionGroup } from '@dxos/util';

import { HALO } from './halo';
import { autoPartyOpener } from './halo/party-opener';
import { InvitationDescriptor, OfflineInvitationClaimer, SecretProvider } from './invitations';
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
  private readonly _halo: HALO;

  private readonly _feedStore: FeedStoreAdapter;
  private readonly _modelFactory: ModelFactory;
  private readonly _networkManager: NetworkManager;
  private readonly _snapshotStore: SnapshotStore;
  private readonly _partyManager: PartyManager;
  private readonly _subs = new SubscriptionGroup();

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
      () => this.halo.identity,
      this._networkManager,
      this._feedStore,
      this._modelFactory,
      this._snapshotStore,
      options
    );

    this._partyManager = new PartyManager(
      this._feedStore,
      this._snapshotStore,
      () => this.halo.identity,
      partyFactory
    );

    this._halo = new HALO({
      keyStorage: keyStorage,
      partyFactory,
      networkManager: this._networkManager,
      partyManager: this._partyManager
    });

    this._halo.identityReady.once(() => {
      // It might be the case that halo gets closed before this has a chance to execute.
      if (this.halo.identity.halo?.isOpen) {
        this._subs.push(autoPartyOpener(this.halo.identity.halo, this._partyManager));
      }
    });
  }

  toString () {
    return `Database(${JSON.stringify({
      parties: this._partyManager.parties.length
    })})`;
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
    if (this.isOpen) {
      return;
    }

    await this._feedStore.open();
    await this.halo.open(onProgressCallback);

    await this._partyManager.open(onProgressCallback);
  }

  /**
   * Closes the party and associated streams.
   */
  async close () {
    if (!this.isOpen) {
      return;
    }

    this._subs.unsubscribe();

    // TODO(marik-d): Should be _identityManager.close().
    await this.halo.close();

    // TODO(marik-d): Close network manager.
    await this._partyManager.close();

    await this._feedStore.close();
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

    this.halo.reset();

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
      secretProvider ?? OfflineInvitationClaimer.createSecretProvider(this.halo.identity);

    const impl = await this._partyManager.joinParty(invitationDescriptor, actualSecretProvider);
    return new Party(impl);
  }
}
