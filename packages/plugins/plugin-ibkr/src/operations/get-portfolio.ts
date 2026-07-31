//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';

import { parseCash, parsePositions } from '../services';
import { IbkrOperation } from '../types';
import { latestReport } from './feed';

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
