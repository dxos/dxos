//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { scheduleTask, scheduleTaskInterval, synchronized, trackLeaks } from '@dxos/async';
import { Context } from '@dxos/context';
import { FeedInfo } from '@dxos/credentials';
import { failUndefined } from '@dxos/debug';
import { ItemManager } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { DataMessage, FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { SpaceCache } from '@dxos/protocols/src/proto/gen/dxos/echo/metadata';
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
 * Minimum time in MS between recording latest timeframe in metadata.
 */
const TIMEFRAME_SAVE_DEBOUNCE_INTERVAL = 500;

/**
 * Flag to disable automatic local snapshots.
 */
const DISABLE_SNAPSHOT_CACHE = true;

const CACHING_INTERVAL = 5_000;

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

  private _lastTimeframeSaveTime = 0;
  private _lastSnapshotSaveTime = 0;

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
      this._pipeline.writer ?? failUndefined(),
    );

    this.databaseBackend = new DatabaseHost(feedWriter, this._snapshot?.database);
    this._itemManager = new ItemManager(this._params.modelFactory);

    // Connect pipeline to the database.
    await this.databaseBackend.open(this._itemManager, this._params.modelFactory);

    // Start message processing loop.
    scheduleTask(this._ctx, async () => {
      await this._consumePipeline();
    });

    // Save cache in interval.
    scheduleTaskInterval(this._ctx, () => this._saveCache(), CACHING_INTERVAL);

    this._isOpen = true;
  }

  @synchronized
  async close() {
    if (!this._isOpen) {
      return;
    }
    log('close');
    this._isOpen = false;

    await this._ctx.dispose();
    await this._pipeline?.stop();

    // NOTE: Make sure the processing is stopped BEFORE we save the snapshot.
    try {
      await this._saveCache();
      if (this._pipeline) {
        await this._saveTargetTimeframe(this._pipeline.state.timeframe);
        if (!DISABLE_SNAPSHOT_CACHE) {
          await this._saveSnapshot(this._pipeline.state.timeframe);
        }
      }
    } catch (err) {
      log.catch(err);
    }

    await this.databaseBackend?.close();
    await this._itemManager?.destroy();
    await this._params.snapshotManager.close();
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
              memberKey: feedInfo.assertion.identityKey,
            },
          });

          // Timeframe clock is not updated yet
          await this._noteTargetStateIfNeeded(this._pipeline.state.pendingTimeframe);
        }
      } catch (err: any) {
        log.catch(err);
      }
    }
  }

  private _createSnapshot(timeframe: Timeframe): SpaceSnapshot {
    assert(this.databaseBackend, 'Database backend is not initialized.');
    return {
      spaceKey: this._params.spaceKey.asUint8Array(),
      timeframe,
      database: this.databaseBackend!.createSnapshot(),
    };
  }

  private async _saveSnapshot(timeframe: Timeframe) {
    const snapshot = await this._createSnapshot(timeframe);
    const snapshotKey = await this._params.snapshotManager.store(snapshot);
    await this._params.metadataStore.setSpaceSnapshot(this._params.spaceKey, snapshotKey);
    return snapshot;
  }

  private async _saveTargetTimeframe(timeframe: Timeframe) {
    const newTimeframe = Timeframe.merge(this._targetTimeframe ?? new Timeframe(), timeframe);
    await this._params.metadataStore.setSpaceLatestTimeframe(this._params.spaceKey, newTimeframe);
    this._targetTimeframe = newTimeframe;
  }

  private async _saveCache() {
    const cache: SpaceCache = {};

    {
      // Add properties to cache.
      const properties = this._itemManager.items
        .map((item) => item.state)
        .filter((state) => state.type && state.type === 'dxos.sdk.client.Properties')[0];
      if (properties) {
        cache.properties = properties.data;
      }
    }

    {
      // Save cache.
      if (Object.keys(cache).length > 0) {
        await this._params.metadataStore.setCache(this._params.spaceKey, cache);
      }
    }
  }

  private async _noteTargetStateIfNeeded(timeframe: Timeframe) {
    if (Date.now() - this._lastTimeframeSaveTime > TIMEFRAME_SAVE_DEBOUNCE_INTERVAL) {
      this._lastTimeframeSaveTime = Date.now();

      await this._saveTargetTimeframe(timeframe);
    }

    if (
      !DISABLE_SNAPSHOT_CACHE &&
      Date.now() - this._lastSnapshotSaveTime > AUTOMATIC_SNAPSHOT_DEBOUNCE_INTERVAL &&
      timeframe.totalMessages() - this._lastAutomaticSnapshotTimeframe.totalMessages() > MESSAGES_PER_SNAPSHOT
    ) {
      this._lastSnapshotSaveTime = Date.now();

      const snapshot = await this._saveSnapshot(timeframe);
      this._lastAutomaticSnapshotTimeframe = snapshot.timeframe ?? failUndefined();
      log('save', { snapshot });
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
