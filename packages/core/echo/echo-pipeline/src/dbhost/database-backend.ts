//

//
// Copyright 2023 DXOS.org
//

import { EchoProcessor, ItemDemuxer, ItemDemuxerOptions, ItemManager } from '@dxos/echo-db';
import { FeedWriter } from '@dxos/feed-store';
import { ModelFactory } from '@dxos/model-factory';
import { DataMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { EchoSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';

import { DataServiceHost } from './data-service-host';

/**
 * Database backend that operates on two streams: read and write.
 * Mutations are read from the incoming streams and applied to the ItemManager via ItemDemuxer.
 * Write operations result in mutations being written to the outgoing stream.
 */
export class DatabaseBackendHost {
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
    this._itemManager._debugLabel = 'host';

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
