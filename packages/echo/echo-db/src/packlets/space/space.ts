//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { synchronized } from '@dxos/async';
import { failUndefined } from '@dxos/debug';
import { EchoEnvelope, mapFeedWriter, TypedMessage } from '@dxos/echo-protocol';
import { FeedDescriptor } from '@dxos/feed-store';
import { AdmittedFeed, Credential } from '@dxos/halo-protocol';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { PublicKey, Timeframe } from '@dxos/protocols';
import { AsyncCallback, Callback } from '@dxos/util';

import { Database, FeedDatabaseBackend } from '../database';
import { Pipeline } from '../pipeline';
import { ControlPipeline } from './control-pipeline';
import { SpaceProtocol, SwarmIdentity } from './space-protocol';
import { NetworkManager, Plugin } from '@dxos/network-manager';
import { ReplicatorPlugin } from './replicator-plugin';

export type SpaceParams = {
  spaceKey: PublicKey
  initialTimeframe: Timeframe
  genesisFeed: FeedDescriptor
  controlWriteFeed: FeedDescriptor
  dataWriteFeed: FeedDescriptor
  feedProvider: (feedKey: PublicKey) => Promise<FeedDescriptor>
  networkManager: NetworkManager,
  networkPlugins: Plugin[]
  swarmIdentity: SwarmIdentity,
}

/**
 * Spaces are globally addressable databases with access control.
 */
export class Space {
  private readonly _openFeed: (feedKey: PublicKey) => Promise<FeedDescriptor>;
  private readonly _dataWriteFeed: FeedDescriptor;
  private readonly _controlPipeline: ControlPipeline;
  
  private readonly _replicator = new ReplicatorPlugin();
  private readonly _protocol: SpaceProtocol;

  public readonly onCredentialProcessed: Callback<AsyncCallback<Credential>>;

  private _isOpen = false;

  private _dataPipeline?: Pipeline;
  private _databaseBackend?: FeedDatabaseBackend;
  private _database?: Database;

  constructor ({
    spaceKey,
    initialTimeframe,
    genesisFeed,
    controlWriteFeed,
    dataWriteFeed,
    feedProvider,
    networkManager,
    swarmIdentity,
    networkPlugins
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
    this.onCredentialProcessed = this._controlPipeline.onCredentialProcessed;
    this._controlPipeline.onFeedAdmitted.set(async info => {
      if (info.assertion.designation === AdmittedFeed.Designation.DATA) {
        // We will add all existing data feeds when the data pipeline is initialized.
        if (!this._dataPipeline) {
          return;
        }

        this._dataPipeline.addFeed(await feedProvider(info.key));
      }

      if(!info.key.equals(genesisFeed.key)) { 
        this._replicator.addFeed(await feedProvider(info.key));
      }
    });

    this._replicator.addFeed(genesisFeed);

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

  get database () {
    return this._database;
  }

  // TODO(burdon): Why expose this?
  get controlMessageWriter () {
    return this._controlPipeline.writer;
  }

  // TODO(burdon): Why expose this? Method is called "control" but returns state from data.
  get controlPipelineState () {
    return this._dataPipeline?.state;
  }

  @synchronized
  async open () {
    if (this._isOpen) {
      return;
    }

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

    this._dataPipeline = new Pipeline(new Timeframe());
    this._dataPipeline.setWriteFeed(this._dataWriteFeed);
    for (const feed of this._controlPipeline.partyState.feeds.values()) {
      this._dataPipeline.addFeed(await this._openFeed(feed.key));
    }

    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    this._databaseBackend = new FeedDatabaseBackend(
      mapFeedWriter<EchoEnvelope, TypedMessage>(msg => ({
        '@type': 'dxos.echo.feed.EchoEnvelope', ...msg
      }), this._dataPipeline.writer ?? failUndefined()),
      {}, // TODO(dmaretskyi): Populate snapshot.
      {
        snapshots: true
      }
    );

    // Open pipeline and connect it to the database.
    this._database = new Database(modelFactory, this._databaseBackend, new PublicKey(Buffer.alloc(32))); // TODO(dmaretskyi): Fix.
    await this._database.initialize();

    setImmediate(async () => {
      assert(this._dataPipeline);
      for await (const msg of this._dataPipeline.consume()) {
        try {
          log('Processing message', { msg });
          const payload = msg.data.payload as TypedMessage;
          if (payload['@type'] === 'dxos.echo.feed.EchoEnvelope') {
            const feedInfo = this._controlPipeline.partyState.feeds.get(msg.key);
            if (!feedInfo) {
              log.error('Could not determine feed owner', { feedKey: msg.key });
              continue;
            }

            assert(this._databaseBackend);
            await this._databaseBackend.echoProcessor({
              data: payload,
              meta: {
                feedKey: msg.key,
                seq: msg.seq,
                timeframe: msg.data.timeframe,
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
