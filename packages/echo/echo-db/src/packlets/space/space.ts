//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { EchoEnvelope, FeedMessage, mapFeedWriter } from '@dxos/echo-protocol';
import { failUndefined } from '@dxos/debug';
import { FeedDescriptor } from '@dxos/feed-store';
import { AdmittedFeed } from '@dxos/halo-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { PublicKey, Timeframe } from '@dxos/protocols';

import { Database, FeedDatabaseBackend } from '../database';
import { consumePipeline, Pipeline } from '../pipeline';
import { ControlPipeline } from './control-pipeline';

export type SpaceParams = {
  spaceKey: PublicKey
  initialTimeframe: Timeframe
  genesisFeed: FeedDescriptor
  controlWriteFeed: FeedDescriptor
  dataWriteFeed: FeedDescriptor
  feedProvider: (feedKey: PublicKey) => Promise<FeedDescriptor>
}

/**
 * Spaces are globally addressable databases with access control.
 */
export class Space {
  private readonly _openFeed: (feedKey: PublicKey) => Promise<FeedDescriptor>;
  private readonly _controlPipeline: ControlPipeline;
  private readonly _dataWriteFeed: FeedDescriptor;

  private _dataPipeline?: Pipeline;

  constructor ({
    spaceKey,
    initialTimeframe,
    genesisFeed,
    controlWriteFeed,
    dataWriteFeed,
    feedProvider
  }: SpaceParams) {
    this._openFeed = feedProvider;
    this._dataWriteFeed = dataWriteFeed;

    // TODO(burdon): Pass in control pipeline or create factory?
    this._controlPipeline = new ControlPipeline({
      initialTimeframe,
      genesisFeed,
      spaceKey,
      feedProvider
    });

    this._controlPipeline.setWriteFeed(controlWriteFeed);
    this._controlPipeline.onFeedAdmitted.set(async info => {
      if (info.assertion.designation === AdmittedFeed.Designation.DATA) {
        // We will add all existing data feeds when the data pipeline is initialized.
        if (!this._dataPipeline) {
          return;
        }

        this._dataPipeline.addFeed(await feedProvider(info.key));
      }
    });
  }

  get isOpen () {
    return false;
  }

  async open () {
    await this._controlPipeline.start();
    await this._initializeDataPipeline();
  }

  async close () {}

  private async _initializeDataPipeline () {
    assert(!this._dataPipeline, 'Data pipeline already initialized.');

    this._dataPipeline = new Pipeline(new Timeframe());
    this._dataPipeline.setWriteFeed(this._dataWriteFeed);
    for (const feed of this._controlPipeline.partyState.feeds.values()) {
      this._dataPipeline.addFeed(await this._openFeed(feed.key));
    }

    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const databaseBackend = new FeedDatabaseBackend(
      mapFeedWriter<EchoEnvelope, Omit<FeedMessage, 'timeframe'>>
        (echo => ({ echo }), this._dataPipeline.writer ?? failUndefined()),
      {},
      {
        snapshots: true
      }
    );

    const database = new Database(modelFactory, databaseBackend, this._memberKey);

    // Open pipeline and connect it to the database.
    await database.initialize();

    // TODO(burdon): Don't import functions.
    consumePipeline(
      this._pipeline.consume(),
      this._partyProcessor,
      databaseBackend.echoProcessor,
      async error => {
        // TODO(dmaretskyi): Better error handling.
        console.error('Pipeline error:', error);
      }
    );
  }
}
