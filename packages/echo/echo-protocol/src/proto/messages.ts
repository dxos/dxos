//
// Copyright 2020 DXOS.org
//

import { Timeframe } from '@dxos/protocols';

import { ItemID } from '../types';
import { schema } from './gen';
import { FeedMessage } from './gen/dxos/echo/feed';

//
// Testing.
//

export const createTestItemMutation = (
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
