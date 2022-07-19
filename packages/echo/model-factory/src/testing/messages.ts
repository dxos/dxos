//
// Copyright 2020 DXOS.org
//

import { schema, FeedMessage, ItemID } from '@dxos/echo-protocol';
import { Timeframe } from '@dxos/protocols';

export const createSetPropertyMutation = (
  itemId: ItemID, key: string, value: string, timeframe?: Timeframe
): FeedMessage => ({
  timeframe,
  echo: {
    itemId,
    mutation: schema.getCodecForType('dxos.echo.testing.TestItemMutation').encode({
      key,
      value
    })
  }
});
