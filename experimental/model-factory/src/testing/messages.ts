//
// Copyright 2020 DXOS.org
//

import { dxos, ItemID } from '@dxos/experimental-echo-protocol';

export const createSetPropertyMutation =
  (itemId: ItemID, key: string, value: string, timeframe?: dxos.echo.ITimeframe): dxos.IFeedMessage => ({
    echo: {
      timeframe,
      itemId,
      itemMutation: {
        key,
        value
      }
    }
  });
