//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Event, synchronized } from '@dxos/async';
import { failUndefined } from '@dxos/debug';
import { FeedWrapper } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log, logInfo } from '@dxos/log';
import { TypedMessage } from '@dxos/protocols';
import type { EchoEnvelope, FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { AdmittedFeed, Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { Timeframe } from '@dxos/timeframe';
import { AsyncCallback, Callback } from '@dxos/util';

import { createMappedFeedWriter } from '../common';
import { Database, DatabaseBackend, DatabaseBackendHost } from '../database';
import { Pipeline, PipelineAccessor } from '../pipeline';
import { ControlPipeline } from './control-pipeline';
import { SpaceProtocol } from './space-protocol';
import { DataPipelineController } from './data-pipeline-controller';

// TODO(burdon): Factor out types.
export type DatabaseFactoryParams = {
  databaseBackend: DatabaseBackend;
};

type FeedProvider = (feedKey: PublicKey) => Promise<FeedWrapper<FeedMessage>>;

export type SpaceParams = {
  spaceKey: PublicKey;
  protocol: SpaceProtocol;
  genesisFeed: FeedWrapper<FeedMessage>;
  controlFeed: FeedWrapper<FeedMessage>;
  dataFeed: FeedWrapper<FeedMessage>;
  feedProvider: FeedProvider;
  initialTimeframe?: Timeframe; // TODO(dmaretskyi): Remove.
  dataPipelineControllerProvider: () => DataPipelineController;
};

/**
 * Common interface with client.
 */
// TODO(dmaretskyi): Move to client.
export interface ISpace {
  key: PublicKey;
  isOpen: boolean;
  database: Database;
  open(): Promise<void>;
  close(): Promise<void>;
}

/**
 * Spaces are globally addressable databases with access control.
 */
export class Space {
  public readonly onCredentialProcessed = new Callback<AsyncCallback<Credential>>();
  public readonly stateUpdate = new Event();

  private readonly _key: PublicKey;
  private readonly _dataFeed: FeedWrapper<FeedMessage>;
  private readonly _controlFeed: FeedWrapper<FeedMessage>;
  private readonly _feedProvider: FeedProvider;
  private readonly _dataPipelineControllerProvider: () => DataPipelineController;

  // TODO(dmaretskyi): This is only recorded here for invitations.
  private readonly _genesisFeedKey: PublicKey;
  private readonly _controlPipeline: ControlPipeline;
  private readonly _protocol: SpaceProtocol;

  private _isOpen = false;
  private _dataPipeline?: Pipeline;
  private _dataPipelineController?: DataPipelineController;

  constructor({
    spaceKey,
    protocol,
    genesisFeed,
    controlFeed,
    dataFeed,
    feedProvider,
    initialTimeframe,
    dataPipelineControllerProvider,
  }: SpaceParams) {
    assert(spaceKey && dataFeed && feedProvider);
    this._key = spaceKey;
    this._controlFeed = controlFeed;
    this._dataFeed = dataFeed;
    this._feedProvider = feedProvider;
    this._genesisFeedKey = genesisFeed.key;
    this._dataPipelineControllerProvider = dataPipelineControllerProvider;

    this._controlPipeline = new ControlPipeline({
      spaceKey,
      genesisFeed,
      feedProvider,
      initialTimeframe
    });

    this._controlPipeline.setWriteFeed(controlFeed);
    this._controlPipeline.onFeedAdmitted.set(async (info) => {
      if (info.assertion.designation === AdmittedFeed.Designation.DATA) {
        // We will add all existing data feeds when the data pipeline is initialized.
        if (!this._dataPipeline) {
          return;
        }

        await this._dataPipeline.addFeed(await feedProvider(info.key));
      }

      if (!info.key.equals(genesisFeed.key)) {
        this._protocol.addFeed(await feedProvider(info.key));
      }
    });

    this._controlPipeline.onCredentialProcessed.set(async (credential) => {
      await this.onCredentialProcessed.callIfSet(credential);
      log('onCredentialProcessed', { credential });
      this.stateUpdate.emit();
    });

    // Start replicating the genesis feed.
    this._protocol = protocol;
    this._protocol.addFeed(genesisFeed);
  }

  @logInfo
  get key() {
    return this._key;
  }

  get isOpen() {
    return this._isOpen;
  }

  get genesisFeedKey(): PublicKey {
    return this._genesisFeedKey;
  }

  get controlFeedKey() {
    return this._controlFeed.key;
  }

  get dataFeedKey() {
    return this._dataFeed.key;
  }

  get spaceState() {
    return this._controlPipeline.spaceState;
  }

  /**
   * @test-only
   */
  get controlPipeline(): PipelineAccessor {
    return this._controlPipeline.pipeline;
  }

  @synchronized
  async open() {
    log('opening...');
    if (this._isOpen) {
      return;
    }

    // Order is important.
    await this._controlPipeline.start();
    await this._openDataPipeline();
    await this._protocol.start();

    this._isOpen = true;
    log('opened');
  }

  @synchronized
  async close() {
    log('closing...', { key: this._key });
    if (!this._isOpen) {
      return;
    }

    // Closes in reverse order to open.
    await this._protocol.stop();
    await this._closeDataPipeline();
    await this._controlPipeline.stop();

    this._isOpen = false;
    log('closed');
  }

  // TODO(burdon): Is this re-entrant? Should objects like Database be reconstructed?
  private async _openDataPipeline() {
    assert(!this._dataPipeline, 'Data pipeline already initialized.');

    // Create pipeline.
    {
      this._dataPipeline = new Pipeline(new Timeframe());
      this._dataPipeline.setWriteFeed(this._dataFeed);
      for (const feed of this._controlPipeline.spaceState.feeds.values()) {
        await this._dataPipeline.addFeed(await this._feedProvider(feed.key));
      }
    }

    await this._dataPipeline.start();

    this._dataPipelineController = this._dataPipelineControllerProvider();
    await this._dataPipelineController.open(this._dataPipeline);

  }

  private async _closeDataPipeline() {
    assert(this._dataPipeline, 'Data pipeline not initialized.');

    await this._dataPipelineController?.close();
    await this._dataPipeline.stop();
  }
}
