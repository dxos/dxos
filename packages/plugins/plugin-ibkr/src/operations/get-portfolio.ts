//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { IbkrOperation } from '#types';

import { parseCash, parsePositions } from '../services/index.ts';
import { latestReport } from './feed.ts';

const handler: Operation.WithHandler<typeof IbkrOperation.GetPortfolio> = IbkrOperation.GetPortfolio.pipe(
  Operation.withHandler(
    Effect.fn(function* () {
      const report = yield* latestReport;
      const xml = report?.xml;
      return {
        fetchedAt: report?.fetchedAt,
        positions: xml ? parsePositions(xml) : [],
        cash: xml ? parseCash(xml) : [],
      };
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
