//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import { Readable } from 'stream';

import { dxos } from '../proto/gen/testing';

import { createReadable, createWritable } from '../util';
import { IEchoStream, ItemID } from './types';
import { ItemManager } from './item-manager';
import { jsonReplacer } from '../proto';

const log = debug('dxos:echo:item-demuxer');

/**
 * Creates a stream that consumes `IEchoStream` messages and routes them to the associated items.
 * @param itemManager
 */
export const createItemDemuxer = (itemManager: ItemManager): NodeJS.WritableStream => {
  assert(itemManager);

  // Mutations are buffered for each item.
  const itemStreams = new Map<ItemID, Readable>();

  // TODO(burdon): Should this implement some "back-pressure" (hints) to the PartyProcessor?
  return createWritable<IEchoStream>(async (message: IEchoStream) => {
    log('Reading:', JSON.stringify(message, jsonReplacer));
    const { data: { itemId, genesis } } = message;
    assert(itemId);

    if (genesis) {
      const { itemType, modelType } = genesis;
      assert(itemType && modelType);

      // Create mutation stream.
      const itemStream = createReadable<dxos.echo.testing.IEchoEnvelope>();
      itemStreams.set(itemId, itemStream);

      // Create item.
      const item = await itemManager.constructItem(itemId, itemType, modelType, itemStream);
      assert(item.id === itemId);
    } else {
      // NOTE: Spacetime should guarantee that the item genesis message has already been processed.
      const itemStream = itemStreams.get(itemId);
      assert(itemStream, `Missing item: ${itemId}`);

      // Forward mutations to the item's stream.
      await itemStream.push(message);
    }
  });
};
