//
// Copyright 2020 DXOS.org
//

import { humanize } from '@dxos/crypto';
import { FeedKey, ItemType, PartyKey } from '@dxos/experimental-echo-protocol';
import { ModelFactory, ModelType, Model, ModelConstructor } from '@dxos/experimental-model-factory';
import { ObjectModel } from '@dxos/experimental-object-model';
import assert from 'assert';
import { createItemDemuxer, Item, ItemFilter, ItemManager } from '../items';
import { ResultSet } from '../result';
import { PartyProcessor } from './party-processor';
import { Pipeline } from './pipeline';
import { Inviter, Invitation } from '../invitation';

export const PARTY_ITEM_TYPE = 'wrn://dxos.org/item/party';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PartyFilter {}

/**
 * A Party represents a shared dataset containing queryable Items that are constructed from an ordered stream
 * of mutations.
 */
export class Party {
  private _itemManager: ItemManager | undefined;
  private _itemDemuxer: NodeJS.WritableStream | undefined;

  private _unsubscribePipeline: (() => void) | undefined;

  /**
   * The Party is constructed by the `Database` object.
   * @param {ModelFactory} modelFactory
   * @param {Pipeline} pipeline
   */
  constructor (
    private readonly _modelFactory: ModelFactory,
    private readonly _pipeline: Pipeline,
    private readonly _partyProcessor: PartyProcessor,
    public readonly writeFeedKey: FeedKey
  ) {
    assert(this._modelFactory);
    assert(this._pipeline);
    assert(this._partyProcessor);
  }

  toString () {
    return `Party(${JSON.stringify({ key: humanize(this.key) })})`;
  }

  get key (): PartyKey {
    return this._pipeline.partyKey;
  }

  get isOpen (): boolean {
    return !!this._itemManager;
  }

  /**
   * Opens the pipeline and connects the streams.
   */
  async open () {
    if (this._itemManager) {
      return this;
    }

    // TODO(burdon): Support read-only parties.
    const [readStream, writeStream] = await this._pipeline.open();

    // Connect to the downstream item demuxer.
    this._itemManager = new ItemManager(this._modelFactory, writeStream);
    this._itemDemuxer = createItemDemuxer(this._itemManager);
    readStream.pipe(this._itemDemuxer);

    // TODO(burdon): Propagate errors.
    this._unsubscribePipeline = this._pipeline.errors.on(() => {});

    return this;
  }

  /**
   * Closes the pipeline and streams.
   */
  async close () {
    if (!this._itemManager) {
      return this;
    }

    // Disconnect the read stream.
    this._pipeline.readStream?.unpipe(this._itemDemuxer);

    this._itemManager = undefined;
    this._itemDemuxer = undefined;

    // TODO(burdon): Create test to ensure everything closes cleanly.
    await this._pipeline.close();

    this._unsubscribePipeline!();

    return this;
  }

  /**
   * Sets a party property.
   * @param {string} key
   * @param value
   */
  async setProperty (key: string, value: any): Promise<Party> {
    const item = await this._getPropertiestItem();
    await item.model.setProperty(key, value);
    return this;
  }

  /**
   * Returns a party property value.
   * @param key
   */
  async getProperty (key: string): Promise<any> {
    const item = await this._getPropertiestItem();
    return await item.model.getProperty(key);
  }

  /**
   * Creates a new item with the given queryable type and model.
   * @param {ModelType} [modelType]
   * @param {ItemType} [itemType]
   */
  // https://www.typescriptlang.org/docs/handbook/functions.html#overloads
  async createItem (): Promise<Item<ObjectModel>>
  async createItem (modelClass: undefined, itemType?: ItemType | undefined): Promise<Item<ObjectModel>>
  async createItem (modelType: ModelType, itemType?: ItemType | undefined): Promise<Item<any>>
  async createItem <M extends Model<any>>(modelClass: ModelConstructor<M>, itemType?: ItemType | undefined): Promise<Item<M>>
  async createItem (modelType: ModelConstructor<Model<any>> | ModelType = ObjectModel.meta.type, itemType?: ItemType | undefined): Promise<Item<any>> {
    assert(this._itemManager);
    if (typeof modelType !== 'string') {
      modelType = modelType.meta.type;
    }

    return this._itemManager.createItem(modelType, itemType);
  }

  /**
   * Queries for a set of Items matching the optional filter.
   * @param filter
   */
  async queryItems (filter?: ItemFilter): Promise<ResultSet<Item<any>>> {
    assert(this._itemManager);
    return this._itemManager.queryItems(filter);
  }

  /**
   * Returns a special Item that is used by the Party to manage its properties.
   */
  async _getPropertiestItem (): Promise<Item<ObjectModel>> {
    assert(this.isOpen);
    assert(this._itemManager);
    const { value: items } = await this._itemManager?.queryItems({ type: PARTY_ITEM_TYPE });
    assert(items.length === 1);
    return items[0];
  }

  createInvitation (): Inviter {
    const invitation: Invitation = {
      partyKey: this.key,
      feeds: this._pipeline.memberFeeds
    };

    assert(this._pipeline.writeStream);
    return new Inviter(this._partyProcessor, this._pipeline.writeStream, invitation);
  }
}
