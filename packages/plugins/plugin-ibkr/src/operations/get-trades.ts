//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';

import { parseTrades } from '../services';
import { IbkrOperation } from '../types';
import { latestReport } from './feed';

const lastWeekCutoff = (): string => {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  // IBKR tradeDate/dateTime fields start with YYYYMMDD; lexicographic comparison is correct.
  return date.toISOString().slice(0, 10).replace(/-/g, '');
};

const handler: Operation.WithHandler<typeof IbkrOperation.GetTrades> = IbkrOperation.GetTrades.pipe(
  Operation.withHandler(
    Effect.fn(function* () {
      const report = yield* latestReport;
      const xml = report?.xml;
      const cutoff = lastWeekCutoff();
      return {
        fetchedAt: report?.fetchedAt,
        trades: xml ? parseTrades(xml).filter((trade) => trade.date >= cutoff) : [],
      };
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
