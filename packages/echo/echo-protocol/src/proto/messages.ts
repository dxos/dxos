//
// Copyright 2020 DXOS.org
//

import { Timeframe } from '@dxos/protocols';

import { ItemID, ItemType } from '../types';
import { schema } from './gen';
import { FeedMessage } from './gen/dxos/echo/feed';

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
  timeframe,
  echo: {
    itemId,
    mutation: schema.getCodecForType('dxos.test.echo.TestItemMutation').encode({
      key,
      value
    })
  }
});
