//
// Copyright 2020 DXOS.org
//

import { ItemID, ItemType } from '../types';
import { schema } from './gen';
import { FeedMessage } from './gen/dxos';
import { Timeframe } from './gen/dxos/echo';

//
// ECHO generators.
//

export const createItemGenesis = (itemId: ItemID, itemType: ItemType): FeedMessage => ({
  echo: {
    genesis: {
      itemType
    }
  }
});

//
// Testing.
//

export const createTestItemMutation = (
  itemId: ItemID, key: string, value: string, timeframe?: Timeframe
): FeedMessage => ({
  echo: {
    itemId,
    timeframe,
    mutation: schema.getCodecForType('dxos.echo.testing.TestItemMutation').encode({
      key,
      value
    })
  }
});
