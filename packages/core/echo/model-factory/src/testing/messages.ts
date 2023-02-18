//
// Copyright 2020 DXOS.org
//

import { schema, ItemID } from '@dxos/protocols';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { Timeframe } from '@dxos/timeframe';

export const createSetPropertyMutation = (
  objectId: ItemID,
  key: string,
  value: string,
  timeframe = new Timeframe()
): FeedMessage => ({
  timeframe,
  payload: {
    data: {
      object: {
        objectId,
        mutations: [
          {
            model: {
              '@type': 'google.protobuf.Any',
              typeUrl: 'todo',
              value: schema.getCodecForType('example.testing.data.TestItemMutation').encode({
                key,
                value
              })
            }
          }
        ]
      }
    }
  }
});
