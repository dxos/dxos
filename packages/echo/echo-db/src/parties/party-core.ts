//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { synchronized } from '@dxos/async';
import { KeyHint } from '@dxos/credentials';
import { timed } from '@dxos/debug';
import { createFeedWriter, DatabaseSnapshot, PartyKey, PartySnapshot, Timeframe } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';

import { Database, TimeframeClock } from '../items';
import { createAutomaticSnapshots, SnapshotStore } from '../snapshots';
import { FeedStoreAdapter } from '../util';
import { createMessageSelector } from './message-selector';
import { PartyProcessor } from './party-processor';
import { Pipeline } from './pipeline';

const DEFAULT_SNAPSHOT_INTERVAL = 100; // every 100 messages

export interface PartyOptions {
  readLogger?: (msg: any) => void;
  writeLogger?: (msg: any) => void;
  readOnly?: boolean;
  // TODO(burdon): Hierarchical options ({ snapshot: { enabled: true, interval: 100 } })
  snapshots?: boolean;
  snapshotInterval?: number;
}

/**
 * Encapsulates core components needed to run a party:
 *  - ECHO database with item-manager & item-demuxer.
 *  - Collection of feeds from the feed store.
 *  - HALO PartyState state-machine that handles key admission.
 *  - A Pipeline with the feed-store iterator that reads the messages in the proper order.
 *
 * The core class also handles the combined ECHO and HALO state snapshots.
 */
// TODO(marik-d): Try to pick a better name for it.
export class PartyCore {
  /**
   * Snapshot to be restored from when party.open() is called.
   */
  private _databaseSnapshot: DatabaseSnapshot | undefined;

  private _subscriptions: (() => void)[] = [];

  private _database?: Database;
  private _pipeline?: Pipeline;
  private _timeframeClock?: TimeframeClock;
  private _partyProcessor?: PartyProcessor;

  constructor (
    private readonly _partyKey: PartyKey,
    private readonly _feedStore: FeedStoreAdapter,
    private readonly _modelFactory: ModelFactory,
    private readonly _snapshotStore: SnapshotStore,
    private readonly _initialTimeframe?: Timeframe,
    private readonly _options: PartyOptions = {}
  ) {}

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

  // TODO(marik-d): Needed for Replicator plugin in PartProtocol, consider removing.
  get feedStore () {
    return this._feedStore;
  }

  getWriteFeed () {
    const feed = this._feedStore.queryWritableFeed(this._partyKey);
    assert(feed, `No writable feed found for party ${this._partyKey}`);
    return feed;
  }

  /**
   * Opens the pipeline and connects the streams.
   */
  @synchronized
  @timed(1_000)
  async open (keyHints: KeyHint[] = []) {
    if (this.isOpen) {
      return this;
    }

    const feed = this._feedStore.queryWritableFeed(this._partyKey);
    assert(feed, `Missing feed for: ${String(this._partyKey)}`);

    this._timeframeClock = new TimeframeClock(this._initialTimeframe);

    if (!this._partyProcessor) {
      this._partyProcessor = new PartyProcessor(this._partyKey);
      if (keyHints.length > 0) {
        await this._partyProcessor.takeHints(keyHints);
      }
    }

    const iterator = await this._feedStore.createIterator(
      this._partyKey,
      createMessageSelector(this._partyProcessor, this._timeframeClock),
      this._initialTimeframe
    );

    const feedWriteStream = createFeedWriter(feed);

    this._pipeline = new Pipeline(
      this._partyProcessor, iterator, this._timeframeClock, feedWriteStream, this._options);

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

    // TODO(burdon): Propagate errors.
    this._subscriptions.push(this._pipeline.errors.on(err => console.error(err)));

    if (this._options.snapshots) {
      createAutomaticSnapshots(
        this,
        this._timeframeClock,
        this._snapshotStore,
        this._options.snapshotInterval ?? DEFAULT_SNAPSHOT_INTERVAL
      );
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

    this._subscriptions.forEach(cb => cb());

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
