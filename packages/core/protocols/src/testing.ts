//
// Copyright 2020 DXOS.org
//

import { Timeframe } from '@dxos/timeframe';

import { schema } from './proto';
import type { FeedMessage } from './proto/gen/dxos/echo/feed';
import { ItemID } from './types';

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
    mutation: schema
      .getCodecForType('example.testing.data.TestItemMutation')
      .encode({ key, value })
  }
});
