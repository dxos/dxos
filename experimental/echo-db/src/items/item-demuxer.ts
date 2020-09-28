//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import { Readable } from 'stream';

import { protocol, IEchoStream, ItemID } from '@dxos/experimental-echo-protocol';
import { createReadable, createWritable, jsonReplacer } from '@dxos/experimental-util';

import { ItemManager } from './item-manager';

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
    const { data: { itemId, genesis, itemMutation, mutation } } = message;
    assert(itemId);

    //
    // New item.
    //
    if (genesis) {
      const { itemType, modelType, parentId } = genesis;
      assert(modelType);

      // Create inbound stream for item.
      const itemStream = createReadable<protocol.dxos.echo.IEchoEnvelope>();
      itemStreams.set(itemId, itemStream);

      // Create item.
      const item = await itemManager.constructItem(itemId, modelType, itemType, itemStream, parentId);
      assert(item.id === itemId);
    }

    //
    // NOTE: Spacetime guarantees that the item genesis message has already been processed.
    //

    //
    // Set parent item references.
    //
    if (itemMutation) {
      const item = itemManager.getItem(itemId);
      assert(item);

      item._processMutation(itemMutation, itemId => itemManager.getItem(itemId));
    }

    //
    // Model mutations.
    //
    if (mutation) {
      const itemStream = itemStreams.get(itemId);
      assert(itemStream, `Missing item: ${itemId}`);

      // Forward mutations to the item's stream.
      await itemStream.push(message);
    }
  });
};
