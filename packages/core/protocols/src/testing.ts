//
// Copyright 2020 DXOS.org
//

import { FeedMessage } from './proto/gen/dxos/echo/feed.js';
import { schema } from './proto/index.js';
import { Timeframe } from './timeframe.js';
import { ItemID } from './types.js';

//
// Testing.
//

// TODO(burdon): Move to testing package (with other fakers, etc.)
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
