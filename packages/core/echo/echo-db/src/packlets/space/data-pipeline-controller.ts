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
import { SnapshotManager } from '../database/snapshot-manager';

export type DataPipelineControllerContext = {
  openPipeline: (start: Timeframe) => Promise<Pipeline>;
}

/**
 * Controls data pipeline in the space.
 * Consumes mutations from the feed and applies them to the database.
 */
export interface DataPipelineController {
  open(context: DataPipelineControllerContext): Promise<void>;
  close(): Promise<void>;
}

export class NoopDataPipelineController implements DataPipelineController {
  async open(context: DataPipelineControllerContext): Promise<void> {}

  async close(): Promise<void> {}
}

export type DataPipelineControllerImplParams = {
  modelFactory: ModelFactory,
  snapshotManager?: SnapshotManager,
  memberKey: PublicKey,
  spaceKey: PublicKey,
  feedInfoProvider: (feedKey: PublicKey) => FeedInfo | undefined,
  snapshot: SpaceSnapshot | undefined
}

export class DataPipelineControllerImpl implements DataPipelineController {
  private _ctx = new Context();
  private _spaceContext!: DataPipelineControllerContext;
  private _pipeline?: Pipeline;

  public readonly onTimeframeReached = new Event<Timeframe>();

  constructor(
    private readonly _params: DataPipelineControllerImplParams
  ) {}

  public databaseBackend?: DatabaseBackendHost;
  public database?: Database;

  get pipelineState() {
    return this._pipeline?.state;
  }

  get snapshotTimeframe() {
    return this._params.snapshot?.timeframe;
  }

  getStartTimeframe(): Timeframe {
    return snapshotTimeframeToStartingTimeframe(this.snapshotTimeframe ?? new Timeframe());
  }

  async open(spaceContext: DataPipelineControllerContext) {
    this._spaceContext = spaceContext;
    this._pipeline = await this._spaceContext.openPipeline(this.getStartTimeframe());

    // Create database backend.
    const feedWriter = createMappedFeedWriter<EchoEnvelope, TypedMessage>(
      (msg) => ({
        '@type': 'dxos.echo.feed.EchoEnvelope',
        ...msg
      }),
      this._pipeline.writer ?? failUndefined()
    );

    this.databaseBackend = new DatabaseBackendHost(feedWriter, this._params.snapshot?.database, {
      snapshots: true // TODO(burdon): Config.
    });

    // Connect pipeline to the database.
    this.database = new Database(this._params.modelFactory, this.databaseBackend, this._params.memberKey);
    await this.database.initialize();

    // Start message processing loop.
    scheduleTask(this._ctx, async () => {
      await this._consumePipeline();
    });
  }

  async close() {
    await this._ctx.dispose();
    await this._pipeline?.stop();
    await this.databaseBackend?.close();
    await this.database?.destroy();
  }

  createSnapshot(): SpaceSnapshot {
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
        const payload = data.payload as TypedMessage;
        if (payload['@type'] === 'dxos.echo.feed.EchoEnvelope') {
          const feedInfo = this._params.feedInfoProvider(feedKey);
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
