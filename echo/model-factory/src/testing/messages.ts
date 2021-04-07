//
// Copyright 2020 DXOS.org
//

import { schema, FeedMessage, ItemID, Timeframe } from '@dxos/echo-protocol';

export const createSetPropertyMutation = (
  itemId: ItemID, key: string, value: string, timeframe?: Timeframe
): FeedMessage => ({
  echo: {
    timeframe,
    itemId,
    mutation: schema.getCodecForType('dxos.echo.testing.TestItemMutation').encode({
      key,
      value
    })
  }
});
