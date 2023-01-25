//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Event, synchronized, trackLeaks } from '@dxos/async';
import { FeedInfo } from '@dxos/credentials';
import { FeedWrapper } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log, logInfo } from '@dxos/log';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { AdmittedFeed, Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { AsyncCallback, Callback } from '@dxos/util';

import { Database } from '../database';
import { Pipeline, PipelineAccessor } from '../pipeline';
import { ControlPipeline } from './control-pipeline';
import { DataPipelineController } from './data-pipeline-controller';
import { SpaceProtocol } from './space-protocol';

// TODO(burdon): Factor out?
type FeedProvider = (feedKey: PublicKey) => Promise<FeedWrapper<FeedMessage>>;

export type SpaceParams = {
  spaceKey: PublicKey;
  protocol: SpaceProtocol;
  genesisFeed: FeedWrapper<FeedMessage>;
  controlFeed: FeedWrapper<FeedMessage>;
  dataFeed: FeedWrapper<FeedMessage>;
  feedProvider: FeedProvider;
};

/**
 * Common interface with client.
 */
// TODO(dmaretskyi): Move to client? Not referenced here.
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
// TODO(dmaretskyi): Extract database stuff.
@trackLeaks('open', 'close')
export class Space {
  public readonly onCredentialProcessed = new Callback<AsyncCallback<Credential>>();
  public readonly stateUpdate = new Event();
  public readonly protocol: SpaceProtocol;

  private readonly _key: PublicKey;
  private readonly _genesisFeedKey: PublicKey;
  private readonly _controlFeed: FeedWrapper<FeedMessage>;
  private readonly _dataFeed: FeedWrapper<FeedMessage>;
  private readonly _feedProvider: FeedProvider;
  private readonly _controlPipeline: ControlPipeline;

  private _isOpen = false;
  private _dataPipeline?: Pipeline;
  private _dataPipelineController?: DataPipelineController;

  constructor({ spaceKey, protocol, genesisFeed, controlFeed, dataFeed, feedProvider }: SpaceParams) {
    assert(spaceKey && dataFeed && feedProvider);
    this._key = spaceKey;
    this._genesisFeedKey = genesisFeed.key;
    this._controlFeed = controlFeed;
    this._dataFeed = dataFeed;
    this._feedProvider = feedProvider;

    this._controlPipeline = new ControlPipeline({ spaceKey, genesisFeed, feedProvider });
    this._controlPipeline.setWriteFeed(controlFeed);
    this._controlPipeline.onFeedAdmitted.set(async (info) => {
      if (info.assertion.designation === AdmittedFeed.Designation.DATA) {
        // We will add all existing data feeds when the data pipeline is initialized.
        if (this._dataPipeline) {
          await this._dataPipeline.addFeed(await feedProvider(info.key));
        }
      }

      if (!info.key.equals(genesisFeed.key)) {
        this.protocol.addFeed(await feedProvider(info.key));
      }
    });

    this._controlPipeline.onCredentialProcessed.set(async (credential) => {
      await this.onCredentialProcessed.callIfSet(credential);
      log('onCredentialProcessed', { credential });
      this.stateUpdate.emit();
    });

    // Start replicating the genesis feed.
    this.protocol = protocol;
    this.protocol.addFeed(genesisFeed);
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

  /**
   * Use for diagnostics.
   */
  getControlFeeds(): FeedInfo[] {
    return Array.from(this._controlPipeline.spaceState.feeds.values());
  }

  /**
   * Use for diagnostics.
   */
  // getDataFeeds(): FeedInfo[] {
  //   return this._dataPipeline?.getFeeds();
  // }

  @synchronized
  async open() {
    log('opening...');
    if (this._isOpen) {
      return;
    }

    // Order is important.
    await this._controlPipeline.start();
    await this.protocol.start();

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
    await this.protocol.stop();
    await this._dataPipelineController?.close();
    await this._controlPipeline.stop();

    this._isOpen = false;
    log('closed');
  }

  async initDataPipeline(controller: DataPipelineController) {
    assert(this._isOpen, 'Space must be open to initialize data pipeline.');
    assert(!this._dataPipelineController, 'Data pipeline already initialized.');
    assert(!this._dataPipeline, 'Data pipeline already initialized.');

    this._dataPipelineController = controller;
    await this._dataPipelineController.open({
      openPipeline: async (start) => {
        assert(!this._dataPipeline, 'Data pipeline already initialized.'); // TODO(dmaretskyi): Allow concurrent pipelines.
        // Create pipeline.
        this._dataPipeline = new Pipeline(start);
        this._dataPipeline.setWriteFeed(this._dataFeed);
        for (const feed of this._controlPipeline.spaceState.feeds.values()) {
          if (feed.assertion.designation === AdmittedFeed.Designation.DATA) {
            await this._dataPipeline.addFeed(await this._feedProvider(feed.key));
          }
        }

        await this._dataPipeline.start();
        return this._dataPipeline;
      }
    });
  }
}
