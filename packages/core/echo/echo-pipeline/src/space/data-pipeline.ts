//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Event, scheduleTask, synchronized, trackLeaks } from '@dxos/async';
import { Context } from '@dxos/context';
import { FeedInfo } from '@dxos/credentials';
import { failUndefined } from '@dxos/debug';
import { ItemManager } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { DataMessage, FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { Timeframe } from '@dxos/timeframe';

import { createMappedFeedWriter } from '../common';
import { DatabaseHost, SnapshotManager } from '../dbhost';
import { MetadataStore } from '../metadata';
import { Pipeline } from '../pipeline';

export interface PipelineFactory {
  openPipeline: (start: Timeframe) => Promise<Pipeline>;
}

export type DataPipelineParams = {
  modelFactory: ModelFactory;
  snapshotManager: SnapshotManager;
  metadataStore: MetadataStore;
  memberKey: PublicKey;
  spaceKey: PublicKey;
  feedInfoProvider: (feedKey: PublicKey) => FeedInfo | undefined;
  snapshotId: string | undefined;
};

/**
 * Number of mutations since the last snapshot before we automatically create another snapshot.
 */
const MESSAGES_PER_SNAPSHOT = 10;

/**
 * Minimum time between automatic snapshots.
 */
const AUTOMATIC_SNAPSHOT_DEBOUNCE_INTERVAL = 5000;

/**
 * Minimum time between recording latest timeframe in metadata.
 */
const TIMEFRAME_SAVE_DEBOUNCE_INTERVAL = 500;

/**
 * Flag to disable automatic local snapshots.
 */
const DISABLE_SNAPSHOT_CACHE = true;

/**
 * Controls data pipeline in the space.
 * Consumes the pipeline and updates the database.
 * Reacts to new epochs to restart the pipeline.
 */
@trackLeaks('open', 'close')
export class DataPipeline {
  private _ctx = new Context();
  private _spaceContext!: PipelineFactory;
  private _pipeline?: Pipeline;
  private _snapshot?: SpaceSnapshot;
  private _targetTimeframe?: Timeframe;

  private _lastAutomaticSnapshotTimeframe = new Timeframe();
  private _isOpen = false;

  public readonly onTimeframeReached = new Event<Timeframe>();

  constructor(private readonly _params: DataPipelineParams) {}

  public _itemManager!: ItemManager;
  public databaseBackend?: DatabaseHost;

  get isOpen() {
    return this._isOpen;
  }

  get pipelineState() {
    return this._pipeline?.state;
  }

  get snapshotTimeframe() {
    return this._snapshot?.timeframe;
  }

  getStartTimeframe(): Timeframe {
    return snapshotTimeframeToStartingTimeframe(this.snapshotTimeframe ?? new Timeframe());
  }

  setTargetTimeframe(timeframe: Timeframe) {
    this._targetTimeframe = timeframe;
    this._pipeline?.state.setTargetTimeframe(timeframe);
  }

  @synchronized
  async open(spaceContext: PipelineFactory) {
    if (this._isOpen) {
      return;
    }

    this._spaceContext = spaceContext;
    if (this._params.snapshotId && !DISABLE_SNAPSHOT_CACHE) {
      this._snapshot = await this._params.snapshotManager.load(this._params.snapshotId);
      this._lastAutomaticSnapshotTimeframe = this._snapshot?.timeframe ?? new Timeframe();
    }

    this._pipeline = await this._spaceContext.openPipeline(this.getStartTimeframe());
    if (this._targetTimeframe) {
      this._pipeline.state.setTargetTimeframe(this._targetTimeframe);
    }

    // Create database backend.
    const feedWriter = createMappedFeedWriter<DataMessage, FeedMessage.Payload>(
      (data: DataMessage) => ({ data }),
      this._pipeline.writer ?? failUndefined()
    );

    this.databaseBackend = new DatabaseHost(feedWriter, this._snapshot?.database);
    this._itemManager = new ItemManager(this._params.modelFactory);

    // Connect pipeline to the database.
    await this.databaseBackend.open(this._itemManager, this._params.modelFactory);

    // Start message processing loop.
    scheduleTask(this._ctx, async () => {
      await this._consumePipeline();
    });

    this._createPeriodicSnapshots();

    this._isOpen = true;
  }

  private _createPeriodicSnapshots() {
    // Record last timeframe.
    this.onTimeframeReached.debounce(TIMEFRAME_SAVE_DEBOUNCE_INTERVAL).on(this._ctx, async () => {
      await this._saveLatestTimeframe();
    });

    if (!DISABLE_SNAPSHOT_CACHE) {
      this.onTimeframeReached.debounce(AUTOMATIC_SNAPSHOT_DEBOUNCE_INTERVAL).on(this._ctx, async () => {
        const latestTimeframe = this._pipeline?.state.timeframe;
        if (!latestTimeframe) {
          return;
        }

        // Save snapshot.
        if (
          latestTimeframe.totalMessages() - this._lastAutomaticSnapshotTimeframe.totalMessages() >
          MESSAGES_PER_SNAPSHOT
        ) {
          const snapshot = await this._saveSnapshot();
          this._lastAutomaticSnapshotTimeframe = snapshot.timeframe ?? failUndefined();
          log('save', { snapshot });
        }
      });
    }
  }

  private async _saveSnapshot() {
    const snapshot = await this.createSnapshot();
    const snapshotKey = await this._params.snapshotManager.store(snapshot);
    await this._params.metadataStore.setSpaceSnapshot(this._params.spaceKey, snapshotKey);
    return snapshot;
  }

  private async _saveLatestTimeframe() {
    const latestTimeframe = this._pipeline?.state.timeframe;
    log('save latest timeframe', { latestTimeframe, spaceKey: this._params.spaceKey });
    if (latestTimeframe) {
      const newTimeframe = Timeframe.merge(this._targetTimeframe ?? new Timeframe(), latestTimeframe);
      await this._params.metadataStore.setSpaceLatestTimeframe(this._params.spaceKey, newTimeframe);
    }
  }

  @synchronized
  async close() {
    if (!this._isOpen) {
      return;
    }
    log('close');
    this._isOpen = false;

    try {
      await this._saveLatestTimeframe();
      await this._saveSnapshot();
    } catch (err) {
      log.catch(err);
    }
    await this._ctx.dispose();
    await this._pipeline?.stop();
    await this.databaseBackend?.close();
    await this._itemManager?.destroy();
    await this._params.snapshotManager.close();
  }

  createSnapshot(): SpaceSnapshot {
    assert(this.databaseBackend, 'Database backend is not initialized.');
    return {
      spaceKey: this._params.spaceKey.asUint8Array(),
      timeframe: this._pipeline?.state.timeframe ?? new Timeframe(),
      database: this.databaseBackend!.createSnapshot()
    };
  }

  private async _consumePipeline() {
    assert(this._pipeline, 'Pipeline is not initialized.');
    for await (const msg of this._pipeline.consume()) {
      const { feedKey, seq, data } = msg;
      log('processing message', { msg });

      try {
        if (data.payload.data) {
          const feedInfo = this._params.feedInfoProvider(feedKey);
          if (!feedInfo) {
            log.error('Could not find feed.', { feedKey });
            continue;
          }

          await this.databaseBackend!.echoProcessor({
            batch: data.payload.data.batch,
            meta: {
              feedKey,
              seq,
              timeframe: data.timeframe,
              memberKey: feedInfo.assertion.identityKey
            }
          });
          this.onTimeframeReached.emit(data.timeframe);
        }
      } catch (err: any) {
        log.catch(err);
      }
    }
  }

  async waitUntilTimeframe(timeframe: Timeframe) {
    assert(this._pipeline, 'Pipeline is not initialized.');
    await this._pipeline.state.waitUntilTimeframe(timeframe);
  }
}

/**
 * Increase all indexes by one so that we start processing the next mutation after the one in the snapshot.
 */
const snapshotTimeframeToStartingTimeframe = (snapshotTimeframe: Timeframe) => {
  return snapshotTimeframe.map(([key, seq]) => [key, seq + 1]);
};
