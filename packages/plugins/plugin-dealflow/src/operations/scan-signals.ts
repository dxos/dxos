//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Filter, Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Signal } from '#types';

import { ScanSignals } from './definitions';

/**
 * Scans for signals related to a deal from all connected data sources.
 */
const handler: Operation.WithHandler<typeof ScanSignals> = ScanSignals.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ deal: dealRef, lookbackDays = 30 }) {
      const deal = yield* Database.load(dealRef);
      const db = Obj.getDatabase(deal);
      if (!db) {
        return { signals: [] };
      }

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - lookbackDays);
      const cutoffIso = cutoff.toISOString();

      // Query all signals and filter by deal.
      const allSignals = yield* Effect.promise(() => db.query(Filter.type(Signal.Signal)).run());

      const dealSignals = allSignals
        .filter((signal) => {
          // Match by deal reference.
          if (signal.deal?.target?.id === deal.id) {
            return true;
          }
          // Match by organization reference.
          const org = deal.organization?.target;
          if (org && signal.organization?.target?.id === org.id) {
            return true;
          }
          return false;
        })
        .filter((signal) => !signal.detectedAt || signal.detectedAt >= cutoffIso)
        .sort((signalA, signalB) => (signalB.detectedAt ?? '').localeCompare(signalA.detectedAt ?? ''));

      return {
        signals: dealSignals.map((signal) => ({
          title: signal.title,
          kind: signal.kind ?? 'unknown',
          source: signal.source ?? 'unknown',
          detectedAt: signal.detectedAt ?? '',
        })),
      };
    }),
  ),
);

export default handler;
