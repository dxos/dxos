//
// Copyright 2020 DXOS.org
//

import type { FeedMessage, ItemID } from '@dxos/echo-protocol';
import { Timeframe } from '@dxos/protocols';

import { schema } from '../proto';

export const createSetPropertyMutation = (
  itemId: ItemID, key: string, value: string, timeframe = new Timeframe()
): FeedMessage => ({
  timeframe,
  payload: {
    '@type': 'dxos.echo.feed.EchoEnvelope',
    itemId,
    mutation: schema.getCodecForType('dxos.test.echo.TestItemMutation').encode({
      key,
      value
    })
  }
});
