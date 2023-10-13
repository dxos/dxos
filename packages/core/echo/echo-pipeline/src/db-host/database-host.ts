//
// Copyright 2023 DXOS.org
//

import { type EchoProcessor, ItemDemuxer, type ItemManager } from '@dxos/echo-db';
import { type FeedWriter } from '@dxos/feed-store';
import { type ModelFactory } from '@dxos/model-factory';
import { type DataMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { type EchoSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';

import { DataServiceHost } from './data-service-host';

/**
 * Database backend that operates on two streams: read and write.
 * Mutations are read from the incoming streams and applied to the ItemManager via ItemDemuxer.
 * Write operations result in mutations being written to the outgoing stream.
 */
export class DatabaseHost {
  private _echoProcessor!: EchoProcessor;
  private _itemManager!: ItemManager;
  public _itemDemuxer!: ItemDemuxer;

  constructor(
    private readonly _outboundStream: FeedWriter<DataMessage> | undefined,
    private readonly _flush: () => Promise<void>,
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

    this._itemDemuxer = new ItemDemuxer(itemManager, modelFactory);
    this._echoProcessor = this._itemDemuxer.open();
  }

  async close() {}

  getWriteStream(): FeedWriter<DataMessage> | undefined {
    return this._outboundStream;
  }

  createSnapshot(): EchoSnapshot {
    return this._itemDemuxer.createSnapshot();
  }

  createDataServiceHost() {
    return new DataServiceHost(this._itemManager, this._itemDemuxer, this._flush, this._outboundStream ?? undefined);
  }
}
