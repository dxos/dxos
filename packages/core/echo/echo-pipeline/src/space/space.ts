//
// Copyright 2022 DXOS.org
//

import { Event, synchronized, trackLeaks, Lock } from '@dxos/async';
import { Context } from '@dxos/context';
import { FeedInfo } from '@dxos/credentials';
import { FeedOptions, FeedWrapper } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log, logInfo } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { AdmittedFeed, Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { Timeframe } from '@dxos/timeframe';
import { trace } from '@dxos/tracing';
import { AsyncCallback, Callback } from '@dxos/util';

import { ControlPipeline } from './control-pipeline';
import { DataPipeline } from './data-pipeline';
import { SpaceProtocol } from './space-protocol';
import { SnapshotManager } from '../db-host';
import { MetadataStore } from '../metadata';
import { PipelineAccessor } from '../pipeline';

// TODO(burdon): Factor out?
type FeedProvider = (feedKey: PublicKey, opts?: FeedOptions) => Promise<FeedWrapper<FeedMessage>>;

export type SpaceParams = {
  spaceKey: PublicKey;
  protocol: SpaceProtocol;
  genesisFeed: FeedWrapper<FeedMessage>;
  feedProvider: FeedProvider;
  modelFactory: ModelFactory;
  metadataStore: MetadataStore;
  snapshotManager: SnapshotManager;
  memberKey: PublicKey;

  // TODO(dmaretskyi): Superseded by epochs.
  snapshotId?: string | undefined;
};

export type CreatePipelineParams = {
  start: Timeframe;
  // designation: AdmittedFeed.Designation;
};

/**
 * Spaces are globally addressable databases with access control.
 */
// TODO(dmaretskyi): Extract database stuff.
@trackLeaks('open', 'close')
@trace.resource()
export class Space {
  private readonly _addFeedLock = new Lock();

  public readonly onCredentialProcessed = new Callback<AsyncCallback<Credential>>();
  public readonly stateUpdate = new Event();
  public readonly protocol: SpaceProtocol;

  private readonly _key: PublicKey;
  private readonly _genesisFeedKey: PublicKey;
  private readonly _feedProvider: FeedProvider;
  private readonly _controlPipeline: ControlPipeline;
  private readonly _dataPipeline: DataPipeline;
  private readonly _snapshotManager: SnapshotManager;

  private _isOpen = false;
  private _controlFeed?: FeedWrapper<FeedMessage>;
  private _dataFeed?: FeedWrapper<FeedMessage>;

  constructor(params: SpaceParams) {
    invariant(params.spaceKey && params.feedProvider);
    this._key = params.spaceKey;
    this._genesisFeedKey = params.genesisFeed.key;
    this._feedProvider = params.feedProvider;
    this._snapshotManager = params.snapshotManager;

    this._controlPipeline = new ControlPipeline({
      spaceKey: params.spaceKey,
      genesisFeed: params.genesisFeed,
      feedProvider: params.feedProvider,
      metadataStore: params.metadataStore,
    });

    // TODO(dmaretskyi): Feed set abstraction.
    this._controlPipeline.onFeedAdmitted.set(async (info) => {
      // Enable sparse replication to not download mutations covered by prior epochs.
      const sparse = info.assertion.designation === AdmittedFeed.Designation.DATA;

      if (info.assertion.designation === AdmittedFeed.Designation.DATA) {
        // We will add all existing data feeds when the data pipeline is initialized.
        queueMicrotask(async () => {
          if (this._dataPipeline.pipeline) {
            if (!this._dataPipeline.pipeline.hasFeed(info.key)) {
              return this._dataPipeline.pipeline.addFeed(await this._feedProvider(info.key, { sparse }));
            }
          }
        });
      }

      if (!info.key.equals(params.genesisFeed.key)) {
        queueMicrotask(async () => {
          this.protocol.addFeed(await params.feedProvider(info.key, { sparse }));
        });
      }
    });

    this._controlPipeline.onCredentialProcessed.set(async (credential) => {
      await this.onCredentialProcessed.callIfSet(credential);
      log('onCredentialProcessed', { credential });
      this.stateUpdate.emit();
    });

    // Start replicating the genesis feed.
    this.protocol = params.protocol;
    this.protocol.addFeed(params.genesisFeed);

    this._dataPipeline = new DataPipeline({
      modelFactory: params.modelFactory,
      metadataStore: params.metadataStore,
      snapshotManager: params.snapshotManager,
      memberKey: params.memberKey,
      spaceKey: this._key,
      feedInfoProvider: (feedKey) => this._controlPipeline.spaceState.feeds.get(feedKey),
      snapshotId: params.snapshotId,
      onPipelineCreated: async (pipeline) => {
        if (this._dataFeed) {
          pipeline.setWriteFeed(this._dataFeed);
        }

        // Add existing feeds.
        await this._addFeedLock.executeSynchronized(async () => {
          for (const feed of this._controlPipeline.spaceState.feeds.values()) {
            if (feed.assertion.designation === AdmittedFeed.Designation.DATA && !pipeline.hasFeed(feed.key)) {
              await pipeline.addFeed(await this._feedProvider(feed.key, { sparse: true }));
            }
          }
        });
      },
    });
  }

  @logInfo
  @trace.info()
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
    return this._controlFeed?.key;
  }

  get dataFeedKey() {
    return this._dataFeed?.key;
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

  get dataPipeline(): DataPipeline {
    return this._dataPipeline;
  }

  get snapshotManager(): SnapshotManager {
    return this._snapshotManager;
  }

  setControlFeed(feed: FeedWrapper<FeedMessage>) {
    invariant(!this._controlFeed, 'Control feed already set.');
    this._controlFeed = feed;
    this._controlPipeline.setWriteFeed(feed);
    return this;
  }

  setDataFeed(feed: FeedWrapper<FeedMessage>) {
    invariant(!this._dataFeed, 'Data feed already set.');
    this._dataFeed = feed;
    this._dataPipeline.pipeline?.setWriteFeed(feed);
    return this;
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
  @trace.span()
  async open(ctx: Context) {
    log('opening...');
    if (this._isOpen) {
      return;
    }

    // Order is important.
    await this._controlPipeline.start();
    await this.protocol.start();
    await this._controlPipeline.spaceState.addCredentialProcessor(this._dataPipeline);

    this._isOpen = true;
    log('opened');
  }

  @synchronized
  async close() {
    log('closing...', { key: this._key });
    if (!this._isOpen) {
      return;
    }
    await this._controlPipeline.spaceState.removeCredentialProcessor(this._dataPipeline);

    await this._dataPipeline.close();

    // Closes in reverse order to open.
    await this.protocol.stop();
    await this._controlPipeline.stop();

    this._isOpen = false;
    log('closed');
  }

  @synchronized
  async initializeDataPipeline() {
    log('initializeDataPipeline');
    invariant(this._isOpen, 'Space must be open to initialize data pipeline.');
    await this._dataPipeline.open();
  }
}
