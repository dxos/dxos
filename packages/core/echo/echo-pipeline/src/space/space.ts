//
// Copyright 2022 DXOS.org
//

import { Event, Mutex, synchronized, trackLeaks } from '@dxos/async';
import { type Context } from '@dxos/context';
import { type FeedInfo } from '@dxos/credentials';
import { type FeedOptions, type FeedWrapper } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log, logInfo } from '@dxos/log';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { AdmittedFeed, type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { type Timeframe } from '@dxos/timeframe';
import { trace } from '@dxos/tracing';
import { Callback, type AsyncCallback } from '@dxos/util';

import { ControlPipeline } from './control-pipeline';
import { type SpaceProtocol } from './space-protocol';
import { type SnapshotManager } from '../db-host';
import { type MetadataStore } from '../metadata';
import { type PipelineAccessor } from '../pipeline';

// TODO(burdon): Factor out?
type FeedProvider = (feedKey: PublicKey, opts?: FeedOptions) => Promise<FeedWrapper<FeedMessage>>;

export type SpaceParams = {
  spaceKey: PublicKey;
  protocol: SpaceProtocol;
  genesisFeed: FeedWrapper<FeedMessage>;
  feedProvider: FeedProvider;
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
  private readonly _addFeedMutex = new Mutex();

  public readonly onCredentialProcessed = new Callback<AsyncCallback<Credential>>();
  public readonly stateUpdate = new Event();
  @trace.info()
  public readonly protocol: SpaceProtocol;

  private readonly _key: PublicKey;
  private readonly _genesisFeedKey: PublicKey;
  private readonly _feedProvider: FeedProvider;
  @trace.info()
  private readonly _controlPipeline: ControlPipeline;

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

  get snapshotManager(): SnapshotManager {
    return this._snapshotManager;
  }

  async setControlFeed(feed: FeedWrapper<FeedMessage>) {
    invariant(!this._controlFeed, 'Control feed already set.');
    this._controlFeed = feed;
    await this._controlPipeline.setWriteFeed(feed);
    return this;
  }

  async setDataFeed(feed: FeedWrapper<FeedMessage>) {
    invariant(!this._dataFeed, 'Data feed already set.');
    this._dataFeed = feed;
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
    await this._controlPipeline.stop();

    this._isOpen = false;
    log('closed');
  }
}
