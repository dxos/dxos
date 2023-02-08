//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { EventSubscriptions } from '@dxos/async';
import { FeedWriter } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { DataMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { DataService } from '@dxos/protocols/proto/dxos/echo/service';
import { EchoSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';

import { DataMirror } from './data-mirror';
import { DataServiceHost } from './data-service-host';
import { EchoProcessor, ItemDemuxer, ItemDemuxerOptions } from './item-demuxer';
import { ItemManager } from './item-manager';

const log = debug('dxos:echo-db:database-backend');

/**
 * Generic interface to represent a backend for the database.
 * Interfaces with ItemManager to maintain the collection of entities up-to-date.
 * Provides a way to query for the write stream to make mutations.
 * Creates data snapshots.
 * @deprecated
 */
export interface DatabaseBackend {
  isReadOnly: boolean;

  open(itemManager: ItemManager, modelFactory: ModelFactory): Promise<void>;
  close(): Promise<void>;

  /**
   * @deprecated
   */
  getWriteStream(): FeedWriter<DataMessage> | undefined;
  createSnapshot(): EchoSnapshot;
  createDataServiceHost(): DataServiceHost;
}

/**
 * Database backend that operates on two streams: read and write.
 * Mutations are read from the incoming streams and applied to the ItemManager via ItemDemuxer.
 * Write operations result in mutations being written to the outgoing stream.
 */
export class DatabaseBackendHost implements DatabaseBackend {
  private _echoProcessor!: EchoProcessor;
  private _itemManager!: ItemManager;
  private _itemDemuxer!: ItemDemuxer;

  constructor(
    private readonly _outboundStream: FeedWriter<DataMessage> | undefined,
    private readonly _snapshot?: EchoSnapshot,
    private readonly _options: ItemDemuxerOptions = {} // TODO(burdon): Pass in factory instead?
  ) {}

  get isReadOnly(): boolean {
    return !!this._outboundStream;
  }

  get echoProcessor() {
    return this._echoProcessor;
  }

  async open(itemManager: ItemManager, modelFactory: ModelFactory) {
    this._itemManager = itemManager;
    this._itemDemuxer = new ItemDemuxer(itemManager, modelFactory, this._options);
    this._echoProcessor = this._itemDemuxer.open();

    if (this._snapshot) {
      await this._itemDemuxer.restoreFromSnapshot(this._snapshot);
    }
  }

  async close() {}

  getWriteStream(): FeedWriter<DataMessage> | undefined {
    return this._outboundStream;
  }

  createSnapshot() {
    return this._itemDemuxer.createSnapshot();
  }

  createDataServiceHost() {
    return new DataServiceHost(this._itemManager, this._itemDemuxer, this._outboundStream ?? undefined);
  }
}

/**
 * Database backend that is backed by the DataService instance.
 * Uses DataMirror to populate entities in ItemManager.
 */
export class DatabaseBackendProxy implements DatabaseBackend {
  private _dataMirror?: DataMirror;
  private readonly _subscriptions = new EventSubscriptions();
  public _itemManager!: ItemManager;

  // prettier-ignore
  constructor(
    private readonly _service: DataService,
    private readonly _spaceKey: PublicKey
  ) {}

  get isReadOnly(): boolean {
    return false;
  }

  async open(itemManager: ItemManager, modelFactory: ModelFactory): Promise<void> {
    this._itemManager = itemManager;

    this._dataMirror = new DataMirror(this._itemManager, this._service, this._spaceKey);

    this._subscriptions.add(
      modelFactory.registered.on(async (model) => {
        for (const item of this._itemManager.getUninitializedEntities()) {
          if (item._stateManager.modelType === model.meta.type) {
            await this._itemManager.initializeModel(item.id);
          }
        }
      })
    );

    await this._dataMirror.open();
  }

  async close(): Promise<void> {
    this._subscriptions.clear();
    await this._dataMirror?.close();
  }

  getWriteStream(): FeedWriter<DataMessage> | undefined {
    return {
      write: async (mutation) => {
        log('write', mutation);
        const { feedKey, seq } = await this._service.write({
          batch: {
            objects: [mutation.object],
          },
          spaceKey: this._spaceKey
        });
        assert(feedKey);
        assert(seq !== undefined);
        return {
          feedKey,
          seq
        };
      }
    };
  }

  createSnapshot(): EchoSnapshot {
    throw new Error('Method not supported.');
  }

  createDataServiceHost(): DataServiceHost {
    throw new Error('Method not supported.');
  }
}
