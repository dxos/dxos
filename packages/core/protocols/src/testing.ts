//
// Copyright 2020 DXOS.org
//

import { Timeframe } from '@dxos/timeframe';

import { schema } from './proto';
import type { FeedMessage } from './proto/gen/dxos/echo/feed';
import { type ObjectId } from './types';

//
// Testing.
//

// TODO(burdon): Move to testing package (with other fakers, etc.)
export const createTestItemMutation = (
  objectId: ObjectId,
  key: string,
  value: string,
  timeframe = new Timeframe(),
): FeedMessage => ({
  timeframe,
  payload: {
    data: {
      batch: {
        objects: [
          {
            objectId,
            mutations: [
              {
                model: {
                  '@type': 'google.protobuf.Any',
                  typeUrl: 'todo',
                  value: schema.getCodecForType('example.testing.data.TestItemMutation').encode({ key, value }),
                },
              },
            ],
          },
        ],
      },
    },
  },
});
