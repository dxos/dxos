//
// Copyright 2022 DXOS.org
//

import { scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { FeedInfo } from '@dxos/credentials';
import { failUndefined } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { TypedMessage } from '@dxos/protocols';
import { EchoEnvelope } from '@dxos/protocols/proto/dxos/echo/feed';

import { createMappedFeedWriter } from '../common';
import { Database, DatabaseBackendHost } from '../database';
import { Pipeline } from '../pipeline';

/**
 * Controls data pipeline in the space.
 * Consumes mutations from the feed and applies them to the database.
 */
export interface DataPipelineController {
  // TODO(dmaretskyi): Methods to set the initial timeframe, restart the pipeline on a new epoch and so on.
  open(dataPipeline: Pipeline): Promise<void>;
  close(): Promise<void>;
}

export class NoopDataPipelineController implements DataPipelineController {
  async open(dataPipeline: Pipeline): Promise<void> {}

  async close(): Promise<void> {}
}

export class DataPipelineControllerImpl implements DataPipelineController {
  private _ctx = new Context();

  constructor(
    private readonly _modelFactory: ModelFactory,
    private readonly _memberKey: PublicKey,
    private readonly _feedInfoProvider: (feedKey: PublicKey) => FeedInfo | undefined
  ) {}

  public databaseBackend?: DatabaseBackendHost;
  public database?: Database;

  async open(pipeline: Pipeline) {
    // Create database backend.
    {
      const feedWriter = createMappedFeedWriter<EchoEnvelope, TypedMessage>(
        (msg) => ({
          '@type': 'dxos.echo.feed.EchoEnvelope',
          ...msg
        }),
        pipeline.writer ?? failUndefined()
      );

      this.databaseBackend = new DatabaseBackendHost(
        feedWriter,
        {}, // TODO(dmaretskyi): Populate snapshot.
        {
          snapshots: true // TODO(burdon): Config.
        }
      );
    }

    // Connect pipeline to the database.
    {
      this.database = new Database(this._modelFactory, this.databaseBackend, this._memberKey);
      await this.database.initialize();
    }

    // Start message processing loop.
    scheduleTask(this._ctx, async () => {
      for await (const msg of pipeline.consume()) {
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
          }
        } catch (err: any) {
          log.catch(err);
        }
      }
    });
  }

  async close() {
    await this._ctx.dispose();
    await this.databaseBackend?.close();
    await this.database?.destroy();
  }
}
