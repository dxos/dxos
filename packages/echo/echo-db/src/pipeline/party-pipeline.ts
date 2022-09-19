//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { synchronized } from '@dxos/async';
import { failUndefined, timed } from '@dxos/debug';
import { Credential } from '@dxos/halo-protocol/src/proto';
import { ModelFactory } from '@dxos/model-factory';
import { PublicKey, Timeframe } from '@dxos/protocols';
import { DatabaseSnapshot, PartySnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { SubscriptionGroup } from '@dxos/util';

import { Database, FeedDatabaseBackend } from '../packlets/database';
import { Pipeline } from '../packlets/pipeline';
import { createAutomaticSnapshots, SnapshotStore } from '../snapshots';
import { consumePipeline } from './feed-muxer';
import { PartyFeedProvider } from './party-feed-provider';
import { PartyProcessor } from './party-processor';

const DEFAULT_SNAPSHOT_INTERVAL = 100; // Every 100 messages.

export interface PipelineOptions {
  readLogger?: (msg: any) => void
  writeLogger?: (msg: any) => void
  readOnly?: boolean
  // TODO(burdon): Hierarchical options.
  // snapshots: { enabled: true, interval: 100 } }
  snapshots?: boolean
  snapshotInterval?: number
}

const log = debug('dxos:echo-db:pipeline');

export interface OpenOptions {
  /**
   * Initial feed that contains PartyGenesis message and acts as the root for the feed DAG.
   */
  genesisFeedKey: PublicKey
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
  private _partyProcessor?: PartyProcessor;
  private _pipeline?: Pipeline;

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
    assert(this._pipeline, 'Party not open.');
    return this._pipeline.state.timeframe;
  }

  get timeframeUpdate () {
    assert(this._pipeline, 'Party not open.');
    return this._pipeline.state.timeframeUpdate;
  }

  async getWriteFeed () {
    const feed = await this._feedProvider.createOrOpenWritableFeed();
    assert(feed, `No writable feed found for party: ${this._partyKey}`);
    return feed;
  }

  get credentialsWriter (): FeedWriter<Credential> {
    assert(this._pipeline?.writer, 'No writable feed or pipeline is not open.');
    return mapFeedWriter<Credential, Omit<FeedMessage, 'timeframe'>>(credential => ({ halo: { credential } }), this._pipeline.writer);
  }

  /**
   * Opens the pipeline and connects the streams.
   */
  @synchronized
  @timed(1_000)
  async open (options: OpenOptions) {
    const {
      genesisFeedKey,
      initialTimeframe,
      targetTimeframe
    } = options;

    if (this.isOpen) {
      return this;
    }

    const writableFeed = await this._feedProvider.createOrOpenWritableFeed();

    if (!this._partyProcessor) {
      this._partyProcessor = new PartyProcessor(this._partyKey);
    }

    // Automatically open new admitted feeds.
    this._subscriptions.push(this._partyProcessor.feedAdded.on(async feedKey => {
      const feed = await this._feedProvider.createOrOpenReadOnlyFeed(feedKey);
      if (!this._pipeline) {
        log(`Party processor added feed while pipeline was closed: ${feedKey}`);
        return;
      }

      if (feedKey.equals(genesisFeedKey)) {
        return; // Ignore genesis feed as it is explicitly added to the pipeline during bootstrap.
      }

      this._pipeline.addFeed(feed);
    }));

    // Make sure we have the genesis feed open for replication.
    const genesisFeed = await this._feedProvider.createOrOpenReadOnlyFeed(genesisFeedKey);

    //
    // Pipeline
    //

    this._pipeline = new Pipeline(initialTimeframe ?? new Timeframe());
    this._pipeline.addFeed(genesisFeed);

    // Writable feed
    this._pipeline.setWriteFeed(writableFeed);

    //
    // Database
    //

    const databaseBackend = new FeedDatabaseBackend(
      mapFeedWriter<EchoEnvelope, Omit<FeedMessage, 'timeframe'>>(echo => ({ echo }), this._pipeline.writer ?? failUndefined()),
      this._databaseSnapshot,
      { snapshots: true }
    );
    this._database = new Database(
      this._modelFactory,
      databaseBackend,
      this._memberKey
    );

    // Open pipeline and connect it to the database.
    await this._database.initialize();

    consumePipeline(
      this._pipeline.consume(),
      this._partyProcessor,
      databaseBackend.echoProcessor,
      async error => {
        // TODO(dmaretskyi): Better error handling.
        console.error('Pipeline error:', error);
      }
    );

    if (this._options.snapshots) {
      createAutomaticSnapshots(
        this, // TODO(burdon): Don't pass `this`.
        this._pipeline.state.timeframeUpdate,
        this._snapshotStore,
        this._options.snapshotInterval ?? DEFAULT_SNAPSHOT_INTERVAL
      );
    }

    if (targetTimeframe) {
      await this._pipeline.state.waitUntilReached(targetTimeframe);
    }

    // TODO(dmaretskyi): Do we want to asset here that the writable feed has been admitted to the pipeline.

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

    await this._pipeline?.stop();
    this._pipeline = undefined;

    this._partyProcessor = undefined;

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
      timeframe: this._pipeline!.state.timeframe,
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
