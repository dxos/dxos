//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { SpaceCapabilities, SpaceOperation } from '@dxos/plugin-space';

import { tickerSource, TRADINGVIEW_SOURCE } from '../constants';
import { Ibkr } from '../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Ibkr.Portfolio),
        createObject: (_props, options) =>
          Effect.gen(function* () {
            const object = Ibkr.makePortfolio();
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Ibkr.Instrument),
        createObject: (_props, options) =>
          Effect.gen(function* () {
            const symbol = 'AAPL';
            const exchange = 'NASDAQ';
            const object = Ibkr.makeInstrument({
              name: 'Apple Inc.',
              symbol,
              exchange,
              assetClass: 'stock',
              keys: [
                { source: tickerSource(exchange), id: symbol },
                { source: TRADINGVIEW_SOURCE, id: `${exchange}:${symbol}` },
              ],
            });
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
    ];
  }),
);
