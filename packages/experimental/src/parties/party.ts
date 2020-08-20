//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { humanize } from '@dxos/crypto';

import { createItemDemuxer, Item, ItemFilter, ItemManager, ItemType } from '../items';
import { ResultSet } from '../result';
import { ModelFactory, ModelType } from '../models';
import { Pipeline } from './pipeline';
import { PartyKey } from './types';
import { TestModel } from '../testing';

// TODO(burdon): Namespace?
export const PARTY_ITEM_TYPE = '__PARTY_PROPERTIES__';

/**
 * Party.
 */
export class Party {
  private readonly _modelFactory: ModelFactory;
  private readonly _pipeline: Pipeline;

  private _itemManager: ItemManager | undefined;
  private _itemDemuxer: NodeJS.WritableStream | undefined;

  /**
   * @param modelFactory
   * @param pipeline
   */
  constructor (modelFactory: ModelFactory, pipeline: Pipeline) {
    assert(modelFactory);
    assert(pipeline);
    this._modelFactory = modelFactory;
    this._pipeline = pipeline;
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
   * Opens the pipeline.
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

    return this;
  }

  /**
   * Closes the pipeline.
   */
  async close () {
    if (!this._itemManager) {
      return this;
    }

    // Disconnect the read stream.
    this._pipeline.readStream?.unpipe(this._itemDemuxer);

    this._itemManager = undefined;
    this._itemDemuxer = undefined;

    await this._pipeline.close();

    return this;
  }

  // TODO(burdon): Block until model updated?
  async setProperty (key: string, value: any): Promise<Party> {
    const item = await this._gePropertiestItem();
    await (item.model as TestModel).setProperty(key, value);
    return this;
  }

  async getProperty (key: string): Promise<any> {
    const item = await this._gePropertiestItem();
    return await (item.model as TestModel).getProperty(key);
  }

  // TODO(burdon): Block until model updated?
  async createItem (itemType: ItemType, modelType: ModelType): Promise<Item> {
    assert(this._itemManager);
    return this._itemManager.createItem(itemType, modelType);
  }

  async queryItems (filter?: ItemFilter): Promise<ResultSet<Item>> {
    assert(this._itemManager);
    return this._itemManager.queryItems(filter);
  }

  async _gePropertiestItem () {
    assert(this.isOpen);
    assert(this._itemManager);
    const { value: items } = await this._itemManager?.queryItems({ type: PARTY_ITEM_TYPE });
    assert(items.length === 1);
    return items[0];
  }
}
