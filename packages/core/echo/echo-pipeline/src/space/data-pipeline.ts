//
// Copyright 2022 DXOS.org
//

import { Event, scheduleTask, sleep, synchronized, trackLeaks } from '@dxos/async';
import { Context } from '@dxos/context';
import {
  type CredentialProcessor,
  type FeedInfo,
  type SpecificCredential,
  checkCredentialType,
} from '@dxos/credentials';
import { getStateMachineFromItem, ItemManager, TYPE_PROPERTIES } from '@dxos/echo-db';
import { type FeedWriter } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log, omit } from '@dxos/log';
import { type ModelFactory } from '@dxos/model-factory';
import { CancelledError, type DataPipelineProcessed } from '@dxos/protocols';
import { type DataMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { type SpaceCache } from '@dxos/protocols/proto/dxos/echo/metadata';
import { type ObjectSnapshot } from '@dxos/protocols/proto/dxos/echo/model/document';
import { type SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { type Credential, type Epoch } from '@dxos/protocols/proto/dxos/halo/credentials';
import { Timeframe } from '@dxos/timeframe';
import { TimeSeriesCounter, TimeUsageCounter, trace } from '@dxos/tracing';
import { tracer } from '@dxos/util';

import { DatabaseHost, type SnapshotManager } from '../db-host';
import { type MetadataStore } from '../metadata';
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
const AUTOMATIC_SNAPSHOT_DEBOUNCE_INTERVAL = 5_000;

/**
 * Minimum time in MS between recording latest timeframe in metadata.
 */
const TIMEFRAME_SAVE_DEBOUNCE_INTERVAL = 5_000;

/**
 * Controls data pipeline in the space.
 * Consumes the pipeline and updates the database.
 * Reacts to new epochs to restart the pipeline.
 */
@trackLeaks('open', 'close')
@trace.resource()
export class DataPipeline implements CredentialProcessor {
  private _ctx = new Context();
  private _pipeline?: Pipeline = undefined;
  private _targetTimeframe?: Timeframe = undefined;

  private _lastAutomaticSnapshotTimeframe = new Timeframe();
  private _isOpen = false;

  private _lastTimeframeSaveTime = 0;
  private _lastSnapshotSaveTime = 0;
  private _lastProcessedEpoch = -1;
  private _epochCtx?: Context;

  @trace.metricsCounter()
  private _usage = new TimeUsageCounter();

  @trace.metricsCounter()
  private _mutations = new TimeSeriesCounter();

  public databaseHost?: DatabaseHost;

  public itemManager!: ItemManager;

  /**
   * Current epoch. Might be still processing.
   */
  public currentEpoch?: SpecificCredential<Epoch> = undefined;

  /**
   * Epoch currently applied.
   */
  public appliedEpoch?: SpecificCredential<Epoch> = undefined;

  public readonly onNewEpoch = new Event<Credential>();

  constructor(private readonly _params: DataPipelineParams) {}

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

  async processCredential(credential: Credential) {
    if (!checkCredentialType(credential, 'dxos.halo.credentials.Epoch')) {
      return;
    }

    this.currentEpoch = credential;
    if (this._isOpen) {
      // process epoch
      await this._processEpochInSeparateTask(credential);
    }
  }

  @synchronized
  async open() {
    if (this._isOpen) {
      return;
    }

    this._pipeline = new Pipeline();
    await this._params.onPipelineCreated(this._pipeline);

    await this._pipeline.pause(); // Start paused until we have the first epoch.
    await this._pipeline.start();

    if (this._targetTimeframe) {
      this._pipeline.state.setTargetTimeframe(this._targetTimeframe);
    }

    // Create database backend.
    const feedWriter: FeedWriter<DataMessage> = {
      write: (data, options) => {
        invariant(this._pipeline, 'Pipeline is not initialized.');
        invariant(this.currentEpoch, 'Epoch is not initialized.');
        return this._pipeline.writer.write({ data }, options);
      },
    };

    this.databaseHost = new DatabaseHost(feedWriter, () => this._flush());
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

    this._ctx = new Context();
    this._pipeline = undefined;
    this._targetTimeframe = undefined;
    this._lastAutomaticSnapshotTimeframe = new Timeframe();
    this.currentEpoch = undefined;
    this.appliedEpoch = undefined;
    this._lastProcessedEpoch = -1;
    this._epochCtx = undefined;
  }

  private async _consumePipeline() {
    if (this.currentEpoch) {
      const waitForOneEpoch = this.onNewEpoch.waitForCount(1);
      await this._processEpochInSeparateTask(this.currentEpoch);
      await waitForOneEpoch;
    }

    let messageCounter = 0;

    invariant(this._pipeline, 'Pipeline is not initialized.');
    for await (const msg of this._pipeline.consume()) {
      const span = this._usage.beginRecording();
      this._mutations.inc();

      const { feedKey, seq, data } = msg;
      log('processing message', { feedKey, seq });

      try {
        if (data.payload.data) {
          const feedInfo = this._params.feedInfoProvider(feedKey);
          if (!feedInfo) {
            log.warn('Could not find feed', { feedKey });
            continue;
          }

          const timer = tracer.mark('dxos.echo.pipeline.data'); // TODO(burdon): Add ID to params to filter.
          this.databaseHost!.echoProcessor({
            batch: data.payload.data.batch,
            meta: {
              feedKey,
              seq,
              timeframe: data.timeframe,
              memberKey: feedInfo.assertion.identityKey,
            },
          });

          timer.end();
          // TODO(burdon): Reconcile different tracer approaches.
          log.trace('dxos.echo.data-pipeline.processed', {
            feedKey: feedKey.toHex(), // TODO(burdon): Need to flatten?
            seq,
            spaceKey: this._params.spaceKey.toHex(),
          } satisfies DataPipelineProcessed);

          // Timeframe clock is not updated yet.
          await this._noteTargetStateIfNeeded(this._pipeline.state.pendingTimeframe);
        }
      } catch (err: any) {
        log.catch(err);
      }

      span.end();

      if (++messageCounter > 1_000) {
        messageCounter = 0;
        // Allow other tasks to process.
        await sleep(1);
      }
    }
  }

  private _createSnapshot(): SpaceSnapshot {
    invariant(this.databaseHost, 'Database backend is not initialized.');
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
          item.modelMeta?.type === 'dxos.org/model/document' &&
          // TODO(burdon): Document?
          (getStateMachineFromItem(item)?.snapshot() as ObjectSnapshot).type === TYPE_PROPERTIES,
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
    if (!this._pipeline?.state.reachedTarget) {
      return;
    }

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
      await this._processEpoch(ctx, epoch.subject.assertion);

      this.appliedEpoch = epoch;
      this.onNewEpoch.emit(epoch);
    });
  }

  @synchronized
  private async _processEpoch(ctx: Context, epoch: Epoch) {
    invariant(this._isOpen, 'Space is closed.');
    invariant(this._pipeline);
    this._lastProcessedEpoch = epoch.number;

    log('processing', { epoch: omit(epoch, 'proof') });
    if (epoch.snapshotCid) {
      const snapshot = await this._params.snapshotManager.load(ctx, epoch.snapshotCid);
      this.databaseHost!._itemDemuxer.restoreFromSnapshot(snapshot.database);
    }

    log('restarting pipeline from epoch');
    await this._pipeline.pause();
    await this._pipeline.setCursor(epoch.timeframe);
    await this._pipeline.unpause();
  }

  async waitUntilTimeframe(timeframe: Timeframe) {
    invariant(this._pipeline, 'Pipeline is not initialized.');
    await this._pipeline.state.waitUntilTimeframe(timeframe);
  }

  @synchronized
  async createEpoch(): Promise<Epoch> {
    invariant(this._pipeline);
    invariant(this.currentEpoch);

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

  private async _flush() {
    try {
      await this._saveCache();
      if (this._pipeline) {
        await this._saveTargetTimeframe(this._pipeline.state.timeframe);
      }
    } catch (err) {
      log.catch(err);
    }

    await this._params.metadataStore.flush();
  }
}
