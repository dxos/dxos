//
// Copyright 2020 DXOS.org
//

import { createAny } from '@dxos/util';

import { ItemID, ItemType } from '../types';
import { protocol } from './proto';

//
// ECHO generators.
//

export const createItemGenesis = (itemId: ItemID, itemType: ItemType): protocol.dxos.IFeedMessage => ({
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
  itemId: ItemID, key: string, value: string, timeframe?: protocol.dxos.echo.ITimeframe
): protocol.dxos.IFeedMessage => ({
  echo: {
    itemId,
    timeframe,
    mutation: createAny<protocol.dxos.echo.testing.ITestItemMutation>({
      key,
      value
    }, 'dxos.echo.testing.TestItemMutation')
  }
});
