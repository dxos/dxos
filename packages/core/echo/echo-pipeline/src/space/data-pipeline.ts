//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Event, scheduleTask, synchronized, trackLeaks } from '@dxos/async';
import { Context } from '@dxos/context';
import { CredentialProcessor, FeedInfo, SpecificCredential, checkCredentialType } from '@dxos/credentials';
import { getStateMachineFromItem, ItemManager } from '@dxos/echo-db';
import { CancelledError } from '@dxos/errors';
import { FeedWriter } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { DataMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { SpaceCache } from '@dxos/protocols/proto/dxos/echo/metadata';
import { ObjectSnapshot } from '@dxos/protocols/proto/dxos/echo/model/document';
import { SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { Credential, Epoch } from '@dxos/protocols/proto/dxos/halo/credentials';
import { Timeframe } from '@dxos/timeframe';

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

  /**
   * Called once.
   */
  onPipelineCreated: (pipeline: Pipeline) => Promise<void>;
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
 * Controls data pipeline in the space.
 * Consumes the pipeline and updates the database.
 * Reacts to new epochs to restart the pipeline.
 */
@trackLeaks('open', 'close')
export class DataPipeline {
  private _ctx = new Context();
  private _pipeline?: Pipeline;
  private _targetTimeframe?: Timeframe;

  private _lastAutomaticSnapshotTimeframe = new Timeframe();
  private _isOpen = false;

  private _lastTimeframeSaveTime = 0;
  private _lastSnapshotSaveTime = 0;

  constructor(private readonly _params: DataPipelineParams) {}

  public itemManager!: ItemManager;
  public databaseHost?: DatabaseHost;

  public currentEpoch?: SpecificCredential<Epoch>;
  private _lastProcessedEpoch = -1;
  public onNewEpoch = new Event<Credential>();
  private _epochCtx?: Context;

  get isOpen() {
    return this._isOpen;
  }

  get pipeline() {
    return this._pipeline;
  }

  get pipelineState() {
    return this._pipeline?.state;
  }

  setTargetTimeframe(timeframe: Timeframe) {
    this._targetTimeframe = timeframe;
    this._pipeline?.state.setTargetTimeframe(timeframe);
  }

  createCredentialProcessor(): CredentialProcessor {
    return {
      process: async (credential) => {
        if (!checkCredentialType(credential, 'dxos.halo.credentials.Epoch')) {
          return;
        }

        this.currentEpoch = credential;
        if (this._isOpen) {
          // process epoch
          await this._processEpochInSeparateTask(credential);
        }
      },
    };
  }

  @synchronized
  async open() {
    if (this._isOpen) {
      return;
    }

    this._pipeline = new Pipeline();
    await this._params.onPipelineCreated(this._pipeline);
    await this._pipeline.start();
    await this._pipeline.pause(); // Start paused until we have the first epoch.

    if (this._targetTimeframe) {
      this._pipeline.state.setTargetTimeframe(this._targetTimeframe);
    }

    // Create database backend.
    const feedWriter: FeedWriter<DataMessage> = {
      write: (data, options) => {
        assert(this._pipeline, 'Pipeline is not initialized.');
        assert(this.currentEpoch, 'Epoch is not initialized.');
        return this._pipeline.writer.write({ data }, options);
      },
    };

    this.databaseHost = new DatabaseHost(feedWriter);
    this.itemManager = new ItemManager(this._params.modelFactory);

    // Connect pipeline to the database.
    await this.databaseHost.open(this.itemManager, this._params.modelFactory);

    // Start message processing loop.
    scheduleTask(this._ctx, async () => {
      await this._consumePipeline();
    });

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
      }
    } catch (err) {
      log.catch(err);
    }

    await this.databaseHost?.close();
    await this.itemManager?.destroy();
    await this._params.snapshotManager.close();
  }

  private async _consumePipeline() {
    if (this.currentEpoch) {
      const waitForOneEpoch = this.onNewEpoch.waitFor(() => true);
      await this._processEpochInSeparateTask(this.currentEpoch);
      await waitForOneEpoch;
    }

    assert(this._pipeline, 'Pipeline is not initialized.');
    for await (const msg of this._pipeline.consume()) {
      const { feedKey, seq, data } = msg;
      log('processing message', { feedKey, seq });

      try {
        if (data.payload.data) {
          const feedInfo = this._params.feedInfoProvider(feedKey);
          if (!feedInfo) {
            log.error('Could not find feed.', { feedKey });
            continue;
          }

          await this.databaseHost!.echoProcessor({
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

  private _createSnapshot(): SpaceSnapshot {
    assert(this.databaseHost, 'Database backend is not initialized.');
    return {
      spaceKey: this._params.spaceKey.asUint8Array(),
      timeframe: this._pipeline!.state.timeframe,
      database: this.databaseHost!.createSnapshot(),
    };
  }

  private async _saveTargetTimeframe(timeframe: Timeframe) {
    const newTimeframe = Timeframe.merge(this._targetTimeframe ?? new Timeframe(), timeframe);
    await this._params.metadataStore.setSpaceDataLatestTimeframe(this._params.spaceKey, newTimeframe);
    this._targetTimeframe = newTimeframe;
  }

  private async _saveCache() {
    const cache: SpaceCache = {};

    try {
      // Add properties to cache.
      const propertiesItem = this.itemManager.items.find(
        (item) =>
          item.modelMeta?.type === 'dxos:model/document' &&
          (getStateMachineFromItem(item)?.snapshot() as ObjectSnapshot).type === 'dxos.sdk.client.Properties',
      );
      if (propertiesItem) {
        cache.properties = getStateMachineFromItem(propertiesItem)?.snapshot() as ObjectSnapshot;
      }
    } catch (err) {
      log.warn('Failed to cache properties', err);
    }

    // Save cache.
    await this._params.metadataStore.setCache(this._params.spaceKey, cache);
  }

  private async _noteTargetStateIfNeeded(timeframe: Timeframe) {
    // TODO(dmaretskyi): Replace this with a proper debounce/throttle.

    if (Date.now() - this._lastTimeframeSaveTime > TIMEFRAME_SAVE_DEBOUNCE_INTERVAL) {
      this._lastTimeframeSaveTime = Date.now();

      await this._saveTargetTimeframe(timeframe);
    }

    if (
      Date.now() - this._lastSnapshotSaveTime > AUTOMATIC_SNAPSHOT_DEBOUNCE_INTERVAL &&
      timeframe.totalMessages() - this._lastAutomaticSnapshotTimeframe.totalMessages() > MESSAGES_PER_SNAPSHOT
    ) {
      await this._saveCache();
    }
  }

  private async _processEpochInSeparateTask(epoch: SpecificCredential<Epoch>) {
    if (epoch.subject.assertion.number <= this._lastProcessedEpoch) {
      return;
    }
    await this._epochCtx?.dispose();
    const ctx = new Context({
      onError: (err) => {
        if (err instanceof CancelledError) {
          log('Epoch processing cancelled.');
        } else {
          log.catch(err);
        }
      },
    });
    this._epochCtx = ctx;
    scheduleTask(ctx, async () => {
      if (!this._isOpen) {
        // Space closed before we got to process the epoch.
        return;
      }
      log('process epoch', { epoch });
      await this._processEpoch(ctx, epoch.subject.assertion);
      this.onNewEpoch.emit(epoch);
    });
  }

  @synchronized
  private async _processEpoch(ctx: Context, epoch: Epoch) {
    assert(this._isOpen, 'Space is closed.');
    assert(this._pipeline);
    this._lastProcessedEpoch = epoch.number;

    log('Processing epoch', { epoch });
    if (epoch.snapshotCid) {
      const snapshot = await this._params.snapshotManager.load(ctx, epoch.snapshotCid);

      // TODO(dmaretskyi): Clearing old items + events.
      this.databaseHost!._itemDemuxer.restoreFromSnapshot(snapshot.database);
    }

    log('restarting pipeline for epoch');

    await this._pipeline.pause();
    await this._pipeline.setCursor(epoch.timeframe);
    await this._pipeline.unpause();
  }

  async waitUntilTimeframe(timeframe: Timeframe) {
    assert(this._pipeline, 'Pipeline is not initialized.');
    await this._pipeline.state.waitUntilTimeframe(timeframe);
  }

  @synchronized
  async createEpoch(): Promise<Epoch> {
    assert(this._pipeline);
    assert(this.currentEpoch);

    await this._pipeline.pause();

    const snapshot = await this._createSnapshot();
    const snapshotCid = await this._params.snapshotManager.store(snapshot);

    const epoch: Epoch = {
      previousId: this.currentEpoch.id,
      timeframe: this._pipeline.state.timeframe,
      number: (this.currentEpoch.subject.assertion as Epoch).number + 1,
      snapshotCid,
    };

    await this._pipeline.unpause();

    return epoch;
  }

  async ensureEpochInitialized() {
    await this.onNewEpoch.waitForCondition(() => !!this.currentEpoch);
  }
}
