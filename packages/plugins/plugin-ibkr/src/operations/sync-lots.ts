//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Filter, Obj, Query, Ref } from '@dxos/echo';

import { IBKR_SOURCE, tickerSource } from '../constants';
import { parseClosedLots, parseOpenLots } from '../services';
import { Ibkr, IbkrOperation } from '../types';
import { latestReportFromFeed } from './feed';

const handler: Operation.WithHandler<typeof IbkrOperation.SyncLots> = IbkrOperation.SyncLots.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ account: accountRef, report: reportRef }) {
      const portfolio = yield* Database.load(accountRef);
      const report = reportRef
        ? yield* Database.load(reportRef)
        : yield* latestReportFromFeed(yield* Database.load(portfolio.feed));
      if (!report) {
        return { synced: 0, created: 0, updated: 0, removed: 0 };
      }

      return yield* syncLotsFromReport(portfolio, report);
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;

const syncLotsFromReport = Effect.fn(function* (portfolio: Ibkr.Portfolio, report: Ibkr.Report) {
  const parsed = [...parseOpenLots(report.xml), ...parseClosedLots(report.xml)];
  const portfolioRef = Ref.make(portfolio);
  const existing = yield* Database.query(
    Query.select(Filter.and(Filter.type(Ibkr.Lot), Filter.childOf(portfolio, { transitive: false }))),
  ).run;

  const existingByKey = new Map(
    existing.flatMap((lot) => {
      const key = Obj.getMeta(lot).keys.find((entry) => entry.source === IBKR_SOURCE);
      return key ? [[key.id, lot] as const] : [];
    }),
  );

  let created = 0;
  let updated = 0;
  const seen = new Set<string>();

  for (const snapshot of parsed) {
    const foreignId = lotForeignId(snapshot);
    seen.add(foreignId);

    const { instrument } = yield* Operation.invoke(IbkrOperation.MaterializeInstrument, {
      key: { source: tickerSource('NASDAQ'), id: snapshot.symbol.toUpperCase() },
      symbol: snapshot.symbol,
      exchange: 'NASDAQ',
    });

    const fields = {
      ...lotFields(snapshot),
      portfolio: portfolioRef,
      instrument,
    };

    const match = existingByKey.get(foreignId);
    if (match) {
      Obj.update(match, (match) => {
        Object.assign(match, fields);
      });
      updated++;
    } else {
      const lot = yield* Database.add(
        Obj.make(Ibkr.Lot, {
          [Obj.Meta]: { keys: [{ source: IBKR_SOURCE, id: foreignId }] },
          ...fields,
        }),
      );
      Obj.setParent(lot, portfolio);
      existingByKey.set(foreignId, lot);
      created++;
    }
  }

  let removed = 0;
  for (const lot of existing) {
    const key = Obj.getMeta(lot).keys.find((entry) => entry.source === IBKR_SOURCE);
    if (key && !seen.has(key.id)) {
      yield* Database.remove(lot);
      removed++;
    }
  }

  yield* Database.flush();

  return { synced: parsed.length, created, updated, removed };
});

const lotForeignId = (lot: Ibkr.LotSnapshot): string =>
  lot.sold
    ? `closed/${lot.symbol}/${lot.acquired ?? ''}/${lot.sold}/${lot.quantity}`
    : `open/${lot.symbol}/${lot.acquired ?? ''}/${lot.quantity}`;

const lotFields = (snapshot: Ibkr.LotSnapshot): Omit<Obj.MakeProps<typeof Ibkr.Lot>, 'portfolio' | 'instrument'> => ({
  symbol: snapshot.symbol,
  quantity: snapshot.quantity,
  acquired: snapshot.acquired,
  sold: snapshot.sold,
  costBasis: snapshot.costBasis,
  markPrice: snapshot.markPrice,
  value: snapshot.value,
  proceeds: snapshot.proceeds,
  unrealizedPnl: snapshot.unrealizedPnl,
  realizedPnl: snapshot.realizedPnl,
  currency: snapshot.currency,
});
