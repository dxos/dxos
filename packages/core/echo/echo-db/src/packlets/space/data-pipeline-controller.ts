//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Event, scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { FeedInfo } from '@dxos/credentials';
import { failUndefined } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { TypedMessage } from '@dxos/protocols';
import { EchoEnvelope } from '@dxos/protocols/proto/dxos/echo/feed';
import { SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { Timeframe } from '@dxos/timeframe';

import { createMappedFeedWriter } from '../common';
import { Database, DatabaseBackendHost } from '../database';
import { Pipeline } from '../pipeline';

/**
 * Controls data pipeline in the space.
 * Consumes mutations from the feed and applies them to the database.
 */
export interface DataPipelineController {
  /**
   * Starting timeframe for the data pipeline.
   */
  getStartTimeframe(): Timeframe;

  // TODO(dmaretskyi): Methods to set the initial timeframe, restart the pipeline on a new epoch and so on.
  open(dataPipeline: Pipeline): Promise<void>;
  close(): Promise<void>;
}

export class NoopDataPipelineController implements DataPipelineController {
  getStartTimeframe(): Timeframe {
    return new Timeframe();
  }

  async open(dataPipeline: Pipeline): Promise<void> {}

  async close(): Promise<void> {}
}

export class DataPipelineControllerImpl implements DataPipelineController {
  private _ctx = new Context();
  private _pipeline?: Pipeline;

  public readonly onTimeframeReached = new Event<Timeframe>();

  constructor(
    private readonly _modelFactory: ModelFactory,
    private readonly _memberKey: PublicKey,
    private readonly _feedInfoProvider: (feedKey: PublicKey) => FeedInfo | undefined,
    private readonly _spaceKey: PublicKey,
    private readonly _snapshot: SpaceSnapshot | undefined
  ) {}

  public databaseBackend?: DatabaseBackendHost;
  public database?: Database;

  get pipelineState() {
    return this._pipeline?.state;
  }

  get snapshotTimeframe() {
    return this._snapshot?.timeframe;
  }

  getStartTimeframe(): Timeframe {
    return snapshotTimeframeToStartingTimeframe(this.snapshotTimeframe ?? new Timeframe());
  }

  async open(pipeline: Pipeline) {
    this._pipeline = pipeline;

    // Create database backend.
    const feedWriter = createMappedFeedWriter<EchoEnvelope, TypedMessage>(
      (msg) => ({
        '@type': 'dxos.echo.feed.EchoEnvelope',
        ...msg
      }),
      pipeline.writer ?? failUndefined()
    );

    this.databaseBackend = new DatabaseBackendHost(feedWriter, this._snapshot?.database, {
      snapshots: true // TODO(burdon): Config.
    });

    // Connect pipeline to the database.
    this.database = new Database(this._modelFactory, this.databaseBackend, this._memberKey);
    await this.database.initialize();

    // Start message processing loop.
    scheduleTask(this._ctx, async () => {
      await this._consumePipeline();
    });
  }

  async close() {
    await this._ctx.dispose();
    await this.databaseBackend?.close();
    await this.database?.destroy();
  }

  createSnapshot(): SpaceSnapshot {
    return {
      spaceKey: this._spaceKey.asUint8Array(),
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
        const payload = data.payload as TypedMessage;
        if (payload['@type'] === 'dxos.echo.feed.EchoEnvelope') {
          const feedInfo = this._feedInfoProvider(feedKey);
          if (!feedInfo) {
            log.error('Could not find feed.', { feedKey });
            continue;
          }

          await this.databaseBackend!.echoProcessor({
            data: payload,
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
