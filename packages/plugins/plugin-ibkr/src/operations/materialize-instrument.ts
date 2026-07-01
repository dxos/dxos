//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Filter, Obj, Query, Ref } from '@dxos/echo';

import { TRADINGVIEW_SOURCE } from '../constants';
import { foreignKeyEquals, mergeForeignKeys } from '../services';
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
        const keys = defaultForeignKeys({ key, symbol, exchange, extraKeys });
        const existing = yield* Database.query(Query.select(Filter.foreignKeys(Ibkr.Instrument, keys))).run;
        if (existing.length > 0) {
          const instrument = existing[0];
          // Idempotent materialization via a different alias (e.g. conid/CUSIP) must not drop the keys
          // it was found by: fold any newly-learned foreign keys onto the matched instrument.
          const learned = keys.filter(
            (foreignKey) => !Obj.getMeta(instrument).keys.some((entry) => foreignKeyEquals(entry, foreignKey)),
          );
          if (learned.length > 0) {
            Obj.update(instrument, (instrument) => {
              Obj.getMeta(instrument).keys.push(...learned);
            });
          }
          return { instrument: Ref.make(instrument), created: false };
        }

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
