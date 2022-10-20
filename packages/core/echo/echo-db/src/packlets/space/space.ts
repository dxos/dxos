//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { synchronized } from '@dxos/async';
import { failUndefined } from '@dxos/debug';
import { FeedWrapper } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { NetworkManager, Plugin } from '@dxos/network-manager';
import { TypedMessage } from '@dxos/protocols';
import { EchoEnvelope, FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { AdmittedFeed, Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { Timeframe } from '@dxos/timeframe';
import { AsyncCallback, Callback } from '@dxos/util';

import { createMappedFeedWriter } from '../common';
import { Database, DatabaseBackend, FeedDatabaseBackend } from '../database';
import { Pipeline, PipelineAccessor } from '../pipeline';
import { ControlPipeline } from './control-pipeline';
import { ReplicatorPlugin } from './replicator-plugin';
import { SpaceProtocol, SwarmIdentity } from './space-protocol';

export type DatabaseFactoryParams = {
  databaseBackend: DatabaseBackend
}

type DatabaseFactory = (params: DatabaseFactoryParams) => Promise<Database>;

export type SpaceParams = {
  spaceKey: PublicKey
  genesisFeed: FeedWrapper<FeedMessage>
  controlFeed: FeedWrapper<FeedMessage>
  dataFeed: FeedWrapper<FeedMessage>
  feedProvider: (feedKey: PublicKey) => Promise<FeedWrapper<FeedMessage>>
  initialTimeframe: Timeframe
  networkManager: NetworkManager
  networkPlugins: Plugin[]
  swarmIdentity: SwarmIdentity
  databaseFactory: DatabaseFactory
}

/**
 * Spaces are globally addressable databases with access control.
 */
export class Space {
  public readonly onCredentialProcessed: Callback<AsyncCallback<Credential>>;

  private readonly _key: PublicKey;
  private readonly _dataFeed: FeedWrapper<FeedMessage>;
  private readonly _controlFeed: FeedWrapper<FeedMessage>;
  private readonly _feedProvider: (feedKey: PublicKey) => Promise<FeedWrapper<FeedMessage>>;
  // TODO(dmaretskyi): This is only recorded here for invitations.
  private readonly _genesisFeedKey: PublicKey;
  private readonly _databaseFactory: DatabaseFactory;

  private readonly _controlPipeline: ControlPipeline;
  private readonly _replicator = new ReplicatorPlugin();
  private readonly _protocol: SpaceProtocol;

  private _isOpen = false;
  private _dataPipeline?: Pipeline;
  private _databaseBackend?: FeedDatabaseBackend;
  private _database?: Database;

  constructor ({
    spaceKey,
    genesisFeed,
    controlFeed,
    dataFeed,
    feedProvider,
    initialTimeframe,
    networkManager,
    networkPlugins,
    swarmIdentity,
    databaseFactory
  }: SpaceParams) {
    assert(spaceKey && dataFeed && feedProvider);
    this._key = spaceKey;
    this._controlFeed = controlFeed;
    this._dataFeed = dataFeed;
    this._feedProvider = feedProvider;
    this._genesisFeedKey = genesisFeed.key;
    this._databaseFactory = databaseFactory;

    this._controlPipeline = new ControlPipeline({
      spaceKey,
      genesisFeed,
      feedProvider,
      initialTimeframe
    });

    this._controlPipeline.setWriteFeed(controlFeed);
    this._controlPipeline.onFeedAdmitted.set(async info => {
      if (info.assertion.designation === AdmittedFeed.Designation.DATA) {
        // We will add all existing data feeds when the data pipeline is initialized.
        if (!this._dataPipeline) {
          return;
        }

        this._dataPipeline.addFeed(await feedProvider(info.key));
      }

      if (!info.key.equals(genesisFeed.key)) {
        this._replicator.addFeed(await feedProvider(info.key));
      }
    });

    this.onCredentialProcessed = this._controlPipeline.onCredentialProcessed;

    // Start replicating the genesis feed.
    this._replicator.addFeed(genesisFeed);

    // Create the network protocol.
    this._protocol = new SpaceProtocol(
      networkManager,
      spaceKey,
      swarmIdentity,
      [
        this._replicator,
        ...networkPlugins
      ]
    );
  }

  get isOpen () {
    return this._isOpen;
  }

  get key () {
    return this._key;
  }

  get database () {
    return this._database;
  }

  /**
   * @test-only
   */
  get controlPipeline (): PipelineAccessor {
    return this._controlPipeline.pipeline;
  }

  get genesisFeedKey (): PublicKey {
    return this._genesisFeedKey;
  }

  get controlFeedKey () {
    return this._controlFeed.key;
  }

  get dataFeedKey () {
    return this._dataFeed.key;
  }

  @synchronized
  async open () {
    if (this._isOpen) {
      return;
    }

    // Order is important.
    await this._controlPipeline.start();
    await this._openDataPipeline();
    await this._protocol.start();

    this._isOpen = true;
  }

  @synchronized
  async close () {
    if (!this._isOpen) {
      return;
    }

    await this._protocol.stop();

    // TODO(burdon): Does order matter?
    await this._controlPipeline.stop();
    await this._closeDataPipeline();

    this._isOpen = false;
  }

  // TODO(burdon): Is this re-entrant? Should objects like Database be reconstructed?
  private async _openDataPipeline () {
    assert(!this._dataPipeline, 'Data pipeline already initialized.');

    // Create pipeline.
    {
      this._dataPipeline = new Pipeline(new Timeframe());
      this._dataPipeline.setWriteFeed(this._dataFeed);
      for (const feed of this._controlPipeline.partyState.feeds.values()) {
        await this._dataPipeline.addFeed(await this._feedProvider(feed.key));
      }
    }

    // Create database backend.
    {
      const feedWriter = createMappedFeedWriter<EchoEnvelope, TypedMessage>(msg => ({
        '@type': 'dxos.echo.feed.EchoEnvelope',
        ...msg
      }), this._dataPipeline.writer ?? failUndefined());

      this._databaseBackend = new FeedDatabaseBackend(
        feedWriter,
        {}, // TODO(dmaretskyi): Populate snapshot.
        {
          snapshots: true // TODO(burdon): Config.
        }
      );
    }

    // Connect pipeline to the database.
    {
      this._database = await this._databaseFactory({ databaseBackend: this._databaseBackend });
      await this._database.initialize();
    }

    await this._dataPipeline.start();

    // Start message processing loop.
    setTimeout(async () => {
      assert(this._dataPipeline);
      for await (const msg of this._dataPipeline.consume()) {
        const { key: feedKey, seq, data } = msg;
        log('Processing message.', { msg });

        try {
          const payload = data.payload as TypedMessage;
          if (payload['@type'] === 'dxos.echo.feed.EchoEnvelope') {
            const feedInfo = this._controlPipeline.partyState.feeds.get(feedKey);
            if (!feedInfo) {
              log.error('Could not find feed.', { feedKey });
              continue;
            }

            await this._databaseBackend!.echoProcessor({
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

  private async _closeDataPipeline () {
    assert(this._dataPipeline, 'Data pipeline not initialized.');

    await this._dataPipeline?.stop();
    await this._databaseBackend?.close();
    await this._database?.destroy();
  }
}
