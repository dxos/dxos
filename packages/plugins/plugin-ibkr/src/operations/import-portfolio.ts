//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Feed, Obj } from '@dxos/echo';

import { IbkrImportError } from '../errors';
import { parseCash, parsePositions, parseTrades } from '../services';
import { Ibkr, IbkrOperation } from '../types';
import { getOrCreatePortfolioFeed } from './feed';

const handler: Operation.WithHandler<typeof IbkrOperation.ImportPortfolioReport> =
  IbkrOperation.ImportPortfolioReport.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ xml }) {
        // Guard against non-Flex uploads before persisting; parsers tolerate missing sections but not garbage.
        if (!xml.includes('<FlexQueryResponse')) {
          return yield* Effect.fail(new IbkrImportError());
        }
        // Stamp the import time like the daily sync stamps its fetch time, so reads select the newest snapshot.
        const fetchedAt = new Date().toISOString();
        const feed = yield* getOrCreatePortfolioFeed;
        yield* Feed.append(feed, [Obj.make(Ibkr.Report, { xml, fetchedAt })]);
        return {
          fetchedAt,
          positions: parsePositions(xml).length,
          trades: parseTrades(xml).length,
          cash: parseCash(xml).length,
        };
      }),
    ),
    Operation.opaqueHandler,
  );

export default handler;
