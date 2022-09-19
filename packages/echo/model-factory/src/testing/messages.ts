//
// Copyright 2020 DXOS.org
//

import { ItemID } from '@dxos/echo-protocol';
import { Timeframe, schema } from '@dxos/protocols';
import { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';

export const createSetPropertyMutation = (
  itemId: ItemID, key: string, value: string, timeframe = new Timeframe()
): FeedMessage => ({
  timeframe,
  payload: {
    '@type': 'dxos.echo.feed.EchoEnvelope',
    itemId,
    mutation: schema.getCodecForType('example.testing.data.TestItemMutation').encode({
      key,
      value
    })
  }
});
