//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Filter } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Deal } from '#types';

import { QueryDeals } from './definitions';

/**
 * Queries deals with optional filters by stage, sector, or date range.
 */
const handler: Operation.WithHandler<typeof QueryDeals> = QueryDeals.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ stage, sector, limit = 20 }) {
      const { db } = yield* Database.Service;

      const allDeals: Deal.Deal[] = yield* Effect.promise(() => db.query(Filter.type(Deal.Deal)).run());

      let filtered = allDeals;

      if (stage) {
        filtered = filtered.filter((deal) => deal.stage === stage);
      }

      if (sector) {
        const sectorLower = sector.toLowerCase();
        filtered = filtered.filter((deal) =>
          deal.sectors?.some((dealSector) => dealSector.toLowerCase().includes(sectorLower)),
        );
      }

      // Sort by last activity (newest first).
      filtered.sort((dealA, dealB) =>
        (dealB.lastActivity ?? '').localeCompare(dealA.lastActivity ?? ''),
      );

      const limitedDeals = filtered.slice(0, limit);

      return {
        deals: limitedDeals.map((deal) => ({
          name: deal.name ?? 'Unnamed',
          stage: deal.stage ?? 'unknown',
          organization: deal.organization?.target?.name,
          round: deal.round,
          sectors: deal.sectors ? [...deal.sectors] : undefined,
          lastActivity: deal.lastActivity,
        })),
        total: filtered.length,
      };
    }),
  ),
);

export default handler;
