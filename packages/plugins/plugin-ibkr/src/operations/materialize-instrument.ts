//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Filter, Obj, Query, Ref } from '@dxos/echo';

import { mergeForeignKeys } from '../services';
import { TRADINGVIEW_SOURCE } from '../constants';
import { Ibkr, IbkrOperation } from '../types';

const defaultForeignKeys = ({
  key,
  symbol,
  exchange,
  extraKeys,
}: {
  key: { source: string; id: string };
  symbol: string;
  exchange?: string;
  extraKeys?: readonly { source: string; id: string }[];
}) => {
  const derived: { source: string; id: string }[] = [];
  if (exchange) {
    derived.push({ source: TRADINGVIEW_SOURCE, id: `${exchange.toUpperCase()}:${symbol.toUpperCase()}` });
  }
  return mergeForeignKeys([key], [...(extraKeys ?? []), ...derived]);
};

const handler: Operation.WithHandler<typeof IbkrOperation.MaterializeInstrument> =
  IbkrOperation.MaterializeInstrument.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ key, name, symbol, exchange, assetClass, extraKeys }) {
        const existing = yield* Database.query(Query.select(Filter.foreignKeys(Ibkr.Instrument, [key]))).run;
        if (existing.length > 0) {
          return { instrument: Ref.make(existing[0]), created: false };
        }

        const keys = defaultForeignKeys({ key, symbol, exchange, extraKeys });
        const instrument = yield* Database.add(
          Ibkr.makeInstrument({
            keys,
            name: name ?? symbol,
            symbol,
            exchange,
            assetClass,
          }),
        );
        return { instrument: Ref.make(instrument), created: true };
      }),
    ),
    Operation.opaqueHandler,
  );

export default handler;
