//
// Copyright 2020 DXOS.org
//

import { Timeframe, schema } from '@dxos/protocols';
import { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';

import { ItemID } from '../types';

//
// Testing.
//

// TODO(burdon): Move to protocols.
export const createTestItemMutation = (
  itemId: ItemID,
  key: string,
  value: string,
  timeframe = new Timeframe()
): FeedMessage => ({
  timeframe,
  echo: {
    itemId,
    mutation: schema.getCodecForType('dxos.testing.data.TestItemMutation').encode({
      key,
      value
    })
  }
});
