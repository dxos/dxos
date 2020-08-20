//
// Copyright 2020 DXOS.org
//

import { dxos } from '../proto/gen/testing';

import { FeedKey } from '../feeds';
import { ItemID } from '../items';
import { PartyKey } from '../parties';
import { createMessage } from '../proto';

//
// HALO generators.
//

export const createPartyGenesis = (partyKey: PartyKey, feedKey: FeedKey) =>
  createMessage<dxos.echo.testing.IFeedMessage>({
    halo: {
      genesis: {
        partyKey,
        feedKey
      }
    }
  });

//
// ECHO generators.
//

export const createSetPropertyMutation =
  (itemId: ItemID, key: string, value: string, timeframe?: dxos.echo.testing.ITimeframe) =>
    createMessage<dxos.echo.testing.IFeedMessage>({
      echo: {
        timeframe,
        itemId,
        itemMutation: {
          set: {
            key,
            value
          }
        }
      }
    });

export const createAppendPropertyMutation =
  (itemId: ItemID, key: string, value: string, timeframe?: dxos.echo.testing.ITimeframe) =>
    createMessage<dxos.echo.testing.IFeedMessage>({
      echo: {
        timeframe,
        itemId,
        itemMutation: {
          append: {
            key,
            value
          }
        }
      }
    });
