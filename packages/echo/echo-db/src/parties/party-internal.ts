//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { synchronized, Event } from '@dxos/async';
import { KeyHint, createAuthMessage, Authenticator } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import { raise, timed } from '@dxos/debug';
import { createFeedWriter, DatabaseSnapshot, PartyKey, PartySnapshot, Timeframe, FeedKey } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';

import { InvitationManager } from '../invitations';
import { Database, TimeframeClock } from '../items';
import { createAutomaticSnapshots, SnapshotStore } from '../snapshots';
import { FeedStoreAdapter } from '../util';
import { IdentityManager } from './identity-manager';
import { createMessageSelector } from './message-selector';
import { PartyProcessor } from './party-processor';
import { PartyProtocol } from './party-protocol';
import { Pipeline } from './pipeline';

// TODO(burdon): Format?
const DEFAULT_SNAPSHOT_INTERVAL = 100; // every 100 messages
export const PARTY_ITEM_TYPE = 'dxn://dxos/item/party';
export const PARTY_TITLE_PROPERTY = 'title';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PartyFilter {}

export interface ActivationOptions {
  global?: boolean;
  device?: boolean;
}

export interface PartyActivator {
  isActive(): boolean,
  getLastKnownTitle(): string,
  setLastKnownTitle(title: string): Promise<void>,
  activate(options: ActivationOptions): Promise<void>;
  deactivate(options: ActivationOptions): Promise<void>;
}

export interface PartyOptions {
  readLogger?: (msg: any) => void;
  writeLogger?: (msg: any) => void;
  readOnly?: boolean;
  snapshots?: boolean;
  snapshotInterval?: number;
}

/**
 * A Party represents a shared dataset containing queryable Items that are constructed from an ordered stream
 * of mutations.
 */
// TODO(burdon): Rename PartyImpl.
export class PartyInternal {
  public readonly update = new Event<void>();

  /**
   * Snapshot to be restored from when party.open() is called.
   */
  private _databaseSnapshot: DatabaseSnapshot | undefined;

  private _subscriptions: (() => void)[] = [];

  private _database?: Database;
  private _pipeline?: Pipeline;
  private _protocol?: PartyProtocol;
  private _timeframeClock?: TimeframeClock;
  private _partyProcessor?: PartyProcessor;
  private _invitationManager?: InvitationManager;

  private readonly _activator?: PartyActivator;

  constructor (
    private readonly _partyKey: PartyKey,
    private readonly _identityManager: IdentityManager,
    private readonly _feedStore: FeedStoreAdapter,
    private readonly _modelFactory: ModelFactory,
    private readonly _networkManager: NetworkManager,
    private readonly _snapshotStore: SnapshotStore,
    private readonly _hints: KeyHint[] = [],
    private readonly _initialTimeframe?: Timeframe,
    private readonly _options: PartyOptions = {}
  ) {
    this._activator = this._identityManager.halo?.createPartyActivator(this);
  }

  get key (): PartyKey {
    return this._partyKey;
  }

  get isOpen (): boolean {
    return !!(this._database && this._partyProcessor && this._protocol && this._pipeline);
  }

  get database (): Database {
    assert(this._database, 'Party not open.');
    return this._database;
  }

  get processor () {
    assert(this._partyProcessor, 'Party not open.');
    return this._partyProcessor;
  }

  get pipeline () {
    assert(this._pipeline, 'Party not open.');
    return this._pipeline;
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
  @timed(5000)
  async open () {
    if (this.isOpen) {
      return this;
    }

    const feed = this._feedStore.queryWritableFeed(this._partyKey);
    assert(feed, `Missing feed for: ${String(this._partyKey)}`);

    this._timeframeClock = new TimeframeClock(this._initialTimeframe);

    if (!this._partyProcessor) {
      this._partyProcessor = new PartyProcessor(this._partyKey);
      if (this._hints.length) {
        await this._partyProcessor.takeHints(this._hints);
      }
    }

    // TODO(burdon): Close on clean-up.
    const iterator = await this._feedStore.createIterator(this._partyKey,
      createMessageSelector(this._partyProcessor, this._timeframeClock), this._initialTimeframe);

    const feedWriteStream = createFeedWriter(feed);

    this._pipeline = new Pipeline(
      this._partyProcessor, iterator, this._timeframeClock, feedWriteStream, this._options);

    this._invitationManager = new InvitationManager(
      this._partyProcessor,
      this._identityManager,
      this._networkManager
    );

    assert(this._identityManager.deviceKey, 'Missing device key.');

    // Network/swarm.
    this._protocol = new PartyProtocol(
      this._partyKey,
      this._networkManager,
      this._feedStore,
      this._partyProcessor.getActiveFeedSet(),
      this._invitationManager,
      this._identityManager,
      this._createCredentialsProvider(this._partyKey, PublicKey.from(feed!.key)),
      this._partyProcessor.authenticator
    );

    // TODO(burdon): Support read-only parties.
    const [readStream, writeStream] = await this._pipeline.open();

    this._database = new Database(
      this._modelFactory,
      this._timeframeClock,
      readStream,
      writeStream ?? null,
      this._databaseSnapshot
    );
    await this._database.init();

    if (this._pipeline.outboundHaloStream) {
      this._partyProcessor.setOutboundStream(this._pipeline.outboundHaloStream);
    }

    // Replication.
    await this._protocol.start();

    // TODO(burdon): Propagate errors.
    this._subscriptions.push(this._pipeline.errors.on(err => console.error(err)));

    // Issue an 'update' whenever the properties change.
    this.database.queryItems({ type: PARTY_ITEM_TYPE }).update.on(() => this.update.emit());

    if (this._options.snapshots) {
      createAutomaticSnapshots(
        this,
        this._timeframeClock,
        this._snapshotStore,
        this._options.snapshotInterval ?? DEFAULT_SNAPSHOT_INTERVAL
      );
    }

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

    await this._protocol?.stop();
    this._protocol = undefined;

    await this._database?.destroy();
    this._database = undefined;

    await this._pipeline?.close();
    this._pipeline = undefined;

    this._invitationManager = undefined;
    this._partyProcessor = undefined;
    this._timeframeClock = undefined;

    this._subscriptions.forEach(cb => cb());
    this.update.emit();

    return this;
  }

  get isActive () {
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
    assert(this.isOpen, 'Party not open.');

    return {
      partyKey: this.key.asUint8Array(),
      timeframe: this._timeframeClock!.timeframe,
      timestamp: Date.now(),
      database: this.database.createSnapshot(),
      halo: this.processor.makeSnapshot()
    };
  }

  async restoreFromSnapshot (snapshot: PartySnapshot) {
    assert(!this.isOpen, 'Party is already open.');
    assert(!this._partyProcessor, 'Party processor already exists.');
    assert(snapshot.halo);
    assert(snapshot.database);

    this._partyProcessor = new PartyProcessor(this._partyKey);
    await this._partyProcessor.restoreFromSnapshot(snapshot.halo);

    this._databaseSnapshot = snapshot.database;
  }

  private _createCredentialsProvider (partyKey: PartyKey, feedKey: FeedKey) {
    return {
      get: () => Buffer.from(Authenticator.encodePayload(createAuthMessage(
        this._identityManager.keyring,
        partyKey,
        this._identityManager.identityKey ?? raise(new Error('No identity key')),
        this._identityManager.deviceKeyChain ?? this._identityManager.deviceKey ?? raise(new Error('No device key')),
        this._identityManager.keyring.getKey(feedKey)
      )))
    };
  }
}
