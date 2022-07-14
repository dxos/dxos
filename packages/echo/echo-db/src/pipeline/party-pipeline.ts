//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { synchronized } from '@dxos/async';
import { KeyType, Message as HaloMessage } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import { timed } from '@dxos/debug';
import { createFeedWriter, DatabaseSnapshot, FeedSelector, FeedWriter, PartyKey, PartySnapshot, Timeframe } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { SubscriptionGroup } from '@dxos/util';

import { createMessageSelector, PartyProcessor, PartyFeedProvider, FeedMuxer } from '.';
import { Database, FeedDatabaseBackend, TimeframeClock } from '../packlets/database';
import { createAutomaticSnapshots, SnapshotStore } from '../snapshots';

const DEFAULT_SNAPSHOT_INTERVAL = 100; // Every 100 messages.

export interface PipelineOptions {
  readLogger?: (msg: any) => void;
  writeLogger?: (msg: any) => void;
  readOnly?: boolean;
  // TODO(burdon): Hierarchical options.
  // snapshots: { enabled: true, interval: 100 } }
  snapshots?: boolean;
  snapshotInterval?: number;
}

export interface OpenOptions {
  /**
   * Initial feed that contains PartyGenesis message and acts as the root for the feed DAG.
   */
  genesisFeedKey: PublicKey
  /**
   * Keys of initial feeds needed to bootstrap the party.
   */
  feedHints?: PublicKey[]
  /**
   * Timeframe to start processing feed messages from.
   */
  initialTimeframe?: Timeframe
  /**
   * Timeframe which must be reached until further processing.
   * PartyCore.open will block until this timeframe is reached.
   */
  targetTimeframe?: Timeframe
}

/**
 * Encapsulates core components needed by a party:
 * - ECHO database with item-manager & item-demuxer.
 * - HALO PartyState state-machine that handles key admission.
 * - Data processing pipeline with the feed-store iterator that reads the messages in the proper order.
 *
 * The core class also handles the combined ECHO and HALO state snapshots.
 */
export class PartyPipeline {
  /**
   * Snapshot to be restored from when party.open() is called.
   */
  private _databaseSnapshot: DatabaseSnapshot | undefined;

  private readonly _subscriptions = new SubscriptionGroup();

  private _database?: Database;
  private _pipeline?: FeedMuxer;
  private _partyProcessor?: PartyProcessor;
  private _timeframeClock?: TimeframeClock;

  constructor (
    private readonly _partyKey: PartyKey,
    private readonly _feedProvider: PartyFeedProvider,
    private readonly _modelFactory: ModelFactory,
    private readonly _snapshotStore: SnapshotStore,
    private readonly _memberKey: PublicKey,
    private readonly _options: PipelineOptions = {}
  ) { }

  get key (): PartyKey {
    return this._partyKey;
  }

  get isOpen (): boolean {
    return !!(this._database && this._partyProcessor);
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

  get timeframe () {
    assert(this._timeframeClock, 'Party not open');
    return this._timeframeClock.timeframe;
  }

  get timeframeUpdate () {
    assert(this._timeframeClock, 'Party not open');
    return this._timeframeClock.update;
  }

  async getWriteFeed () {
    const feed = await this._feedProvider.createOrOpenWritableFeed();
    assert(feed, `No writable feed found for party: ${this._partyKey}`);
    return feed;
  }

  get credentialsWriter (): FeedWriter<HaloMessage> {
    assert(this._pipeline?.outboundHaloStream, 'Party not open');
    return this._pipeline?.outboundHaloStream;
  }

  /**
   * Opens the pipeline and connects the streams.
   */
  @synchronized
  @timed(1_000)
  async open (options: OpenOptions) {
    const {
      feedHints = [],
      genesisFeedKey,
      initialTimeframe,
      targetTimeframe
    } = options;

    if (this.isOpen) {
      return this;
    }

    this._timeframeClock = new TimeframeClock(initialTimeframe);

    const writableFeed = await this._feedProvider.createOrOpenWritableFeed();

    if (!this._partyProcessor) {
      this._partyProcessor = new PartyProcessor(this._partyKey);
    }

    // Automatically open new admitted feeds.
    this._subscriptions.push(this._partyProcessor.feedAdded.on(feed => {
      void this._feedProvider.createOrOpenReadOnlyFeed(feed);
    }));

    if (feedHints.length > 0) {
      await this._partyProcessor.takeHints(feedHints.map(publicKey => ({ publicKey, type: KeyType.FEED })));
    }

    //
    // Pipeline
    //

    const iterator = await this._feedProvider.createIterator(
      createMessageSelector(this._partyProcessor, this._timeframeClock),
      createFeedSelector(this._partyProcessor, [genesisFeedKey]),
      initialTimeframe
    );

    this._pipeline = new FeedMuxer(
      this._partyProcessor,

      iterator,
      this._timeframeClock,
      createFeedWriter(writableFeed.feed),
      this._options
    );

    //
    // Database
    //

    const databaseBackend = new FeedDatabaseBackend(this._pipeline.outboundEchoStream, this._databaseSnapshot, { snapshots: true });
    this._database = new Database(
      this._modelFactory,
      databaseBackend,
      this._memberKey
    );

    // Open pipeline and connect it to the database.
    await this._database.initialize();
    this._pipeline.setEchoProcessor(databaseBackend.echoProcessor);
    await this._pipeline.open();

    // TODO(burdon): Propagate errors.
    this._subscriptions.push(this._pipeline.errors.on(err => console.error(err)));

    if (this._options.snapshots) {
      createAutomaticSnapshots(
        this, // TODO(burdon): Don't pass `this`.
        this._timeframeClock,
        this._snapshotStore,
        this._options.snapshotInterval ?? DEFAULT_SNAPSHOT_INTERVAL
      );
    }

    if (targetTimeframe) {
      await this._timeframeClock.waitUntilReached(targetTimeframe);
    }

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

    await this._database?.destroy();
    this._database = undefined;

    await this._pipeline?.close();
    this._pipeline = undefined;

    this._partyProcessor = undefined;
    this._timeframeClock = undefined;

    this._subscriptions.unsubscribe();

    return this;
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
}

const createFeedSelector = (partyProcessor: PartyProcessor, hints: PublicKey[]): FeedSelector => feed => hints.some(hint => hint.equals(feed.key)) || partyProcessor.isFeedAdmitted(feed.key);
