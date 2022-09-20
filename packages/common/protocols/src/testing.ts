//
// Copyright 2020 DXOS.org
//

import { schema } from './proto';
import { FeedMessage } from './proto/gen/dxos/echo/feed';
import { Timeframe } from './timeframe';
import { ItemID } from './types';

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
  payload: {
    '@type': 'dxos.echo.feed.EchoEnvelope',
    itemId,
    mutation: schema.getCodecForType('example.testing.data.TestItemMutation').encode({ key, value })
  }
});
